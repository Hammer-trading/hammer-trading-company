import { Prisma } from "@prisma/client";
import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

export type NotificationPayload = {
  to: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP";
export type DeliveryResult = {
  status: "sent" | "not_configured" | "failed";
  provider: string;
  error?: string;
  response?: Record<string, unknown>;
};

export type IntegrationConfiguration = {
  key: "email" | "sms" | "whatsapp" | "courier" | "payment" | "blob";
  label: string;
  provider: string;
  configured: boolean;
  missing: string[];
};

type SmtpResponse = {
  code: number;
  message: string;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function configured(key: IntegrationConfiguration["key"], label: string, provider: string, required: string[]): IntegrationConfiguration {
  const missing = required.filter((name) => !readEnv(name));
  return { key, label, provider, configured: missing.length === 0, missing };
}

export function getIntegrationConfiguration(): IntegrationConfiguration[] {
  const smsProvider = readEnv("SMS_PROVIDER") || "none";
  const whatsappProvider = readEnv("WHATSAPP_PROVIDER") || "none";
  const courierProvider = readEnv("COURIER_PROVIDER") || "none";
  const paymentProvider = readEnv("PAYMENT_PROVIDER") || "COD";
  return [
    configured("email", "Email", "SMTP", "SMTP_HOST SMTP_USER SMTP_PASSWORD".split(" ")),
    configured("sms", "SMS", smsProvider, smsProvider === "generic" ? ["SMS_API_URL", "SMS_API_KEY"] : ["SMS_PROVIDER"]),
    configured(
      "whatsapp",
      "WhatsApp",
      whatsappProvider,
      whatsappProvider === "meta"
        ? ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"]
        : whatsappProvider === "generic"
          ? ["WHATSAPP_API_URL", "WHATSAPP_API_KEY"]
          : ["WHATSAPP_PROVIDER"]
    ),
    configured("courier", "Courier", courierProvider, ["COURIER_PROVIDER", "COURIER_API_URL", "COURIER_API_KEY"]),
    paymentProvider.toUpperCase() === "COD"
      ? { key: "payment", label: "Payments", provider: "COD", configured: true, missing: [] }
      : configured("payment", "Payments", paymentProvider, ["PAYMENT_PROVIDER", "PAYMENT_API_URL", "PAYMENT_API_KEY"]),
    configured("blob", "Media storage", "Vercel Blob", ["BLOB_READ_WRITE_TOKEN"])
  ];
}

function encodeHeaderValue(value: string) {
  if (!value) return value;
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function sanitizeBody(message: string) {
  return message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

class SmtpClient {
  private buffer = "";
  private pending: ((response: SmtpResponse) => void) | null = null;
  private currentLines: string[] = [];
  private currentCode: number | null = null;

  constructor(private socket: import("node:net").Socket | import("node:tls").TLSSocket) {
    this.socket.setEncoding("utf8");
    this.socket.setTimeout(15_000, () => this.socket.destroy(new Error("SMTP connection timed out")));
    this.socket.on("data", (chunk) => this.consume(String(chunk)));
  }

  private consume(chunk: string) {
    this.buffer += chunk;
    while (this.buffer.includes("\n")) {
      const index = this.buffer.indexOf("\n");
      const rawLine = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      if (!rawLine) continue;
      const match = /^(\d{3})([ -])(.*)$/.exec(rawLine);
      if (!match) continue;
      const code = Number(match[1]);
      const separator = match[2];
      const responseText = match[3] ?? "";
      if (this.currentCode !== code) {
        this.currentCode = code;
        this.currentLines = [];
      }
      this.currentLines.push(responseText);
      if (separator === " " && this.pending) {
        const response = { code, message: this.currentLines.join("\n").trim() };
        const resolve = this.pending;
        this.pending = null;
        this.currentCode = null;
        this.currentLines = [];
        resolve(response);
      }
    }
  }

  private waitForResponse() {
    return new Promise<SmtpResponse>((resolve, reject) => {
      const fail = (error: Error) => {
        this.socket.off("error", fail);
        reject(error);
      };
      this.socket.once("error", fail);
      this.pending = (response) => {
        this.socket.off("error", fail);
        resolve(response);
      };
    });
  }

  async nextResponse() {
    return await this.waitForResponse();
  }

  async command(command: string, expectedCodes: number[] | number) {
    const expected = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
    this.socket.write(`${command}\r\n`);
    const response = await this.waitForResponse();
    if (!expected.includes(response.code)) {
      throw new Error(`SMTP command failed with response ${response.code}`);
    }
    return response;
  }

  sendRaw(data: string) {
    this.socket.write(data);
  }

  end() {
    this.socket.end();
  }
}

async function createSocket(host: string, port: number, secure: boolean) {
  if (secure || port === 465) {
    const tls = await import("node:tls");
    return tls.connect({ host, port, servername: host });
  }
  const net = await import("node:net");
  return net.connect({ host, port });
}

async function startSmtpSession() {
  const host = readEnv("SMTP_HOST");
  const port = Number(readEnv("SMTP_PORT") || "587");
  const user = readEnv("SMTP_USER");
  const password = readEnv("SMTP_PASSWORD");
  const fromEmail = readEnv("SMTP_FROM_EMAIL") || user;
  const fromName = readEnv("SMTP_FROM_NAME") || "Hammer Trading Company";
  const secure = readEnv("SMTP_SECURE") === "true";
  const allowInsecure = readEnv("SMTP_ALLOW_INSECURE") === "true";
  if (!host || !user || !password || !fromEmail) return null;

  const socket = await createSocket(host, port, secure);
  const client = new SmtpClient(socket);
  const greeting = await client.nextResponse();
  if (greeting.code !== 220) throw new Error(`SMTP server rejected connection with ${greeting.code}`);
  const appHostname = new URL(getAppUrl()).hostname;
  await client.command(`EHLO ${appHostname}`, 250);

  if (!secure && port !== 465) {
    try {
      await client.command("STARTTLS", 220);
      const tls = await import("node:tls");
      const tlsSocket = tls.connect({ socket: socket as import("node:net").Socket, servername: host });
      const upgradedClient = new SmtpClient(tlsSocket);
      await upgradedClient.command(`EHLO ${appHostname}`, 250);
      return { client: upgradedClient, fromEmail, fromName, user, password };
    } catch (error) {
      if (!allowInsecure) throw error;
    }
  }
  return { client, fromEmail, fromName, user, password };
}

export async function sendEmail(payload: NotificationPayload): Promise<DeliveryResult> {
  const provider = "SMTP";
  const configuration = getIntegrationConfiguration().find((item) => item.key === "email");
  if (!configuration?.configured) {
    return { status: "not_configured", provider, error: `Missing ${configuration?.missing.join(", ") || "SMTP configuration"}` };
  }

  let session: Awaited<ReturnType<typeof startSmtpSession>> = null;
  try {
    session = await startSmtpSession();
    if (!session) return { status: "not_configured", provider, error: "SMTP configuration is incomplete" };
    const { client, fromEmail, fromName, user, password } = session;
    await client.command("AUTH LOGIN", 334);
    await client.command(Buffer.from(user, "utf8").toString("base64"), 334);
    await client.command(Buffer.from(password, "utf8").toString("base64"), 235);
    await client.command(`MAIL FROM:<${fromEmail}>`, 250);
    await client.command(`RCPT TO:<${payload.to}>`, [250, 251]);
    await client.command("DATA", 354);
    const headers = [
      `From: ${encodeHeaderValue(fromName)} <${fromEmail}>`,
      `To: <${payload.to}>`,
      `Subject: ${encodeHeaderValue(payload.subject)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      `Date: ${new Date().toUTCString()}`,
      "",
      sanitizeBody(payload.message)
    ].join("\r\n");
    client.sendRaw(`${headers}\r\n.\r\n`);
    const response = await client.nextResponse();
    if (response.code !== 250) throw new Error(`SMTP message rejected with ${response.code}`);
    await client.command("QUIT", [221, 250]);
    return { status: "sent", provider, response: { code: response.code } };
  } catch (error) {
    console.error("email:delivery-failed", error);
    return { status: "failed", provider, error: error instanceof Error ? error.message : "SMTP delivery failed" };
  } finally {
    session?.client.end();
  }
}

async function sendGenericWebhook(
  payload: NotificationPayload,
  provider: string,
  url: string,
  apiKey: string
): Promise<DeliveryResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ to: payload.to, subject: payload.subject, message: payload.message, metadata: payload.metadata }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}`);
    const body = await response.json().catch(() => ({}));
    return { status: "sent", provider, response: typeof body === "object" && body ? body : {} };
  } catch (error) {
    console.error(`${provider}:delivery-failed`, error);
    return { status: "failed", provider, error: error instanceof Error ? error.message : `${provider} delivery failed` };
  }
}

export async function sendSms(payload: NotificationPayload): Promise<DeliveryResult> {
  const provider = readEnv("SMS_PROVIDER") || "none";
  if (provider !== "generic" || !readEnv("SMS_API_URL") || !readEnv("SMS_API_KEY")) {
    return { status: "not_configured", provider, error: "SMS provider credentials are not configured" };
  }
  return sendGenericWebhook(payload, provider, readEnv("SMS_API_URL"), readEnv("SMS_API_KEY"));
}

export async function sendWhatsApp(payload: NotificationPayload): Promise<DeliveryResult> {
  const provider = readEnv("WHATSAPP_PROVIDER") || "none";
  if (provider === "generic" && readEnv("WHATSAPP_API_URL") && readEnv("WHATSAPP_API_KEY")) {
    return sendGenericWebhook(payload, provider, readEnv("WHATSAPP_API_URL"), readEnv("WHATSAPP_API_KEY"));
  }
  if (provider !== "meta" || !readEnv("WHATSAPP_ACCESS_TOKEN") || !readEnv("WHATSAPP_PHONE_NUMBER_ID")) {
    return { status: "not_configured", provider, error: "WhatsApp provider credentials are not configured" };
  }
  const version = readEnv("WHATSAPP_GRAPH_VERSION") || "v21.0";
  const url = `https://graph.facebook.com/${version}/${readEnv("WHATSAPP_PHONE_NUMBER_ID")}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${readEnv("WHATSAPP_ACCESS_TOKEN")}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: payload.to.replace(/\D/g, ""),
        type: "text",
        text: { preview_url: true, body: payload.message }
      }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`Meta WhatsApp returned HTTP ${response.status}`);
    const body = await response.json().catch(() => ({}));
    return { status: "sent", provider, response: typeof body === "object" && body ? body : {} };
  } catch (error) {
    console.error("whatsapp:delivery-failed", error);
    return { status: "failed", provider, error: error instanceof Error ? error.message : "WhatsApp delivery failed" };
  }
}

async function deliver(channel: NotificationChannel, payload: NotificationPayload) {
  if (channel === "EMAIL") return sendEmail(payload);
  if (channel === "SMS") return sendSms(payload);
  return sendWhatsApp(payload);
}

export async function enqueueNotification(channel: NotificationChannel, payload: NotificationPayload) {
  const job = await prisma.outboundNotificationJob.create({
    data: {
      channel,
      recipient: payload.to,
      subject: payload.subject,
      message: payload.message,
      metadata: payload.metadata as Prisma.InputJsonValue | undefined
    }
  });
  return processNotificationJob(job.id);
}

export async function processNotificationJob(jobId: string) {
  const claimed = await prisma.outboundNotificationJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: new Date() },
      attemptsCount: { lt: 4 }
    },
    data: { status: "PROCESSING", attemptsCount: { increment: 1 } }
  });
  if (claimed.count !== 1) return null;

  const job = await prisma.outboundNotificationJob.findUnique({ where: { id: jobId } });
  if (!job) return null;
  const result = await deliver(job.channel as NotificationChannel, {
    to: job.recipient,
    subject: job.subject,
    message: job.message,
    metadata: job.metadata && typeof job.metadata === "object" && !Array.isArray(job.metadata)
      ? job.metadata as Record<string, unknown>
      : undefined
  });
  const terminalStatus = result.status === "sent"
    ? "SENT"
    : result.status === "not_configured"
      ? "NOT_CONFIGURED"
      : job.attemptsCount >= job.maxAttempts
        ? "DEAD"
        : "FAILED";
  const retryDelay = Math.min(60, 2 ** Math.max(0, job.attemptsCount - 1)) * 60_000;

  await prisma.$transaction([
    prisma.outboundNotificationAttempt.create({
      data: {
        jobId: job.id,
        status: terminalStatus,
        provider: result.provider,
        error: result.error,
        providerResponse: result.response as Prisma.InputJsonValue | undefined
      }
    }),
    prisma.outboundNotificationJob.update({
      where: { id: job.id },
      data: {
        status: terminalStatus,
        provider: result.provider,
        lastError: result.error || null,
        nextAttemptAt: terminalStatus === "FAILED" ? new Date(Date.now() + retryDelay) : job.nextAttemptAt,
        sentAt: terminalStatus === "SENT" ? new Date() : null
      }
    })
  ]);
  return { jobId: job.id, ...result };
}

export async function processPendingNotificationJobs(limit = 25) {
  const jobs = await prisma.outboundNotificationJob.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: new Date() },
      attemptsCount: { lt: 4 }
    },
    select: { id: true },
    orderBy: { nextAttemptAt: "asc" },
    take: Math.min(100, Math.max(1, limit))
  });
  const results = [];
  for (const job of jobs) {
    results.push(await processNotificationJob(job.id));
  }
  return results.filter(Boolean);
}

export async function createCourierShipment(orderNumber: string): Promise<{
  status: "not_configured";
  courierName: string;
  trackingNumber: null;
  error: string;
}> {
  const provider = readEnv("COURIER_PROVIDER") || "none";
  return {
    status: "not_configured",
    courierName: provider,
    trackingNumber: null,
    error: `Courier integration is not configured for order ${orderNumber}`
  };
}
