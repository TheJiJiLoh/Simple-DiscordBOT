# Simple-DiscordBOT

這是一個基於 Discord.js v14 構建的簡單 Discord 機器人，支援斜線指令 (Slash Commands) 與自訂指令功能。
專案結構簡單，適合部署於 Render、Fly.io 或本地託管。

## ✨ 功能特色

*   **延遲監控**: 即時查看機器人與 Discord API 的延遲。
*   **自訂指令**: 允許使用者動態新增、移除簡單的關鍵字回覆指令。
*   **斜線指令**: 支援現代化的 Discord Slash Commands (`/`)。
*   **Web Server**: 內建 Express 伺服器，方便部署於 Render 等雲端平台並配合 UptimeRobot 防止休眠。
*   **防止超時**: 實作了 `deferReply` 機制，確保在網路延遲時不會出現 "Unknown interaction" 錯誤。

## 🛠️ 安裝與執行

### 1. 下載專案
```bash
git clone https://github.com/你的帳號/Simple-DiscordBOT.git
cd Simple-DiscordBOT
npm install
```

### 2. 設定環境變數
請在專案根目錄建立一個 `.env` 檔案，並填入以下資訊：

```env
DISCORD_TOKEN=你的機器人Token
CLIENT_ID=你的機器人Application_ID
GUILD_ID=測試用的伺服器ID (選填，若填寫則指令會立即在該伺服器生效)
```

### 3. 部署指令
在第一次啟動或新增指令後，需執行此命令向 Discord 註冊斜線指令：
```bash
node deploy-commands.js
```

### 4. 啟動機器人
```bash
npm start
# 或是 node index.js
```

## 📝 指令列表

### 斜線指令 (Slash Commands)
| 指令 | 說明 |
| :--- | :--- |
| `/ping` | 開始監控延遲 (每 5 秒更新一次數據) |
| `/stop` | 停止 Ping 監控 |
| `/commsg [名稱] [回應]` | 新增一個自訂指令 |
| `/rmcommsg [名稱]` | 移除一個自訂指令 |
| `/commsglist` | 列出目前所有的自訂指令 |
| `/help` | 顯示指令說明清單 |

### 文字指令 (Prefix Commands)
機器人也支援以 `!` 開頭的文字指令：
*   `!commsg [名稱] [回應]`
*   `!rmcommsg [名稱]`
*   `!commsglist`
*   `![自訂指令名稱]` (例如 `!hello`)

## ☁️ 部署到 Render

1.  將專案推送到 GitHub。
2.  在 Render 新增 Web Service。
3.  連結此 Repository。
4.  Build Command: `npm install`
5.  Start Command: `node index.js`
6.  在 Environment Variables 設定 `DISCORD_TOKEN` 和 `CLIENT_ID`。

## 📄 授權

本專案採用 [MIT License](LICENSE) 授權。
Copyright (c) 2026 JiJiLoh
