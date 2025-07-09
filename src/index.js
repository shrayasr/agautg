async function fetchQuoteValue(symbol) {
	try {
		const url = `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`;
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
			}
		});

		if (!response.ok) {
			return `ERR: HTTP ${response.status}`;
		}

		const html = await response.text();
		const match = html.match(/<span[^>]*id="quoteLtp"[^>]*>([\d,\.]+)<\/span>/);
		
		if (!match) {
			return 'ERR: quoteLtp span not found';
		}

		return match[1];
	} catch (error) {
		return `ERR: ${error.message}`;
	}
}

export default {
	async fetch(request, env, ctx) {
		if (new URL(request.url).pathname !== '/') {
			return new Response('Not Found', { status: 404 });
		}

		console.log("Getting values");

		const [auValue, agValue] = await Promise.all([
			fetchQuoteValue('GOLDBEES'),
			fetchQuoteValue('SILVERBEES')
		]);

		console.log("Got values");

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
