const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const CATEGORY_ORDER = ['一般', '自訂指令', '實用工具', '管理工具'];
const ADMIN_PERMISSIONS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageMessages,
];

/**
 * 判斷是否為管理員：伺服器擁有者或具備任一管理相關權限。
 */
function isAdminUser(user, memberPermissions, ownerId) {
    if (ownerId && user?.id === ownerId) return true;
    if (!memberPermissions) return false;
    return ADMIN_PERMISSIONS.some(permission => permission && memberPermissions.has(permission));
}

function formatUsage(command) {
    const json = command.data.toJSON();
    const options = (json.options ?? []).map(option => (
        option.required ? `<${option.name}>` : `[${option.name}]`
    ));

    return `/${json.name}${options.length ? ` ${options.join(' ')}` : ''}`;
}

/**
 * 判斷是否為管理員專用指令（有 default_member_permissions 或歸類在管理工具）。
 */
function isAdminCommand(command) {
    const json = command.data.toJSON();
    return command.category === '管理工具' || Boolean(json.default_member_permissions);
}

/**
 * @param {object} client Discord client（需有 client.commands）
 * @param {object} [options] { isAdmin: boolean } 是否顯示管理員專用指令
 */
function buildHelpEmbed(client, { isAdmin = false } = {}) {
    const embed = new EmbedBuilder()
        .setTitle(isAdmin ? '📚 指令說明清單（管理員）' : '📚 指令說明清單')
        .setColor(isAdmin ? 0xfaa61a : 0x5865f2)
        .setFooter({
            text: isAdmin
                ? '👑 管理員視圖：包含管理專用指令。文字指令：!help、!ping、!stop、!commsg、!commsglist、!rmcommsg'
                : '也支援文字指令：!help、!ping、!stop、!commsg、!commsglist、!rmcommsg',
        });

    if (isAdmin) {
        embed.setDescription('以下是全部指令，包含僅管理員可用的功能。');
    } else {
        embed.setDescription('管理專用指令已隱藏；需要「管理訊息 / 管理成員 / 封鎖成員」等權限才會顯示。');
    }

    const groups = new Map();

    for (const command of client.commands.values()) {
        if (!isAdmin && isAdminCommand(command)) continue;

        const category = command.category ?? '其他';
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(command);
    }

    const categories = [...groups.keys()].sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a);
        const indexB = CATEGORY_ORDER.indexOf(b);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    for (const category of categories) {
        const commands = groups.get(category)
            .sort((a, b) => a.data.name.localeCompare(b.data.name));

        let value = commands
            .map(command => `**${formatUsage(command)}**\n${command.data.description}`)
            .join('\n');

        if (value.length > 1024) {
            value = `${value.slice(0, 1021)}...`;
        }

        embed.addFields({ name: category, value });
    }

    return embed;
}

module.exports = { buildHelpEmbed, formatUsage, isAdminCommand, isAdminUser };
