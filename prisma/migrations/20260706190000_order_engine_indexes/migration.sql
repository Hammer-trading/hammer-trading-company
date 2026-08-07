CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_customerPhone_idx" ON "Order"("customerPhone");
CREATE INDEX IF NOT EXISTS "Order_city_idx" ON "Order"("city");
CREATE INDEX IF NOT EXISTS "Order_paymentMethod_idx" ON "Order"("paymentMethod");
CREATE INDEX IF NOT EXISTS "Order_trackingNumber_idx" ON "Order"("trackingNumber");
CREATE INDEX IF NOT EXISTS "Order_courierId_idx" ON "Order"("courierId");
CREATE INDEX IF NOT EXISTS "Order_assignedRiderId_idx" ON "Order"("assignedRiderId");
CREATE INDEX IF NOT EXISTS "Order_estimatedDeliveryAt_idx" ON "Order"("estimatedDeliveryAt");

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX IF NOT EXISTS "OrderItem_sku_idx" ON "OrderItem"("sku");

CREATE INDEX IF NOT EXISTS "OrderTimeline_orderId_createdAt_idx" ON "OrderTimeline"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderTimeline_actorId_idx" ON "OrderTimeline"("actorId");

CREATE INDEX IF NOT EXISTS "ActivityLog_orderId_action_idx" ON "ActivityLog"("orderId", "action");
CREATE INDEX IF NOT EXISTS "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
