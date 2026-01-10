import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "~/components/ui/input";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "~/lib/constants/filters";

interface SearchFilterProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

/**
 * Search input with debounced onChange
 */
export function SearchFilter({
  value = "",
  onChange,
  placeholder = "Search documents...",
}: SearchFilterProps) {
  const [inputValue, setInputValue] = useState(value);
  const debouncedValue = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);

  // Update filter when debounced value changes
  useEffect(() => {
    onChange(debouncedValue || undefined);
  }, [debouncedValue, onChange]);

  // Sync with external value changes
  useEffect(() => {
    // Only update inputValue if the external value changed to something
    // different from what we've already debounced.
    // This prevents the input from being cleared/reset while typing.
    if (value !== debouncedValue) {
      setInputValue(value || "");
    }
  }, [value, debouncedValue]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
