import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CurrencyFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function CurrencyField({
  label,
  value,
  onChange,
  placeholder = "0",
  error,
  required = false,
  disabled = false,
}: CurrencyFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters and convert to number
    const numericValue = e.target.value.replace(/[^\d]/g, "");
    const parsedValue = numericValue ? parseInt(numericValue, 10) : 0;
    onChange(parsedValue);
  };

  // Format the value with thousand separators
  const formatValue = (val: number) => {
    return val.toLocaleString("id-ID");
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Rp
        </span>
        <Input
          type="text"
          value={formatValue(value)}
          onChange={handleChange}
          placeholder={placeholder}
          className="pl-10"
          disabled={disabled}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}