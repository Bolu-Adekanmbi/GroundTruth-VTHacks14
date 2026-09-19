import type { ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export function Tooltip({ children, label }: TooltipProps) {
  return (
    <span className="tooltip" data-tooltip={label}>
      {children}
    </span>
  );
}
