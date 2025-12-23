'use client';

interface AlphabetNavProps {
  /** Label before the alphabet */
  label: string;
  /** Currently selected letter */
  activeLetter?: string;
  /** Callback when a letter is clicked */
  onLetterClick?: (letter: string) => void;
  /** Base URL for links (if using links instead of callback) */
  baseUrl?: string;
  /** Query param name for the letter */
  queryParam?: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function AlphabetNav({
  label,
  activeLetter,
  onLetterClick,
  baseUrl,
  queryParam = 'letter',
}: AlphabetNavProps) {
  const handleClick = (e: React.MouseEvent, letter: string) => {
    if (onLetterClick) {
      e.preventDefault();
      onLetterClick(letter);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-y-1">
      <span className="text-sm text-[#666] mr-3 min-w-[120px]">{label}</span>
      <div className="alphabet-nav">
        {ALPHABET.map((letter) => (
          <a
            key={letter}
            href={baseUrl ? `${baseUrl}?${queryParam}=${letter}` : '#'}
            onClick={(e) => handleClick(e, letter)}
            className={activeLetter === letter ? 'active font-bold' : ''}
          >
            {letter}
          </a>
        ))}
      </div>
    </div>
  );
}




