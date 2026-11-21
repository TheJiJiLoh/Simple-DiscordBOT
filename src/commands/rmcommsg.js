const { SlashCommandBuilder } = require('discord.js');
const customCommands = require('../utils/customCommands');
const { replyError } = require('../utils/respond');

module.exports = {
    category: '自訂指令',
    data: new SlashCommandBuilder()
        .setName('rmcommsg')
        .setDescription('移除自訂指令')
        .addStringOption(option => option
            .setName('name')
            .setDescription('要移除的指令名稱')
            .setRequired(true)),
    async execute(interaction) {
        const name = interaction.options.getString('name').trim().toLowerCase();

        if (!customCommands.has(name)) {
            return replyError(interaction, `找不到指令 \`!${name}\`，無法移除。`);
        }

        customCommands.remove(name);
        return interaction.reply({ content: `🗑️ 已成功移除指令 \`!${name}\`。` });
    },
};
