'use client';

import { ReactNode } from 'react';

interface VintageButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function VintageButton({ 
  children, 
  onClick, 
  href, 
  className = '',
  type = 'button'
}: VintageButtonProps) {
  const buttonClasses = `interactive-button inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-medium tracking-wide uppercase text-[var(--text-primary)] relative overflow-hidden group ${className}`;
  
  const buttonStyle = {
    backgroundColor: '#fef9eb',
    border: '1px solid #6f5718',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (window.innerWidth >= 768) {
      const target = e.currentTarget;
      target.style.backgroundColor = '#fff5e1';
      target.style.borderColor = '#8b6f2a';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    target.style.backgroundColor = '#fef9eb';
    target.style.borderColor = '#6f5718';
  };

  if (href) {
    return (
      <a
        href={href}
        className={buttonClasses}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="relative z-10">{children}</span>
        <div 
          className="absolute inset-0 bg-gradient-to-r from-[#1890ff]/20 via-[#1890ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
      </a>
    );
  }

  return (
    <button
      type={type}
      className={buttonClasses}
      style={buttonStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="relative z-10">{children}</span>
      <div 
        className="absolute inset-0 bg-gradient-to-r from-[#1890ff]/20 via-[#1890ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
    </button>
  );
}

