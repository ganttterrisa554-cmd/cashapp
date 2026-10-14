'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { getInvoice, PaymentError } from '@/lib/payments';
import styles from './page.module.css';

const presetAmounts = [50, 75, 100, 150, 200, 250, 300, 500, 750];
const FETCH_TIMEOUT_MS = 15000;
const REDIRECT_FALLBACK_MS = 2000;

function cashAppUrl(invoice: string) {
  return `https://cash.app/launch/lightning/${invoice}`;
}

export default function PaymentForm({
  destination = 'default',
  title = 'Application fee',
}: {
  destination?: 'default' | 'pay';
  title?: string;
}) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashAppHref, setCashAppHref] = useState<string>('');
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
    setCashAppHref('');
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
    setError('');
    setCashAppHref('');
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
    setCashAppHref('');
    setIsProcessing(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const pr = await getInvoice(amount, destination, controller.signal);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const href = cashAppUrl(pr);
      window.location.assign(href);

      fallbackTimerRef.current = window.setTimeout(() => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setCashAppHref(href);
        setIsProcessing(false);
        setError('If your wallet app did not open automatically, tap the button below.');
      }, REDIRECT_FALLBACK_MS);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const timedOut = err instanceof DOMException && err.name === 'AbortError';
      const message =
        err instanceof PaymentError
          ? err.message
          : timedOut
            ? 'Taking too long. Please try again.'
            : 'Failed to generate invoice';
      setError(message);
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
          <span className={styles.badge}>Lightning Instant Checkout</span>
        </div>

        <div className={styles.method}>
          <div className={styles.methodIcon}>⚡</div>
          <div>
            <p className={styles.methodName}>Lightning Network</p>
            <p className={styles.methodSub}>Instant invoice</p>
          </div>
        </div>

        <p className={styles.sectionLabel}>Select amount (USD)</p>

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
          {isProcessing ? 'Generating Invoice...' : 'Continue to Wallet →'}
        </button>

        {cashAppHref && (
          <a className={styles.fallbackLink} href={cashAppHref}>
            Open Lightning Wallet
          </a>
        )}

        <p className={styles.footer}>
          Powered by <span className={styles.footerBrand}>Lightning Network</span>
        </p>
      </div>
    </div>
  );
}
