const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60_000;
const STALE_CACHE_TTL_MS = 10 * 60_000;

let cachedPrice: { value: number; fetchedAt: number } | null = null;

const PRICE_SOURCES: { name: string; url: string; parse: (data: any) => number }[] = [
  {
    name: "kraken",
    url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    parse: (data) => parseFloat(Object.values<any>(data?.result ?? {})[0]?.c?.[0]),
  },
  {
    name: "bitstamp",
    url: "https://www.bitstamp.net/api/v2/ticker/btcusd/",
    parse: (data) => parseFloat(data?.last),
  },
  {
    name: "coinbase",
    url: "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    parse: (data) => parseFloat(data?.data?.amount),
  },
  {
    name: "gemini",
    url: "https://api.gemini.com/v1/pubticker/btcusd",
    parse: (data) => parseFloat(data?.last),
  },
  {
    name: "blockchain.info",
    url: "https://blockchain.info/ticker",
    parse: (data) => parseFloat(data?.USD?.last),
  },
  {
    name: "coingecko",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    parse: (data) => parseFloat(data?.bitcoin?.usd),
  },
];

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`${url} responded with ${res.status}`);
  }
  return res.json();
}

function getCachedPrice(maxAgeMs: number): number | null {
  if (!cachedPrice) {
    return null;
  }
  if (Date.now() - cachedPrice.fetchedAt > maxAgeMs) {
    return null;
  }
  return cachedPrice.value;
}

async function fetchLiveBtcPrice(): Promise<number> {
  const price = await Promise.any(
    PRICE_SOURCES.map(async (source) => {
      const parsed = source.parse(await fetchJson(source.url));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${source.name} returned an unusable price`);
      }
      return parsed;
    }),
  );

  cachedPrice = { value: price, fetchedAt: Date.now() };
  return price;
}

export async function fetchBtcPrice(): Promise<number> {
  const fresh = getCachedPrice(CACHE_TTL_MS);
  if (fresh !== null) {
    return fresh;
  }

  try {
    return await fetchLiveBtcPrice();
  } catch (error) {
    const stale = getCachedPrice(STALE_CACHE_TTL_MS);
    if (stale !== null) {
      console.warn("Using stale BTC price after live fetch failed:", error);
      return stale;
    }
    throw error;
  }
}
