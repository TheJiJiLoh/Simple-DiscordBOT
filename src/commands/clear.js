const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    InteractionContextType,
} = require('discord.js');
const { replyError } = require('../utils/respond');
const { logModAction } = require('../utils/modlog');

module.exports = {
    category: '管理工具',
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('批次刪除頻道訊息（最多 100 則）')
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('要刪除的訊息數量 (1-100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100))
        .addUserOption(option => option
            .setName('user')
            .setDescription('只刪除這位使用者的訊息'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return replyError(interaction, '你需要「管理訊息」權限才能使用此指令。');
        }

        const channel = interaction.channel;
        if (!channel || typeof channel.bulkDelete !== 'function') {
            return replyError(interaction, '這個頻道不支援批次刪除訊息。');
        }

        const amount = interaction.options.getInteger('amount');
        const user = interaction.options.getUser('user');

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let messages;
        if (user) {
            const fetched = await channel.messages.fetch({ limit: 100 });
            messages = fetched.filter(message => message.author.id === user.id).first(amount);
        } else {
            messages = await channel.messages.fetch({ limit: amount });
        }

        if (messages.size === 0) {
            return interaction.editReply('找不到符合條件的訊息可以刪除（訊息可能已超過 14 天）。');
        }

        const deleted = await channel.bulkDelete(messages, true);

        await logModAction(interaction.guild, {
            action: '清除訊息',
            moderator: interaction.user,
            target: channel.toString(),
            reason: `刪除 ${deleted.size} 則訊息${user ? `（僅限 ${user.tag}）` : ''}`,
        });

        return interaction.editReply(
            `🧹 已刪除 **${deleted.size}** 則訊息${user ? `（來自 ${user.tag}）` : ''}。`,
        );
    },
};
