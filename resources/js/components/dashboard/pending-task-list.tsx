import React from 'react';
import { Link } from '@inertiajs/react';
import { ClipboardCheck, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from './section-header';
import { EmptyState } from './empty-state';

export interface PendingTaskItemData {
    id: number;
    title: string;
    subject?: string;
    class?: string;
    pending_count: number;
}

export interface PendingTaskListProps {
    items: PendingTaskItemData[];
    actionHref?: string;
    className?: string;
}

/**
 * PendingTaskList & PendingTaskItem
 * Reusable Mobile-First list component for "Tugas Perlu Dinilai".
 * Touch-friendly (min 48px item area with active states).
 */
export function PendingTaskList({
    items = [],
    actionHref = '/assignments',
    className = '',
}: PendingTaskListProps) {
    return (
        <Card className={`rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden w-full min-w-0 ${className}`}>
            <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
                <SectionHeader
                    title="Tugas Perlu Dinilai"
                    subtitle="Asesmen menunggu masukan & nilai"
                    icon={ClipboardCheck}
                    actionHref={actionHref}
                    actionLabel="Semua Asesmen"
                    className="mb-0"
                />
            </div>

            <CardContent className="p-0">
                {items.length === 0 ? (
                    <EmptyState
                        icon={CheckCircle2}
                        title="Semua tugas telah dinilai"
                        description="Tidak ada penugasan atau asesmen yang tertunda."
                        className="py-8"
                    />
                ) : (
                    <div className="divide-y divide-border/50">
                        {items.map((task) => (
                            <Link
                                key={task.id}
                                href={`/assignments/${task.id}/grade-view`}
                                className="group flex items-center gap-3 p-3.5 sm:p-4 hover:bg-muted/40 active:bg-muted/60 transition-all min-h-[52px]"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                        {task.title}
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                        {task.class ? `${task.class} • ` : ''}{task.subject || 'Mata Pelajaran'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge
                                        variant="destructive"
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-2xs"
                                    >
                                        {task.pending_count} Perlu Dinilai
                                    </Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
