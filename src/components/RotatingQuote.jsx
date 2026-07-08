import { useEffect, useState } from 'react';
import { RELATIONSHIP_QUOTES } from '../lib/quotes.js';

export default function RotatingQuote({ className = '' }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * RELATIONSHIP_QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % RELATIONSHIP_QUOTES.length);
        setVisible(true);
      }, 400);
    }, 8000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <p
      className={`text-sm leading-7 text-smoke transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} ${className}`}
      aria-live="polite"
    >
      “{RELATIONSHIP_QUOTES[index]}”
    </p>
  );
}
