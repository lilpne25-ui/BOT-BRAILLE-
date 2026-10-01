import * as React from "react";
import {
  cn
} from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input =
  React.forwardRef<
    HTMLInputElement,
    InputProps
  >(
    (
      {
        className,
        type,
        ...props
      },
      ref
    ) => {
      return (
        <input
          type={type}
          className={cn(
            [
              "flex h-11 w-full rounded-xl border border-input bg-white px-3 py-2",
              "text-sm text-foreground shadow-[0_1px_2px_hsl(var(--brand-ink)/0.04)]",
              "transition-[border-color,box-shadow,background-color] duration-150",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground/80",
              "hover:border-primary/25",
              "focus-visible:border-primary/55 focus-visible:outline-none",
              "focus-visible:ring-4 focus-visible:ring-primary/10",
              "disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-70"
            ].join(" "),
            className
          )}
          ref={ref}
          {...props}
        />
      );
    }
  );

Input.displayName =
  "Input";

export {
  Input
};
