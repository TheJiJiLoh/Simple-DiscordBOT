const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
	{
		name: 'ping',
		description: '開始即時監控延遲 (每 5 秒更新)',
	},
	{
		name: 'stop',
		description: '停止 Ping 監控',
	},
	{
		name: 'commsg',
		description: '新增自訂指令',
		options: [
			{
				name: 'name',
				description: '指令名稱 (例如: hello)',
				type: 3, // String
				required: true,
			},
			{
				name: 'response',
				description: '機器人回覆的內容',
				type: 3, // String
				required: true,
			},
		],
	},
	{
		name: 'commsglist',
		description: '列出所有自訂指令',
	},
	{
		name: 'rmcommsg',
		description: '移除自訂指令',
		options: [
			{
				name: 'name',
				description: '要移除的指令名稱',
				type: 3, // String
				required: true,
			},
		],
	},
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		const guildId = process.env.GUILD_ID;
		
		if (guildId) {
			console.log(`正在為伺服器 (ID: ${guildId}) 註冊指令... (立即生效)`);
			await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
				{ body: commands },
			);
			console.log('成功註冊伺服器專用指令！');
		} else {
			console.log('正在註冊全域指令... (可能需要一小時生效)');
			await rest.put(
				Routes.applicationCommands(process.env.CLIENT_ID),
				{ body: commands },
			);
			console.log('成功註冊全域指令！');
		}

	} catch (error) {
		console.error(error);
	}
})();
