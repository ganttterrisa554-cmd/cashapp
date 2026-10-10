import PaymentForm from '../PaymentForm';

export const metadata = {
  title: 'Pay deposit fee',
};

export default function DepositFeePage() {
  return <PaymentForm destination="default" title="Pay deposit fee" />;
}
