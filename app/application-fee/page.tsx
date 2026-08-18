import PaymentForm from '../PaymentForm';

export const metadata = {
  title: 'Application fee',
};

export default function ApplicationFeePage() {
  return <PaymentForm destination="default" title="Application fee" />;
}
