require('dotenv').config({ quiet: true });

const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./src/commands');

async function main() {
    const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

    if (!DISCORD_TOKEN || !CLIENT_ID) {
        console.error('❌ 請先在 .env 設定 DISCORD_TOKEN 與 CLIENT_ID。');
        process.exitCode = 1;
        return;
    }

    const commands = [...loadCommands().values()].map(command => command.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        if (GUILD_ID) {
            console.log(`正在為伺服器 (ID: ${GUILD_ID}) 註冊 ${commands.length} 個指令...（立即生效）`);
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log('✅ 成功註冊伺服器專用指令！');
        } else {
            console.log(`正在註冊 ${commands.length} 個全域指令...（可能需要一小時生效）`);
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('✅ 成功註冊全域指令！');
        }
    } catch (error) {
        console.error('❌ 註冊指令失敗:', error);
        process.exitCode = 1;
    }
}

main();
