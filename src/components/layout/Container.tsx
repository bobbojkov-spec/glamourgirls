interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`max-w-[1200px] mx-auto px-4 ${className}`}>
      {children}
    </div>
  );
}




