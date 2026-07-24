'use client';

import { useState, type ChangeEvent } from 'react';
import styles from './page.module.css';

const presetAmounts = [50, 75, 100, 150, 200, 250, 300, 500, 750];

type ButtonState = 'idle' | 'processing' | 'invoice-ready';

interface InvoiceResponse {
  pr: string;
}

interface ErrorResponse {
  error: string;
}

export default function Home() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(75);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [invoice, setInvoice] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError('');
    setButtonState('idle');
    setInvoice('');
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
    setError('');
    setButtonState('idle');
    setInvoice('');
  };

  const handleGenerateInvoice = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

    if (!amount || amount < 1 || amount > 999) {
      setError('Please enter an amount between $1 and $999');
      return;
    }

    setError('');
    setButtonState('processing');

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
        setButtonState('idle');
        return;
      }

      const invData = data as InvoiceResponse;
      setInvoice(invData.pr);
      setButtonState('invoice-ready');
    } catch (err) {
      setError('Failed to generate invoice');
      setButtonState('idle');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy invoice');
    }
  };

  const handleOpenCashApp = () => {
    window.location.href = `https://cash.app/launch/lightning/${invoice}`;
  };

  const handleOpenLightning = () => {
    window.location.href = `lightning:${invoice}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {buttonState === 'invoice-ready' ? (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>Ready to Pay</h1>
            </div>
            <div className={styles.qrContainer}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(invoice)}`} 
                alt="QR Code"
              />
            </div>
            <div className={styles.invoiceActions}>
              <button 
                className={styles.cashAppButton} 
                onClick={handleOpenCashApp}
              >
                💵 Pay with Cash App
              </button>
              <button 
                className={styles.secondaryButton} 
                onClick={handleCopyToClipboard}
              >
                {copied ? '✅ Copied!' : '📋 Copy Invoice'}
              </button>
              <button 
                className={styles.secondaryButton} 
                onClick={handleOpenLightning}
              >
                ⚡ Open in Wallet
              </button>
            </div>
            <div className={styles.invoiceText}>
              <p className={styles.invoiceLabel}>Invoice:</p>
              <p className={styles.invoiceValue}>{invoice}</p>
            </div>
            <button 
              className={styles.backButton} 
              onClick={() => setButtonState('idle')}
            >
              ← Back
            </button>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>Send Lightning Payment</h1>
              <span className={styles.badge}>🔒 Secure & Instant</span>
              <div className={styles.method}>Cash App Compatible</div>
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
              onClick={handleGenerateInvoice}
              disabled={buttonState === 'processing'}
            >
              {buttonState === 'idle' && '🔒 Generate Invoice'}
              {buttonState === 'processing' && '⏳ Processing...'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
