"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PublicReview = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  reply?: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { name: string };
};

export function ProductReviews({ productId, reviews }: { productId: string; reviews: PublicReview[] }) {
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: formData.get("title"),
          comment: formData.get("comment")
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Review could not be submitted.");
      event.currentTarget.reset();
      setRating(5);
      setMessage("Verified review submitted for admin approval.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review could not be submitted.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 grid gap-5">
      {reviews.length ? (
        <div className="grid gap-3">
          {reviews.slice(0, 4).map((review) => (
            <article key={review.id} className="border-t border-[var(--line)] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{review.title}</strong>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><Star size={13} fill="currentColor" /> {review.rating}/5</span>
                {review.isVerifiedPurchase ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} /> Verified</span> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{review.comment}</p>
              <p className="mt-2 text-xs text-slate-500">{review.user.name} / {new Date(review.createdAt).toLocaleDateString()}</p>
              {review.reply ? <p className="mt-3 border-l-2 border-red-600 pl-3 text-sm"><strong>HTC reply:</strong> {review.reply}</p> : null}
            </article>
          ))}
        </div>
      ) : <p className="text-sm leading-6 text-[var(--muted)]">No approved reviews yet.</p>}

      <form onSubmit={submit} className="border-t border-[var(--line)] pt-5">
        <h3 className="font-black">Write a verified purchase review</h3>
        <div className="mt-3 flex gap-1" aria-label="Rating">
          {[1,2,3,4,5].map((value) => (
            <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star rating`} className="grid size-9 place-items-center text-amber-500">
              <Star size={20} fill={value <= rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
        <input name="title" required minLength={2} maxLength={120} className="premium-field mt-3 min-h-11 w-full px-3" placeholder="Review title" />
        <textarea name="comment" required minLength={10} maxLength={2000} className="premium-field mt-3 min-h-24 w-full p-3" placeholder="Share product quality and usage feedback" />
        <Button className="mt-3" type="submit" variant="outline" disabled={loading}>{loading ? "Submitting..." : "Submit review"}</Button>
        {message ? <p className="mt-3 text-sm font-semibold" role="status">{message}</p> : null}
      </form>
    </div>
  );
}
