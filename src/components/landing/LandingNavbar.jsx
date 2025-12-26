'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function LandingNavbar({ logo, links, cta }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Determine active section
      const sections = links.map((link) => link.href.replace('#', ''));
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [links]);

  const scrollToSection = (e, href) => {
    e.preventDefault();
    if (href.startsWith('#')) {
      const element = document.getElementById(href.replace('#', ''));
      if (element) {
        const offset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        setMobileMenuOpen(false);
      }
    }
  };

  return (
    <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src={logo}
              alt="Nurse Note AI"
              width={120}
              height={40}
              className={`h-8 w-auto transition-all ${scrolled ? 'brightness-0' : ''}`}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 lg:flex">
            {links.map((link) => {
              const sectionId = link.href.replace('#', '');
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => scrollToSection(e, link.href)}
                  className={`text-sm font-medium transition-colors ${
                    scrolled
                      ? isActive
                        ? 'text-blue-600'
                        : 'text-slate-700 hover:text-blue-600'
                      : isActive
                        ? 'text-white'
                        : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* CTA Buttons */}
          <div className="hidden items-center space-x-3 lg:flex">
            <a
              href={cta.secondary.href}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {cta.secondary.label}
            </a>
            <Link
              href={cta.primary.href}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {cta.primary.label}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden ${scrolled ? 'text-slate-700' : 'text-white'}`}
            aria-label="メニュー"
          >
            <i className={`ti ti-${mobileMenuOpen ? 'x' : 'menu-2'} text-2xl`}></i>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white py-4 lg:hidden">
            <div className="flex flex-col space-y-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => scrollToSection(e, link.href)}
                  className="text-sm font-medium text-slate-700 hover:text-blue-600"
                >
                  {link.label}
                </a>
              ))}
              <a href={cta.secondary.href} className="text-sm font-medium text-slate-700 hover:text-blue-600">
                {cta.secondary.label}
              </a>
              <Link
                href={cta.primary.href}
                className="inline-block rounded-full bg-blue-600 px-5 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
              >
                {cta.primary.label}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
