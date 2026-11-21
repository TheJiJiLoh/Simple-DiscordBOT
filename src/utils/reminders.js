const store = require('./store');

let clientRef = null;
let reminders = store.readJson('reminders', []);
if (!Array.isArray(reminders)) {
    console.warn('data/reminders.json 格式不正確，已重置為空陣列。');
    reminders = [];
}
let nextId = reminders.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;

const timers = new Map();
const MAX_TIMEOUT = 2_147_483_647; // setTimeout 的上限（約 24.8 天）

function persist() {
    store.writeJson('reminders', reminders);
}

function schedule(reminder) {
    const delay = reminder.dueAt - Date.now();

    if (delay <= 0) {
        fire(reminder);
        return;
    }

    const timer = setTimeout(() => {
        timers.delete(reminder.id);
        // 超過 setTimeout 上限時，重新排程剩下的時間
        if (Date.now() < reminder.dueAt) schedule(reminder);
        else fire(reminder);
    }, Math.min(delay, MAX_TIMEOUT));

    timers.set(reminder.id, timer);
}

async function fire(reminder) {
    reminders = reminders.filter(item => item.id !== reminder.id);
    persist();

    const client = clientRef;
    if (!client) return;

    try {
        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
        if (channel?.isTextBased()) {
            await channel.send({ content: `<@${reminder.userId}> ⏰ 提醒：${reminder.message}` });
            return;
        }
    } catch (error) {
        console.error('透過頻道發送提醒失敗:', error);
    }

    // 頻道不存在或沒有權限時，改用私訊
    try {
        const user = await client.users.fetch(reminder.userId);
        await user.send(`⏰ 提醒：${reminder.message}`);
    } catch (error) {
        console.error('透過私訊發送提醒失敗:', error);
    }
}

/**
 * 機器人登入後呼叫，重新排程資料檔中尚未到期的提醒。
 */
function init(client) {
    clientRef = client;

    for (const reminder of [...reminders]) {
        if (timers.has(reminder.id)) continue;
        schedule(reminder);
    }

    if (reminders.length > 0) {
        console.log(`已重新排程 ${reminders.length} 個提醒。`);
    }
}

function create({ userId, channelId, guildId, message, delayMs }) {
    const now = Date.now();
    const reminder = {
        id: nextId++,
        userId,
        channelId,
        guildId,
        message,
        dueAt: now + delayMs,
        createdAt: now,
    };

    reminders.push(reminder);
    persist();
    schedule(reminder);
    return reminder;
}

function countForUser(userId) {
    return reminders.filter(item => item.userId === userId).length;
}

module.exports = { init, create, countForUser };
