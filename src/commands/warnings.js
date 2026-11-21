const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    InteractionContextType,
    EmbedBuilder,
} = require('discord.js');
const warnings = require('../utils/warnings');
const { buildOverview } = require('../utils/warningView');

module.exports = {
    category: '管理工具',
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('查看警告紀錄（不指定成員則顯示全部）')
        .addUserOption(option => option
            .setName('user')
            .setDescription('要查詢的成員（留空則查看所有人的警告）'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (!user) {
            const overview = buildOverview(interaction.guild, interaction.guildId);

            if (overview.empty) {
                return interaction.reply({
                    content: '✅ 目前沒有任何警告紀錄。',
                    flags: MessageFlags.Ephemeral,
                });
            }

            return interaction.reply({
                embeds: [overview.embed],
                flags: MessageFlags.Ephemeral,
            });
        }

        const entries = warnings.list(interaction.guildId, user.id);

        if (entries.length === 0) {
            return interaction.reply({
                content: `✅ **${user.tag}** 沒有任何警告紀錄。`,
                flags: MessageFlags.Ephemeral,
            });
        }

        let description = entries
            .map(entry => (
                `**#${entry.id}** ${entry.reason}\n`
                + `> 由 <@${entry.moderatorId}> • <t:${Math.floor(entry.createdAt / 1000)}:R>`
            ))
            .join('\n\n');

        if (description.length > 4000) {
            description = `${description.slice(0, 3997)}...`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ ${user.tag} 的警告紀錄（${entries.length}）`)
            .setColor(0xfee75c)
            .setDescription(description);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
