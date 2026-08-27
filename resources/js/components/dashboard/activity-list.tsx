import React from 'react';
import { Activity, BookOpen, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeader } from './section-header';
import { EmptyState } from './empty-state';

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
    material: { label: 'Materi', color: 'bg-indigo-500 text-white', icon: BookOpen },
    assignment: { label: 'Asesmen', color: 'bg-rose-500 text-white', icon: ClipboardList },
    submission: { label: 'Tugas Masuk', color: 'bg-emerald-500 text-white', icon: Activity },
};

/**
 * ActivityList & ActivityItem
 * Reusable Mobile-First recent activities log component.
 */
export function ActivityList({
    activities = [],
    className = '',
}: ActivityListProps) {
    return (
        <Card className={`rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden w-full min-w-0 ${className}`}>
            <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
                <SectionHeader
                    title="Aktivitas Terkini"
                    subtitle="Pembaruan materi & asesmen"
                    icon={Activity}
                    className="mb-0"
                />
            </div>

            <CardContent className="p-0">
                {activities.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title="Belum ada aktivitas"
                        description="Aktivitas pembuatan materi dan asesmen akan muncul di sini."
                        className="py-6"
                    />
                ) : (
                    <div className="divide-y divide-border/50">
                        {activities.slice(0, 5).map((act) => {
                            const info = typeMap[act.type] || typeMap.material;
                            return (
                                <div
                                    key={act.id}
                                    className="flex items-center gap-3 p-3.5 sm:p-4 hover:bg-muted/30 transition-colors min-h-[48px]"
                                >
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${info.color}`}>
                                        <info.icon className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                            {act.title}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                            {act.subject}
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="text-[10px] font-semibold text-muted-foreground block">
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
