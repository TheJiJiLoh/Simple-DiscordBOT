const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

/**
 * 載入 src/commands 底下所有指令模組。
 * 每個模組需匯出 { data, execute, category? }。
 */
function loadCommands() {
    const commands = new Collection();
    const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js');

    for (const file of files) {
        const command = require(path.join(__dirname, file));

        if (!command?.data || typeof command.execute !== 'function') {
            console.warn(`略過無效的指令檔案: ${file}`);
            continue;
        }

        commands.set(command.data.name, command);
    }

    return commands;
}

module.exports = { loadCommands };
