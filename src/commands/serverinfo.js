const {
    SlashCommandBuilder,
    EmbedBuilder,
    ChannelType,
    GuildVerificationLevel,
    InteractionContextType,
} = require('discord.js');

const VERIFICATION_LEVELS = {
    [GuildVerificationLevel.None]: '無',
    [GuildVerificationLevel.Low]: '低',
    [GuildVerificationLevel.Medium]: '中',
    [GuildVerificationLevel.High]: '高',
    [GuildVerificationLevel.VeryHigh]: '最高',
};

module.exports = {
    category: '實用工具',
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('顯示伺服器資訊')
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const { guild } = interaction;
        const owner = await guild.fetchOwner().catch(() => null);
        const channels = guild.channels.cache;

        const textChannels = channels.filter(channel => channel.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(channel => channel.type === ChannelType.GuildVoice).size;
        const categories = channels.filter(channel => channel.type === ChannelType.GuildCategory).size;
        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        const embed = new EmbedBuilder()
            .setTitle(guild.name)
            .setColor(0x5865f2)
            .addFields(
                { name: '🆔 伺服器 ID', value: guild.id, inline: true },
                {
                    name: '👑 擁有者',
                    value: owner ? `${owner.user.tag}\n\`${owner.id}\`` : '未知',
                    inline: true,
                },
                {
                    name: '📅 建立時間',
                    value: `<t:${createdAt}:F>\n(<t:${createdAt}:R>)`,
                    inline: false,
                },
                { name: '👥 成員數', value: `${guild.memberCount}`, inline: true },
                {
                    name: '💬 頻道',
                    value: `文字 ${textChannels} / 語音 ${voiceChannels} / 分類 ${categories}`,
                    inline: true,
                },
                { name: '🎭 身分組', value: `${Math.max(guild.roles.cache.size - 1, 0)}`, inline: true },
                {
                    name: '🚀 Boost',
                    value: `等級 ${guild.premiumTier}（${guild.premiumSubscriptionCount ?? 0} 次加成）`,
                    inline: true,
                },
                {
                    name: '🔒 驗證等級',
                    value: VERIFICATION_LEVELS[guild.verificationLevel] ?? '未知',
                    inline: true,
                },
                { name: '🌐 偏好語言', value: guild.preferredLocale, inline: true },
            );

        const icon = guild.iconURL({ size: 256 });
        if (icon) embed.setThumbnail(icon);

        await interaction.reply({ embeds: [embed] });
    },
};
