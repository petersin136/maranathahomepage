"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashMonthPoint } from "@/lib/admin/dashboard-data";

const INK = "#2F3A2F";
const QUIET = "#D9D3CB";
const MUTED = "#8A847C";

function ChartTip({
  active,
  payload
}: {
  active?: boolean;
  payload?: { payload: DashMonthPoint }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-[8px] border border-[#E6E1DA] bg-white px-3 py-2">
      <p className="text-[13px] font-bold leading-none text-[#1C1C1C]">{row.label}</p>
      <p className="mt-1.5 text-[12px] leading-none text-[#8A847C]">{row.count}건</p>
    </div>
  );
}

export function DashboardMonthChart({ points }: { points: DashMonthPoint[] }) {
  const max = points.reduce((peak, point) => Math.max(peak, point.count), 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="32%">
        <CartesianGrid vertical={false} stroke="#F3EFEA" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: MUTED, fontSize: 12 }} dy={6} />
        <YAxis
          allowDecimals={false}
          domain={[0, Math.max(4, max)]}
          width={28}
          axisLine={false}
          tickLine={false}
          tick={{ fill: MUTED, fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: "#F6F4F0" }} content={<ChartTip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={42}>
          {points.map((point) => (
            <Cell key={point.key} fill={point.current ? INK : QUIET} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
