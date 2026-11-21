const fs = require('fs');
const path = require('path');

/**
 * 載入 src/events 底下所有事件模組。
 * 每個模組需匯出 { name, execute, once? }。
 */
function registerEvents(client) {
    const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js');

    for (const file of files) {
        const event = require(path.join(__dirname, file));

        if (!event?.name || typeof event.execute !== 'function') {
            console.warn(`略過無效的事件檔案: ${file}`);
            continue;
        }

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

module.exports = { registerEvents };
