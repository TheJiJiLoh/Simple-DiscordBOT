const { SlashCommandBuilder } = require('discord.js');
const pingMonitor = require('../utils/pingMonitor');

module.exports = {
    category: '一般',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('開始即時監控延遲 (每 5 秒更新)'),
    async execute(interaction) {
        await interaction.deferReply();

        if (pingMonitor.isRunning(interaction.user.id)) {
            return interaction.editReply('你已經有一個正在執行的監控！請先輸入 `/stop` 停止它。');
        }

        const started = await pingMonitor.start({
            userId: interaction.user.id,
            client: interaction.client,
            edit: content => interaction.editReply(content),
        });

        if (!started) {
            return interaction.editReply('你已經有一個正在執行的監控！請先輸入 `/stop` 停止它。');
        }
    },
};
