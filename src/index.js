async function fetchQuoteValue(symbol, retryCount = 0) {
	try {
		const yahooSymbol = `${symbol}.NS`;
		const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
		
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000);
		
		// Add delay between requests to avoid rate limiting
		if (retryCount > 0) {
			await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
		}
		
		const response = await fetch(yahooUrl, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'application/json',
				'Accept-Language': 'en-US,en;q=0.9',
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		});

		clearTimeout(timeoutId);

		if (response.status === 429 && retryCount < 3) {
			console.log(`Rate limited for ${symbol}, retrying in ${2 * (retryCount + 1)} seconds...`);
			return await fetchQuoteValue(symbol, retryCount + 1);
		}

		if (!response.ok) {
			return `ERR: HTTP ${response.status}`;
		}

		const data = await response.json();
		
		if (data.chart && data.chart.result && data.chart.result[0]) {
			const result = data.chart.result[0];
			if (result.meta && result.meta.regularMarketPrice) {
				return result.meta.regularMarketPrice.toString();
			}
			if (result.indicators && result.indicators.quote && result.indicators.quote[0]) {
				const quotes = result.indicators.quote[0];
				if (quotes.close && quotes.close.length > 0) {
					const lastPrice = quotes.close[quotes.close.length - 1];
					if (lastPrice !== null) {
						return lastPrice.toString();
					}
				}
			}
		}
		
		return 'ERR: Price not found';
	} catch (error) {
		if (error.name === 'AbortError') {
			return 'ERR: Request timeout';
		}
		return `ERR: ${error.message}`;
	}
}

async function sendTelegramMessage(botToken, chatId, message) {
	try {
		const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				chat_id: chatId,
				text: message,
				parse_mode: 'HTML'
			})
		});

		if (!response.ok) {
			console.error('Telegram API error:', response.status, await response.text());
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error sending Telegram message:', error);
		return false;
	}
}

async function getPricesAndSendTelegram(env) {
	// Fetch sequentially to avoid rate limiting
	const auValue = await fetchQuoteValue('GOLDBEES');
	await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
	const agValue = await fetchQuoteValue('SILVERBEES');

	// Calculate ratio (Gold / Silver)
	const goldPrice = parseFloat(auValue.replace(/[^\d.]/g, ''));
	const silverPrice = parseFloat(agValue.replace(/[^\d.]/g, ''));
	const ratio = goldPrice / silverPrice;

	console.log(`Gold: ${auValue}, Silver: ${agValue}, Ratio: ${ratio.toFixed(3)}`);

	// Check if ratio meets threshold conditions
	const shouldSendAlert = ratio <= 0.7 || ratio >= 0.8;

	if (shouldSendAlert) {
		const timestamp = new Date().toLocaleString('en-IN', {
			timeZone: 'Asia/Kolkata',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});

		let signal = '';
		let emoji = '';
		if (ratio <= 0.7) {
			signal = '🟢 BUY GOLD';
			emoji = '🥇';
		} else if (ratio >= 0.8) {
			signal = '🟢 BUY SILVER';
			emoji = '🥈';
		}

		const message = `<b>🚨 ${emoji} Trading Signal!</b>\n\n<b>${signal}</b>\n\n🥇 <a href="https://www.nseindia.com/get-quotes/equity?symbol=GOLDBEES">Gold (GOLDBEES)</a>: ₹${auValue}\n🥈 <a href="https://www.nseindia.com/get-quotes/equity?symbol=SILVERBEES">Silver (SILVERBEES)</a>: ₹${agValue}\n\n📊 <b>Ratio: ${ratio.toFixed(3)}</b>\n\n<i>Updated: ${timestamp}</i>`;

		if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
			await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, message);
		}
	} else {
		console.log(`Ratio ${ratio.toFixed(3)} is within threshold (0.7 < ratio < 0.8). No alert sent.`);
	}

	return { au: auValue, ag: agValue, ratio: ratio.toFixed(3) };
}

export default {
	async fetch(request, env, ctx) {
		const pathname = new URL(request.url).pathname;
		
		if (pathname === '/') {
			const result = await getPricesAndSendTelegram(env);
			return new Response(JSON.stringify(result), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}
		
		if (pathname === '/mycron') {
			await getPricesAndSendTelegram(env);
			return new Response('OK', {
				headers: {
					'Content-Type': 'text/plain',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}

		return new Response('Not Found', { status: 404 });
	},

	async scheduled(event, env, ctx) {
		await getPricesAndSendTelegram(env);
	}
};
