'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import styles from './page.module.css';

const presetAmounts = [50, 75, 100, 150, 200, 250, 300, 500, 750];
const FETCH_TIMEOUT_MS = 25000;
const REDIRECT_FALLBACK_MS = 2000;

interface BtcPaymentResponse {
  uri: string;
}

interface ErrorResponse {
  error: string;
}

export default function BtcPaymentForm({ title = 'Pay' }: { title?: string }) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletHref, setWalletHref] = useState<string>('');
  const requestIdRef = useRef(0);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const clearFallbackTimer = () => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError('');
    setWalletHref('');
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
    setError('');
    setWalletHref('');
  };

  const handlePayNow = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

    if (!amount || amount < 1 || amount > 999) {
      setError('Please enter an amount between $1 and $999');
      return;
    }

    const requestId = ++requestIdRef.current;
    clearFallbackTimer();
    setError('');
    setWalletHref('');
    setIsProcessing(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch('/api/get-btc-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
        signal: controller.signal,
      });

      const data: BtcPaymentResponse | ErrorResponse = await res.json();

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!res.ok) {
        const errData = data as ErrorResponse;
        setError(errData.error || 'Something went wrong');
        setIsProcessing(false);
        return;
      }

      const paymentData = data as BtcPaymentResponse;
      if (!paymentData.uri) {
        setError('Could not prepare the payment. Please try again.');
        setIsProcessing(false);
        return;
      }

      window.location.assign(paymentData.uri);

      fallbackTimerRef.current = window.setTimeout(() => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setWalletHref(paymentData.uri);
        setIsProcessing(false);
        setError('If Cash App did not open, tap the button below.');
      }, REDIRECT_FALLBACK_MS);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const timedOut = err instanceof DOMException && err.name === 'AbortError';
      setError(timedOut ? 'Taking too long. Please try again.' : 'Failed to prepare payment');
      setIsProcessing(false);
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
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
          {isProcessing ? 'Processing...' : '🔒 Pay →'}
        </button>

        {walletHref && (
          <a className={styles.fallbackLink} href={walletHref}>
            Open Cash App
          </a>
        )}

        <p className={styles.footer}>
          © Powered by <span className={styles.footerBrand}>Cashapp</span>
        </p>
      </div>
    </div>
  );
}
