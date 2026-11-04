"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DEMO_SERIES } from "@/lib/demo";

const DAY = 86_400_000;
const dateLabel = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Vault value vs net deposits, with buys and sells marked (SPEC 3.2). */
export function ValueChart() {
  const first = DEMO_SERIES[0]?.t ?? 0;
  const last = DEMO_SERIES[DEMO_SERIES.length - 1]?.t ?? 0;
  const ticks = Array.from({ length: Math.floor((last - first) / (2 * DAY)) + 1 }, (_, i) => first + i * 2 * DAY);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={DEMO_SERIES} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="value" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4C98" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#FF4C98" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ffffff" strokeOpacity={0.04} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[first, last]}
            ticks={ticks}
            tickFormatter={dateLabel}
            tick={{ fill: "#5c6a79", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#5c6a79", fontSize: 11, fontFamily: "JetBrains Mono Variable" }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => Math.round(v).toLocaleString("en-US")}
            domain={[
              (min: number) => Math.floor((min - 30) / 50) * 50,
              (max: number) => Math.ceil((max + 30) / 50) * 50,
            ]}
          />
          <Tooltip
            cursor={{ stroke: "#28333f" }}
            contentStyle={{ background: "#171e28", border: "1px solid #28333f", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#8e9cab" }}
            labelFormatter={(t) => dateLabel(Number(t))}
            formatter={(v, name) => [`${Number(v).toFixed(1)} SUI`, name === "value" ? "Vault value" : "Net deposits"]}
          />
          <Line
            type="stepAfter"
            dataKey="deposits"
            stroke="#8e9cab"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={1.2}
          />
          <Area type="monotone" dataKey="value" stroke="#FF4C98" strokeWidth={2} fill="url(#value)" />
          {DEMO_SERIES.filter((p) => p.trade).map((p) => (
            <ReferenceDot
              key={p.t}
              x={p.t}
              y={p.value}
              r={4}
              fill={p.trade === "buy" ? "#3ddc97" : "#efa1c9"}
              stroke="#0d1117"
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
