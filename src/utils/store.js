const fs = require('fs');
const path = require('path');

// 所有持久化資料都放在專案根目錄的 data/ 底下
const dataDir = path.join(__dirname, '..', '..', 'data');

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function getFilePath(name) {
    return path.join(dataDir, `${name}.json`);
}

/**
 * 讀取 JSON 資料檔，檔案不存在或格式錯誤時回傳 fallback。
 */
function readJson(name, fallback = {}) {
    try {
        const raw = fs.readFileSync(getFilePath(name), 'utf8');
        if (!raw.trim()) return fallback;
        return JSON.parse(raw);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`讀取資料檔 data/${name}.json 失敗:`, error);
        }
        return fallback;
    }
}

/**
 * 以「先寫暫存檔再改名」的方式寫入，避免寫到一半損壞資料。
 */
function writeJson(name, data) {
    ensureDataDir();
    const target = getFilePath(name);
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2));
    fs.renameSync(temp, target);
}

/**
 * 將舊版放在專案根目錄的資料檔搬進 data/（僅在 data/ 沒有資料時執行）。
 */
function isEmpty(value) {
    if (Array.isArray(value)) return value.length === 0;
    if (value && typeof value === 'object') return Object.keys(value).length === 0;
    return true;
}

function migrateLegacyFile(legacyPath, name) {
    try {
        if (!fs.existsSync(legacyPath)) return;

        const existing = readJson(name, null);
        if (existing !== null && !isEmpty(existing)) return;

        const raw = fs.readFileSync(legacyPath, 'utf8');
        if (!raw.trim()) return;

        const legacyData = JSON.parse(raw);
        if (isEmpty(legacyData)) return;

        writeJson(name, legacyData);
        console.log(`已將舊資料 ${path.basename(legacyPath)} 遷移到 data/${name}.json`);
    } catch (error) {
        console.error(`遷移舊資料 ${path.basename(legacyPath)} 失敗:`, error);
    }
}

module.exports = { readJson, writeJson, migrateLegacyFile, dataDir };
