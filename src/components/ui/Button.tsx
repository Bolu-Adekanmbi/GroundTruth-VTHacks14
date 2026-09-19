import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ children, className, icon, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button className={`button button--${variant}${className ? ` ${className}` : ""}`} type="button" {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
