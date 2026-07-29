'use client';

import { useState, type ChangeEvent } from 'react';
import styles from './page.module.css';

const presetAmounts = [50, 75, 100, 150, 200, 250, 300, 500, 750];
const payeeName = 'Linda';

interface InvoiceResponse {
  pr: string;
}

interface ErrorResponse {
  error: string;
}

export default function Home() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError('');
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
    setError('');
  };

  const handlePayNow = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

    if (!amount || amount < 1 || amount > 999) {
      setError('Please enter an amount between $1 and $999');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/get-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data: InvoiceResponse | ErrorResponse = await res.json();

      if (!res.ok) {
        const errData = data as ErrorResponse;
        setError(errData.error || 'Something went wrong');
        setIsProcessing(false);
        return;
      }

      const invData = data as InvoiceResponse;
      window.location.href = `https://cash.app/launch/lightning/${invData.pr}`;
    } catch (err) {
      setError('Failed to generate invoice');
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <h1 className={styles.title}>Pay {payeeName}</h1>
          <span className={styles.badge}>🔒 Secure Payment</span>
        </div>

        <div className={styles.method}>
          <div className={styles.methodIcon}>$</div>
          <div>
            <p className={styles.methodName}>CashApp</p>
            <p className={styles.methodSub}>Instant</p>
          </div>
        </div>

        <p className={styles.sectionLabel}>$ Select amount</p>

        <div className={styles.amountGrid}>
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              className={`${styles.amountButton} ${selectedAmount === amount ? styles.active : ''}`}
              onClick={() => handlePresetClick(amount)}
            >
              ${amount}
            </button>
          ))}
        </div>

        <div className={styles.inputWrap}>
          <span className={styles.inputPrefix}>$</span>
          <input
            type="number"
            className={styles.customInput}
            placeholder="Enter amount"
            min="1"
            max="999"
            value={customAmount}
            onChange={handleCustomChange}
          />
        </div>

        {error && (
          <p id="err-msg" className={styles.error}>
            {error}
          </p>
        )}

        <button className={styles.payButton} onClick={handlePayNow} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : '🔒 Pay Now →'}
        </button>

        <p className={styles.footer}>
          © Powered by <span className={styles.footerBrand}>Cashapp</span>
        </p>
      </div>
    </div>
  );
}
