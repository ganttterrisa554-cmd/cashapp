import { fetchBtcPrice } from "@/lib/btc-price";

const FETCH_TIMEOUT_MS = 15000;

const DEFAULT_WOS_USERNAME = "brainygrip14";
const DEFAULT_BTC_ADDRESS = "bc1qgthwdlhgdmxswc7m2vpkn6ux4sfu2eavfsqmtc";

interface LnurlpResponse {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`${url} responded with ${res.status}`);
  }
  return res.json();
}

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
  }
}

export async function getInvoice(
  amount: number,
  destination?: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new PaymentError("Invalid amount", 400);
  }

  const wosUsername =
    destination === "pay"
      ? process.env.NEXT_PUBLIC_WOS_USERNAME_PAY || DEFAULT_WOS_USERNAME
      : process.env.NEXT_PUBLIC_WOS_USERNAME || DEFAULT_WOS_USERNAME;

  const lnurlpUrl = `https://walletofsatoshi.com/.well-known/lnurlp/${wosUsername}`;
  let lnurlpData: LnurlpResponse;
  try {
    lnurlpData = await fetchJson(lnurlpUrl, signal);
  } catch (error) {
    console.error("LNURLp lookup failed:", error);
    throw new PaymentError(
      "Could not reach the payment provider. Please try again.",
      502,
    );
  }

  let btcPrice: number;
  try {
    btcPrice = await fetchBtcPrice();
  } catch (error) {
    console.error("All Bitcoin price sources failed:", error);
    throw new PaymentError(
      "Could not fetch the Bitcoin rate. Please try again.",
      502,
    );
  }

  const satoshis = (amount / btcPrice) * 100000000;
  const msats = Math.floor(satoshis * 1000);

  if (msats < lnurlpData.minSendable || msats > lnurlpData.maxSendable) {
    throw new PaymentError(
      `Amount must be between ${Math.ceil(lnurlpData.minSendable / 100000000000)} and ${Math.floor(lnurlpData.maxSendable / 100000000000)} USD`,
      400,
    );
  }

  const callbackUrl = `${lnurlpData.callback}?amount=${msats}`;
  let invoiceData: { pr: string };
  try {
    invoiceData = await fetchJson(callbackUrl, signal);
  } catch (error) {
    console.error("Invoice request failed:", error);
    throw new PaymentError("Could not generate the invoice. Please try again.", 502);
  }

  if (!invoiceData?.pr) {
    throw new PaymentError("Could not generate the invoice. Please try again.", 502);
  }

  return invoiceData.pr;
}

function formatBtcAmount(btc: number): string {
  return btc.toFixed(8).replace(/\.?0+$/, "");
}

export async function getBtcPayment(
  amount: number,
  signal?: AbortSignal,
): Promise<{ address: string; btcAmount: string; uri: string }> {
  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new PaymentError("Invalid amount", 400);
  }

  const address = process.env.NEXT_PUBLIC_BTC_ADDRESS_PAID || DEFAULT_BTC_ADDRESS;
  if (
    !/^bc1[a-z0-9]{25,87}$/.test(address) &&
    !/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)
  ) {
    throw new PaymentError("BTC address not configured", 500);
  }

  let btcPrice: number;
  try {
    btcPrice = await fetchBtcPrice();
  } catch (error) {
    console.error("All Bitcoin price sources failed:", error);
    throw new PaymentError(
      "Could not fetch the Bitcoin rate. Please try again.",
      502,
    );
  }

  const btcAmount = amount / btcPrice;
  const params = new URLSearchParams({
    amount: formatBtcAmount(btcAmount),
    label: "Payment",
  });

  return {
    address,
    btcAmount: formatBtcAmount(btcAmount),
    uri: `bitcoin:${address}?${params.toString()}`,
  };
}
