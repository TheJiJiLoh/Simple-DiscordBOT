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
const { replyError } = require('../utils/respond');
const { logModAction } = require('../utils/modlog');
const {
    generateToken,
    createRow,
    createSelectRow,
    remember,
    consume,
} = require('../utils/confirm');

const MAX_LIST = 25; // Discord 下拉選單最多 25 個選項

module.exports = {
    category: '管理工具',
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('解除封鎖使用者')
        .addStringOption(option => option
            .setName('user_id')
            .setDescription('要解除封鎖的使用者 ID（可留空，改用清單選擇）')
            .setMaxLength(20))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('原因（可留空，之後會再詢問）')
            .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
            return replyError(interaction, '你需要「封鎖成員」權限才能使用此指令。');
        }

        // 清單、彈窗與確認提示都只讓執行者看到，結果才公開發到頻道
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const userId = interaction.options.getString('user_id')?.trim();
        const givenReason = interaction.options.getString('reason')?.trim();
        const guild = interaction.guild;
        const channel = interaction.channel;

        // 有給 ID：直接對該使用者處理
        if (userId) {
            if (!/^\d{17,20}$/.test(userId)) {
                return interaction.editReply('❌ 使用者 ID 格式錯誤，請輸入正確的數字 ID。');
            }

            const ban = await guild.bans.fetch(userId).catch(() => null);
            if (!ban) {
                return interaction.editReply(`❌ 找不到 <@${userId}> 的封鎖紀錄。`);
            }

            return startUnban(interaction, guild, channel, ban, givenReason);
        }

        // 沒給 ID：列出封鎖清單
        const bans = [...(await guild.bans.fetch().catch(() => [])).values()];
        if (bans.length === 0) {
            return interaction.editReply('✅ 目前沒有被封鎖的使用者。');
        }

        const shown = bans.slice(0, MAX_LIST);
        const options = shown.map((ban, index) => ({
            label: ban.user.tag.slice(0, 100),
            value: String(index),
            description: `ID: ${ban.user.id}`,
        }));

        const token = generateToken();
        remember(token, {
            moderatorId: interaction.user.id,
            bans: shown,
            onPick: async (selectInteraction, value) => {
                const ban = shown[Number(value)];
                if (!ban) {
                    return selectInteraction.update({
                        content: '❌ 選擇無效，請重新執行指令。',
                        components: [],
                    }).catch(() => null);
                }

                consume(token);
                return startUnban(selectInteraction, guild, channel, ban, givenReason);
            },
        });

        const note = bans.length > MAX_LIST
            ? `\n（僅顯示前 ${MAX_LIST} 筆，共 ${bans.length} 筆）`
            : '';

        return interaction.editReply({
            content: `🔨 目前共有 ${bans.length} 個封鎖中的使用者，請選擇要解除封鎖的對象：${note}`,
            components: [createSelectRow('unban', token, options)],
        });
    },
};

/**
 * 若已給原因就直接確認；否則跳出 Modal 詢問原因。
 */
async function startUnban(interaction, guild, channel, ban, reason) {
    if (reason) {
        return askConfirm(interaction, guild, channel, ban, reason);
    }

    const token = generateToken();
    remember(token, {
        moderatorId: interaction.user.id,
        onModal: (modalInteraction, entered) => askConfirm(modalInteraction, guild, channel, ban, entered),
    });

    const modal = new ModalBuilder()
        .setCustomId(`reason:unban:${token}`)
        .setTitle('解除封鎖原因')
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('原因')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('例如：表現良好，准予解封')
                .setMaxLength(500),
        ));

    return interaction.showModal(modal);
}

/**
 * 顯示「確認解除封鎖」的按鈕，確認後才執行。
 */
async function askConfirm(interaction, guild, channel, ban, reason) {
    const token = generateToken();
    remember(token, {
        moderatorId: interaction.user.id,
        run: async confirmation => {
            try {
                await guild.members.unban(ban.user.id, `${interaction.user.tag}: ${reason}`);
            } catch (error) {
                console.error('解除封鎖失敗:', error);
                return confirmation.update({
                    content: '❌ 解除封鎖失敗，請檢查權限設定。',
                    components: [],
                }).catch(() => null);
            }

            await logModAction(guild, {
                action: '解除封鎖',
                moderator: interaction.user,
                target: `${ban.user.tag} (${ban.user.id})`,
                reason,
            });

            // 結果公開發到頻道，讓所有人看到原因
            const result = `✅ 已解除封鎖 **${ban.user.tag}**。\n原因：${reason}`;
            if (channel?.isTextBased()) {
                await channel.send(result).catch(() => null);
            }

            return confirmation.update({
                content: '✅ 已執行，結果已公開回覆。',
                components: [],
            }).catch(() => null);
        },
    });

    const payload = {
        content: `⚠️ 確定要解除封鎖 **${ban.user.tag}** 嗎？\n原因：${reason}`,
        components: [createRow('unban', token)],
    };

    if (interaction.isChatInputCommand()) {
        return interaction.editReply(payload);
    }
    if (interaction.isStringSelectMenu()) {
        return interaction.update(payload);
    }
    // Modal 送出後是新的訊息，用(ephemeral) reply 建立確認鈕
    return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}
