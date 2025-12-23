import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="hidden lg:block mb-8">
      <ol className="flex items-center gap-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg
                  className="w-3 h-3 text-[var(--text-muted)] mx-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ opacity: 0.4 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
              {isLast ? (
                <span className="px-4 py-2 rounded-lg text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-semibold text-xs uppercase tracking-[0.15em] shadow-[var(--shadow-subtle)]">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface)] transition-all duration-200 flex items-center gap-2 group text-xs uppercase tracking-[0.15em] font-medium"
                >
                  <svg
                    className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-gold)] transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  {item.label}
                </Link>
              ) : (
                <span className="px-4 py-2 text-[var(--text-secondary)] text-xs uppercase tracking-[0.15em] font-medium">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

