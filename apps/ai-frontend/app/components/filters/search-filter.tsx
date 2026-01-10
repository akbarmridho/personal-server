import { Search } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Input } from "~/components/ui/input";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "~/lib/constants/filters";

interface SearchFilterProps {
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

export interface SearchFilterRef {
  clear: () => void;
}

/**
 * Search input with debounced onChange (local state only, not synced to URL)
 */
export const SearchFilter = forwardRef<SearchFilterRef, SearchFilterProps>(
  function SearchFilter(
    { onChange, placeholder = "Search documents..." },
    ref,
  ) {
    const [inputValue, setInputValue] = useState("");
    const debouncedValue = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);

    // Store latest onChange callback in a ref to avoid effect re-runs
    const onChangeRef = useRef(onChange);
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Update filter when debounced value changes
    useEffect(() => {
      onChangeRef.current(debouncedValue || undefined);
    }, [debouncedValue]);

    // Expose clear method
    useImperativeHandle(ref, () => ({
      clear: () => setInputValue(""),
    }));

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
  },
);
