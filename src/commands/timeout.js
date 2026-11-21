const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
} = require('discord.js');
const { parseDuration, formatDuration } = require('../utils/duration');
const { replyError } = require('../utils/respond');
const { canModerate } = require('../utils/permissions');
const { logModAction } = require('../utils/modlog');

const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000; // Discord 上限為 28 天

module.exports = {
    category: '管理工具',
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('暫時禁言成員')
        .addUserOption(option => option
            .setName('user')
            .setDescription('要禁言的成員')
            .setRequired(true))
        .addStringOption(option => option
            .setName('duration')
            .setDescription('禁言時間，例如 10m、1h、7d（最多 28 天）')
            .setRequired(true))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('原因')
            .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return replyError(interaction, '你需要「管理成員」權限才能使用此指令。');
        }

        await interaction.deferReply();

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

        const durationInput = interaction.options.getString('duration');
        const durationMs = parseDuration(durationInput);

        if (!durationMs) {
            return interaction.editReply('❌ 時間格式錯誤！請使用如 `10m`、`1h`、`7d` 的格式。');
        }
        if (durationMs > MAX_TIMEOUT) {
            return interaction.editReply('❌ 禁言時間最長為 28 天。');
        }
        if (!target.moderatable) {
            return interaction.editReply('❌ 我沒有權限禁言這位成員，請檢查我的身分組位階與「管理成員」權限。');
        }

        const reason = interaction.options.getString('reason') ?? '未提供原因';

        try {
            await target.timeout(durationMs, `${interaction.user.tag}: ${reason}`);
        } catch (error) {
            console.error('禁言成員失敗:', error);
            return interaction.editReply('❌ 禁言失敗，請檢查權限設定。');
        }

        await logModAction(interaction.guild, {
            action: '禁言',
            moderator: interaction.user,
            target: `${target.user.tag} (${target.id})`,
            reason,
            extra: `時長：${formatDuration(durationMs)}`,
        });

        return interaction.editReply(
            `🔇 已禁言 **${target.user.tag}** ${formatDuration(durationMs)}。\n原因：${reason}`,
        );
    },
};
