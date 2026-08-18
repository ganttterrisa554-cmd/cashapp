import { NextRequest } from "next/server";

interface RequestBody {
  amount: number;
  destination?: string;
}

function resolveWosUsername(destination: string | undefined): string | undefined {
  if (destination === 'pay') {
    return process.env.WOS_USERNAME_PAY || 'brainygrip14';
  }

  return process.env.WOS_USERNAME;
}

interface LnurlpResponse {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
}

interface InvoiceResponse {
  pr: string;
}

const FETCH_TIMEOUT_MS = 8000;

const PRICE_SOURCES: { name: string; url: string; parse: (data: any) => number }[] = [
  {
    name: "coinbase",
    url: "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    parse: (data) => parseFloat(data?.data?.amount),
  },
  {
    name: "kraken",
    url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    parse: (data) => parseFloat(Object.values<any>(data?.result ?? {})[0]?.c?.[0]),
  },
  {
    name: "binance",
    url: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
    parse: (data) => parseFloat(data?.price),
  },
  {
    name: "blockchain.info",
    url: "https://blockchain.info/ticker",
    parse: (data) => parseFloat(data?.USD?.last),
  },
];

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${url} responded with ${res.status}`);
  }
  return res.json();
}

// Races every exchange so one blocked or slow endpoint cannot stall the payment.
async function fetchBtcPrice(): Promise<number> {
  return Promise.any(
    PRICE_SOURCES.map(async (source) => {
      const price = source.parse(await fetchJson(source.url));
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`${source.name} returned an unusable price`);
      }
      return price;
    }),
  );
}

export async function POST(request: NextRequest) {
  try {
    const { amount, destination }: RequestBody = await request.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    const wosUsername = resolveWosUsername(destination);
    if (!wosUsername) {
      return Response.json(
        { error: "WOS_USERNAME not configured" },
        { status: 500 },
      );
    }

    // Step 1: Fetch LNURLp metadata
    const lnurlpUrl = `https://walletofsatoshi.com/.well-known/lnurlp/${wosUsername}`;
    let lnurlpData: LnurlpResponse;
    try {
      lnurlpData = await fetchJson(lnurlpUrl);
    } catch (error) {
      console.error("LNURLp lookup failed:", error);
      return Response.json(
        { error: "Could not reach the payment provider. Please try again." },
        { status: 502 },
      );
    }

    // Step 2: Fetch BTC price
    let btcPrice: number;
    try {
      btcPrice = await fetchBtcPrice();
    } catch (error) {
      console.error("All Bitcoin price sources failed:", error);
      return Response.json(
        { error: "Could not fetch the Bitcoin rate. Please try again." },
        { status: 502 },
      );
    }

    // Step 3: Convert USD to millisatoshis
    const satoshis = (amount / btcPrice) * 100000000;
    const msats = Math.floor(satoshis * 1000);

    // Step 4: Validate against min/max sendable
    if (msats < lnurlpData.minSendable || msats > lnurlpData.maxSendable) {
      return Response.json(
        {
          error: `Amount must be between ${Math.ceil(lnurlpData.minSendable / 100000000000)} and ${Math.floor(lnurlpData.maxSendable / 100000000000)} USD`,
        },
        { status: 400 },
      );
    }

    // Step 5: Fetch invoice from callback URL with amount
    const callbackUrl = `${lnurlpData.callback}?amount=${msats}`;
    let invoiceData: InvoiceResponse;
    try {
      invoiceData = await fetchJson(callbackUrl);
    } catch (error) {
      console.error("Invoice request failed:", error);
      return Response.json(
        { error: "Could not generate the invoice. Please try again." },
        { status: 502 },
      );
    }

    if (!invoiceData?.pr) {
      return Response.json(
        { error: "Could not generate the invoice. Please try again." },
        { status: 502 },
      );
    }

    return Response.json({ pr: invoiceData.pr });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
