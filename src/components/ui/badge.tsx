import * as React from "react";
import {
  cva,
  type VariantProps
} from "class-variance-authority";
import {
  cn
} from "@/lib/utils";

const badgeVariants =
  cva(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
      variants: {
        variant: {
          default:
            "border-primary/15 bg-primary/10 text-primary",
          secondary:
            "border-border bg-secondary/75 text-secondary-foreground",
          success:
            "border-emerald-200/80 bg-emerald-50 text-emerald-700",
          warning:
            "border-amber-200/80 bg-amber-50 text-amber-800",
          destructive:
            "border-red-200/80 bg-red-50 text-red-700",
          outline:
            "border-border bg-white text-foreground"
        }
      },
      defaultVariants: {
        variant:
          "default"
      }
    }
  );

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<
      typeof badgeVariants
    > {}

function Badge({
  className,
  variant,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({
          variant
        }),
        className
      )}
      {...props}
    />
  );
}

export {
  Badge,
  badgeVariants
};
