import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ action, title }: SectionHeaderProps) {
  return (
    <header className="section-header">
      <h2>{title}</h2>
      {action}
    </header>
  );
}
