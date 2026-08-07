import { MessageCircle } from "lucide-react";

export function WhatsAppSupport() {
  const number = process.env.WHATSAPP_SUPPORT_NUMBER?.replace(/\D/g, "") || "";
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number}?text=Assalamualaikum%20Hammer%20Trading%20Company%2C%20I%20need%20support.`}
      className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-mint text-white shadow-glow"
      aria-label="WhatsApp support"
    >
      <MessageCircle size={26} />
    </a>
  );
}
