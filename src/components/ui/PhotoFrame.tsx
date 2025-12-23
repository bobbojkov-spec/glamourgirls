import Image from 'next/image';

interface PhotoFrameProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Adds a slight rotation for polaroid effect */
  polaroid?: boolean;
  /** Thicker border */
  thick?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function PhotoFrame({
  src,
  alt,
  width = 280,
  height = 350,
  polaroid = false,
  thick = false,
  className = '',
  onClick,
}: PhotoFrameProps) {
  return (
    <div 
      className={`
        photo-frame 
        ${thick ? 'photo-frame-thick' : ''} 
        ${polaroid ? 'photo-frame-portrait' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      style={{ width: 'fit-content' }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="block"
        style={{ 
          width: width, 
          height: 'auto',
          maxWidth: '100%',
        }}
      />
    </div>
  );
}




