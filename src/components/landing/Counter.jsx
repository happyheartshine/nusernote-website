'use client';

import { useState, useEffect, useRef } from 'react';

export default function Counter({ value, unit, label, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateCounter();
        }
      },
      { threshold: 0.5 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [hasAnimated]);

  const animateCounter = () => {
    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateCounter = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuad = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(easeOutQuad * value);

      setCount(currentCount);

      if (now < endTime) {
        requestAnimationFrame(updateCounter);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(updateCounter);
  };

  return (
    <div ref={counterRef} className="text-center">
      <div className="mb-2 flex items-baseline justify-center">
        <span className="text-4xl font-bold text-blue-600 sm:text-5xl">{count}</span>
        <span className="ml-1 text-2xl font-bold text-blue-600">{unit}</span>
      </div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
