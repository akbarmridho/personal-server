import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import type { ElementRef } from "react";
import { forwardRef } from "react";
import { Button } from "~/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type ButtonVariantProps = VariantProps<typeof Button>;

export type TooltipIconButtonProps = React.ComponentProps<typeof Button> & {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
};

export const TooltipIconButton = forwardRef<
  ElementRef<typeof Button>,
  TooltipIconButtonProps
>(({ children, tooltip, side = "bottom", ...rest }, ref) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-auto p-2"
          {...rest}
          ref={ref}
        >
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});

TooltipIconButton.displayName = "TooltipIconButton";
