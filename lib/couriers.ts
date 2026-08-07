type ShipmentPayload = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  addressLine: string;
  codAmount?: number;
  weightKg?: number;
};

export type CourierBooking =
  | {
      status: "booked";
      courierName: string;
      bookingId: string;
      trackingNumber: string;
      response?: Record<string, unknown>;
    }
  | {
      status: "not_configured" | "failed";
      courierName: string;
      bookingId: null;
      trackingNumber: null;
      error: string;
    };

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

async function book(provider: string, payload: ShipmentPayload): Promise<CourierBooking> {
  const configuredProvider = readEnv("COURIER_PROVIDER").toLowerCase().replaceAll("_", "");
  const apiUrl = readEnv("COURIER_API_URL");
  const apiKey = readEnv("COURIER_API_KEY");
  const normalizedProvider = provider.toLowerCase().replaceAll(" ", "");
  if (!configuredProvider || configuredProvider === "none" || !apiUrl || !apiKey || configuredProvider !== normalizedProvider) {
    return {
      status: "not_configured",
      courierName: provider,
      bookingId: null,
      trackingNumber: null,
      error: `${provider} API credentials are not configured. Add tracking manually or configure the provider in Settings.`
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ provider, ...payload }),
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}`);
    const data = await response.json().catch(() => ({}));
    const bookingId = String(data.bookingId || data.booking_id || "");
    const trackingNumber = String(data.trackingNumber || data.tracking_number || data.tracking_id || "");
    if (!bookingId || !trackingNumber) throw new Error(`${provider} response did not include booking and tracking identifiers`);
    return {
      status: "booked",
      courierName: provider,
      bookingId,
      trackingNumber,
      response: typeof data === "object" && data ? data : {}
    };
  } catch (error) {
    console.error("Courier booking failed", error);
    return {
      status: "failed",
      courierName: provider,
      bookingId: null,
      trackingNumber: null,
      error: error instanceof Error ? error.message : `${provider} booking failed`
    };
  }
}

export const courierServices = {
  leopards: (payload: ShipmentPayload) => book("Leopards", payload),
  tcs: (payload: ShipmentPayload) => book("TCS", payload),
  postex: (payload: ShipmentPayload) => book("PostEx", payload),
  trax: (payload: ShipmentPayload) => book("Trax", payload),
  blueex: (payload: ShipmentPayload) => book("BlueEX", payload),
  localRiders: (payload: ShipmentPayload) => book("Local Riders", payload)
};
