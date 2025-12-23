import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export default function Button({ 
  variant = 'primary', 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = 'px-6 py-3 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[var(--bg-surface)] border-2 border-[var(--accent-gold)] text-[var(--text-primary)] hover:bg-[var(--state-hover-wash)] focus:ring-[var(--state-focus-ring)]',
    secondary: 'bg-transparent border-2 border-[var(--accent-gold)] text-[var(--text-primary)] hover:bg-[var(--state-hover-wash)] focus:ring-[var(--state-focus-ring)]',
    ghost: 'bg-transparent border-0 text-[var(--text-primary)] hover:bg-[var(--state-hover-wash)] focus:ring-[var(--state-focus-ring)]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

