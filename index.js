// 引入必要的 discord.js 類別
const { Client, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
// 引入 fs 以讀寫檔案
const fs = require('fs');
// 引入 express 建立健康檢查伺服器
const express = require('express');
// 引入 dotenv 以讀取 .env 檔案中的 Token
require('dotenv').config();

// === 建立一個簡單的 Web Server 給 Render 檢查 ===
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord Bot is running!');
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});
// ============================================

// 載入自訂指令資料
let customCommands = {};
try {
    const data = fs.readFileSync('./customCommands.json', 'utf8');
    customCommands = JSON.parse(data);
} catch (err) {
    console.error('讀取自訂指令失敗或檔案為空，將使用空物件初始化。');
}

// 建立一個新的 Client 實例 (機器人本體)
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds, // 讓機器人能讀取伺服器基本資訊
		GatewayIntentBits.GuildMessages, // 讓機器人能讀取訊息 (如果需要)
		GatewayIntentBits.MessageContent // 讀取訊息內容 (需要去 Developer Portal 開啟 Intent)
	],
});

// 建立一個 Map 來儲存每個使用者的計時器 (Key: UserId, Value: IntervalId)
const pingIntervals = new Map();

// 當機器人成功登入並準備好時，執行一次
client.once(Events.ClientReady, readyClient => {
	console.log(`準備好了！已登入為 ${readyClient.user.tag}`);
});

// 監聽互動事件 (斜線指令)
client.on(Events.InteractionCreate, async interaction => {
	// 如果這不是一個指令互動，就忽略
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

    try {
        // === 處理 /ping 指令 ===
        if (commandName === 'ping') {
            // 先告訴 Discord 我們收到了，請稍等 (避免 3 秒超時)
            await interaction.deferReply();

            // 檢查是否已經在執行
            if (pingIntervals.has(interaction.user.id)) {
                return interaction.editReply({ content: '你已經有一個正在執行的監控！請先輸入 `/stop` 停止它。' }); // 注意這裡不用 ephemeral，因為 deferReply 預設是公开的，除非 defer 時指定
            }

            // 發送初始訊息
            await interaction.editReply({ content: '開始監控延遲... (每 5 秒更新)' });

            // 變數用來儲存上一次測量的機器人延遲
            let lastRoundtrip = 0;

            // 定義更新函式
            const updatePing = async () => {
                try {
                    const startTimestamp = Date.now(); // 記錄開始編輯的時間
                    const apiPing = Math.round(client.ws.ping);
                    const timestamp = new Date().toLocaleTimeString('zh-TW', { 
                        timeZone: 'Asia/Taipei', 
                        hour12: false 
                    });
                    
                    // 編輯訊息，顯示上一次測量的機器人延遲 (如果是第一次則顯示 "計算中...")
                    const robotLatencyText = lastRoundtrip === 0 ? "計算中..." : `${lastRoundtrip}ms`;

                    await interaction.editReply(
                        `Pong! 🏓 (即時更新中)\n` +
                        `API 延遲: **${apiPing}ms**\n` +
                        `機器人延遲: **${robotLatencyText}**\n` +
                        `最後更新: ${timestamp}\n` +
                        `輸入 \`/stop\` 來停止。`
                    );

                    // 計算這次編輯花費的時間，供下次顯示
                    lastRoundtrip = Date.now() - startTimestamp;

                } catch (error) {
                    // 如果訊息被刪除或出錯，清除計時器
                    const intervalId = pingIntervals.get(interaction.user.id);
                    if (intervalId) clearInterval(intervalId);
                    pingIntervals.delete(interaction.user.id);
                }
            };

            // 立即執行一次，然後設定每 5 秒執行一次
            await updatePing();
            const interval = setInterval(updatePing, 5000);

            // 儲存計時器 ID
            pingIntervals.set(interaction.user.id, interval);
            return;
        }

        // === 處理 /stop 指令 ===
        if (commandName === 'stop') {
             await interaction.deferReply();
            const interval = pingIntervals.get(interaction.user.id);

            if (interval) {
                clearInterval(interval); // 停止計時器
                pingIntervals.delete(interaction.user.id); // 從 Map 中移除
                await interaction.editReply('🛑 已停止 Ping 監控。');
            } else {
                await interaction.editReply({ content: '目前沒有正在執行的監控喔！' });
            }
            return;
        }

        // === 處理 /commsg 指令 (新增自訂指令) ===
        if (commandName === 'commsg') {
            await interaction.deferReply();
            const name = interaction.options.getString('name').toLowerCase();
            const response = interaction.options.getString('response');

            // 簡單驗證：指令名稱必須符合 Discord 規範 (小寫字母、數字、-、_)
            if (!/^[\w-]+$/.test(name)) {
                return interaction.editReply({ content: '指令名稱無效！只能包含小寫字母、數字、底線(_)和連字號(-)。' });
            }

            // 儲存到記憶體
            customCommands[name] = response;

            // 儲存到檔案
            fs.writeFileSync('./customCommands.json', JSON.stringify(customCommands, null, 2));

            await interaction.editReply(`✅ 成功新增指令！請輸入 \`!${name}\` 來測試，機器人將會回覆：${response}`);
            return;
        }

        // === 處理 /commsglist 指令 (列出所有指令) ===
        if (commandName === 'commsglist') {
            await interaction.deferReply({ ephemeral: true }); // 這個列表可能很長，且是給個人看的，設為隱藏
            const commandList = Object.keys(customCommands);

            if (commandList.length === 0) {
                return interaction.editReply('目前沒有任何自訂指令喔！試試看 `/commsg` 新增一個吧。');
            }

            // 格式化輸出
            const description = commandList.map(name => `**!${name}** -> ${customCommands[name]}`).join('\n');

            return interaction.editReply({
                content: `📋 **目前已有的自訂指令列表：**\n\n${description}`
            });
        }

        // === 處理 /rmcommsg 指令 (移除自訂指令) ===
        if (commandName === 'rmcommsg') {
            await interaction.deferReply();
            const name = interaction.options.getString('name').toLowerCase();

            if (!customCommands[name]) {
                return interaction.editReply({ content: `找不到指令 \`!${name}\`，無法移除。` });
            }

            delete customCommands[name];
            fs.writeFileSync('./customCommands.json', JSON.stringify(customCommands, null, 2));

            await interaction.editReply(`🗑️ 已成功移除指令 \`!${name}\`。`);
            return;
        }

        // === 處理 /help 指令 (顯示指令說明) ===
        if (commandName === 'help') {
             await interaction.deferReply({ ephemeral: true }); // 說明選單設為隱藏
            const helpMessage = 
                `📚 **指令說明清單**\n\n` +
                `**/ping** - 開始監控延遲 (機器人與 API)\n` +
                `**/stop** - 停止 Ping 監控\n` +
                `**/commsg [名稱] [回應]** - 新增自訂指令 (例如：\`/commsg hello 你好\`) \n` +
                `**/rmcommsg [名稱]** - 移除自訂指令\n` +
                `**/commsglist** - 列出目前所有的自訂指令\n` +
                `**/help** - 顯示此說明清單\n\n` +
                `💡 *提示：你也可以使用 \`!commsg\`、\`!rmcommsg\` 和 \`!commsglist\` 等文字指令喔！*`;

            return interaction.editReply({ content: helpMessage });
        }
    } catch (error) {
        console.error(`執行指令 ${commandName} 時發生錯誤:`, error);
        // 如果已經 defer 過了，要用 editReply，否則用 reply
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: '執行指令時發生內部錯誤！', ephemeral: true }).catch(console.error);
        } else {
            await interaction.reply({ content: '執行指令時發生內部錯誤！', ephemeral: true }).catch(console.error);
        }
    }
});

// 監聽訊息事件 (處理 !xxx 自訂指令)
client.on(Events.MessageCreate, async message => {
    // 忽略機器人訊息
    if (message.author.bot) return;

    // 檢查是否以 ! 開頭
    if (!message.content.startsWith('!')) return;

    // 取得指令名稱 (移除 ! 並轉小寫)
    // 例如 "!Hello world" -> "hello"
    const commandName = message.content.slice(1).split(' ')[0].toLowerCase();

    // === 處理 !commsg (新增指令) ===
    if (commandName === 'commsg') {
        const args = message.content.slice(1).split(' ');
        // args[0] is '!commsg'
        // args[1] is name
        // args[2...] is response
        
        if (args.length < 3) {
            return message.reply('格式錯誤！請輸入：`!commsg 指令名稱 回覆內容`\n例如：`!commsg hello 你好呀`');
        }

        const newName = args[1].toLowerCase();
        const response = args.slice(2).join(' ');

        // 簡單驗證名稱
        if (!/^[\w-]+$/.test(newName)) {
             return message.reply('指令名稱只能包含英數字、底線或連字號喔！');
        }

        customCommands[newName] = response;
        fs.writeFileSync('./customCommands.json', JSON.stringify(customCommands, null, 2));

        return message.reply(`✅ 成功新增！輸入 \`!${newName}\` 試試看！`);
    }

    // === 處理 !commsglist 指令 (列出所有指令 - 文字版) ===
    if (commandName === 'commsglist') {
        const commandList = Object.keys(customCommands);

        if (commandList.length === 0) {
            return message.reply('目前沒有任何自訂指令喔！');
        }

        const description = commandList.map(name => `**!${name}** -> ${customCommands[name]}`).join('\n');
        return message.reply(`📋 **目前已有的自訂指令列表：**\n\n${description}`);
    }

    // === 處理 !rmcommsg (移除指令) ===
    if (commandName === 'rmcommsg') {
        const args = message.content.slice(1).split(' ');
        if (args.length < 2) {
             return message.reply('格式錯誤！請輸入：`!rmcommsg 指令名稱`');
        }

        const nameToDelete = args[1].toLowerCase();

        if (!customCommands[nameToDelete]) {
            return message.reply(`找不到指令 \`!${nameToDelete}\`，無法移除。`);
        }

        delete customCommands[nameToDelete];
        fs.writeFileSync('./customCommands.json', JSON.stringify(customCommands, null, 2));

        return message.reply(`🗑️ 已成功移除指令 \`!${nameToDelete}\`。`);
    }

    // 檢查是否有這個自訂指令
    if (customCommands[commandName]) {
        await message.reply(customCommands[commandName]);
    }
});

// 避免程式因未捕捉的錯誤而崩潰
process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// 登入機器人 (從 .env 檔案讀取 Token)
client.login(process.env.DISCORD_TOKEN);
