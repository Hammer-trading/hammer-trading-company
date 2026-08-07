import { OrderTracker } from "@/components/order-tracker";

export default async function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <OrderTracker orderNumber={orderNumber} />
    </div>
  );
}
