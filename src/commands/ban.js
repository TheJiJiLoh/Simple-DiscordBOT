const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    InteractionContextType,
} = require('discord.js');
const { replyError } = require('../utils/respond');
const { canModerate } = require('../utils/permissions');
const { logModAction } = require('../utils/modlog');
const { generateToken, createRow, remember } = require('../utils/confirm');

module.exports = {
    category: '管理工具',
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('封鎖使用者')
        .addUserOption(option => option
            .setName('user')
            .setDescription('要封鎖的使用者')
            .setRequired(true))
        .addIntegerOption(option => option
            .setName('delete_days')
            .setDescription('同時刪除該使用者最近幾天的訊息 (0-7)')
            .setMinValue(0)
            .setMaxValue(7))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('原因')
            .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
            return replyError(interaction, '你需要「封鎖成員」權限才能使用此指令。');
        }

        // 確認提示只讓執行者看到，避免其他人看到或誤按
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const user = interaction.options.getUser('user');
        let member = interaction.options.getMember('user');
        if (!member) {
            member = await interaction.guild.members.fetch(user.id).catch(() => null);
        }
        const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
        const reason = interaction.options.getString('reason') ?? '未提供原因';

        if (user.id === interaction.user.id) {
            return interaction.editReply('❌ 無法封鎖自己。');
        }
        if (user.id === interaction.client.user.id) {
            return interaction.editReply('❌ 無法封鎖機器人自己。');
        }
        if (user.id === interaction.guild.ownerId) {
            return interaction.editReply('❌ 無法封鎖伺服器擁有者。');
        }

        if (member) {
            const check = canModerate(interaction, member);
            if (!check.ok) return interaction.editReply(`❌ ${check.reason}`);
        }

        const token = generateToken();
        remember(token, {
            moderatorId: interaction.user.id,
            run: async confirmation => {
                try {
                    await interaction.guild.members.ban(user.id, {
                        reason: `${interaction.user.tag}: ${reason}`,
                        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
                    });
                } catch (error) {
                    console.error('封鎖使用者失敗:', error);
                    return confirmation.update({
                        content: '❌ 封鎖失敗，請檢查權限設定。',
                        components: [],
                    }).catch(() => null);
                }

                await logModAction(interaction.guild, {
                    action: '封鎖',
                    moderator: interaction.user,
                    target: `${user.tag} (${user.id})`,
                    reason,
                    extra: deleteDays > 0 ? `同時刪除最近 ${deleteDays} 天的訊息` : undefined,
                });

                // 結果公開發到頻道，讓所有人看到原因
                const result = `🔨 已封鎖 **${user.tag}**。\n原因：${reason}`;
                if (interaction.channel?.isTextBased()) {
                    await interaction.channel.send(result).catch(() => null);
                }

                return confirmation.update({
                    content: '✅ 已執行，結果已公開回覆。',
                    components: [],
                }).catch(() => null);
            },
        });

        const extra = deleteDays > 0 ? `\n將同時刪除最近 ${deleteDays} 天的訊息。` : '';
        return interaction.editReply({
            content: `⚠️ 確定要封鎖 **${user.tag}** 嗎？${extra}\n原因：${reason}`,
            components: [createRow('ban', token)],
        });
    },
};
