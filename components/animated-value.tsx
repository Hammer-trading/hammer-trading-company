"use client";

import { useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { cn } from "@/lib/utils";

type AnimatedValueProps = {
  value: number;
  className?: string;
  from?: number;
  prefix?: string;
  suffix?: string;
  currency?: boolean;
  delay?: number;
};

const subscribeHydration = () => () => undefined;
const clientHydrated = () => true;
const serverHydrated = () => false;

export function AnimatedValue({ value, className, from = 0, prefix = "", suffix = "", currency = false, delay = 0 }: AnimatedValueProps) {
  const reduceMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  const sign = rounded < 0 ? "-" : "";
  const safeValue = Math.abs(rounded);
  const label = `${currency ? "PKR " : prefix}${sign}${safeValue.toLocaleString("en-PK")}${suffix}`;

  if (hydrated && reduceMotion) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={cn("inline-flex items-baseline tabular-nums", className)} aria-label={label}>
      {currency ? <span className="mr-1 text-[0.72em] font-black uppercase tracking-wide opacity-70">PKR</span> : prefix ? <span>{prefix}</span> : null}
      {sign ? <span>-</span> : null}
      <SlidingNumber
        number={safeValue}
        fromNumber={from}
        thousandSeparator=","
        inView
        inViewOnce
        transition={{ stiffness: 180, damping: 24, mass: 0.45 }}
        delay={delay}
      />
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
}

export function AnimatedMoney({ value, className, delay = 0 }: { value: number; className?: string; delay?: number }) {
  return <AnimatedValue value={value} className={className} currency delay={delay} />;
}
