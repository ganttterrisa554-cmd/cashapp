'use client';

import { useState } from 'react';
import styles from './page.module.css';

const presetAmounts = [50, 75, 100, 150, 200, 250, 300, 500, 750];

export default function Home() {
  const [selectedAmount, setSelectedAmount] = useState(75);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');
  const [buttonState, setButtonState] = useState('idle');

  const handlePresetClick = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError('');
  };

  const handleCustomChange = (e) => {
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
    setButtonState('processing');

    try {
      const response = await fetch('/api/get-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong');
        setButtonState('idle');
        return;
      }

      setButtonState('launching');

      window.location.href = `https://cash.app/${data.pr}`;

      setTimeout(() => {
        window.location.href = `lightning:${data.pr}`;
      }, 1500);
    } catch (err) {
      setError('Failed to process payment. Please try again.');
      setButtonState('idle');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pay Linda</h1>
          <span className={styles.badge}>🔒 Secure Payment</span>
          <div className={styles.method}>CashApp / Instant</div>
        </div>

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

        <input
          type="number"
          className={styles.customInput}
          placeholder="Or enter custom amount ($1-$999)"
          min="1"
          max="999"
          value={customAmount}
          onChange={handleCustomChange}
        />

        {error && (
          <p id="err-msg" className={styles.error}>
            {error}
          </p>
        )}

        <button
          className={styles.payButton}
          onClick={handlePayNow}
          disabled={buttonState !== 'idle'}
        >
          {buttonState === 'idle' && '🔒 Pay Now →'}
          {buttonState === 'processing' && '⏳ Processing...'}
          {buttonState === 'launching' && '🚀 Launching Cash App...'}
        </button>
      </div>
    </div>
  );
}
