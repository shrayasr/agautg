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

export default {
	async fetch(request, env, ctx) {
		if (new URL(request.url).pathname !== '/') {
			return new Response('Not Found', { status: 404 });
		}

		const [auValue, agValue] = await Promise.all([
			fetchQuoteValue('GOLDBEES'),
			fetchQuoteValue('SILVERBEES')
		]);

		const result = {
			au: auValue,
			ag: agValue
		};

		return new Response(JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	},
};
