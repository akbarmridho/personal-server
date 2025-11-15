import { useEffect, useState } from "react";
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
  max?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  disabled,
  min,
  max,
}: NumberFieldProps) {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        type="number"
        value={inputValue}
        onChange={(e) => {
          const val = e.target.value;
          setInputValue(val);
          if (val === "" || val === "-") return;
          const num = Number(val);
          if (!Number.isNaN(num)) onChange(num);
        }}
        onBlur={() => {
          if (inputValue === "" || inputValue === "-") {
            onChange(0);
            setInputValue("0");
          }
        }}
        placeholder={placeholder}
        className={error ? "border-red-500" : ""}
        disabled={disabled}
        min={min}
        max={max}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
