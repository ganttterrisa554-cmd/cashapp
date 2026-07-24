import { NextRequest } from "next/server";

interface RequestBody {
  amount: number;
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

export async function POST(request: NextRequest) {
  try {
    const { amount }: RequestBody = await request.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    const wosUsername = process.env.WOS_USERNAME;
    if (!wosUsername) {
      return Response.json(
        { error: "WOS_USERNAME not configured" },
        { status: 500 },
      );
    }

    // Step 1: Fetch LNURLp metadata
    const lnurlpUrl = `https://walletofsatoshi.com/.well-known/lnurlp/${wosUsername}`;
    const lnurlpRes = await fetch(lnurlpUrl);
    if (!lnurlpRes.ok) {
      return Response.json(
        { error: "Failed to fetch LNURLp metadata" },
        { status: 500 },
      );
    }
    const lnurlpData: LnurlpResponse = await lnurlpRes.json();

    // Step 2: Fetch BTC price from Coinbase
    const coinbaseRes = await fetch(
      "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    );
    if (!coinbaseRes.ok) {
      return Response.json(
        { error: "Failed to fetch Bitcoin price" },
        { status: 500 },
      );
    }
    const coinbaseData = await coinbaseRes.json();
    const btcPrice = parseFloat(coinbaseData.data.amount);

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
    const invoiceRes = await fetch(callbackUrl);
    if (!invoiceRes.ok) {
      return Response.json(
        { error: "Failed to generate invoice" },
        { status: 500 },
      );
    }
    const invoiceData: InvoiceResponse = await invoiceRes.json();

    return Response.json({ pr: invoiceData.pr });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
