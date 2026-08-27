import React from 'react';
import { cn } from '@/lib/utils';

export type ActivityFilterKey = 'all' | 'unread' | 'assignment' | 'submission' | 'announcement';

export interface ActivityFilterOption {
    key: ActivityFilterKey;
    label: string;
    count?: number;
}

export interface ActivityFilterProps {
    activeFilter: ActivityFilterKey;
    onFilterChange: (key: ActivityFilterKey) => void;
    unreadCount?: number;
    className?: string;
}

export function ActivityFilter({ activeFilter, onFilterChange, unreadCount = 0, className = '' }: ActivityFilterProps) {
    const filters: ActivityFilterOption[] = [
        { key: 'all', label: 'Semua' },
        { key: 'unread', label: 'Belum Dibaca', count: unreadCount },
        { key: 'assignment', label: 'Asesmen' },
        { key: 'submission', label: 'Tugas Masuk' },
        { key: 'announcement', label: 'Pengumuman' },
    ];

    return (
        <div className={cn('flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full', className)}>
            {filters.map((f) => {
                const isActive = activeFilter === f.key;
                return (
                    <button
                        key={f.key}
                        onClick={() => onFilterChange(f.key)}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] shrink-0 active:scale-95 border',
                            isActive
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-card text-muted-foreground border-border/70 hover:bg-muted/50 hover:text-foreground'
                        )}
                    >
                        <span>{f.label}</span>
                        {typeof f.count === 'number' && f.count > 0 && (
                            <span
                                className={cn(
                                    'px-1.5 py-0.5 rounded-full text-[10px] font-black',
                                    isActive
                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                        : 'bg-primary/10 text-primary'
                                )}
                            >
                                {f.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
