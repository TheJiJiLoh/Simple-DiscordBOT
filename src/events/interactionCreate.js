const { Events, MessageFlags } = require('discord.js');
const { parseCustomId, peek, consume } = require('../utils/confirm');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // 管理指令的「確認執行 / 取消」按鈕
        if (interaction.isButton()) {
            const { kind, token } = parseCustomId(interaction.customId);
            const data = peek(token);

            if (!data) {
                return interaction.reply({
                    content: '⚠️ 這個確認已過期，請重新執行指令。',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => null);
            }

            // 只有發起指令的管理員可以操作，避免其他人誤按
            if (interaction.user.id !== data.moderatorId) {
                return interaction.reply({
                    content: '❌ 只有執行指令的管理員可以操作這個確認。',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => null);
            }

            if (kind === 'cancel') {
                consume(token);
                return interaction.update({
                    content: '已取消。',
                    components: [],
                }).catch(() => null);
            }

            if (kind === 'confirm') {
                consume(token);
                try {
                    await data.run(interaction);
                } catch (error) {
                    console.error('執行確認操作時發生錯誤:', error);

                    const payload = { content: '❌ 執行時發生內部錯誤！', components: [] };
                    if (interaction.replied || interaction.deferred) {
                        return interaction.followUp({
                            ...payload,
                            flags: MessageFlags.Ephemeral,
                        }).catch(() => null);
                    }
                    return interaction.update(payload).catch(() => null);
                }
            }
            return;
        }

        // 管理指令的下拉選單（例如 /unban 選擇要解除封鎖的對象）
        if (interaction.isStringSelectMenu()) {
            const { kind, token } = parseCustomId(interaction.customId);
            if (kind !== 'pick') return;

            const data = peek(token);

            if (!data) {
                return interaction.reply({
                    content: '⚠️ 這個選擇已過期，請重新執行指令。',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => null);
            }

            if (interaction.user.id !== data.moderatorId) {
                return interaction.reply({
                    content: '❌ 只有執行指令的管理員可以操作這個選擇。',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => null);
            }

            try {
                await data.onPick(interaction, interaction.values[0]);
            } catch (error) {
                console.error('處理選擇時發生錯誤:', error);

                const payload = { content: '❌ 處理選擇時發生內部錯誤！', components: [] };
                if (interaction.replied || interaction.deferred) {
                    return interaction.followUp({
                        ...payload,
                        flags: MessageFlags.Ephemeral,
                    }).catch(() => null);
                }
                return interaction.update(payload).catch(() => null);
            }
            return;
        }

        // 管理指令的 Modal 送出（例如 /unban 填寫原因）
        if (interaction.isModalSubmit()) {
            const { kind, token } = parseCustomId(interaction.customId);
            if (kind !== 'reason') return;

            const data = peek(token);

            if (!data) {
                return interaction.reply({
                    content: '⚠️ 這個表單已過期，請重新執行指令。',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => null);
            }

            if (interaction.user.id !== data.moderatorId) {
                return interaction.reply({
                    content: '❌ 只有執行指令的管理員可以操作這個表單。',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => null);
            }

            const reason = interaction.fields.getTextInputValue('reason')?.trim() || '未提供原因';
            consume(token);

            try {
                await data.onModal(interaction, reason);
            } catch (error) {
                console.error('處理表單時發生錯誤:', error);

                return interaction.reply({
                    content: '❌ 處理表單時發生內部錯誤！',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => null);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.warn(`收到未知指令: /${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`執行 /${interaction.commandName} 時發生錯誤:`, error);

            const payload = {
                content: '❌ 執行指令時發生內部錯誤！',
                flags: MessageFlags.Ephemeral,
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp(payload).catch(() => null);
            } else {
                await interaction.reply(payload).catch(() => null);
            }
        }
    },
};
