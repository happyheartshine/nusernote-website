'use client';

import { useState } from 'react';

export default function FAQAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-all">
            <button
              onClick={() => toggleItem(index)}
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-slate-50"
            >
              <span className="pr-4 font-semibold text-slate-900">{item.question}</span>
              <i
                className={`ti ti-chevron-down flex-shrink-0 text-xl text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              ></i>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="border-t border-slate-100 px-6 pt-4 pb-6">
                <p className="leading-relaxed text-slate-600">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
