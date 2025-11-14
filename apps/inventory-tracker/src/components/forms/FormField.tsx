import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  error?: string;
  required?: boolean;
}

export function FormField({
  label,
  error,
  required,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input {...props} aria-invalid={!!error} className={cn(className)} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface TextareaProps extends ComponentProps<"textarea"> {
  label: string;
  error?: string;
  required?: boolean;
}

export function FormTextarea({
  label,
  error,
  required,
  className,
  ...props
}: TextareaProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <textarea
        {...props}
        aria-invalid={!!error}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          className,
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
