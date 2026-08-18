import PaymentForm from '../PaymentForm';

export const metadata = {
  title: 'Pay securely',
};

export default function PayPage() {
  return <PaymentForm destination="pay" title="Pay securely" />;
}
