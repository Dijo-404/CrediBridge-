interface FxCache {
	rate: number;
	fetchedAt: number;
	source: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache: FxCache | null = null;

export async function getUsdToInrRate(): Promise<FxCache> {
	if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
		return _cache;
	}

	const apiUrl =
		process.env.FX_API_URL ??
		'https://api.frankfurter.app/latest?from=USD&to=INR';

	try {
		const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) throw new Error(`FX API returned ${res.status}`);
		const json = (await res.json()) as { rates?: { INR?: number } };
		const rate = json.rates?.INR;
		if (!rate || !Number.isFinite(rate)) {
			throw new Error('Invalid rate in FX API response');
		}
		_cache = { rate, fetchedAt: Date.now(), source: 'frankfurter' };
		return _cache;
	} catch (err) {
		if (_cache) {
			console.warn('[fx] FX API failed, using cached rate:', (err as Error).message);
			return _cache;
		}
		console.warn('[fx] FX API failed, using fallback 83.5:', (err as Error).message);
		return { rate: 83.5, fetchedAt: Date.now(), source: 'fallback' };
	}
}
