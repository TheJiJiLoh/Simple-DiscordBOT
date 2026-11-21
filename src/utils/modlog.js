const { EmbedBuilder } = require('discord.js');

const COLORS = {
    '清除訊息': 0x5865f2,
    '警告': 0xfee75c,
    '移除警告': 0x57f287,
    '禁言': 0xfaa61a,
    '解除禁言': 0x57f287,
    '踢出': 0xed4245,
    '封鎖': 0xed4245,
    '解除封鎖': 0x57f287,
};

/**
 * 若設定了 MOD_LOG_CHANNEL_ID，就把管理操作紀錄送到該頻道。
 */
async function logModAction(guild, { action, moderator, target, reason, extra }) {
    const channelId = process.env.MOD_LOG_CHANNEL_ID;
    if (!guild || !channelId) return;

    try {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.warn(`找不到管理紀錄頻道 (${channelId})，或該頻道不支援傳送訊息。`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ ${action}`)
            .setColor(COLORS[action] ?? 0x99aab5)
            .setTimestamp()
            .addFields(
                { name: '管理員', value: `${moderator.tag} (${moderator.id})`, inline: true },
                { name: '對象', value: target, inline: true },
                { name: '原因', value: reason || '未提供原因' },
            );

        if (extra) embed.addFields({ name: '補充', value: extra });

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('寫入管理紀錄失敗:', error);
    }
}

module.exports = { logModAction };
