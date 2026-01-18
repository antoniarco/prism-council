// Icon system matching Lucide style from reference
// Thin stroke (1.5), rounded caps/joins, consistent sizing

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function Archive({ className = "", size = 16 }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function Plus({ className = "", size = 16 }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Clock({ className = "", size = 12 }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function Settings({ className = "", size = 20 }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function Sparkles({ className = "", size = 16 }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
    </svg>
  );
}

export function ArrowRight({ className = "", size = 16 }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export function X({ className = "", size = 16 }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ChevronRight({ className = "", size = 16 }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// Decorative starburst icon inspired by Claude's UI
// 12-pointed flower/asterisk for editorial presence
export function DecorativeBurstIcon({ className = "", size = 30 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* 12-pointed starburst - alternating long and short rays */}
      <g>
        {/* Long rays (primary) */}
        <circle cx="12" cy="3" r="1.2" />
        <circle cx="12" cy="21" r="1.2" />
        <circle cx="3" cy="12" r="1.2" />
        <circle cx="21" cy="12" r="1.2" />
        
        {/* Diagonal long rays */}
        <circle cx="6.1" cy="6.1" r="1.2" />
        <circle cx="17.9" cy="17.9" r="1.2" />
        <circle cx="17.9" cy="6.1" r="1.2" />
        <circle cx="6.1" cy="17.9" r="1.2" />
        
        {/* Short rays (secondary) - offset points */}
        <circle cx="12" cy="7.5" r="0.8" />
        <circle cx="12" cy="16.5" r="0.8" />
        <circle cx="7.5" cy="12" r="0.8" />
        <circle cx="16.5" cy="12" r="0.8" />
        
        {/* Center circle */}
        <circle cx="12" cy="12" r="1.8" />
      </g>
    </svg>
  );
}

