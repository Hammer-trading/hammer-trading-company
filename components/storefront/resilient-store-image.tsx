"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ResilientStoreImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  fallbackSrc?: string;
};

export function ResilientStoreImage({ src, alt, className, sizes, priority = false, fallbackSrc = "/brand/workshop-hero.webp" }: ResilientStoreImageProps) {
  const [source, setSource] = useState(src || fallbackSrc);

  useEffect(() => {
    setSource(src || fallbackSrc);
  }, [fallbackSrc, src]);

  return (
    <Image
      src={source}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      unoptimized={source.startsWith("data:") || source.startsWith("/api/")}
      onError={() => { if (source !== fallbackSrc) setSource(fallbackSrc); }}
    />
  );
}
