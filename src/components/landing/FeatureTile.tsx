'use client';

import Image from 'next/image';
import Link from 'next/link';

interface FeatureTileProps {
  feature: {
    image: string;
    headline?: string;
    title: string;
    href?: string;
    tag?: string;
    icon?: string;
    description?: string;
  };
}

export default function FeatureTile({ feature }: FeatureTileProps) {
  const href = feature.href || '#';

  return (
    <div className="group relative flex-shrink-0 overflow-hidden rounded-tl-[4rem] border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-lg">
      {/* Image Container */}
      <div className="relative aspect-[4/5] w-[280px] overflow-hidden sm:w-[320px] md:w-[380px] lg:w-[420px]">
        <Image
          src={feature.image}
          alt={feature.title}
          fill
          sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, (max-width: 1024px) 380px, 420px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />

        {/* Overlay Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-left text-white sm:p-8">
          {/* Tag */}
          {feature.tag && (
            <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm sm:text-sm">
              {feature.tag}
            </span>
          )}

          {/* Headline */}
          {feature.headline && (
            <h3 className="mb-4 whitespace-pre-line text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">
              {feature.headline}
            </h3>
          )}

          {/* Button Link */}
          <Link
            href={href}
            className="group/btn inline-flex items-center gap-2 rounded-lg border border-white/40 bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-white/70 hover:bg-white/10 hover:underline focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-900 sm:px-6 sm:py-3 sm:text-base"
          >
            <span>{feature.title}</span>
            <svg
              className="h-4 w-4 transition-transform group-hover/btn:translate-x-1 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

