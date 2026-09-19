import type { KeyboardEvent } from "react";

export interface SegmentOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface SegmentedControlProps<TValue extends string> {
  label: string;
  options: readonly SegmentOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
}

export function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
  className
}: SegmentedControlProps<TValue>) {
  const selectedIndex = options.findIndex((option) => option.value === value);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = options.length - 1;
    let nextIndex = index;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    const nextValue = options[nextIndex]?.value;
    if (nextValue) {
      onChange(nextValue);
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(
            `[data-segmented-label="${label}"][data-segmented-index="${nextIndex}"]`
          )
          ?.focus();
      });
    }
  }

  return (
    <div className={className ? `segmented ${className}` : "segmented"} role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button
          aria-checked={option.value === value}
          className="segmented__item"
          data-segmented-index={index}
          data-segmented-label={label}
          key={option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          role="radio"
          tabIndex={index === selectedIndex ? 0 : -1}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
