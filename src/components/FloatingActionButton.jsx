'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

/**
 * Floating Action Button (FAB)
 * Only shows on mobile, fixed at bottom right
 */
export default function FloatingActionButton({ onClick, label = '新規作成', icon = 'ph-plus' }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-30 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
      aria-label={label}
    >
      <i className={`ph ${icon} text-2xl`}></i>
      <span className="font-semibold">{label}</span>
    </button>
  );
}

FloatingActionButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string,
  icon: PropTypes.string,
};
