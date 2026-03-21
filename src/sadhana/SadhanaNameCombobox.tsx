import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

const MAX_SUGGESTIONS_SHOWN = 120;
/** डिफ़ॉल्ट: इतने अक्षरों के बाद ही सुझाव दिखें */
const DEFAULT_MIN_QUERY_LENGTH = 3;

export type SadhanaNameComboboxProps = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  suggestions: string[];
  disabled?: boolean;
  inputClassName: string;
  listHint: string;
  /** कम से कम इतने अक्षर टाइप करने के बाद सुझाव (डिफ़ॉल्ट 3) */
  minQueryLength?: number;
  /** फ़ोकस हटने के बाद (ड्रॉपडाउन बंद होने के बाद) — पैरेंट स्क्रॉल आदि */
  onBlurComplete?: () => void;
};

export const SadhanaNameCombobox: React.FC<SadhanaNameComboboxProps> = ({
  id,
  value,
  onChange,
  suggestions,
  disabled,
  inputClassName,
  listHint,
  minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
  onBlurComplete,
}) => {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<number | undefined>(undefined);
  /** चुनने के तुरंत बाद auto-open वाला effect दोबारा खोल देता है — उसे रोकने के लिए */
  const suppressAutoOpenAfterPick = useRef(false);

  const filtered = useMemo(() => {
    const q = value.trim();
    if (q.length < minQueryLength) {
      return [];
    }
    const qLower = q.toLowerCase();
    return suggestions
      .filter((n) => n.trim().toLowerCase().startsWith(qLower))
      .slice(0, MAX_SUGGESTIONS_SHOWN);
  }, [suggestions, value, minQueryLength]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (disabled) return;
    if (suppressAutoOpenAfterPick.current) {
      suppressAutoOpenAfterPick.current = false;
      return;
    }
    const el = inputRef.current;
    if (!el || document.activeElement !== el) return;
    if (filtered.length > 0) setOpen(true);
    else setOpen(false);
  }, [filtered.length, disabled, value, suggestions.length]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(filtered.length > 0 ? filtered.length - 1 : -1);
    }
  }, [activeIndex, filtered.length]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el || el.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [close]);

  const selectName = (name: string) => {
    suppressAutoOpenAfterPick.current = true;
    onChange(name);
    close();
  };

  const onInputBlur = () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    blurTimer.current = window.setTimeout(() => {
      close();
      onBlurComplete?.();
    }, 150);
  };

  const onInputFocus = () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    if (filtered.length > 0) setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && filtered.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(e.key === 'ArrowDown' ? 0 : filtered.length - 1);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < filtered.length) {
      e.preventDefault();
      selectName(filtered[activeIndex]);
    }
  };

  return (
    <div ref={wrapRef} className="sadhana-combobox">
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        className={inputClassName}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onInputFocus}
        onBlur={onInputBlur}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
      />
      {open && filtered.length > 0 ? (
        <ul
          id={listId}
          className="sadhana-combobox__list"
          role="listbox"
          aria-label={listHint}
        >
          {filtered.map((name, idx) => (
            <li
              key={`${name}-${idx}`}
              role="option"
              aria-selected={activeIndex === idx}
              className={`sadhana-combobox__option${activeIndex === idx ? ' sadhana-combobox__option--active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectName(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
