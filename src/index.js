async function fetchQuoteValue(symbol) {
	try {
		const yahooSymbol = `${symbol}.NS`;
		const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
		
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);
		
		const response = await fetch(yahooUrl, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'application/json'
			}
		});

		clearTimeout(timeoutId);

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
	const [auValue, agValue] = await Promise.all([
		fetchQuoteValue('GOLDBEES'),
		fetchQuoteValue('SILVERBEES')
	]);

	const timestamp = new Date().toLocaleString('en-IN', {
		timeZone: 'Asia/Kolkata',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	const message = `<b>🥇 Gold & Silver Prices</b>\n\n🥇 Gold (GOLDBEES): ₹${auValue}\n🥈 Silver (SILVERBEES): ₹${agValue}\n\n<i>Updated: ${timestamp}</i>`;

	if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
		await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, message);
	}

	return { au: auValue, ag: agValue };
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
			return new Response('Telegram message sent!', {
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
