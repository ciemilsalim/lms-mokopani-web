import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DistributionItem {
    range: string;
    count: number;
}

const COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export default function ScoreDistributionChart({ data }: { data: DistributionItem[] }) {
    if (!data || data.every(d => d.count === 0)) {
        return (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Belum ada data nilai
            </div>
        );
    }

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barCategoryGap="30%">
                    <XAxis
                        dataKey="range"
                        tick={{ fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: 12,
                            border: '1px solid hsl(var(--border))',
                            fontSize: 12,
                        }}
                        formatter={(value: number) => [value, 'Siswa']}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i]} fillOpacity={0.8} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
