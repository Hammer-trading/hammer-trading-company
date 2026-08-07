"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { money } from "@/lib/utils";

type LazyAnimatedValueProps = {
  value: number;
  className?: string;
  from?: number;
  prefix?: string;
  suffix?: string;
  currency?: boolean;
  delay?: number;
};

const DynamicAnimatedValue = dynamic(() => import("@/components/animated-value").then((mod) => mod.AnimatedValue), {
  ssr: false
});

const DynamicAnimatedMoney = dynamic(() => import("@/components/animated-value").then((mod) => mod.AnimatedMoney), {
  ssr: false
});

function useDeferredAnimation() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  return ready;
}

export function LazyAnimatedValue(props: LazyAnimatedValueProps) {
  const ready = useDeferredAnimation();

  if (!ready) {
    const rounded = Math.round(Number.isFinite(props.value) ? props.value : 0);
    return <span className={props.className}>{props.prefix}{rounded.toLocaleString("en-PK")}{props.suffix}</span>;
  }

  return <DynamicAnimatedValue {...props} />;
}

export function LazyAnimatedMoney({ value, className, delay = 0 }: { value: number; className?: string; delay?: number }) {
  const ready = useDeferredAnimation();

  if (!ready) return <span className={className}>{money(value)}</span>;

  return <DynamicAnimatedMoney value={value} className={className} delay={delay} />;
}
