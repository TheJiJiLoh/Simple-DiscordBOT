const UNIT_MS = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
};

/**
 * 解析 10m、1h30m、2d 這類時間字串，回傳毫秒；格式錯誤回傳 null。
 */
function parseDuration(input) {
    if (typeof input !== 'string') return null;

    const text = input.trim().toLowerCase().replace(/\s+/g, '');
    if (!text) return null;

    const pattern = /(\d+)([smhd])/g;
    let total = 0;
    let consumed = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index !== consumed) return null;
        consumed = pattern.lastIndex;

        const value = Number(match[1]);
        if (!Number.isFinite(value) || value <= 0) return null;
        total += value * UNIT_MS[match[2]];
    }

    if (consumed !== text.length || total <= 0) return null;
    return total;
}

function formatDuration(ms) {
    const units = [
        ['天', 24 * 60 * 60 * 1000],
        ['小時', 60 * 60 * 1000],
        ['分鐘', 60 * 1000],
        ['秒', 1000],
    ];

    let remaining = ms;
    const parts = [];

    for (const [label, size] of units) {
        const value = Math.floor(remaining / size);
        if (value > 0) {
            parts.push(`${value} ${label}`);
            remaining -= value * size;
        }
    }

    return parts.join(' ') || '0 秒';
}

module.exports = { parseDuration, formatDuration };
