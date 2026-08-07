import type { Metadata } from "next";
import "./globals.css";
import "./storefront-interfaces.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteFrame } from "@/components/site-frame";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { ServiceWorkerManager } from "@/components/service-worker-manager";
import { WishlistProvider } from "@/components/wishlist-provider";
import { getAppUrl } from "@/lib/app-url";

const storefrontThemeScript = `
try {
  if (window.location.pathname.startsWith("/admin")) {
    var storedAdminTheme = window.localStorage.getItem("hammer-admin-theme");
    var adminDarkTheme = storedAdminTheme === "dark";
    document.documentElement.classList.toggle("dark", adminDarkTheme);
    document.documentElement.dataset.adminTheme = adminDarkTheme ? "dark" : "light";
    document.documentElement.style.colorScheme = adminDarkTheme ? "dark" : "light";
  } else {
    var storedTheme = window.localStorage.getItem("hammer-store-theme");
    var darkTheme = storedTheme === "dark";
    var previewDesign = new URLSearchParams(window.location.search).get("theme-preview");
    var storedDesign = previewDesign || window.localStorage.getItem("hammer-store-design") || "industrial";
    var previewLayout = new URLSearchParams(window.location.search).get("layout-preview");
    var storedLayout = previewLayout || window.localStorage.getItem("hammer-store-layout") || "showroom";
    document.documentElement.classList.toggle("dark", darkTheme);
    document.documentElement.dataset.storeTheme = darkTheme ? "dark" : "light";
    document.documentElement.dataset.storeDesign = storedDesign;
    document.documentElement.dataset.storeLayout = storedLayout;
    document.documentElement.style.colorScheme = darkTheme ? "dark" : "light";
  }
} catch (_) {}
`;


export const metadata: Metadata = {
  title: "Hammer Trading Company | Hardware Store Pakistan",
  description: "Modern hardware e-commerce store with tools, safety gear, delivery tracking, wholesale quotes, and secure QR confirmation.",
  metadataBase: new URL(getAppUrl()),
  keywords: ["Hammer Trading Company", "hardware store Pakistan", "tools Pakistan", "safety gear", "wholesale hardware", "delivery tracking"],
  manifest: "/manifest.webmanifest",
  applicationName: "Hammer Trading Company",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Hammer Trading Company",
    description: "Hardware, tools, safety gear, wholesale quotes, and secure delivery tracking across Pakistan.",
    url: "/",
    siteName: "Hammer Trading Company",
    images: [{ url: "/brand/htc-logo.png", width: 512, height: 512, alt: "Hammer Trading Company" }],
    locale: "en_PK",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Hammer Trading Company",
    description: "Professional hardware and tools ecommerce across Pakistan.",
    images: ["/brand/htc-logo.png"]
  },
  appleWebApp: {
    capable: true,
    title: "HTC",
    statusBarStyle: "black-translucent"
  },
  formatDetection: {
    telephone: true
  },
  icons: {
    icon: "/brand/htc-logo.png",
    shortcut: "/brand/htc-logo.png",
    apple: "/brand/htc-logo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: storefrontThemeScript }} />
      </head>
      <body className="font-interface antialiased">
        <ServiceWorkerManager />
        <SmoothScrollProvider>
          <CartProvider>
            <WishlistProvider>
              <SiteFrame>{children}</SiteFrame>
            </WishlistProvider>
          </CartProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
