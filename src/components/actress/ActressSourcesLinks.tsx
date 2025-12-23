import { parseHtml } from '@/lib/parseHtml';

interface Link {
  id?: number;
  text: string;
  url: string;
  ord?: number;
}

interface Book {
  id?: number;
  title: string;
  url: string;
  ord?: number;
}

interface ActressSourcesLinksProps {
  sources?: string;
  links?: Link[];
  books?: Book[];
}

export default function ActressSourcesLinks({ sources, links, books }: ActressSourcesLinksProps) {
  const hasContent = sources || (links && links.length > 0) || (books && books.length > 0);
  
  if (!hasContent) {
    return null;
  }

  return (
    <div className="actress-sources-links mt-8 text-left">
      {/* Sources */}
      {sources && (
        <div className="mb-6">
          <div className="timeline-row">
            <div className="timeline-date"></div>
            <div className="timeline-event text-left">
              <span className="underline">Sources:</span>
              {' '}
              <span>{parseHtml(sources)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Books */}
      {books && books.length > 0 && (
        <div className="mb-6">
          <div className="timeline-row">
            <div className="timeline-date"></div>
            <div className="timeline-event text-left">
              <span className="underline">Recommended Books:</span>
            </div>
          </div>
          {books.map((book, index) => (
            <div key={book.id || index} className="timeline-row">
              <div className="timeline-date"></div>
              <div className="timeline-event text-left">
                <a
                  href={book.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-gold)] hover:text-[var(--text-primary)] hover:underline transition-colors"
                >
                  {parseHtml(book.title)}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Links */}
      {links && links.length > 0 && (
        <div>
          <div className="timeline-row">
            <div className="timeline-date"></div>
            <div className="timeline-event text-left">
              <span className="underline">Links:</span>
            </div>
          </div>
          {links.map((link, index) => (
            <div key={link.id || index} className="timeline-row">
              <div className="timeline-date"></div>
              <div className="timeline-event text-left">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-gold)] hover:text-[var(--text-primary)] hover:underline transition-colors"
                >
                  {parseHtml(link.text)}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
