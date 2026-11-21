const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
} = require('discord.js');
const { replyError } = require('../utils/respond');
const { canModerate } = require('../utils/permissions');
const { logModAction } = require('../utils/modlog');

module.exports = {
    category: '管理工具',
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('解除成員的禁言')
        .addUserOption(option => option
            .setName('user')
            .setDescription('要解除禁言的成員')
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

        const isTimedOut = typeof target.isCommunicationDisabled === 'function'
            ? target.isCommunicationDisabled()
            : target.communicationDisabledUntilTimestamp != null;

        if (!isTimedOut) {
            return interaction.editReply('❌ 這位成員目前沒有被禁言。');
        }

        const check = canModerate(interaction, target);
        if (!check.ok) return interaction.editReply(`❌ ${check.reason}`);

        if (!target.moderatable) {
            return interaction.editReply('❌ 我沒有權限解除這位成員的禁言，請檢查我的身分組位階與「管理成員」權限。');
        }

        const reason = interaction.options.getString('reason') ?? '未提供原因';

        try {
            await target.timeout(null, `${interaction.user.tag}: ${reason}`);
        } catch (error) {
            console.error('解除禁言失敗:', error);
            return interaction.editReply('❌ 解除禁言失敗，請檢查權限設定。');
        }

        await logModAction(interaction.guild, {
            action: '解除禁言',
            moderator: interaction.user,
            target: `${target.user.tag} (${target.id})`,
            reason,
        });

        return interaction.editReply(`🔊 已解除 **${target.user.tag}** 的禁言。\n原因：${reason}`);
    },
};
