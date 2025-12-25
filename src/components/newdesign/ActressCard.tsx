import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ActressCardProps {
  id: string;
  name: string;
  decade: string;
  imageUrl: string;
  slug?: string;
}

export default function ActressCard({ id, name, decade, imageUrl, slug }: ActressCardProps) {
  const href = slug ? `/actress/${id}/${slug}` : `/actress/${id}`;
  
  return (
    <Link href={href} className="group interactive-link">
      <div className="interactive-row bg-[var(--bg-surface)] rounded-lg shadow-[var(--shadow-subtle)] overflow-hidden hover:shadow-[var(--shadow-lift)]">
        {/* Image */}
        <div className="relative w-full aspect-square overflow-hidden rounded-lg">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
        
        {/* Text */}
        <div className="p-4">
          <h3 
            className="text-[var(--text-primary)] font-bold text-[28px] leading-[1.2] mb-1"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {name}
          </h3>
          <p 
            className="text-[13px] text-[var(--text-secondary)] uppercase"
            style={{ letterSpacing: '0.08em' }}
          >
            {decade}
          </p>
        </div>
      </div>
    </Link>
  );
}

