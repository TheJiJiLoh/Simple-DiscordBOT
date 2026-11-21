const { EmbedBuilder } = require('discord.js');

/**
 * 將自訂指令清單組成 embed；內容太長時自動分成多個 embed。
 */
function buildCustomCommandEmbeds(commands) {
    const entries = Object.entries(commands);

    if (entries.length === 0) {
        return [
            new EmbedBuilder()
                .setTitle('📋 自訂指令列表')
                .setDescription('目前沒有任何自訂指令喔！試試看 `/commsg` 新增一個吧。')
                .setColor(0x5865f2),
        ];
    }

    const MAX_TOTAL = 5500; // Discord 所有 embed 合計上限為 6000
    const MAX_DESCRIPTION = 3900;

    const chunks = [];
    let current = '';
    let used = 0;
    let shown = 0;

    for (const [name, response] of entries) {
        const line = `**!${name}** → ${response}`;
        const additional = current ? line.length + 1 : line.length;

        if (used + additional > MAX_TOTAL) break;

        if (current && current.length + additional > MAX_DESCRIPTION) {
            chunks.push(current);
            current = line;
        } else {
            current = current ? `${current}\n${line}` : line;
        }

        used += additional;
        shown += 1;
    }

    if (current) chunks.push(current);

    const remaining = entries.length - shown;
    if (remaining > 0) {
        const note = `…還有 ${remaining} 個指令未顯示（請考慮清理舊指令）。`;
        const lastChunk = chunks[chunks.length - 1];

        if (lastChunk && lastChunk.length + note.length + 1 <= MAX_DESCRIPTION) {
            chunks[chunks.length - 1] = `${lastChunk}\n${note}`;
        } else {
            chunks.push(note);
        }
    }

    return chunks.slice(0, 10).map((description, index) => {
        const embed = new EmbedBuilder()
            .setDescription(description)
            .setColor(0x5865f2);

        if (index === 0) {
            embed.setTitle(`📋 自訂指令列表（共 ${entries.length} 個）`);
        }

        if (chunks.length > 1) {
            embed.setFooter({ text: `第 ${index + 1} / ${chunks.length} 頁` });
        }

        return embed;
    });
}

module.exports = { buildCustomCommandEmbeds };
