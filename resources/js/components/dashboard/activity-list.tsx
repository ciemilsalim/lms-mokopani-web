import React from 'react';
import { Activity, BookOpen, ClipboardList, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@inertiajs/react';

export interface ActivityItemData {
    id: number;
    type: 'material' | 'assignment' | 'submission';
    title: string;
    subject: string;
    created_at: string;
}

export interface ActivityListProps {
    activities: ActivityItemData[];
    className?: string;
}

const typeMap = {
    material: { label: 'Materi', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400', icon: BookOpen },
    assignment: { label: 'Asesmen', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400', icon: ClipboardList },
    submission: { label: 'Tugas Masuk', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', icon: Activity },
};

/**
 * ActivityList
 * Reusable Mobile-First recent activities log component (compact 3 items).
 */
export function ActivityList({
    activities = [],
    className = '',
}: ActivityListProps) {
    return (
        <Card className={`rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden w-full min-w-0 ${className}`}>
            <div className="p-3.5 sm:p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span>Aktivitas Terkini</span>
                    </h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                        Pembaruan materi & asesmen terbaru
                    </p>
                </div>
                <Link
                    href="/materials"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[44px] px-2 py-1 rounded-lg shrink-0"
                >
                    <span>Semua</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <CardContent className="p-0">
                {activities.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground text-xs font-medium">
                        Belum ada aktivitas pembelajaran baru
                    </div>
                ) : (
                    <div className="divide-y divide-border/50 w-full min-w-0">
                        {activities.slice(0, 3).map((act) => {
                            const info = typeMap[act.type] || typeMap.material;
                            return (
                                <div
                                    key={act.id}
                                    className="flex items-start justify-between gap-3 p-3 sm:p-3.5 hover:bg-muted/30 transition-colors min-h-[48px] w-full min-w-0"
                                >
                                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${info.color} mt-0.5 shadow-2xs`}>
                                            <info.icon className="h-4 w-4" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug">
                                                {act.title}
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                {act.subject}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0 pt-0.5">
                                        <span className="text-[10px] font-semibold text-muted-foreground block whitespace-nowrap">
                                            {act.created_at}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
