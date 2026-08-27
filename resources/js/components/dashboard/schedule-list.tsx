import React from 'react';
import { Calendar, Clock, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeader } from './section-header';
import { EmptyState } from './empty-state';

export interface ScheduleItemData {
    subject: string;
    class?: string;
    teacher?: string;
    time: string;
    is_current?: boolean;
}

export interface ScheduleListProps {
    schedules: ScheduleItemData[];
    dayName?: string;
    dateText?: string;
    className?: string;
}

/**
 * ScheduleList & ScheduleItem
 * Reusable Mobile-First schedule component displaying today's teaching classes.
 * Includes live session indicator pulse badge and 48px touch targets.
 */
export function ScheduleList({
    schedules = [],
    dayName = 'Hari ini',
    dateText,
    className = '',
}: ScheduleListProps) {
    return (
        <Card className={`rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden ${className}`}>
            <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                        Jadwal Mengajar
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {dayName}{dateText ? `, ${dateText}` : ''}
                    </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary uppercase tracking-wide border border-primary/20">
                    Live Session
                </span>
            </div>

            <CardContent className="p-3 sm:p-4 space-y-2">
                {schedules.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title="Tidak ada jadwal hari ini"
                        description="Anda tidak memiliki sesi mengajar yang terjadwal."
                        className="py-6"
                    />
                ) : (
                    schedules.map((item, index) => (
                        <div
                            key={index}
                            className={`group relative flex items-center gap-3.5 p-3 rounded-xl transition-all min-h-[52px] ${
                                item.is_current
                                    ? 'bg-primary/10 ring-1 ring-primary/30'
                                    : 'bg-card hover:bg-muted/40 border border-border/40'
                            }`}
                        >
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                                    item.is_current
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {index + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                        {item.subject}
                                    </h3>
                                    {item.is_current && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground animate-pulse">
                                            Sedang Berlangsung
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                                    {item.class && <span className="font-semibold text-foreground/80">Kelas {item.class}</span>}
                                    {item.class && item.time && <span>•</span>}
                                    <Clock className="h-3 w-3 inline text-muted-foreground" />
                                    <span>{item.time}</span>
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
