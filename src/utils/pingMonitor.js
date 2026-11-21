const monitors = new Map(); // userId -> intervalId

function isRunning(userId) {
    return monitors.has(userId);
}

function buildMessage(client, lastRoundtrip) {
    const apiPing = Math.round(client.ws.ping);
    const timestamp = new Date().toLocaleTimeString('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour12: false,
    });
    const robotLatency = lastRoundtrip === 0 ? '計算中...' : `${lastRoundtrip}ms`;

    return `Pong! 🏓 (即時更新中)\n`
        + `API 延遲: **${apiPing}ms**\n`
        + `機器人延遲: **${robotLatency}**\n`
        + `最後更新: ${timestamp}\n`
        + `輸入 \`/stop\` 或 \`!stop\` 來停止。`;
}

/**
 * 開始每 5 秒更新一次延遲訊息。
 * edit 是一個 async function(content)，用來更新斜線指令回覆或一般訊息。
 */
async function start({ userId, client, edit }) {
    if (monitors.has(userId)) return false;

    let lastRoundtrip = 0;

    const render = async () => {
        const startedAt = Date.now();
        await edit(buildMessage(client, lastRoundtrip));
        lastRoundtrip = Date.now() - startedAt;
    };

    await render();

    const interval = setInterval(() => {
        render().catch(() => stop(userId));
    }, 5000);

    monitors.set(userId, interval);
    return true;
}

function stop(userId) {
    const interval = monitors.get(userId);
    if (interval) clearInterval(interval);
    monitors.delete(userId);
    return Boolean(interval);
}

module.exports = { isRunning, start, stop };
