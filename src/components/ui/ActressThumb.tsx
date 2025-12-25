import Image from 'next/image';
import Link from 'next/link';

interface ActressThumbProps {
  id: string;
  name: string;
  photoUrl: string;
  slug?: string;
  era?: string;
}

export default function ActressThumb({ id, name, photoUrl, slug, era }: ActressThumbProps) {
  return (
    <Link href={slug ? `/actress/${id}/${slug}` : `/actress/${id}`} className="block interactive-link">
      <div className="actress-thumb text-center">
        <div className="actress-thumb-photo relative overflow-hidden">
          <Image
            src={photoUrl}
            alt={name}
            width={150}
            height={200}
            className="w-full aspect-[3/4] object-cover"
          />
        </div>
        <div className="mt-2 px-1">
          <span className="text-sm font-bold block truncate uppercase" style={{ fontFamily: "'Kabel Black', sans-serif" }}>
            {name}
          </span>
          {era && (
            <span className="era-badge text-xs">{era}</span>
          )}
        </div>
      </div>
    </Link>
  );
}


