import { PiStar, PiStarFill, PiStarHalfFill } from 'react-icons/pi';
import { USER_REVIEWS } from '../lib/reviews.js';

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5 text-purple-200" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: full }).map((_, index) => (
        <PiStarFill key={`full-${index}`} aria-hidden="true" />
      ))}
      {hasHalf && <PiStarHalfFill aria-hidden="true" />}
      {Array.from({ length: empty }).map((_, index) => (
        <PiStar key={`empty-${index}`} className="text-white/20" aria-hidden="true" />
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <article className="thin-panel w-[320px] shrink-0 p-6 sm:w-[360px]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg text-bone">{review.name}</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ash">{review.city}</p>
        </div>
        <StarRating rating={review.rating} />
      </div>
      <p className="mt-5 text-sm leading-7 text-smoke">“{review.quote}”</p>
    </article>
  );
}

export default function UserReviewsSection() {
  const track = [...USER_REVIEWS, ...USER_REVIEWS];
  return (
    <section className="border-b border-white/12 px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1540px]">
        <div className="text-center">
          <p className="tech-label text-smoke">User Reviews</p>
          <h2 className="serif-title mt-4 text-5xl leading-none sm:text-6xl">Trusted by people looking for clarity.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-smoke">
            Real conversations are complicated. ThirdPerson AI helps people slow down, reflect, and understand the patterns.
          </p>
        </div>
        <div className="marquee-row mt-10">
          <div className="marquee-track gap-5 py-1">
            {track.map((review, index) => (
              <ReviewCard key={`${review.name}-${index}`} review={review} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
