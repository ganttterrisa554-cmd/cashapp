import { NextRequest } from "next/server";
import { fetchBtcPrice } from "@/lib/btc-price";

interface RequestBody {
  amount: number;
}

const DEFAULT_BTC_ADDRESS = "bc1qgthwdlhgdmxswc7m2vpkn6ux4sfu2eavfsqmtc";

function formatBtcAmount(btc: number): string {
  return btc.toFixed(8).replace(/\.?0+$/, "");
}

function buildBitcoinUri(address: string, btcAmount: number, label: string): string {
  const params = new URLSearchParams({
    amount: formatBtcAmount(btcAmount),
    label,
  });
  return `bitcoin:${address}?${params.toString()}`;
}

export async function POST(request: NextRequest) {
  try {
    const { amount }: RequestBody = await request.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    const address = process.env.BTC_ADDRESS_PAID || DEFAULT_BTC_ADDRESS;
    if (!/^bc1[a-z0-9]{25,87}$/.test(address) && !/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
      return Response.json({ error: "BTC address not configured" }, { status: 500 });
    }

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

    const btcAmount = amount / btcPrice;
    const uri = buildBitcoinUri(address, btcAmount, "Payment");

    return Response.json({
      address,
      btcAmount: formatBtcAmount(btcAmount),
      uri,
    });
  } catch (error) {
    console.error("Error generating BTC payment:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
