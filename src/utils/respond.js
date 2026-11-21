const { MessageFlags } = require('discord.js');

function ephemeral(options = {}) {
    return { ...options, flags: MessageFlags.Ephemeral };
}

/**
 * 依照互動狀態安全地回覆（已 defer 或已回覆時改用 followUp）。
 */
async function reply(interaction, options) {
    if (interaction.deferred || interaction.replied) {
        return interaction.followUp(options);
    }
    return interaction.reply(options);
}

async function replyError(interaction, content) {
    return reply(interaction, ephemeral({ content: `❌ ${content}` }));
}

async function replySuccess(interaction, content) {
    return reply(interaction, ephemeral({ content: `✅ ${content}` }));
}

module.exports = { ephemeral, reply, replyError, replySuccess };
