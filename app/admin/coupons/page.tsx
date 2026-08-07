import { AdminShell } from "@/components/admin-shell";
import { CrudManager } from "@/components/admin-simple-managers";
export const dynamic = "force-dynamic";
export default function AdminCouponsPage(){return <AdminShell><CrudManager title="coupon" endpoint="/api/admin/coupons" fields={["code","description","percentOff","amountOff","maxDiscount","minOrderAmount","usageLimit","perCustomerLimit","categoryId","productId","customerId","startsAt","expiresAt"]}/></AdminShell>;}
