import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  controls?: boolean;
  poster?: string | null;
};

export function DynamicMedia({ src, alt, className, priority = false, controls = false, poster }: Props) {
  const source = src || "/brand/htc-logo.png";
  if (/\.(mp4|webm)(?:$|\?)/i.test(source)) {
    return <video src={source} aria-label={alt} controls={controls} poster={poster || undefined} preload={priority ? "metadata" : "none"} playsInline className={cn("absolute inset-0 size-full object-cover", className)} />;
  }
  if (source.startsWith("/") || source.startsWith("data:")) {
    return <Image src={source} alt={alt} fill priority={priority} unoptimized={source.startsWith("data:")} className={cn("object-cover", !src && "object-contain p-8", className)} sizes="(max-width: 768px) 100vw, 50vw" />;
  }
  // Admin-managed external media can come from any HTTPS storage provider.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={source} alt={alt} loading={priority ? "eager" : "lazy"} className={cn("absolute inset-0 size-full object-cover", className)} />;
}
