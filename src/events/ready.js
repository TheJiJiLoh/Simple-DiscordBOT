const { Events, ActivityType } = require('discord.js');
const reminders = require('../utils/reminders');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`準備好了！已登入為 ${client.user.tag}`);
        console.log(`已載入 ${client.commands.size} 個斜線指令。`);

        client.user.setActivity('/help 查看指令', { type: ActivityType.Listening });
        reminders.init(client);
    },
};
