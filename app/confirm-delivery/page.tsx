import { ConfirmDeliveryForm } from "@/components/confirm-delivery-form";

export default async function ConfirmDeliveryPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ConfirmDeliveryForm token={token} />;
}
