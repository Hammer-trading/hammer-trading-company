import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

const variants = {
  primary: "bg-slate-950 text-white shadow-lg shadow-slate-950/10 hover:bg-slate-800",
  accent: "bg-red-700 text-white shadow-lg shadow-red-900/15 hover:bg-red-800",
  ghost: "bg-white/88 text-ink shadow-sm ring-1 ring-slate-200/70 hover:bg-white hover:ring-red-200",
  outline: "border border-slate-300 bg-white/92 text-ink shadow-sm hover:border-red-700 hover:bg-red-50/40 hover:text-red-700"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50", variants[variant], className)}
      {...props}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
};

export function LinkButton({ href, className, variant = "primary", children, ...props }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2", variants[variant], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
