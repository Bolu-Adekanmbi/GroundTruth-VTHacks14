import type { ReactNode } from "react";

interface FieldWrapperProps {
  children: ReactNode;
  label: string;
  value?: string;
}

export function FieldWrapper({ children, label, value }: FieldWrapperProps) {
  return (
    <label className="field-wrapper">
      <span>
        {label}
        {value ? <strong>{value}</strong> : null}
      </span>
      {children}
    </label>
  );
}
