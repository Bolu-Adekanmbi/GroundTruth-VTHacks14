import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tooltip?: string;
  children: ReactNode;
}

export function IconButton({ children, className, label, tooltip, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button${className ? ` ${className}` : ""}`}
      data-tooltip={tooltip ?? label}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
