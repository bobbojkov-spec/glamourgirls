interface EraBadgeProps {
  era: '20s' | '30s' | '40s' | '50s' | '60s' | string;
  className?: string;
}

const eraColors: Record<string, string> = {
  '20s': 'bg-[#D9E8FF] text-[#3a5a8a]',
  '30s': 'bg-[#E9F8E8] text-[#3a6a3a]',
  '40s': 'bg-[#FFF6D9] text-[#8a6a2a]',
  '50s': 'bg-[#F3E0D6] text-[#8a4a3a]',
  '60s': 'bg-[#F0E9FF] text-[#5a3a8a]',
};

export default function EraBadge({ era, className = '' }: EraBadgeProps) {
  const colorClass = eraColors[era] || 'bg-gray-200 text-gray-600';
  
  return (
    <span 
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-sm ${colorClass} ${className}`}
    >
      {era}
    </span>
  );
}




