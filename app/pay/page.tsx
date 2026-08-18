import PaymentForm from '../PaymentForm';

export const metadata = {
  title: 'Deposit fee',
};

export default function PayPage() {
  return <PaymentForm destination="pay" title="Deposit fee" />;
}
