const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    InteractionContextType,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const warnings = require('../utils/warnings');
const { replyError } = require('../utils/respond');
const { logModAction } = require('../utils/modlog');
const {
    generateToken,
    createRow,
    createSelectRow,
    remember,
    consume,
    sendPrompt,
} = require('../utils/confirm');

const MAX_LIST = 25; // Discord 下拉選單最多 25 個選項

module.exports = {
    category: '管理工具',
    data: new SlashCommandBuilder()
        .setName('rmwarn')
        .setDescription('移除成員的某筆警告')
        .addUserOption(option => option
            .setName('user')
            .setDescription('要移除警告的成員')
            .setRequired(true))
        .addIntegerOption(option => option
            .setName('id')
            .setDescription('警告編號（可留空，改用清單選擇）')
            .setMinValue(1))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('原因（可留空，之後會再詢問）')
            .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return replyError(interaction, '你需要「管理成員」權限才能使用此指令。');
        }

        // 清單、彈窗與確認提示都只讓執行者看到
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const user = interaction.options.getUser('user');
        const warningId = interaction.options.getInteger('id');
        const givenReason = interaction.options.getString('reason')?.trim();
        const guild = interaction.guild;

        const entries = warnings.list(interaction.guildId, user.id);
        if (entries.length === 0) {
            return interaction.editReply(`✅ **${user.tag}** 沒有任何警告紀錄。`);
        }

        // 有給編號：直接處理該筆
        if (warningId) {
            const entry = entries.find(item => item.id === warningId);
            if (!entry) {
                return interaction.editReply(`❌ 找不到 **${user.tag}** 的警告 #${warningId}。`);
            }
            return startRemove(interaction, guild, user, entry, givenReason);
        }

        // 沒給編號：列出該成員的警告清單
        const shown = entries.slice(0, MAX_LIST);
        const options = shown.map((entry, index) => ({
            label: `#${entry.id} ${entry.reason}`.slice(0, 100),
            value: String(index),
            description: `建立於 ${new Date(entry.createdAt).toISOString().slice(0, 10)}`,
        }));

        const token = generateToken();
        remember(token, {
            moderatorId: interaction.user.id,
            onPick: async (selectInteraction, value) => {
                const entry = shown[Number(value)];
                if (!entry) {
                    return selectInteraction.update({
                        content: '❌ 選擇無效，請重新執行指令。',
                        components: [],
                    }).catch(() => null);
                }

                consume(token);
                return startRemove(selectInteraction, guild, user, entry, givenReason);
            },
        });

        const note = entries.length > MAX_LIST
            ? `\n（僅顯示前 ${MAX_LIST} 筆，共 ${entries.length} 筆）`
            : '';

        return interaction.editReply({
            content: `⚠️ **${user.tag}** 共有 ${entries.length} 筆警告，請選擇要移除的項目：${note}`,
            components: [createSelectRow('rmwarn', token, options)],
        });
    },
};

/**
 * 把剩下的警告整理成私訊文字（避免超過 Discord 2000 字上限）。
 */
function buildRemainingText(entries, maxLength = 1800) {
    if (entries.length === 0) {
        return '📋 你目前沒有任何警告紀錄。';
    }

    let text = `📋 你目前的警告紀錄（剩餘 ${entries.length} 筆）：\n`
        + entries.map(item => `#${item.id} ${item.reason}`).join('\n');

    if (text.length > maxLength) {
        text = `${text.slice(0, Math.max(0, maxLength - 3))}...`;
    }
    return text;
}

/**
 * 若已給原因就直接確認；否則跳出 Modal 詢問原因。
 */
async function startRemove(interaction, guild, user, entry, reason) {
    if (reason) {
        return askConfirm(interaction, guild, user, entry, reason);
    }

    const token = generateToken();
    remember(token, {
        moderatorId: interaction.user.id,
        onModal: (modalInteraction, entered) => askConfirm(modalInteraction, guild, user, entry, entered),
    });

    const modal = new ModalBuilder()
        .setCustomId(`reason:rmwarn:${token}`)
        .setTitle('移除警告原因')
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('原因')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('例如：警告已過期，予以撤銷')
                .setMaxLength(500),
        ));

    return interaction.showModal(modal);
}

/**
 * 顯示「確認移除」的按鈕，確認後才執行。
 */
async function askConfirm(interaction, guild, user, entry, reason) {
    const token = generateToken();
    remember(token, {
        moderatorId: interaction.user.id,
        run: async confirmation => {
            const removed = warnings.remove(guild.id, user.id, entry.id);
            if (!removed) {
                return confirmation.update({
                    content: `❌ 找不到 **${user.tag}** 的警告 #${entry.id}，可能已被移除。`,
                    components: [],
                }).catch(() => null);
            }

            const remaining = warnings.list(guild.id, user.id);
            const dmHeader = `🗑️ 你在 **${guild.name}** 的警告 #${entry.id} 已被移除。\n`
                + `移除原因：${reason}\n`
                + `原警告原因：${entry.reason}\n\n`;

            // 私訊通知被警告的成員，並附上目前剩下的警告紀錄
            const dmSent = await user.send(
                dmHeader + buildRemainingText(remaining, Math.max(200, 1900 - dmHeader.length)),
            ).then(() => true).catch(() => false);

            await logModAction(guild, {
                action: '移除警告',
                moderator: interaction.user,
                target: `${user.tag} (${user.id})`,
                reason,
                extra: `警告編號 #${entry.id}（原原因：${entry.reason}）`,
            });

            return confirmation.update({
                content: `🗑️ 已移除 **${user.tag}** 的警告 #${entry.id}。\n原因：${reason}`
                    + `\n剩餘警告：${remaining.length} 筆`
                    + (dmSent ? '' : '\n⚠️ 無法私訊通知該成員（對方可能關閉了私訊）。'),
                components: [],
            }).catch(() => null);
        },
    });

    return sendPrompt(interaction, {
        content: `⚠️ 確定要移除 **${user.tag}** 的警告 #${entry.id} 嗎？\n原警告原因：${entry.reason}\n移除原因：${reason}`,
        components: [createRow('rmwarn', token)],
    });
}
