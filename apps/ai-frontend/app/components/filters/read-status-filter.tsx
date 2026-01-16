import { Circle, FilterIcon } from "lucide-react";
import type { ReadStatusFilter as ReadStatusFilterType } from "~/lib/utils/url-params";

interface ReadStatusFilterOption {
  value: ReadStatusFilterType;
  label: string;
  icon: React.ReactNode;
}

interface ReadStatusFilterProps {
  value: ReadStatusFilterType;
  onChange: (value: ReadStatusFilterType) => void;
}

const READ_STATUS_OPTIONS: ReadStatusFilterOption[] = [
  {
    value: "all",
    label: "All Articles",
    icon: <FilterIcon className="h-4 w-4" />,
  },
  {
    value: "unread",
    label: "Unread Only",
    icon: <Circle className="h-4 w-4" />,
  },
  {
    value: "read",
    label: "Read Only",
    icon: (
      <span className="h-4 w-4 flex items-center justify-center text-xs">
        ✓
      </span>
    ),
  },
];

interface FilterBadgeProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function FilterBadge({ isActive, onClick, icon, children }: FilterBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-secondary/50 text-secondary-foreground hover:bg-secondary border border-border/50"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

/**
 * Read status filter for golden article timeline
 * Allows filtering by all/read/unread articles
 */
export function ReadStatusFilter({ value, onChange }: ReadStatusFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Read Status
      </span>
      <div className="flex flex-wrap gap-2">
        {READ_STATUS_OPTIONS.map((option) => (
          <FilterBadge
            key={option.value}
            isActive={value === option.value}
            onClick={() => onChange(option.value)}
            icon={option.icon}
          >
            {option.label}
          </FilterBadge>
        ))}
      </div>
    </div>
  );
}
