"use client";

import { Heart, Loader2 } from "lucide-react";
import { useWishlist } from "@/components/wishlist-provider";

export function WishlistButton({ productId, productName, className = "" }: { productId: string; productName: string; className?: string }) {
  const wishlist = useWishlist();
  const saved = wishlist.productIds.has(productId);
  const pending = wishlist.pendingIds.has(productId);
  return (
    <button
      type="button"
      onClick={() => void wishlist.toggle(productId)}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      title={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={className}
    >
      {pending ? <Loader2 size={17} className="animate-spin" /> : <Heart size={17} fill={saved ? "currentColor" : "none"} />}
    </button>
  );
}
