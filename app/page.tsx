import PaymentForm from './PaymentForm';

export const metadata = {
  title: 'Pay securely',
};

export default function Home() {
  return <PaymentForm destination="default" title="Pay securely" />;
}
