require('dotenv').config({ quiet: true });

const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./src/commands');
const { registerEvents } = require('./src/events');

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ 找不到 DISCORD_TOKEN，請複製 .env.example 為 .env 並填入 Token。');
    process.exit(1);
}

// === 健康檢查伺服器（Render 等平台會定期訪問） ===
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord Bot is running!');
});

const server = app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});
// =================================================

// === 建立 Discord Client ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// 載入指令與事件
client.commands = loadCommands();
registerEvents(client);

// 登入機器人
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ 機器人登入失敗，請檢查 DISCORD_TOKEN 是否正確:', error);
    process.exit(1);
});

// === 優雅關閉 ===
async function shutdown(signal) {
    console.log(`收到 ${signal}，正在關閉機器人...`);
    server.close();
    await client.destroy().catch(() => null);
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 避免程式因未捕捉的錯誤而崩潰
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});
