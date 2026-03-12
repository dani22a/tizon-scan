import React from "react";

type IconProps = {
  size?: number;
  className?: string;
};

const baseProps = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function Leaf({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <path d="M6 3c5 0 11 2 11 8 0 6-5 10-11 10-2 0-3-1-3-3 0-6 4-15 12-15" />
      <path d="M7 14c2 0 5-1 7-3" />
    </svg>
  );
}

export function Map({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
      <line
        x1="9"
        y1="3"
        x2="9"
        y2="18"
      />
      <line
        x1="15"
        y1="6"
        x2="15"
        y2="21"
      />
    </svg>
  );
}

export function Layers({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <polygon points="12,3 22,8 12,13 2,8" />
      <polyline points="2,12 12,17 22,12" />
      <polyline points="2,16 12,21 22,16" />
    </svg>
  );
}

export function ImageIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
      />
      <circle
        cx="9"
        cy="9"
        r="1.5"
      />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  );
}

export function ArrowLeft({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <line
        x1="19"
        y1="12"
        x2="5"
        y2="12"
      />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );
}

export function Camera({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
      <circle
        cx="12"
        cy="13"
        r="4"
      />
    </svg>
  );
}

export function AlertTriangle({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <path d="M12 3l10 18H2L12 3z" />
      <line
        x1="12"
        y1="9"
        x2="12"
        y2="13"
      />
      <circle
        cx="12"
        cy="17"
        r="1"
      />
    </svg>
  );
}

export function CheckCircle({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <polyline points="9,12 11,14 15,10" />
    </svg>
  );
}

export function Info({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <line
        x1="12"
        y1="10"
        x2="12"
        y2="16"
      />
      <circle
        cx="12"
        cy="7"
        r="1"
      />
    </svg>
  );
}

export function ChevronRight({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <polyline points="9,6 15,12 9,18" />
    </svg>
  );
}

export function ChevronDown({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );
}

export function Upload({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line
        x1="12"
        y1="3"
        x2="12"
        y2="15"
      />
    </svg>
  );
}

export function Activity({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </svg>
  );
}

export function Menu({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
      />
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
      />
      <line
        x1="3"
        y1="18"
        x2="21"
        y2="18"
      />
    </svg>
  );
}

export function LogOut({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line
        x1="21"
        y1="12"
        x2="9"
        y2="12"
      />
    </svg>
  );
}

export function Rows3({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function Plus({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function X({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Download({ size = 20, className }: IconProps) {
  return (
    <svg
      {...baseProps(size)}
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
