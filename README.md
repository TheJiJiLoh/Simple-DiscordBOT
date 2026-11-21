# Simple-DiscordBOT

一個以 [discord.js v14](https://discord.js.org/) 打造的 Discord 機器人，支援斜線指令與 `!` 文字指令，並包含自訂指令、實用工具與管理功能。程式碼已重構成可擴充的模組化架構，之後要新增指令只需要在 `src/commands/` 放一個檔案即可。

## 功能特色

- **斜線指令 + 文字指令**：`/ping` 與 `!ping` 都能使用。
- **即時延遲監控**：每 5 秒更新 API 延遲與機器人延遲。
- **自訂指令**：用 `/commsg` 新增 `!hello` 之類的回覆指令，資料會持久化。
- **實用工具**：投票、定時提醒、伺服器資訊、使用者資訊。
- **管理工具**：清除訊息、警告系統、禁言、踢出、封鎖／解除封鎖。
- **管理紀錄**：設定 `MOD_LOG_CHANNEL_ID` 後，管理操作會自動記錄到指定頻道。
- **健康檢查端點**：內建 Express 伺服器，方便部署到 Render 等平台。
- **模組化架構**：指令、事件、工具各自分離，易於維護與擴充。

## 專案結構

```text
.
├── index.js                 # 程式入口：Express 健康檢查 + Discord Client
├── deploy-commands.js       # 註冊斜線指令
├── data/                    # 持久化資料（自訂指令、警告、提醒）
│   ├── customCommands.json
│   ├── warnings.json
│   └── reminders.json
├── src/
│   ├── commands/            # 每個檔案就是一個斜線指令
│   │   ├── index.js         # 指令載入器
│   │   ├── ping.js
│   │   ├── poll.js
│   │   ├── kick.js
│   │   └── ...
│   ├── events/              # Discord 事件
│   │   ├── index.js         # 事件載入器
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── messageCreate.js
│   └── utils/               # 共用工具
│       ├── store.js         # JSON 讀寫與舊資料遷移
│       ├── customCommands.js
│       ├── warnings.js
│       ├── reminders.js
│       ├── pingMonitor.js
│       ├── duration.js
│       ├── permissions.js
│       ├── modlog.js
│       └── ...
├── .env.example
└── package.json
```

## 快速開始

### 1. 安裝環境

需要 **Node.js 18 以上**（建議 20 或 22）。

```bash
npm install
```

### 2. 建立 `.env`

```powershell
Copy-Item .env.example .env
```

打開 `.env` 填入以下資料：

| 變數 | 必填 | 說明 |
| --- | --- | --- |
| `DISCORD_TOKEN` | ✅ | Discord Developer Portal → Bot → Reset Token |
| `CLIENT_ID` | ✅ | Developer Portal → General Information → Application ID |
| `GUILD_ID` | 建議 | 填入測試伺服器 ID，指令會立即生效；留空則註冊為全域指令（最多等 1 小時） |
| `PORT` | ❌ | Web 伺服器埠號，預設 `3000` |
| `MOD_LOG_CHANNEL_ID` | ❌ | 管理紀錄頻道 ID，設定後會記錄管理操作 |

### 3. 設定 Discord 應用程式

1. 到 [Discord Developer Portal](https://discord.com/developers/applications) 建立應用程式。
2. 在 **Bot** 頁面取得 Token，並開啟 **Message Content Intent**（`!` 文字指令需要）。
3. 在 **OAuth2 → URL Generator** 勾選：
   - Scopes：`bot`、`applications.commands`
   - Bot Permissions：`Send Messages`、`Embed Links`、`Read Message History`、`Add Reactions`、`Manage Messages`、`Kick Members`、`Ban Members`、`Moderate Members`
4. 使用產生的連結把機器人邀請到伺服器。

> 機器人的身分組位階必須高於要管理的成員，否則踢出、禁言、封鎖等操作會失敗。

### 4. 註冊斜線指令

```bash
npm run deploy
```

### 5. 啟動機器人

```bash
npm start
```

開發時可以使用自動重啟：

```bash
npm run dev
```

啟動後終端機會顯示 `Web server listening on port 3000` 與 `準備好了！已登入為 ...`。

## 指令列表

### 一般

| 指令 | 說明 |
| --- | --- |
| `/ping` | 開始即時監控延遲（每 5 秒更新） |
| `/stop` | 停止 Ping 監控 |
| `/help` | 顯示指令說明（僅自己可見；管理員會額外看到管理專用指令） |

### 自訂指令

| 指令 | 說明 |
| --- | --- |
| `/commsg <name> <response>` | 新增或更新自訂指令 |
| `/commsglist` | 列出所有自訂指令 |
| `/rmcommsg <name>` | 移除自訂指令 |

新增後即可用 `!名稱` 觸發，例如：

```text
/commsg name:hello response:你好呀
!hello
```

### 實用工具

| 指令 | 說明 |
| --- | --- |
| `/poll <question> <option1> <option2> [option3] [option4] [option5]` | 建立表情符號投票 |
| `/remind <duration> <message>` | 設定定時提醒，例如 `10m`、`1h30m`、`2d`（最長 30 天） |
| `/serverinfo` | 顯示伺服器資訊 |
| `/userinfo [user]` | 顯示使用者資訊 |

### 管理工具

| 指令 | 所需權限 | 說明 |
| --- | --- | --- |
| `/clear <amount> [user]` | 管理訊息 | 批次刪除最多 100 則訊息（Discord 限制：無法刪除超過 14 天的訊息） |
| `/warn [user] [reason]` | 管理成員 | 指定成員時發出警告；不給參數則顯示全伺服器警告總覽 |
| `/warnings [user]` | 管理成員 | 查看警告紀錄；不給成員則顯示全部人的警告 |
| `/rmwarn <user> [id] [reason]` | 管理成員 | 移除警告；不給編號會列出該成員的警告清單讓你選擇 |
| `/timeout <user> <duration> [reason]` | 管理成員 | 暫時禁言，最長 28 天 |
| `/untimeout <user> [reason]` | 管理成員 | 解除成員的禁言 |
| `/kick <user> [reason]` | 踢出成員 | 踢出成員 |
| `/ban <user> [delete_days] [reason]` | 封鎖成員 | 封鎖使用者，可同時刪除最近 0–7 天訊息 |
| `/unban [user_id] [reason]` | 封鎖成員 | 解除封鎖；不給 ID 會列出封鎖清單讓你選擇 |

### 文字指令

| 指令 | 說明 |
| --- | --- |
| `!help` | 顯示指令說明 |
| `!ping` | 開始即時延遲監控 |
| `!stop` | 停止延遲監控 |
| `!commsg <名稱> <回覆>` | 新增或更新自訂指令 |
| `!commsglist` | 列出自訂指令 |
| `!rmcommsg <名稱>` | 移除自訂指令 |
| `!<自訂名稱>` | 觸發自訂指令 |

## 資料保存

- 自訂指令、警告與提醒分別保存在 `data/customCommands.json`、`data/warnings.json`、`data/reminders.json`。
- 寫入採用「暫存檔 + 改名」方式，降低檔案損壞風險。
- 舊版放在根目錄的 `customCommands.json` 會在啟動時自動遷移到 `data/`。
- **Render 免費方案沒有持久化磁碟**，重新部署後 `data/` 會重置。若需要長期保存，請掛載 Persistent Disk，或把資料改存到外部資料庫。

## 部署到 Render

1. 將專案推送到 GitHub。
2. 在 Render 建立 **Web Service**，連接此儲存庫。
3. 設定：
   - Build Command：`npm install`
   - Start Command：`npm start`
   - Health Check Path：`/`
4. 在 **Environment** 加入 `DISCORD_TOKEN`、`CLIENT_ID`、`GUILD_ID`（選填）、`MOD_LOG_CHANNEL_ID`（選填）。
5. 部署完成後，在本機或 Render Shell 執行 `npm run deploy` 註冊指令。

> 若使用免費方案，建議把 `GUILD_ID` 設為測試伺服器，指令更新才會立即生效。

## 新增指令

在 `src/commands/` 新增一個檔案，匯出 `data`、`execute` 與選填的 `category`：

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    category: '實用工具',
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('打招呼'),
    async execute(interaction) {
        await interaction.reply('Hello!');
    },
};
```

重新啟動後指令會自動載入；別忘了執行 `npm run deploy` 讓 Discord 知道新指令。

## 疑難排解

- **斜線指令沒出現**：確認已執行 `npm run deploy`，且 `CLIENT_ID` 正確。使用 `GUILD_ID` 時指令會立即更新；全域指令最多需要 1 小時。
- **`!` 指令沒有反應**：確認已在 Developer Portal 開啟 **Message Content Intent**。
- **機器人上線但無法執行動作**：檢查機器人權限與身分組位階是否高於目標成員。
- **登入失敗**：確認 `DISCORD_TOKEN` 沒有過期，且 `.env` 放在專案根目錄。

## 授權

本專案採用 [MIT License](LICENSE)。
