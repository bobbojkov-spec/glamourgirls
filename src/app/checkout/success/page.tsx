import Link from 'next/link';
import { Header, Footer } from '@/components/newdesign';
import '../../newdesign/design-tokens.css';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="max-w-[500px] w-full text-center">
          {/* Success frame */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-8">
            {/* Checkmark */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="green"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1
              className="text-[var(--text-primary)] mb-4 uppercase"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                fontSize: 'clamp(15px, calc(15px + 0.268vw), 18px)',
                letterSpacing: '0.14em',
                lineHeight: 1.25,
              }}
            >
              Thank You!
            </h1>

            <p className="text-[var(--text-secondary)] mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
              Your purchase was successful. Your HQ photos are ready for download.
            </p>

            <p className="text-xs text-[var(--text-muted)] mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
              A confirmation email has been sent with your download links.
            </p>

            <hr className="border-[var(--border-subtle)] my-6" />

            <Link
              href="/search"
              className="text-sm text-[var(--accent-gold)] hover:underline"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              ← Back to Browse
            </Link>
          </div>

          {/* Additional info */}
          <div className="mt-8 text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>
            <p>Having trouble? <Link href="/contact" className="text-[var(--accent-gold)] hover:underline">Contact us</Link></p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}




