import type { ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface NativeSelectFieldProps extends ComponentProps<"select"> {
  label: string;
  error?: string;
  required?: boolean;
}

export function NativeSelectField({
  label,
  error,
  required,
  className,
  children,
  ...props
}: NativeSelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <select
        {...props}
        aria-invalid={!!error}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          className,
        )}
      >
        {children}
      </select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
