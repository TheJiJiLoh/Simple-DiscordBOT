const {
    SlashCommandBuilder,
    EmbedBuilder,
    InteractionContextType,
} = require('discord.js');

module.exports = {
    category: '實用工具',
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('顯示使用者資訊')
        .addUserOption(option => option
            .setName('user')
            .setDescription('要查詢的使用者（預設為你自己）'))
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const user = interaction.options.getUser('user') ?? interaction.user;

        let member = interaction.options.getMember('user');
        if (!member && user.id === interaction.user.id) member = interaction.member;
        if (!member) {
            member = await interaction.guild.members.fetch(user.id).catch(() => null);
        }

        const accountCreated = Math.floor(user.createdTimestamp / 1000);
        const embed = new EmbedBuilder()
            .setTitle(`${user.bot ? '🤖 ' : ''}${user.tag}`)
            .setColor(member?.displayColor || 0x5865f2)
            .addFields(
                { name: '🆔 使用者 ID', value: user.id, inline: true },
                {
                    name: '📅 帳號建立',
                    value: `<t:${accountCreated}:F>\n(<t:${accountCreated}:R>)`,
                    inline: true,
                },
                {
                    name: '📥 加入伺服器',
                    value: member?.joinedTimestamp
                        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`
                        : '未知',
                    inline: true,
                },
                { name: '📛 暱稱', value: member?.nickname ?? '無', inline: true },
                { name: '🎭 最高身分組', value: member ? `${member.roles.highest}` : '未知', inline: true },
                { name: '🤖 機器人', value: user.bot ? '是' : '否', inline: true },
            );

        const avatar = user.displayAvatarURL({ size: 256 });
        if (avatar) embed.setThumbnail(avatar);

        if (member) {
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => `${role}`);

            embed.addFields({
                name: `🎖️ 身分組（${roles.length}）`,
                value: roles.slice(0, 20).join(' ') || '無',
            });

            if (member.premiumSinceTimestamp) {
                embed.addFields({
                    name: '🚀 加成伺服器',
                    value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R> 開始`,
                });
            }
        }

        const banner = user.bannerURL({ size: 1024 });
        if (banner) embed.setImage(banner);

        await interaction.reply({ embeds: [embed] });
    },
};
