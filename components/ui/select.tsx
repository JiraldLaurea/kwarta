import * as React from "react";
import { LuCheck as Check, LuChevronDown as ChevronDown } from "react-icons/lu";
import { cn } from "@/lib/utils";

export type SelectOption = {
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  value: string;
};

export type SelectProps = {
  "aria-label"?: string;
  compactOptions?: boolean;
  disabled?: boolean;
  id?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  value: string;
};

export function Select({
  "aria-label": ariaLabel,
  compactOptions = false,
  disabled,
  id,
  onValueChange,
  options,
  placeholder = "Select an option",
  triggerClassName,
  value,
}: SelectProps) {
  const buttonId = React.useId();
  const listboxId = React.useId();
  const [isOpen, setIsOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const hasIcons = options.some((option) => option.icon);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  function blurFocusedTextInput() {
    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      activeElement.blur();
    }
  }

  function handleTriggerPointerDown() {
    blurFocusedTextInput();
  }

  function handleTriggerClick() {
    if (disabled) {
      return;
    }

    setIsOpen((open) => !open);
  }

  function selectOption(option: SelectOption) {
    if (option.disabled) {
      return;
    }

    onValueChange(option.value);
    setIsOpen(false);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  return (
    <div className="relative" ref={selectRef}>
      <button
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-white px-3 py-2 text-left text-base text-foreground transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
          isOpen && "border-ring ring-2 ring-ring/20",
          triggerClassName,
        )}
        disabled={disabled}
        id={id ?? buttonId}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        onPointerDown={handleTriggerPointerDown}
      >
        <span className="flex min-w-0 items-center gap-2">
          {hasIcons && selectedOption?.icon ? (
            <span className="flex shrink-0 items-center">
              {selectedOption.icon}
            </span>
          ) : null}
          <span className="min-w-0 truncate">
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
      </button>
      {isOpen && (
        <div
          className="absolute left-0 top-full z-[80] mt-1 w-full min-w-full rounded-lg border border-border bg-white p-2 shadow-sm"
          role="presentation"
        >
          <div
            className="kwarta-scrollbar max-h-72 overflow-y-auto"
            id={listboxId}
            role="listbox"
            tabIndex={-1}
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  aria-disabled={option.disabled}
                  aria-selected={isSelected}
                  className={cn(
                    "relative flex h-10 w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 pr-8 text-left text-sm leading-5 text-foreground outline-none focus:bg-[hsl(var(--hover-surface))] md:hover:bg-[hsl(var(--hover-surface))]",
                    compactOptions && "px-3",
                    option.disabled &&
                      "pointer-events-none cursor-not-allowed opacity-50",
                  )}
                  disabled={option.disabled}
                  key={option.value}
                  role="option"
                  type="button"
                  onClick={() => selectOption(option)}
                >
                  {hasIcons ? (
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center",
                        compactOptions && "w-auto justify-start",
                      )}
                    >
                      {option.icon}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected && (
                    <span className="absolute right-3 inline-flex items-center">
                      <Check className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
