const { SlashCommandBuilder } = require('discord.js');
const pingMonitor = require('../utils/pingMonitor');

module.exports = {
    category: '一般',
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('停止 Ping 監控'),
    async execute(interaction) {
        await interaction.deferReply();

        const stopped = pingMonitor.stop(interaction.user.id);
        await interaction.editReply(stopped
            ? '🛑 已停止 Ping 監控。'
            : '目前沒有正在執行的監控喔！');
    },
};
