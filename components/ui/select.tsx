import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

export type SelectProps = {
  disabled?: boolean;
  id?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
};

export function Select({
  disabled,
  id,
  onValueChange,
  options,
  placeholder = "Select an option",
  value
}: SelectProps) {
  function blurFocusedTextInput() {
    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      activeElement.blur();
    }
  }

  return (
    <SelectPrimitive.Root
      disabled={disabled}
      onValueChange={onValueChange}
      value={value}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-base text-foreground transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-[#2563EB] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.18)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        )}
        id={id}
        onPointerDown={blurFocusedTextInput}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-[80] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-white p-2 shadow-sm"
          avoidCollisions={false}
          position="popper"
          side="bottom"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                className="relative flex h-10 cursor-pointer select-none items-center rounded-md px-3 pr-8 text-sm leading-5 text-foreground outline-none md:hover:bg-neutral-100 focus:bg-neutral-100 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center">
                  <Check className="h-4 w-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
