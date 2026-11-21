/**
 * 檢查互動者是否能對目標成員執行管理操作。
 * 回傳 { ok: true } 或 { ok: false, reason: string }。
 */
function canModerate(interaction, targetMember) {
    if (!targetMember) return { ok: true };

    const { guild, member, client } = interaction;

    if (targetMember.id === guild.ownerId) {
        return { ok: false, reason: '無法對伺服器擁有者執行此操作。' };
    }
    if (targetMember.id === interaction.user.id) {
        return { ok: false, reason: '無法對自己執行此操作。' };
    }
    if (targetMember.id === client.user.id) {
        return { ok: false, reason: '無法對機器人自己執行此操作。' };
    }

    if (member.id !== guild.ownerId
        && member.roles.highest.position <= targetMember.roles.highest.position) {
        return { ok: false, reason: '你的身分組位階必須高於對方。' };
    }

    const me = guild.members.me;
    if (me && me.roles.highest.position <= targetMember.roles.highest.position) {
        return { ok: false, reason: '我的身分組位階低於對方，無法執行此操作。' };
    }

    return { ok: true };
}

module.exports = { canModerate };
