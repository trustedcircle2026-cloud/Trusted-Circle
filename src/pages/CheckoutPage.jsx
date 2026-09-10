import PaymentGateway from '../components/PaymentGateway'

export default function CheckoutPage({ user, items, total, savings, onBack, onCreateOrder, logoUrl, qrUrl }) {
  return <PaymentGateway mode="checkout" user={user} items={items} total={total} cashback={savings} logoUrl={logoUrl} qrUrl={qrUrl} onBack={onBack} onCreateOrder={onCreateOrder} />
}
