export async function POST(request) {
  try {
    const { amount } = await request.json();
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const wosUsername = process.env.WOS_USERNAME;
    if (!wosUsername) {
      return Response.json({ error: 'WOS_USERNAME not configured' }, { status: 500 });
    }

    const wosResponse = await fetch(`https://walletofsatoshi.com/${wosUsername}`);
    if (!wosResponse.ok) {
      return Response.json({ error: 'Failed to fetch wallet metadata' }, { status: 500 });
    }
    const walletData = await wosResponse.json();

    const coinbaseResponse = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    if (!coinbaseResponse.ok) {
      return Response.json({ error: 'Failed to fetch Bitcoin price' }, { status: 500 });
    }
    const coinbaseData = await coinbaseResponse.json();
    const btcPrice = parseFloat(coinbaseData.data.amount);

    const satoshis = (amount / btcPrice) * 100000000;
    const msats = Math.floor(satoshis * 1000);

    const minSendable = walletData.minSendable;
    const maxSendable = walletData.maxSendable;

    if (msats < minSendable || msats > maxSendable) {
      return Response.json({ 
        error: `Amount must be between ${Math.ceil(minSendable / 100000000000)} and ${Math.floor(maxSendable / 100000000000)} USD` 
      }, { status: 400 });
    }

    const callbackUrl = `${walletData.callback}?amount=${msats}`;
    const invoiceResponse = await fetch(callbackUrl);
    if (!invoiceResponse.ok) {
      return Response.json({ error: 'Failed to generate invoice' }, { status: 500 });
    }
    const invoiceData = await invoiceResponse.json();

    return Response.json({ pr: invoiceData.pr });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
