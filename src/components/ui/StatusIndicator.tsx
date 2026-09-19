interface StatusIndicatorProps {
  label: string;
  tone?: "ready" | "warning" | "neutral";
}

export function StatusIndicator({ label, tone = "neutral" }: StatusIndicatorProps) {
  return <span className={`status-indicator status-indicator--${tone}`}>{label}</span>;
}
