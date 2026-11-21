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
        .setName('kick')
        .setDescription('將成員踢出伺服器')
        .addUserOption(option => option
            .setName('user')
            .setDescription('要踢出的成員')
            .setRequired(true))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('原因')
            .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
            return replyError(interaction, '你需要「踢出成員」權限才能使用此指令。');
        }

        // 確認提示只讓執行者看到，避免其他人看到或誤按
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const user = interaction.options.getUser('user');
        let target = interaction.options.getMember('user');
        if (!target) {
            target = await interaction.guild.members.fetch(user.id).catch(() => null);
        }
        if (!target) {
            return interaction.editReply('❌ 找不到這位成員，他可能已經離開伺服器。');
        }

        const check = canModerate(interaction, target);
        if (!check.ok) return interaction.editReply(`❌ ${check.reason}`);

        if (!target.kickable) {
            return interaction.editReply('❌ 我沒有權限踢出這位成員，請檢查我的身分組位階與「踢出成員」權限。');
        }

        const reason = interaction.options.getString('reason') ?? '未提供原因';

        const token = generateToken();
        remember(token, {
            moderatorId: interaction.user.id,
            run: async confirmation => {
                try {
                    await target.kick(`${interaction.user.tag}: ${reason}`);
                } catch (error) {
                    console.error('踢出成員失敗:', error);
                    return confirmation.update({
                        content: '❌ 踢出失敗，請檢查權限設定。',
                        components: [],
                    }).catch(() => null);
                }

                await logModAction(interaction.guild, {
                    action: '踢出',
                    moderator: interaction.user,
                    target: `${target.user.tag} (${target.id})`,
                    reason,
                });

                // 結果公開發到頻道，讓所有人看到原因
                const result = `👢 已將 **${target.user.tag}** 踢出伺服器。\n原因：${reason}`;
                if (interaction.channel?.isTextBased()) {
                    await interaction.channel.send(result).catch(() => null);
                }

                return confirmation.update({
                    content: '✅ 已執行，結果已公開回覆。',
                    components: [],
                }).catch(() => null);
            },
        });

        return interaction.editReply({
            content: `⚠️ 確定要將 **${target.user.tag}** 踢出伺服器嗎？\n原因：${reason}`,
            components: [createRow('kick', token)],
        });
    },
};
