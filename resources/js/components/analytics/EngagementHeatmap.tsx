interface EngagementData {
    total_assignments: number;
    on_time: number;
    late: number;
    missing: number;
    engagement_rate: number;
    on_time_rate: number;
}

export default function EngagementHeatmap({ data }: { data: EngagementData | null }) {
    if (!data || data.total_assignments === 0) {
        return (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Belum ada data engagement
            </div>
        );
    }

    const items = [
        { label: 'Tepat Waktu', count: data.on_time, color: 'bg-emerald-500', pct: data.on_time_rate },
        { label: 'Terlambat', count: data.late, color: 'bg-amber-500', pct: data.total_assignments > 0 ? Math.round((data.late / data.total_assignments) * 100) : 0 },
        { label: 'Tidak Dikumpulkan', count: data.missing, color: 'bg-rose-400', pct: data.total_assignments > 0 ? Math.round((data.missing / data.total_assignments) * 100) : 0 },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between">
                <span className="text-2xl font-black text-foreground">{data.engagement_rate}%</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {data.on_time} / {data.total_assignments} tepat waktu
                </span>
            </div>

            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {items.filter(i => i.count > 0).map((item, i) => (
                    <div
                        key={i}
                        className={`${item.color} transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                    />
                ))}
            </div>

            <div className="flex gap-4 text-[10px] font-bold text-muted-foreground">
                {items.filter(i => i.count > 0).map((item, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${item.color}`} />
                        {item.label}: {item.count}
                    </span>
                ))}
            </div>
        </div>
    );
}
