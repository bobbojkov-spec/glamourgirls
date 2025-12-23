import React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function baseProps(props: IconProps): IconProps {
  return {
    width: props.width ?? 20,
    height: props.height ?? 20,
    viewBox: props.viewBox ?? "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    ...props,
  };
}

export function GridIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" fill="currentColor" />
    </svg>
  );
}

export function CalenderIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7 2v2M17 2v2M4 7h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function UserCircleIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function TableIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 7h16M4 12h16M4 17h16M8 7v14M16 7v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PageIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PieChartIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 2v10h10A10 10 0 0 0 12 2Z" fill="currentColor" opacity="0.3" />
      <path d="M12 12V2a10 10 0 1 0 10 10H12Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PlugInIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M8 3v6M16 3v6M7 9h10M9 9v4a3 3 0 0 0 6 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 13v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BoxCubeIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 2 3 7l9 5 9-5-9-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 7v10l9 5 9-5V7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 12v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HorizontaLDots(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}


