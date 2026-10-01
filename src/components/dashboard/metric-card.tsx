import {
  LucideIcon
} from "lucide-react";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  cn
} from "@/lib/utils";

export type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?:
    | "blue"
    | "green"
    | "amber"
    | "slate";
};

const toneClasses = {
  blue:
    "bg-primary/10 text-primary ring-primary/10",
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-100",
  slate:
    "bg-slate-100 text-slate-700 ring-slate-200"
};

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "blue"
}: MetricCardProps) {
  return (
    <Card className="ui-kpi-card h-full overflow-hidden transition-[border-color,box-shadow] duration-150 group-hover:border-primary/20 group-hover:shadow-[0_16px_38px_-28px_hsl(var(--brand-ink)/0.5)]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="mt-2 break-words text-2xl font-black tracking-tight text-brand-ink sm:text-3xl">
              {value}
            </p>
          </div>

          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-150 group-hover:scale-105 motion-reduce:transform-none",
              toneClasses[
                tone
              ]
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <p className="mt-4 text-sm leading-5 text-muted-foreground">
          {detail}
        </p>
      </CardContent>
    </Card>
  );
}
