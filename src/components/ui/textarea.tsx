import * as React from "react";
import {
  cn
} from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea =
  React.forwardRef<
    HTMLTextAreaElement,
    TextareaProps
  >(
    (
      {
        className,
        ...props
      },
      ref
    ) => (
      <textarea
        ref={ref}
        className={cn(
          [
            "flex min-h-[110px] w-full resize-y rounded-xl border border-input bg-white px-3 py-2.5",
            "text-sm leading-6 text-foreground shadow-[0_1px_2px_hsl(var(--brand-ink)/0.04)]",
            "placeholder:text-muted-foreground/80",
            "transition-[border-color,box-shadow,background-color] duration-150",
            "hover:border-primary/25",
            "focus-visible:border-primary/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
            "disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-70"
          ].join(" "),
          className
        )}
        {...props}
      />
    )
  );

Textarea.displayName =
  "Textarea";

export {
  Textarea
};
