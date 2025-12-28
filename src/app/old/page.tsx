import type { Metadata } from 'next';
import { Header, HeroHome, ColumnLayout, Footer } from '@/components/newdesign';
import '../newdesign/design-tokens.css';

export const metadata: Metadata = {
  title: 'Glamour Girls of the Silver Screen',
  description:
    'Dedicated to the private lives of some of the most glamorous actresses of the Thirties, Forties, Fifties, and Sixties.',
};

interface BasicActress {
  id: string;
  name: string;
  slug?: string;
  decade: string;
  imageUrl: string;
  era?: string;
}

const STATIC_ACTRESSES: BasicActress[] = [
  { id: '6', name: 'Audrey Hepburn', slug: 'audrey-hepburn', decade: '1950s', imageUrl: '/newpic/6/headshot.jpg', era: '1950s' },
  { id: '87', name: 'Marilyn Monroe', slug: 'marilyn-monroe', decade: '1950s', imageUrl: '/newpic/87/headshot.jpg', era: '1950s' },
  { id: '94', name: 'Rita Hayworth', slug: 'rita-hayworth', decade: '1940s', imageUrl: '/newpic/94/headshot.jpg', era: '1940s' },
  { id: '89', name: 'Lauren Bacall', slug: 'lauren-bacall', decade: '1960s', imageUrl: '/newpic/89/headshot.jpg', era: '1960s' },
  { id: '151', name: 'Gene Tierney', slug: 'gene-tierney', decade: '1940s', imageUrl: '/newpic/151/headshot.jpg', era: '1940s' },
  { id: '184', name: 'Myrna Loy', slug: 'myrna-loy', decade: '1930s', imageUrl: '/newpic/184/headshot.jpg', era: '1930s' },
  { id: '192', name: 'Ingrid Bergman', slug: 'ingrid-bergman', decade: '1940s', imageUrl: '/newpic/192/headshot.jpg', era: '1940s' },
  { id: '200', name: 'Grace Kelly', slug: 'grace-kelly', decade: '1950s', imageUrl: '/newpic/200/headshot.jpg', era: '1950s' },
];

const filmTemplates = [
  (name: string) => `The ${name} Affair`,
  (name: string) => `${name} at Midnight`,
  (name: string) => `Letters to ${name}`,
  (name: string) => `Return of ${name}`,
];

const buildFilmTitle = (fullName: string, index: number) => {
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const template = filmTemplates[index % filmTemplates.length];
  return template(lastName || fullName);
};

export default function HomePage() {
  const featuredActresses = STATIC_ACTRESSES;
  const decadesData = STATIC_ACTRESSES.slice(0, 6);
  const latestEntries = STATIC_ACTRESSES.slice(0, 6);
  const archivePhotos = STATIC_ACTRESSES.slice(0, 6).map((actress) => actress.imageUrl);
  const heroImage = '/images/hero-image.png';
  const filmNotes = featuredActresses.slice(0, 3).map((actress, index) => ({
    title: buildFilmTitle(actress.name, index),
    star: actress.name,
    year: `19${40 + index}`,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />

      <main className="flex-1">
        <HeroHome backgroundImageUrl={heroImage} />
        <section className="bg-[var(--bg-page)] py-10 md:py-16 px-4 md:px-6 lg:px-8">
          <div className="max-w-[1600px] mx-auto">
            <ColumnLayout
              featuredData={featuredActresses}
              decadesData={decadesData}
              photoArchive={archivePhotos}
              latestData={latestEntries}
            />
          </div>
        </section>

        <section className="bg-[var(--bg-page)] px-4 md:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-[var(--text-secondary)] leading-relaxed" style={{ fontFamily: 'Montserrat, var(--font-ui)' }}>
            <p className="uppercase tracking-[0.25em] text-xs mb-4 text-[var(--text-muted)]">Dedicated to Cheryl Messina</p>
            <p className="mb-4">
              Welcome to our website dedicated to the private lives of some of the most glamorous actresses of the Thirties, Forties, Fifties, and Sixties.
            </p>
            <p className="mb-4 font-semibold text-[var(--text-primary)] uppercase tracking-[0.2em]">
              Information from thousands of newspapers has recently been added to many entries. More to come, including new faces, so please check back often!
            </p>
            <p className="mb-4">
              Our main sources of information are the newspaper and movie magazine gossip columnist of the day such as Earl Wilson, Harrison Carroll, Louella Parsons, Dorothy Kilgallen, Hedda Hopper, Erskine Johnson and Walter Winchell. We also utilize some highly recommended books such as <em>Fallen Angels</em> by Kirk Crivello, <em>Screen Sirens Scream!</em> by Paul Parla and Charles P. Mitchell, <em>Dark City Dames</em> by Eddie Muller, and the great books and articles by esteemed writers Tom Lisanti and Tom Weaver. We sort the information in chronological order. If we come across conflicting details (like birth dates), all facts are provided. For filmographies please use the links to the IMDb. If you have some additional information or are interested in other celebrities of this period, please fill out the contact form and let us know.
            </p>
            <p className="mb-4">
              Special thanks to our friends Roger Bürgler of Gersau, Switzerland; Dino Cerutti of New York City; Humberto Corado of San Salvador, El Salvador; Jack Randall Earles of Mooresville, Indiana; Don Hart of Buford, Georgia; Marc L. Kagan of San Leandro, California; Richard Koper of Amsterdam, Holland; Donna &amp; Paul Parla of Montrose, California; Charles P. Mitchell of Millinocket, Maine; John O&#39;Dowd of Pine Brook, New Jersey; Jonas Varnas of Vilnius, Lithuania; and Paul Woodbine of Warwick, Rhode Island, for their invaluable contributions.
            </p>
            <p className="font-semibold text-[var(--text-primary)]">
              And a very special THANK YOU to Kirk Crivello for his kind and generous support!
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

