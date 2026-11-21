const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { parseDuration } = require('../utils/duration');
const reminders = require('../utils/reminders');
const { replyError } = require('../utils/respond');

const MAX_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 天

module.exports = {
    category: '實用工具',
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('設定一個定時提醒')
        .addStringOption(option => option
            .setName('duration')
            .setDescription('多久後提醒，例如 10m、1h30m、2d')
            .setRequired(true))
        .addStringOption(option => option
            .setName('message')
            .setDescription('提醒內容')
            .setRequired(true)
            .setMaxLength(500)),
    async execute(interaction) {
        const durationInput = interaction.options.getString('duration');
        const delayMs = parseDuration(durationInput);

        if (!delayMs) {
            return replyError(interaction, '時間格式錯誤！請使用如 `10m`、`1h30m`、`2d` 的格式。');
        }

        if (delayMs > MAX_DURATION) {
            return replyError(interaction, '提醒時間最長為 30 天。');
        }

        const message = interaction.options.getString('message');
        const reminder = reminders.create({
            userId: interaction.user.id,
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            message,
            delayMs,
        });

        const dueTimestamp = Math.floor(reminder.dueAt / 1000);
        const embed = new EmbedBuilder()
            .setTitle('⏰ 提醒已設定')
            .setDescription(`我會在 <t:${dueTimestamp}:F>（<t:${dueTimestamp}:R>）提醒你：\n> ${message}`)
            .setColor(0xfee75c);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
