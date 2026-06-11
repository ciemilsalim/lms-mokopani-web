import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface DistributionItem {
    range: string;
    count: number;
}

// Indigo-themed gradient from warm (low scores) to cool (high scores)
const COLORS = ['#f43f5e', '#f97316', '#eab308', '#6366f1', '#4F46E5'];

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
                <BarChart data={data} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
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
                            backgroundColor: 'hsl(var(--card))',
                            color: 'hsl(var(--foreground))',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: any) => [value, 'Siswa']}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
