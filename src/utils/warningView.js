const { EmbedBuilder } = require('discord.js');
const warnings = require('./warnings');

const MAX_FIELDS = 25; // Discord Embed 最多 25 個欄位
const FIELD_LIMIT = 1024;

function displayName(guild, userId) {
    const member = guild?.members?.cache?.get(userId);
    return member?.user?.tag ?? `使用者 ${userId}`;
}

/**
 * 建立「全伺服器警告總覽」的 Embed。
 * 沒有警告時回傳 { empty: true }。
 */
function buildOverview(guild, guildId) {
    const groups = warnings.listGuild(guildId);

    if (groups.length === 0) {
        return { empty: true };
    }

    const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
    const shown = groups.slice(0, MAX_FIELDS);

    const embed = new EmbedBuilder()
        .setTitle('⚠️ 伺服器警告總覽')
        .setColor(0xfee75c)
        .setFooter({ text: `共 ${groups.length} 位成員、${total} 筆警告` });

    if (groups.length > MAX_FIELDS) {
        embed.setDescription(
            `僅顯示警告最多的前 ${MAX_FIELDS} 位成員；其餘請用 \`/warnings user:\` 查詢。`,
        );
    }

    for (const group of shown) {
        let value = group.entries
            .map(entry => `#${entry.id} ${entry.reason}`)
            .join('\n');

        if (value.length > FIELD_LIMIT) {
            value = `${value.slice(0, FIELD_LIMIT - 3)}...`;
        }

        embed.addFields({
            name: `${displayName(guild, group.userId)}（${group.entries.length} 筆）`.slice(0, 256),
            value,
        });
    }

    return { embed, memberCount: groups.length, total };
}

module.exports = { buildOverview };
