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
  /** Custom font size for the name (e.g., for cart items) */
  nameFontSize?: string;
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
  nameFontSize,
}: ActressListRowProps) {
  const defaultHref = slug ? `/actress/${id}/${slug}` : `/actress/${id}`;
  const finalHref = href || defaultHref;

  // Auto-detect "their men" entries by checking if URL matches headshot pattern
  // This handles cases where theirMan prop isn't passed but the entry is a "their man"
  const isHeadshotUrl = thumbnailUrl.includes('/api/actresses/') && thumbnailUrl.includes('/headshot');
  const shouldUseManPlaceholder = theirMan || isHeadshotUrl;

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
              // Prevent infinite loop by checking if we're already trying a placeholder
              if (img.src.includes('placeholder')) {
                img.style.display = 'none';
                return;
              }
              // Use appropriate placeholder based on entry type
              if (shouldUseManPlaceholder) {
                img.src = '/images/placeholder-man-portrait.png';
              } else {
                img.src = '/images/placeholder-portrait.png';
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
              // For Next.js Image, we need to handle errors differently
              // The error event doesn't give us direct access to change src
              // So we'll use a regular img tag as fallback
              const container = e.currentTarget.parentElement;
              if (container) {
                const fallbackImg = document.createElement('img');
                fallbackImg.src = shouldUseManPlaceholder 
                  ? '/images/placeholder-man-portrait.png' 
                  : '/images/placeholder-portrait.png';
                fallbackImg.alt = name;
                fallbackImg.className = 'w-full h-full object-cover';
                fallbackImg.style.width = '100%';
                fallbackImg.style.height = '100%';
                container.innerHTML = '';
                container.appendChild(fallbackImg);
              }
            }}
          />
        )}
      </div>

      {/* Name and additional content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[var(--text-primary)] leading-tight truncate"
          style={{ 
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: nameFontSize || 'clamp(16px, 0.4vw + 16px, 18px)',
            fontWeight: 600, // SemiBold
            letterSpacing: '0.01em',
          }}
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

