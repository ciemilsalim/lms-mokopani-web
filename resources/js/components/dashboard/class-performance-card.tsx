import React from 'react';
import { BarChart3, ChevronRight, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@inertiajs/react';

export interface ClassPerformanceItem {
    id?: number;
    name: string;
    value: number;
    student_count?: number;
    assignment_count?: number;
    has_assignments?: boolean;
    color?: string;
}

export interface ClassPerformanceCardProps {
    items?: ClassPerformanceItem[];
    className?: string;
}

/**
 * ClassPerformanceCard (Performa Nilai per Kelas)
 * Displays the average performance across all classes taught by this subject teacher.
 */
export function ClassPerformanceCard({ items = [], className = '' }: ClassPerformanceCardProps) {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <Card className={`rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden w-full min-w-0 ${className}`}>
            <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <BarChart3 className="h-4 w-4" />
                        </div>
                        <span className="truncate">Performa Nilai per Kelas</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate pl-10">
                        Rata-rata capaian asesmen siswa pada kelas yang diampu
                    </p>
                </div>
                <Link
                    href="/gradebook"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 min-h-[44px] px-2 py-1 shrink-0"
                >
                    <span>Buku Nilai</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <CardContent className="p-3.5 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {items.map((c, i) => {
                        const score = Number(c.value) || 0;
                        const hasAssignments = c.has_assignments !== undefined ? c.has_assignments : (score > 0);
                        const hasScore = hasAssignments || score > 0;
                        const badgeColor = score >= 80 
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                            : score >= 70 
                            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' 
                            : score >= 60 
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20';

                        const barColor = score >= 80 
                            ? 'bg-emerald-500' 
                            : score >= 70 
                            ? 'bg-indigo-500' 
                            : score >= 60 
                            ? 'bg-amber-500' 
                            : 'bg-rose-500';

                        return (
                            <Link
                                key={c.id || i}
                                href={c.id ? `/classes/${c.id}` : '/classes'}
                                className="group p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col justify-between gap-2.5"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                            {c.name}
                                        </h3>
                                        {c.student_count !== undefined && (
                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                <Users className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                                <span>{c.student_count} Siswa</span>
                                                {c.assignment_count !== undefined && c.assignment_count > 0 && (
                                                    <span className="text-muted-foreground/80">• {c.assignment_count} Asesmen</span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        {hasScore ? (
                                            <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-bold ${badgeColor}`}>
                                                {score}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground italic">
                                                Belum dinilai
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${hasScore ? barColor : 'bg-muted'}`}
                                        style={{ width: `${hasScore ? Math.min(100, Math.max(0, score)) : 0}%` }}
                                    />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
