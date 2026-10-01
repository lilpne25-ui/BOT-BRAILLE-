"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type ChartItem = {
  name: string;
  value: number;
};

type MonthItem = {
  month: string;
  value: number;
};

const COLORS = [
  "#1B9CD9",
  "#EB5B28",
  "#202D36",
  "#191E39",
  "#CDCCCC",
  "#6CC5E8"
];

function EmptyChart({
  message
}: {
  message: string;
}) {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed bg-brand-background p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function QuoteStatusChart({
  data
}: {
  data: ChartItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Cotizaciones por estado
        </CardTitle>
        <CardDescription>
          Distribucion real de las cotizaciones guardadas en el CRM.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="Aun no hay cotizaciones registradas." />
        ) : (
          <div
            className="h-72 w-full"
            aria-label="Grafica de barras de cotizaciones por estado"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={data}
                margin={{
                  left: -20,
                  right: 12
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#d9e2ec"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 11
                  }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  tick={{
                    fontSize: 12
                  }}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value) => [
                    `${value}`,
                    "Cotizaciones"
                  ]}
                />
                <Bar
                  dataKey="value"
                  radius={[
                    10,
                    10,
                    0,
                    0
                  ]}
                  fill="#1B9CD9"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectTypeChart({
  data
}: {
  data: ChartItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Proyectos por solucion
        </CardTitle>
        <CardDescription>
          Distribucion real de los proyectos operativos.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="Aun no hay proyectos operativos registrados." />
        ) : (
          <>
            <div
              className="h-72 w-full"
              aria-label="Grafica circular de proyectos por tipo de solucion"
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {data.map(
                      (_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            COLORS[
                              index %
                                COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(
                      value,
                      name
                    ) => [
                      `${value}`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {data.map(
                (item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          COLORS[
                            index %
                              COLORS.length
                          ]
                      }}
                      aria-hidden="true"
                    />
                    <span>
                      {item.name} ·{" "}
                      {item.value}
                    </span>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MaintenanceByMonthChart({
  data
}: {
  data: MonthItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Mantenimientos por mes
        </CardTitle>
        <CardDescription>
          Agenda real de proximos mantenimientos registrada en Garantias.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="Aun no hay mantenimientos programados." />
        ) : (
          <div
            className="h-72 w-full"
            aria-label="Grafica de mantenimientos proximos por mes"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={data}
                margin={{
                  left: -20,
                  right: 12
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#d9e2ec"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 11
                  }}
                />
                <YAxis
                  tick={{
                    fontSize: 12
                  }}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value) => [
                    `${value}`,
                    "Mantenimientos"
                  ]}
                />
                <Bar
                  dataKey="value"
                  radius={[
                    10,
                    10,
                    0,
                    0
                  ]}
                  fill="#EB5B28"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
