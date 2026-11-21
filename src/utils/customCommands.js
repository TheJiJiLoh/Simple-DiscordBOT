const path = require('path');
const store = require('./store');

const LEGACY_FILE = path.join(__dirname, '..', '..', 'customCommands.json');
store.migrateLegacyFile(LEGACY_FILE, 'customCommands');

let commands = store.readJson('customCommands', {});
if (!commands || typeof commands !== 'object' || Array.isArray(commands)) {
    console.warn('data/customCommands.json 格式不正確，已重置為空物件。');
    commands = {};
}

// 避免自訂指令覆蓋內建文字指令，或造成原型鏈污染
const RESERVED_NAMES = new Set([
    '__proto__',
    'prototype',
    'constructor',
    'help',
    'ping',
    'stop',
    'commsg',
    'commsglist',
    'rmcommsg',
]);

function isValidName(name) {
    return typeof name === 'string'
        && /^[a-z0-9_-]{1,32}$/.test(name)
        && !RESERVED_NAMES.has(name);
}

function getAll() {
    return { ...commands };
}

function get(name) {
    return Object.prototype.hasOwnProperty.call(commands, name) ? commands[name] : undefined;
}

function has(name) {
    return Object.prototype.hasOwnProperty.call(commands, name);
}

function set(name, response) {
    commands[name] = response;
    save();
}

function remove(name) {
    if (!has(name)) return false;
    delete commands[name];
    save();
    return true;
}

function save() {
    store.writeJson('customCommands', commands);
}

module.exports = { isValidName, getAll, get, has, set, remove };
