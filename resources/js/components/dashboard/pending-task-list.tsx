import React from 'react';
import { Link } from '@inertiajs/react';
import { ClipboardCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PendingTaskItem {
    id: number;
    title: string;
    class?: string;
    subject?: string;
    pending_count: number;
    due_date?: string;
}

export interface PendingTaskListProps {
    items: PendingTaskItem[];
    actionHref?: string;
    className?: string;
}

/**
 * PendingTaskList (Perlu Tindakan)
 * Positioned right after Agenda.
 * Min-height 76px, padding 12-16px, status icon 40x40px, title 14px/700, desc 11-12px.
 * If 0 pending: "✓ Semua tugas sudah dinilai" in a neat compact card.
 */
export function PendingTaskList({
    items = [],
    actionHref = '/assignments',
    className = '',
}: PendingTaskListProps) {
    const totalPending = items.reduce((acc, it) => acc + (it.pending_count || 1), 0);

    return (
        <Card className={`rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden w-full min-w-0 min-h-[76px] ${className}`}>
            <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-foreground leading-tight flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <span className="truncate">Perlu Tindakan</span>
                        {items.length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-[10px] font-bold">
                                {totalPending}
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate pl-9">
                        Asesmen siswa yang belum dinilai
                    </p>
                </div>

                <Link
                    href={actionHref}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 min-h-[44px] px-2 py-1 shrink-0"
                >
                    <span>Semua</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <CardContent className="p-0">
                {items.length === 0 ? (
                    <div className="p-3.5 sm:p-4 flex items-center gap-3 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 min-h-[56px]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground leading-tight">✓ Semua tugas sudah dinilai</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Tidak ada penugasan tertunda saat ini.</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50 w-full min-w-0">
                        {items.slice(0, 3).map((task) => (
                            <Link
                                key={task.id}
                                href={`/assignments/${task.id}/grade-view`}
                                className="group flex items-center justify-between gap-2.5 p-3 hover:bg-muted/40 active:bg-muted/60 transition-all min-h-[56px] w-full min-w-0"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                        <ClipboardCheck className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                            {task.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {task.class ? `${task.class} • ` : ''}{task.subject || 'Mata Pelajaran'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge
                                        variant="destructive"
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0"
                                    >
                                        {task.pending_count} Nilai
                                    </Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors shrink-0" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
