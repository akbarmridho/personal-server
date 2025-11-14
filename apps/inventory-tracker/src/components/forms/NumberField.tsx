import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NumberFieldProps {
  label: string;
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  disabled,
  min = 0,
}: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={placeholder}
        className={error ? "border-red-500" : ""}
        disabled={disabled}
        min={min}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
