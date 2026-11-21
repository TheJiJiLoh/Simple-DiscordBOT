const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { replyError } = require('../utils/respond');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = {
    category: '實用工具',
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('建立一個表情符號投票')
        .addStringOption(option => option
            .setName('question')
            .setDescription('投票問題')
            .setRequired(true)
            .setMaxLength(200))
        .addStringOption(option => option
            .setName('option1')
            .setDescription('選項 1')
            .setRequired(true)
            .setMaxLength(80))
        .addStringOption(option => option
            .setName('option2')
            .setDescription('選項 2')
            .setRequired(true)
            .setMaxLength(80))
        .addStringOption(option => option
            .setName('option3')
            .setDescription('選項 3（選填）')
            .setMaxLength(80))
        .addStringOption(option => option
            .setName('option4')
            .setDescription('選項 4（選填）')
            .setMaxLength(80))
        .addStringOption(option => option
            .setName('option5')
            .setDescription('選項 5（選填）')
            .setMaxLength(80)),
    async execute(interaction) {
        const question = interaction.options.getString('question');
        const options = [1, 2, 3, 4, 5]
            .map(index => interaction.options.getString(`option${index}`))
            .filter(Boolean);

        if (options.length < 2) {
            return replyError(interaction, '至少需要兩個選項才能建立投票。');
        }

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${question}`)
            .setDescription(options
                .map((option, index) => `${NUMBER_EMOJIS[index]} ${option}`)
                .join('\n\n'))
            .setColor(0x57f287)
            .setFooter({ text: `由 ${interaction.user.tag} 發起 • 點擊下方表情符號投票` })
            .setTimestamp();

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });

        for (let index = 0; index < options.length; index += 1) {
            await message.react(NUMBER_EMOJIS[index]).catch(() => null);
        }
    },
};
