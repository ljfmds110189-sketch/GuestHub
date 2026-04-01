"use client";

import {
  Children,
  isValidElement,
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import { createPortal } from "react-dom";

type OptionItem = {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
};

type Props = {
  name?: string;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  required?: boolean;
  disabled?: boolean;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  placeholder?: string;
  children?: ReactNode;
};

function toStringValue(value: string | number | readonly string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (typeof value === "number") return String(value);
  return value ?? "";
}

function optionLabel(node: ReactNode) {
  return Children.toArray(node)
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
    .join(" ")
    .trim();
}

function flattenOptions(children: ReactNode): OptionItem[] {
  const entries: OptionItem[] = [];

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const elementType = typeof child.type === "string" ? child.type.toLowerCase() : "";

    if (elementType === "option") {
      const value = toStringValue(child.props.value);
      const label = optionLabel(child.props.children);
      entries.push({ value, label, disabled: Boolean(child.props.disabled) });
      continue;
    }

    if (elementType === "optgroup") {
      const groupLabel = String(child.props.label ?? "").trim();
      for (const sub of Children.toArray(child.props.children)) {
        if (!isValidElement(sub)) continue;
        const subType = typeof sub.type === "string" ? sub.type.toLowerCase() : "";
        if (subType !== "option") continue;
        const value = toStringValue(sub.props.value);
        const label = optionLabel(sub.props.children);
        entries.push({ value, label, disabled: Boolean(sub.props.disabled), group: groupLabel });
      }
    }
  }

  return entries;
}

export function AppSelect({
  name,
  value,
  defaultValue,
  required,
  disabled,
  onChange,
  className = "",
  placeholder,
  children,
}: Props) {
  const options = useMemo(() => flattenOptions(children), [children]);
  const isControlled = value !== undefined;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(toStringValue(defaultValue));
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedValue = isControlled ? toStringValue(value) : internalValue;

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  const displayLabel = selectedOption?.label || placeholder || options[0]?.label || "Select";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const hay = `${option.group ?? ""} ${option.label}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current || typeof window === "undefined") return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const maxLeft = window.innerWidth - viewportPadding - width;
    const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
    const top = rect.bottom + 6;
    setMenuStyle({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => updateMenuPosition();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (open) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selectValue = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    setOpen(false);
    setQuery("");
    onChange?.({ target: { value: nextValue } } as ChangeEvent<HTMLSelectElement>);
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      {required ? (
        <input
          aria-hidden
          tabIndex={-1}
          className="absolute h-0 w-0 opacity-0"
          value={selectedValue}
          onChange={() => {}}
          required
        />
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span className="truncate text-left">{displayLabel}</span>
        <FiChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
              className="fixed z-[140] overflow-hidden rounded-xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <FiSearch className="h-4 w-4 text-white/70" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
                />
              </div>

              <ul className="max-h-56 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-white/60">No results</li>
                ) : (
                  filtered.map((option) => (
                    <li key={`${option.group ?? "root"}-${option.value}`}>
                      <button
                        type="button"
                        disabled={option.disabled}
                        onClick={() => selectValue(option.value)}
                        className={`w-full px-3 py-2 text-left text-sm transition ${
                          selectedValue === option.value
                            ? "bg-cyan-500/30 text-white"
                            : "text-white/90 hover:bg-white/10"
                        } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {option.group ? <span className="me-1 text-[10px] text-white/55">[{option.group}]</span> : null}
                        {option.label}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
