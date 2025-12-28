'use client';

import { useEffect, useRef, useState } from 'react';
import FeatureTile from './FeatureTile';

interface Feature {
  image: string;
  headline?: string;
  title: string;
  href?: string;
  tag?: string;
  icon?: string;
  description?: string;
}

interface HorizontalFeatureScrollProps {
  features: Feature[];
}

export default function HorizontalFeatureScroll({ features }: HorizontalFeatureScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [rowWidth, setRowWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion) return;

    const measureWidths = () => {
      if (trackRef.current) {
        const trackWidth = trackRef.current.scrollWidth;
        const vpWidth = window.innerWidth;
        setRowWidth(trackWidth);
        setViewportWidth(vpWidth);
      }
    };

    // Initial measurement after a short delay to ensure images are loaded
    const timeoutId = setTimeout(() => {
      measureWidths();
    }, 200);

    // Also measure after images potentially load
    const imageLoadTimeout = setTimeout(() => {
      measureWidths();
    }, 500);

    // Measure on resize
    const handleResize = () => {
      measureWidths();
    };

    window.addEventListener('resize', handleResize);

    // IntersectionObserver to only animate when section is in view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      {
        threshold: 0,
        rootMargin: '-50px 0px -50px 0px',
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    // Scroll handler with rAF
    const handleScroll = () => {
      if (!sectionRef.current || !trackRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        const section = sectionRef.current;
        const track = trackRef.current;
        if (!section || !track) return;

        const rect = section.getBoundingClientRect();
        const scrollY = window.scrollY;
        const vpHeight = window.innerHeight;
        const vpWidth = window.innerWidth;

        // Section boundaries
        const sectionTop = rect.top + scrollY;
        const sectionBottom = sectionTop + section.offsetHeight;

        // When section enters viewport (top of section reaches viewport top)
        const scrollStart = sectionTop - vpHeight;
        // When section exits viewport (bottom of section reaches viewport top)
        const scrollEnd = sectionBottom - vpHeight;
        const scrollRange = scrollEnd - scrollStart;

        if (scrollRange <= 0) {
          setTranslateX(0);
          return;
        }

        // Calculate progress (0 to 1)
        const progress = Math.max(0, Math.min(1, (scrollY - scrollStart) / scrollRange));

        // Calculate translateX - scroll from right to left
        const trackWidth = track.scrollWidth;
        // With spacers at start and end (end spacer is 2x tile width for extra space),
        // we need to scroll enough so the last tile is fully visible
        // Add extra padding to ensure last tile is completely visible
        const extraPadding = 100; // Extra padding to ensure full visibility
        const maxTranslate = Math.max(0, trackWidth - vpWidth + extraPadding);
        const newTranslateX = -progress * maxTranslate;

        setTranslateX(newTranslateX);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(imageLoadTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isInView, rowWidth, viewportWidth, prefersReducedMotion]);

  // Fallback for reduced motion or mobile: use horizontal scroll with snap
  if (prefersReducedMotion || typeof window === 'undefined') {
    return (
      <div
        ref={sectionRef}
        className="overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div
          ref={trackRef}
          className="flex gap-16 px-4 py-8"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Spacer at start - width of one tile */}
          <div className="flex-shrink-0 w-[840px] sm:w-[960px] md:w-[1120px] lg:w-[1260px]" />
          
          {features.map((feature, index) => (
            <div key={index} className="snap-start">
              <FeatureTile feature={feature} />
            </div>
          ))}
          
          {/* Spacer at end - width of one tile plus extra space */}
          <div className="flex-shrink-0 w-[840px] sm:w-[960px] md:w-[1120px] lg:w-[1260px]" />
        </div>
      </div>
    );
  }

  // Main sticky scroll implementation
  return (
    <div
      ref={sectionRef}
      className="relative"
      style={{
        height: `calc(${features.length} * 70vh)`,
        minHeight: '100vh',
      }}
    >
      <div
        className="sticky top-24 flex h-[70vh] items-center overflow-hidden"
        style={{
          willChange: 'transform',
        }}
      >
        <div
          ref={trackRef}
          className="flex gap-16 px-4"
          style={{
            transform: `translate3d(${translateX}px, 0, 0)`,
            willChange: 'transform',
          }}
        >
          {/* Spacer at start - width of one tile */}
          <div className="flex-shrink-0 w-[840px] sm:w-[960px] md:w-[1140px] lg:w-[1260px]" />
          
          {features.map((feature, index) => (
            <FeatureTile key={index} feature={feature} />
          ))}
          
          {/* Spacer at end - width of one tile plus extra space */}
          <div className="flex-shrink-0 w-[840px] sm:w-[960px] md:w-[1140px] lg:w-[1260px]" />
        </div>
      </div>
    </div>
  );
}

