"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<keyof typeof THEMES, string>;
  }
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs text-slate-500 dark:text-slate-400",
          "[&_.recharts-cartesian-axis-tick_text]:fill-slate-500 [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-slate-200",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-300 [&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          "dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-slate-800",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, value]) => value.theme || value.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}`
          )
          .join("\n")
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipPayload = {
  color?: string;
  dataKey?: string | number;
  fill?: string;
  name?: string | number;
  payload?: Record<string, unknown>;
  value?: number | string;
};

function getPayloadConfigFromPayload(config: ChartConfig, payload: ChartTooltipPayload, key: string) {
  const payloadPayload = payload.payload;
  let configLabelKey: string = key;

  if (payloadPayload && typeof payloadPayload === "object" && key in payloadPayload) {
    configLabelKey = String(payloadPayload[key]);
  }

  return config[configLabelKey] || config[key];
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean;
    hideIndicator?: boolean;
    hideLabel?: boolean;
    indicator?: "line" | "dot" | "dashed";
    label?: string | number;
    labelFormatter?: (label: string | number) => React.ReactNode;
    nameKey?: string;
    payload?: ChartTooltipPayload[];
    valueFormatter?: (value: number | string, name?: string | number) => React.ReactNode;
  }
>(
  (
    {
      active,
      className,
      hideIndicator = false,
      hideLabel = false,
      indicator = "dot",
      label,
      labelFormatter,
      nameKey,
      payload,
      valueFormatter
    },
    ref
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) {
      return null;
    }

    const tooltipLabel = !hideLabel ? (labelFormatter && label !== undefined ? labelFormatter(label) : label) : null;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-36 gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl shadow-slate-950/10 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
          className
        )}
      >
        {tooltipLabel ? <div className="font-semibold text-slate-900 dark:text-slate-100">{tooltipLabel}</div> : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = String(nameKey || item.name || item.dataKey || "value");
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = item.color || item.fill || itemConfig?.color || "currentColor";

            return (
              <div key={`${key}-${index}`} className="flex min-w-0 items-center gap-2">
                {!hideIndicator ? (
                  <span
                    className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
                      "h-2.5 w-2.5": indicator === "dot",
                      "h-3 w-1": indicator === "line",
                      "h-0 w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed"
                    })}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor
                      } as React.CSSProperties
                    }
                  />
                ) : null}
                <span className="truncate text-slate-500 dark:text-slate-400">{itemConfig?.label || item.name || key}</span>
                <span className="ml-auto font-mono font-semibold tabular-nums text-slate-950 dark:text-slate-50">
                  {valueFormatter ? valueFormatter(item.value ?? 0, item.name) : item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

type ChartLegendPayload = {
  color?: string;
  dataKey?: string | number;
  value?: string | number;
};

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    hideIcon?: boolean;
    nameKey?: string;
    payload?: ChartLegendPayload[];
  }
>(({ className, hideIcon = false, nameKey, payload }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div ref={ref} className={cn("flex flex-wrap items-center justify-center gap-4 text-xs", className)}>
      {payload.map((item) => {
        const key = String(nameKey || item.dataKey || item.value || "value");
        const itemConfig = config[key];

        return (
          <div key={key} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            {!hideIcon ? <span className="size-2 rounded-[2px]" style={{ backgroundColor: item.color || itemConfig?.color }} /> : null}
            {itemConfig?.label || item.value}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
