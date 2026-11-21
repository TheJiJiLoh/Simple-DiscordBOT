const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const customCommands = require('../utils/customCommands');
const { buildCustomCommandEmbeds } = require('../utils/customCommandList');

module.exports = {
    category: '自訂指令',
    data: new SlashCommandBuilder()
        .setName('commsglist')
        .setDescription('列出所有自訂指令'),
    async execute(interaction) {
        const embeds = buildCustomCommandEmbeds(customCommands.getAll());
        await interaction.reply({ embeds, flags: MessageFlags.Ephemeral });
    },
};
