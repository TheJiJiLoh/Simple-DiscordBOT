const { Events } = require('discord.js');
const customCommands = require('../utils/customCommands');
const pingMonitor = require('../utils/pingMonitor');
const { buildHelpEmbed, isAdminUser } = require('../utils/help');
const { buildCustomCommandEmbeds } = require('../utils/customCommandList');

const PREFIX = '!';

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.content.startsWith(PREFIX)) return;

        const input = message.content.slice(PREFIX.length).trim();
        if (!input) return;

        const [rawName, ...args] = input.split(/\s+/);
        const commandName = rawName.toLowerCase();

        try {
            switch (commandName) {
                case 'help': {
                    const isAdmin = isAdminUser(
                        message.author,
                        message.memberPermissions,
                        message.guild?.ownerId,
                    );
                    await message.reply({
                        embeds: [buildHelpEmbed(message.client, { isAdmin })],
                    });
                    return;
                }

                case 'ping': {
                    if (pingMonitor.isRunning(message.author.id)) {
                        await message.reply('你已經有一個正在執行的監控！請先輸入 `!stop` 停止它。');
                        return;
                    }

                    const sent = await message.reply('開始監控延遲...');
                    await pingMonitor.start({
                        userId: message.author.id,
                        client: message.client,
                        edit: content => sent.edit(content),
                    });
                    return;
                }

                case 'stop': {
                    const stopped = pingMonitor.stop(message.author.id);
                    await message.reply(stopped
                        ? '🛑 已停止 Ping 監控。'
                        : '目前沒有正在執行的監控喔！');
                    return;
                }

                case 'commsg': {
                    if (args.length < 2) {
                        await message.reply('格式錯誤！請輸入：`!commsg 指令名稱 回覆內容`\n例如：`!commsg hello 你好呀`');
                        return;
                    }

                    const name = args[0].toLowerCase();
                    const response = args.slice(1).join(' ');

                    if (!customCommands.isValidName(name)) {
                        await message.reply('指令名稱無效！只能包含小寫字母、數字、底線(_)和連字號(-)。');
                        return;
                    }

                    if (response.length > 1900) {
                        await message.reply('回覆內容太長了（最多 1900 字）。');
                        return;
                    }

                    const existed = customCommands.has(name);
                    customCommands.set(name, response);
                    await message.reply(`✅ ${existed ? '已更新' : '成功新增'}！輸入 \`!${name}\` 試試看！`);
                    return;
                }

                case 'commsglist': {
                    const all = customCommands.getAll();
                    if (Object.keys(all).length === 0) {
                        await message.reply('目前沒有任何自訂指令喔！');
                        return;
                    }

                    await message.reply({ embeds: buildCustomCommandEmbeds(all) });
                    return;
                }

                case 'rmcommsg': {
                    if (args.length < 1) {
                        await message.reply('格式錯誤！請輸入：`!rmcommsg 指令名稱`');
                        return;
                    }

                    const name = args[0].toLowerCase();
                    if (!customCommands.has(name)) {
                        await message.reply(`找不到指令 \`!${name}\`，無法移除。`);
                        return;
                    }

                    customCommands.remove(name);
                    await message.reply(`🗑️ 已成功移除指令 \`!${name}\`。`);
                    return;
                }

                default: {
                    const response = customCommands.get(commandName);
                    if (response) await message.reply(response);
                }
            }
        } catch (error) {
            console.error('處理文字指令時發生錯誤:', error);
            await message.reply('❌ 執行指令時發生內部錯誤！').catch(() => null);
        }
    },
};
