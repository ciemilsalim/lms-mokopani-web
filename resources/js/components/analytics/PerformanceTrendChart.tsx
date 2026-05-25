import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface AssignmentScore {
    id: number;
    title: string;
    assessment_type: string;
    max_points: number;
    passing_grade: number;
    avg_score: number | null;
    submission_count: number;
    student_count: number;
    due_date: string | null;
}

export default function PerformanceTrendChart({ data }: { data: AssignmentScore[] }) {
    const chartData = data.map((a, i) => ({
        name: a.title.length > 20 ? a.title.substring(0, 20) + '…' : a.title,
        avg: a.avg_score,
        passing: a.passing_grade,
        index: i,
    }));

    if (!chartData.length || chartData.every(d => d.avg === null)) {
        return (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Belum ada data nilai
            </div>
        );
    }

    return (
        <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        domain={[0, 100]}
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
                    />
                    <ReferenceLine
                        y={70}
                        stroke="hsl(var(--destructive))"
                        strokeDasharray="4 4"
                        strokeOpacity={0.5}
                        label={{
                            value: 'KKTP',
                            position: 'right',
                            fontSize: 10,
                            fill: 'hsl(var(--destructive))',
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="avg"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                        activeDot={{ r: 6 }}
                        connectNulls
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
