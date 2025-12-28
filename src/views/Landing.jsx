'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { landingContent } from '@/data/landingContent';
import LandingNavbar from '@/components/landing/LandingNavbar';
import Section from '@/components/landing/Section';
import HorizontalFeatureScroll from '@/components/landing/HorizontalFeatureScroll';
import PricingCard from '@/components/landing/PricingCard';
import Counter from '@/components/landing/Counter';
import FAQAccordion from '@/components/landing/FAQAccordion';
import TestimonialSlider from '@/components/landing/TestimonialSlider';

export default function Landing() {
  const { nav, hero, trustStrip, problemSolution, features, howItWorks, security, pricing, faq, testimonials, footer } = landingContent;

  // Hero image slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroImages = [
    '/assets/images/landing/img_mv01.jpg',
    '/assets/images/landing/img_mv02.jpg',
    '/assets/images/landing/img_mv03.jpg',
    '/assets/images/landing/img_mv04.jpg',
    '/assets/images/landing/img_mv05.jpg',
    '/assets/images/landing/img_mv06.jpg'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="min-h-screen bg-white">
      {/* ===== NAVBAR ===== */}
      <LandingNavbar logo={nav.logo} links={nav.links} cta={nav.cta} />

      {/* ===== HERO SECTION ===== */}
      <section id="hero" className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20">
        {/* Background Image Slider */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image src={image} alt={`Hero Background ${index + 1}`} fill className="object-cover" priority={index === 0} />
            </div>
          ))}
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              <h1 className="mb-6 text-4xl leading-tight font-bold text-white sm:text-5xl lg:text-6xl">{hero.headline}</h1>
              <p className="mb-8 text-lg leading-relaxed text-blue-100 sm:text-xl">{hero.subhead}</p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href={hero.cta.primary.href}
                  className="w-full rounded-full bg-white px-8 py-4 text-center font-semibold text-blue-600 shadow-xl transition-all hover:bg-blue-50 hover:shadow-2xl sm:w-auto"
                >
                  {hero.cta.primary.label}
                </Link>
                <a
                  href={hero.cta.secondary.href}
                  className="w-full rounded-full border-2 border-white px-8 py-4 text-center font-semibold text-white transition-all hover:bg-white hover:text-blue-600 sm:w-auto"
                >
                  {hero.cta.secondary.label}
                </a>
              </div>
            </div>

            {/* Right: Hero Image with Floating Badges */}
            <div className="relative"></div>
          </div>

          {/* Trust Strip */}
          <div className="mt-16 grid grid-cols-2 gap-6 sm:mt-20 md:grid-cols-4">
            {trustStrip.map((item, index) => (
              <div key={index} className="text-center">
                <div className="mb-3 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
                    <i className={`${item.icon} text-xl`}></i>
                  </div>
                </div>
                <div className="text-sm font-medium text-blue-100">{item.label}</div>
                <div className="text-xs text-blue-200">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROBLEM → SOLUTION SECTION ===== */}
      <Section id="problem-solution" background="white">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">現場の課題を、AIで解決</h2>
          <p className="mx-auto max-w-2xl text-slate-600">訪問看護の現場で日々感じる負担を、テクノロジーの力で軽減します。</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Problem */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <i className="ti ti-alert-circle text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-red-900">{problemSolution.problem.title}</h3>
            </div>
            <ul className="space-y-3">
              {problemSolution.problem.items.map((item, index) => (
                <li key={index} className="flex items-start text-slate-700">
                  <i className="ti ti-x mt-1 mr-2 flex-shrink-0 text-red-500"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <i className="ti ti-bulb text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-blue-900">{problemSolution.solution.title}</h3>
            </div>
            <ul className="space-y-3">
              {problemSolution.solution.items.map((item, index) => (
                <li key={index} className="flex items-start text-slate-700">
                  <i className="ti ti-check mt-1 mr-2 flex-shrink-0 text-blue-600"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {problemSolution.stats.map((stat, index) => (
            <Counter key={index} value={stat.value} unit={stat.unit} label={stat.label} />
          ))}
        </div>
      </Section>

      {/* ===== FEATURES SECTION ===== */}
      <Section id="features" background="gray">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">充実した機能で、記録業務を効率化</h2>
          <p className="mx-auto max-w-2xl text-slate-600">訪問看護の現場で本当に必要な機能を、使いやすく実装しました。</p>
        </div>

        <HorizontalFeatureScroll features={features} />
      </Section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <Section id="how-it-works" background="white">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{howItWorks.title}</h2>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-3">
            {howItWorks.steps.map((step, index) => (
              <div key={index} className="relative text-center">
                {/* Connector line (hidden on mobile) */}
                {index < howItWorks.steps.length - 1 && (
                  <div className="absolute top-16 left-1/2 hidden h-0.5 w-full bg-blue-200 md:block"></div>
                )}

                <div className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                  <i className={`${step.icon} text-3xl`}></i>
                </div>

                <div className="mb-2 text-sm font-bold text-blue-600">{step.number}</div>
                <h3 className="mb-3 text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Demo Image */}
          <div className="mt-12">
            <Image
              src={howItWorks.demoImage}
              alt="使い方デモ"
              width={1000}
              height={600}
              className="w-full rounded-2xl border border-slate-200 shadow-xl"
            />
          </div>
        </div>
      </Section>

      {/* ===== SECURITY SECTION ===== */}
      <Section id="security" background="gradient">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{security.title}</h2>
          <p className="mx-auto max-w-2xl text-slate-600">{security.subtitle}</p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {security.features.map((feature, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <i className={`${feature.icon} text-2xl`}></i>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-blue-50 p-6 text-center">
            <p className="text-sm text-slate-700">{security.note}</p>
          </div>
        </div>
      </Section>

      {/* ===== PRICING SECTION ===== */}
      <Section id="pricing" background="white">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{pricing.title}</h2>
          <p className="mx-auto max-w-2xl text-slate-600">{pricing.subtitle}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {pricing.plans.map((plan, index) => (
            <PricingCard key={index} plan={plan} />
          ))}
        </div>
      </Section>

      {/* ===== TESTIMONIALS SECTION ===== */}
      <Section background="gray">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">導入事例の声</h2>
          <p className="mx-auto max-w-2xl text-slate-600">実際にNurse Note AIを導入いただいている現場の声をお届けします。</p>
        </div>

        <TestimonialSlider testimonials={testimonials} />
      </Section>

      {/* ===== FAQ SECTION ===== */}
      <Section id="faq" background="white">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{faq.title}</h2>
        </div>

        <FAQAccordion items={faq.items} />
      </Section>

      {/* ===== FINAL CTA SECTION ===== */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-900 py-16 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">
            記録業務の負担を減らし、
            <br />
            患者さんとの時間を増やしませんか？
          </h2>
          <p className="mb-8 text-lg text-blue-100">今すぐNurse Note AIを試して、現場の変化を実感してください。</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={nav.cta.primary.href}
              className="w-full rounded-full bg-white px-8 py-4 text-center font-semibold text-blue-600 shadow-xl transition-all hover:bg-blue-50 sm:w-auto"
            >
              {nav.cta.primary.label}
            </Link>
            <a
              href={nav.cta.secondary.href}
              className="w-full rounded-full border-2 border-white px-8 py-4 text-center font-semibold text-white transition-all hover:bg-white hover:text-blue-600 sm:w-auto"
            >
              {nav.cta.secondary.label}
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <Image src={nav.logo} alt={footer.productName} width={120} height={40} className="mx-auto mb-4 h-8 w-auto" />
            <p className="mb-6 text-slate-400">{footer.tagline}</p>
            <div className="flex flex-wrap justify-center gap-6">
              {footer.links.map((link, index) => (
                <a key={index} href={link.href} className="text-sm text-slate-400 transition-colors hover:text-white">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-sm text-slate-500">{footer.copyright}</p>
          </div>
        </div>
      </footer>

      {/* ===== Custom Animations ===== */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float 3s ease-in-out 1s infinite;
        }
      `}</style>
    </div>
  );
}
