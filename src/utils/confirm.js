const crypto = require('crypto');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags,
} = require('discord.js');

const TTL_MS = 5 * 60 * 1000; // 確認按鈕 5 分鐘內有效
const pending = new Map();

function generateToken() {
    return crypto.randomBytes(8).toString('hex');
}

/**
 * 建立「確認執行 / 取消」的按鈕列。
 * customId 格式：confirm:<action>:<token>、cancel:<action>:<token>
 */
function createRow(action, token) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirm:${action}:${token}`)
            .setLabel('確認執行')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`cancel:${action}:${token}`)
            .setLabel('取消')
            .setStyle(ButtonStyle.Secondary),
    );
}

/**
 * 建立下拉選單（用來挑選對象）。
 * customId 格式：pick:<action>:<token>
 */
function createSelectRow(action, token, options) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`pick:${action}:${token}`)
            .setPlaceholder('請選擇')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options),
    );
}

function remember(token, data) {
    pending.set(token, { ...data, expiresAt: Date.now() + TTL_MS });
    sweep();
}

/**
 * 查看待確認資料（不移除）；過期則清除並回傳 null。
 */
function peek(token) {
    const data = pending.get(token);
    if (!data) return null;

    if (data.expiresAt < Date.now()) {
        pending.delete(token);
        return null;
    }
    return data;
}

/**
 * 取出並移除待確認資料；過期或不存在則回傳 null。
 */
function consume(token) {
    const data = peek(token);
    if (data) pending.delete(token);
    return data;
}

function sweep() {
    const now = Date.now();
    for (const [token, data] of pending) {
        if (data.expiresAt < now) pending.delete(token);
    }
}

function parseCustomId(customId) {
    const [kind, action, token] = String(customId).split(':');
    return { kind, action, token };
}

/**
 * 依互動類型送出訊息：
 * - 斜線指令（已 defer）→ editReply
 * - 下拉選單 → update
 * - Modal 送出 → 以 ephemeral reply 建立新訊息
 */
function sendPrompt(interaction, payload) {
    if (typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand()) {
        return interaction.editReply(payload);
    }
    if (typeof interaction.isStringSelectMenu === 'function' && interaction.isStringSelectMenu()) {
        return interaction.update(payload);
    }
    return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

module.exports = {
    generateToken,
    createRow,
    createSelectRow,
    remember,
    peek,
    consume,
    parseCustomId,
    sendPrompt,
};
