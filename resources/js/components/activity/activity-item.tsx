import React from 'react';
import { type LucideIcon, BookOpen, ClipboardList, Inbox, Megaphone, CalendarCheck, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActivityNotificationItem {
    id: number;
    type: 'assignment' | 'submission' | 'announcement' | 'material' | 'attendance' | string;
    title: string;
    message: string | null;
    data: Record<string, any> | null;
    is_read: boolean;
    created_at: string;
}

export interface ActivityItemProps {
    item: ActivityNotificationItem;
    onClick?: () => void;
    className?: string;
}

const typeMap: Record<string, { label: string; color: string; icon: LucideIcon }> = {
    assignment: { label: 'Asesmen', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: ClipboardList },
    submission: { label: 'Tugas Masuk', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: Inbox },
    announcement: { label: 'Pengumuman', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Megaphone },
    material: { label: 'Materi', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', icon: BookOpen },
    attendance: { label: 'Presensi', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', icon: CalendarCheck },
};

export function ActivityItem({ item, onClick, className = '' }: ActivityItemProps) {
    const config = typeMap[item.type] || typeMap.assignment;
    const Icon = config.icon;

    return (
        <div
            onClick={onClick}
            className={cn(
                'group relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-200 cursor-pointer min-h-[64px] active:scale-[0.99]',
                item.is_read
                    ? 'bg-card border-border/70 hover:border-primary/40'
                    : 'bg-primary/5 border-primary/20 shadow-xs hover:border-primary/40',
                className
            )}
        >
            {/* Semantic Event Icon */}
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border mt-0.5', config.color)}>
                <Icon className="h-5 w-5" />
            </div>

            {/* Content Body */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border', config.color)}>
                        {config.label}
                    </span>
                    {!item.is_read && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            Baru
                        </span>
                    )}
                </div>

                <h3 className={cn('text-xs sm:text-sm leading-snug truncate-2-lines', item.is_read ? 'text-foreground font-medium' : 'text-foreground font-bold')}>
                    {item.title}
                </h3>

                {item.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                    </p>
                )}

                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-muted-foreground/80">
                    <Clock className="h-3 w-3" />
                    <span>{item.created_at}</span>
                </div>
            </div>

            {/* Deep link action indicator */}
            <div className="shrink-0 pt-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
            </div>
        </div>
    );
}
