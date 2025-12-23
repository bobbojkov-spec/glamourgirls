interface VintageTitleProps {
  /** First name or top line (script font) */
  firstName?: string;
  /** Last name or main title (display font) */
  lastName: string;
  /** SEO H1 title - overrides lastName if provided */
  h1Title?: string | null;
  /** Color variant for the last name */
  color?: 'red' | 'blue' | 'gold' | 'black' | 'brown';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'hero';
  /** Era-based styling (affects color tone) */
  era?: '30s' | '40s' | '50s' | '60s';
  /** Optional tagline below the title */
  tagline?: string;
  /** Show decorative ornaments */
  ornaments?: boolean;
  className?: string;
}

const colorMap = {
  red: 'text-vintage-red',
  blue: 'text-vintage-blue',
  gold: 'text-vintage-gold',
  black: 'text-vintage-black',
  brown: 'text-vintage-brown',
};

const eraColorMap = {
  '30s': 'title-era-30s',
  '40s': 'title-era-40s',
  '50s': 'title-era-50s',
  '60s': 'title-era-60s',
};

const sizeMap = {
  sm: { 
    script: 'script-sm', 
    display: 'title-small',
    tagline: 'text-base'
  },
  md: { 
    script: 'script-md', 
    display: 'title-card',
    tagline: 'text-lg'
  },
  lg: { 
    script: 'script-lg', 
    display: 'title-section',
    tagline: 'text-xl'
  },
  hero: { 
    script: 'script-lg', 
    display: 'title-hero',
    tagline: 'text-2xl'
  },
};

export default function VintageTitle({
  firstName,
  lastName,
  h1Title,
  color = 'red',
  size = 'lg',
  era,
  tagline,
  ornaments = false,
  className = '',
}: VintageTitleProps) {
  const sizes = sizeMap[size];
  const colorClass = era ? eraColorMap[era] : colorMap[color];
  
  // Use h1Title if provided, otherwise fallback to lastName
  const displayTitle = h1Title || lastName;
  
  return (
    <div className={`text-center ${className}`}>
      {/* First name in script font */}
      {firstName && (
        <div 
          className={`vintage-script ${sizes.script} leading-none`}
          style={{ marginBottom: '-0.3em' }}
        >
          {firstName}
        </div>
      )}
      
      {/* Main title - H1 with SEO title or lastName in Protest Strike */}
      <h1 
        className={`font-protest ${sizes.display} ${ornaments ? 'title-ornament' : ''} ${era === '50s' ? 'title-50s-smaller' : ''}`}
        style={{ 
          display: 'inline-block', 
          margin: 0, 
          padding: 0
        }}
      >
        {displayTitle}
      </h1>
      
      {/* Optional tagline */}
      {tagline && (
        <div 
          className={`vintage-alt ${sizes.tagline} text-vintage-brown mt-2 italic`}
          style={{ opacity: 0.85 }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
}

/* 
  Usage Examples:
  
  // Basic actress name
  <VintageTitle firstName="Marilyn" lastName="Monroe" />
  
  // Era-styled title
  <VintageTitle firstName="Grace" lastName="Kelly" era="50s" />
  
  // Hero title with tagline
  <VintageTitle 
    lastName="Glamour Girls" 
    size="hero" 
    color="gold"
    tagline="of the Silver Screen" 
  />
  
  // Section header with ornaments
  <VintageTitle 
    lastName="Biography" 
    size="md" 
    color="blue"
    ornaments 
  />
*/
