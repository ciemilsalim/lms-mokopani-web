import { BarChart3, Brain, ChevronRight, TrendingUp } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface DiagnosticResult {
    id: number;
    assignment_id: number;
    learning_objective_id: number | null;
    total_score: number;
    is_passed: boolean;
    topic_breakdown: { topic: string; score: number; max_score: number; mastery_pct: number; mastery_level: string }[] | null;
    recommendations: { type: string; message: string; icon?: string; topic?: string }[] | null;
}

interface DiagnosticSummary {
    has_diagnostic: boolean;
    mastered_tp_ids: number[];
    average_score: number | null;
    results: DiagnosticResult[];
}

export default function AdaptiveBanner({ summary }: { summary: DiagnosticSummary | null }) {
    if (!summary || !summary.has_diagnostic) return null;

    const masteryColor = (pct: number) => {
        if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
        if (pct >= 60) return 'text-amber-600 dark:text-amber-400';
        return 'text-rose-600 dark:text-rose-400';
    };

    const masteryBg = (pct: number) => {
        if (pct >= 80) return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30';
        if (pct >= 60) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30';
        return 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30';
    };

    return (
        <div className="mb-10 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground">Hasil Diagnostik</h3>
                    <p className="text-xs text-muted-foreground">
                        Rata-rata: <span className={`font-black ${masteryColor(summary.average_score ?? 0)}`}>{summary.average_score}</span>
                        {' '}&middot;{' '}
                        {summary.mastered_tp_ids.length} TP dikuasai dari {summary.results.length} diagnostik
                    </p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {summary.results.map((result) => {
                    const avgPct = result.total_score ?? 0;
                    return (
                        <div key={result.id} className={`rounded-2xl border p-4 ${masteryBg(avgPct)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-black uppercase tracking-wider ${masteryColor(avgPct)}`}>
                                    {avgPct >= 80 ? 'Siap' : avgPct >= 60 ? 'Cukup' : 'Perbaikan'}
                                </span>
                                <span className={`text-lg font-black ${masteryColor(avgPct)}`}>{avgPct}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                        avgPct >= 80 ? 'bg-emerald-500' : avgPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${avgPct}%` }}
                                />
                            </div>
                            {result.recommendations && result.recommendations.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {result.recommendations.slice(0, 2).map((rec, i) => (
                                        <p key={i} className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                                            {rec.message}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
