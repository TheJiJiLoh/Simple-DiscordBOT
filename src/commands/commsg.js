const { SlashCommandBuilder } = require('discord.js');
const customCommands = require('../utils/customCommands');
const { replyError } = require('../utils/respond');

module.exports = {
    category: '自訂指令',
    data: new SlashCommandBuilder()
        .setName('commsg')
        .setDescription('新增或更新自訂指令')
        .addStringOption(option => option
            .setName('name')
            .setDescription('指令名稱 (例如: hello)')
            .setRequired(true)
            .setMaxLength(32))
        .addStringOption(option => option
            .setName('response')
            .setDescription('機器人回覆的內容')
            .setRequired(true)
            .setMaxLength(1900)),
    async execute(interaction) {
        const name = interaction.options.getString('name').trim().toLowerCase();
        const response = interaction.options.getString('response');

        if (!customCommands.isValidName(name)) {
            return replyError(interaction, '指令名稱無效！只能包含小寫字母、數字、底線(_)和連字號(-)，且不可使用保留名稱。');
        }

        const existed = customCommands.has(name);
        customCommands.set(name, response);

        return interaction.reply({
            content: `✅ ${existed ? '已更新' : '成功新增'}指令！輸入 \`!${name}\` 來測試，機器人將會回覆：${response}`,
        });
    },
};
