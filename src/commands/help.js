const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildHelpEmbed, isAdminUser } = require('../utils/help');

module.exports = {
    category: '一般',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('顯示指令說明清單（依權限顯示不同內容）'),
    async execute(interaction) {
        const isAdmin = isAdminUser(
            interaction.user,
            interaction.memberPermissions,
            interaction.guild?.ownerId,
        );

        await interaction.reply({
            embeds: [buildHelpEmbed(interaction.client, { isAdmin })],
            flags: MessageFlags.Ephemeral,
        });
    },
};
