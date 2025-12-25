'use client';

import Link from 'next/link';
import Image from 'next/image';

export interface ActressListRowProps {
  id: string;
  name: string;
  slug?: string;
  thumbnailUrl: string;
  /** Optional action button (e.g., remove from favorites) */
  actionButton?: React.ReactNode;
  /** Optional additional content to display */
  additionalContent?: React.ReactNode;
  /** Whether this is a "their man" entry */
  theirMan?: boolean;
  /** Custom onClick handler (if provided, Link is not used) */
  onClick?: () => void;
  /** Custom href (if provided, uses this instead of default) */
  href?: string;
  /** If true, row is not clickable (e.g., cart items) */
  nonClickable?: boolean;
}

/**
 * Shared actress row component used in:
 * - Search results
 * - Favorites modal
 * - Shopping cart modal
 * 
 * Provides consistent styling, hover effects, and click feedback.
 */
export default function ActressListRow({
  id,
  name,
  slug,
  thumbnailUrl,
  actionButton,
  additionalContent,
  theirMan = false,
  onClick,
  href,
  nonClickable = false,
}: ActressListRowProps) {
  const defaultHref = slug ? `/actress/${id}/${slug}` : `/actress/${id}`;
  const finalHref = href || defaultHref;

  const rowContent = (
    <div className={`${nonClickable ? '' : 'interactive-row'} flex items-center gap-4 rounded-lg ${nonClickable ? '' : 'hover:bg-[var(--bg-surface-alt)] hover:shadow-sm'}`} style={{ padding: 'clamp(12px, 2vh, 16px)' }}>
      {/* Thumbnail */}
      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
        {thumbnailUrl.startsWith('/api/') || thumbnailUrl.startsWith('http') ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (theirMan && !img.src.includes('placeholder')) {
                img.src = '/images/placeholder-man-portrait.png';
              } else {
                img.style.display = 'none';
              }
            }}
          />
        ) : (
          <Image
            src={thumbnailUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="64px"
            onError={(e) => {
              const img = e.currentTarget;
              if (theirMan && !img.src.includes('placeholder')) {
                img.src = '/images/placeholder-man-portrait.png';
              } else {
                img.style.display = 'none';
              }
            }}
          />
        )}
      </div>

      {/* Name and additional content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-base text-[var(--text-primary)] leading-tight uppercase font-bold truncate"
          style={{ fontFamily: "'Kabel Black', sans-serif" }}
        >
          {name}
        </p>
        {additionalContent && (
          <div className="mt-1">
            {additionalContent}
          </div>
        )}
      </div>

      {/* Action button (if provided) */}
      {actionButton && (
        <div className="flex-shrink-0">
          {actionButton}
        </div>
      )}
    </div>
  );

  if (nonClickable) {
    return <div>{rowContent}</div>;
  }

  if (onClick) {
    return (
      <div onClick={onClick}>
        {rowContent}
      </div>
    );
  }

  return (
    <Link href={finalHref} className="block">
      {rowContent}
    </Link>
  );
}

