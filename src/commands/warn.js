const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
    EmbedBuilder,
} = require('discord.js');
const { replyError } = require('../utils/respond');
const { canModerate } = require('../utils/permissions');
const { logModAction } = require('../utils/modlog');
const { buildOverview } = require('../utils/warningView');
const warnings = require('../utils/warnings');

/**
 * 把警告紀錄整理成文字，超過長度就截斷。
 */
function formatHistory(entries, maxLength) {
    let text = entries
        .map(entry => `#${entry.id} ${entry.reason}`)
        .join('\n');

    if (text.length > maxLength) {
        text = `${text.slice(0, Math.max(0, maxLength - 3))}...`;
    }
    return text;
}

module.exports = {
    category: '管理工具',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('警告成員，或查看全伺服器的警告紀錄')
        .addUserOption(option => option
            .setName('user')
            .setDescription('要警告的成員（留空則查看所有人的警告）'))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('警告原因（指定成員時必填）')
            .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return replyError(interaction, '你需要「管理成員」權限才能使用此指令。');
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason')?.trim();

        // 沒有指定成員：顯示全伺服器的警告總覽
        if (!user) {
            const overview = buildOverview(interaction.guild, interaction.guildId);

            if (overview.empty) {
                return interaction.reply({
                    content: '✅ 目前沒有任何警告紀錄。',
                    flags: MessageFlags.Ephemeral,
                });
            }

            return interaction.reply({
                embeds: [overview.embed],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!reason) {
            return replyError(interaction, '請提供警告原因。');
        }

        await interaction.deferReply();

        let target = interaction.options.getMember('user');
        if (!target) {
            target = await interaction.guild.members.fetch(user.id).catch(() => null);
        }
        if (!target) {
            return interaction.editReply('❌ 找不到這位成員，他可能已經離開伺服器。');
        }

        const check = canModerate(interaction, target);
        if (!check.ok) return interaction.editReply(`❌ ${check.reason}`);

        const warning = warnings.add(interaction.guildId, target.id, {
            moderatorId: interaction.user.id,
            reason,
        });
        const entries = warnings.list(interaction.guildId, target.id);
        const total = entries.length;

        // 私訊通知被警告的成員，附上完整警告紀錄
        const dmHeader = `⚠️ 你在 **${interaction.guild.name}** 收到一個警告。\n`
            + `原因：${reason}\n`
            + `警告編號：#${warning.id}\n\n`
            + `📋 你目前的警告紀錄（共 ${total} 筆）：\n`;

        await target.send(
            dmHeader + formatHistory(entries, Math.max(200, 1900 - dmHeader.length)),
        ).catch(() => null);

        await logModAction(interaction.guild, {
            action: '警告',
            moderator: interaction.user,
            target: `${target.user.tag} (${target.id})`,
            reason,
            extra: `警告編號 #${warning.id}，累計 ${total} 次`,
        });

        const embed = new EmbedBuilder()
            .setTitle('⚠️ 已發出警告')
            .setColor(0xfee75c)
            .setDescription(`已警告 **${target.user.tag}**。`)
            .addFields(
                { name: '警告編號', value: `#${warning.id}`, inline: true },
                { name: '累計次數', value: `${total}`, inline: true },
                { name: '原因', value: reason },
                { name: '警告紀錄', value: formatHistory(entries, 1024) },
            );

        return interaction.editReply({ embeds: [embed] });
    },
};
