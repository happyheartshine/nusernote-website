'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function TestimonialSlider({ testimonials }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="rounded-2xl bg-white p-8 shadow-xl sm:p-12">
        <div className="mb-6 flex items-center justify-center">
          <i className="ti ti-quote text-5xl text-blue-200"></i>
        </div>

        <blockquote className="mb-8 text-center">
          <p className="mb-6 text-lg leading-relaxed text-slate-700 sm:text-xl">{currentTestimonial.quote}</p>

          <div className="flex items-center justify-center">
            <Image
              src={currentTestimonial.avatar}
              alt={currentTestimonial.author}
              width={48}
              height={48}
              className="mr-4 h-12 w-12 rounded-full"
            />
            <div className="text-left">
              <div className="font-semibold text-slate-900">{currentTestimonial.author}</div>
              <div className="text-sm text-slate-600">{currentTestimonial.role}</div>
            </div>
          </div>
        </blockquote>

        {/* Navigation */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={goToPrevious}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-600 hover:text-blue-600"
            aria-label="前へ"
          >
            <i className="ti ti-chevron-left"></i>
          </button>

          <div className="flex space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 w-2 rounded-full transition-colors ${index === currentIndex ? 'bg-blue-600' : 'bg-slate-300'}`}
                aria-label={`スライド ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-600 hover:text-blue-600"
            aria-label="次へ"
          >
            <i className="ti ti-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
