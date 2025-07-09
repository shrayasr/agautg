# Gold & Silver Price Alert Worker

A Cloudflare Worker that monitors gold and silver ETF prices from NSE India and sends trading signals via Telegram based on the gold/silver ratio.

## Features

- 🥇 Fetches real-time prices for GOLDBEES and SILVERBEES ETFs
- 📊 Calculates gold/silver ratio
- 🚨 Sends Telegram alerts when ratio hits trading thresholds
- ⏰ Scheduled monitoring via Cloudflare Cron Triggers
- 🔐 Secure API key authentication
- 🔄 Rate limiting and retry logic for reliable data fetching

## Trading Logic

- **Ratio ≤ 0.7**: 🟢 BUY GOLD signal
- **Ratio ≥ 0.8**: 🟢 BUY SILVER signal
- **0.7 < Ratio < 0.8**: No alert (within normal range)

## Setup

### 1. Telegram Bot Setup

1. Create a new bot via [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Save the bot token (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Send a message to your bot
5. Get your chat ID from: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`

### 2. Environment Variables

Set the following secrets using Wrangler:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put API_KEY
```

### 3. Deploy

```bash
npm install
npm run deploy
```

## Usage

### Manual Check
Access the worker with your API key:
```
https://your-worker.workers.dev/?key=your_secret_key
```

Response format:
```json
{
  "au": "45.67",
  "ag": "78.90",
  "ratio": "0.578"
}
```

### Scheduled Monitoring
The worker automatically runs daily at 4:30 UTC (10:00 AM IST) via Cloudflare Cron Triggers.

## Telegram Message Format

### Trading Signal Example
```
🚨 🥇 Trading Signal!

🟢 BUY GOLD

🥇 Gold (GOLDBEES): ₹45.67
🥈 Silver (SILVERBEES): ₹78.90

📊 Ratio: 0.578

Updated: 09/07/2025, 10:00
```

## Configuration

### Cron Schedule
Configured in `wrangler.jsonc`:
```json
"triggers": {
  "crons": ["30 4 * * *"]
}
```

### Rate Limiting
- Sequential API calls with 1-second delay
- Automatic retry with exponential backoff
- Up to 3 retry attempts for failed requests

## Error Handling

The worker handles various error scenarios:
- API rate limiting (HTTP 429)
- Network timeouts
- Invalid price data
- Missing environment variables

Errors are logged to console and returned in the format:
```json
{
  "au": "ERR: Request timeout",
  "ag": "ERR: HTTP 429",
  "ratio": "1.000"
}
```

## Development

### Local Testing
```bash
npm run dev
```

### View Logs
```bash
wrangler tail
```

## Security

- API key authentication required for manual access
- Telegram bot tokens stored as encrypted secrets
- No sensitive data logged or exposed

## Data Sources

- **Gold (GOLDBEES)**: Yahoo Finance API for `GOLDBEES.NS`
- **Silver (SILVERBEES)**: Yahoo Finance API for `SILVERBEES.NS`
- **NSE Links**: Direct links to NSE India quote pages

## License

MIT