'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down & past the header height
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header 
        className={`bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="font-semibold text-gray-900 text-sm">
            DevTools Hub
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6">
        {children}
      </main>
    </div>
  );
}
