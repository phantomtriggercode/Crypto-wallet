"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export function PriceChart({ data }: { data: { time: string; price: number }[] }) {
  if (data.length < 2) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted">Not enough price history yet.</div>;
  }
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e11d2e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#e11d2e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip
            contentStyle={{ background: "#131318", border: "1px solid #26262f", borderRadius: 8, fontSize: 12 }}
            labelFormatter={() => ""}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Price"]}
          />
          <Area type="monotone" dataKey="price" stroke="#e11d2e" fill="url(#priceFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
