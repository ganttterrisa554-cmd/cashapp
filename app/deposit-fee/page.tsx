import PaymentForm from '../PaymentForm';

export const metadata = {
  title: 'Deposit fee',
};

export default function DepositFeePage() {
  return <PaymentForm destination="pay" title="Deposit fee" />;
}
