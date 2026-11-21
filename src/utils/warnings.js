const store = require('./store');

let data = store.readJson('warnings', {});
if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.warn('data/warnings.json 格式不正確，已重置為空物件。');
    data = {};
}

function key(guildId, userId) {
    return `${guildId}:${userId}`;
}

function list(guildId, userId) {
    return data[key(guildId, userId)] ?? [];
}

/**
 * 列出整個伺服器所有成員的警告，依警告數量由多到少排序。
 * 回傳 [{ userId, entries }]
 */
function listGuild(guildId) {
    const prefix = `${guildId}:`;

    return Object.entries(data)
        .filter(([entryKey, entries]) => (
            entryKey.startsWith(prefix) && Array.isArray(entries) && entries.length > 0
        ))
        .map(([entryKey, entries]) => ({
            userId: entryKey.slice(prefix.length),
            entries,
        }))
        .sort((a, b) => b.entries.length - a.entries.length);
}

function add(guildId, userId, { moderatorId, reason }) {
    const entryKey = key(guildId, userId);
    const entries = data[entryKey] ?? [];
    const nextId = entries.reduce((max, item) => Math.max(max, item.id), 0) + 1;

    const warning = {
        id: nextId,
        moderatorId,
        reason,
        createdAt: Date.now(),
    };

    data[entryKey] = [...entries, warning];
    store.writeJson('warnings', data);
    return warning;
}

function remove(guildId, userId, warningId) {
    const entryKey = key(guildId, userId);
    const entries = data[entryKey] ?? [];
    const next = entries.filter(item => item.id !== warningId);

    if (next.length === entries.length) return false;

    if (next.length === 0) delete data[entryKey];
    else data[entryKey] = next;

    store.writeJson('warnings', data);
    return true;
}

function clear(guildId, userId) {
    const entryKey = key(guildId, userId);
    if (!data[entryKey]) return false;
    delete data[entryKey];
    store.writeJson('warnings', data);
    return true;
}

module.exports = { list, listGuild, add, remove, clear };
