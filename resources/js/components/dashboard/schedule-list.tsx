import React from 'react';
import { Calendar, Clock, BookOpen, ChevronRight, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@inertiajs/react';

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
 * ScheduleList (Agenda Hari Ini)
 * Exact spec:
 * Header padding: 16px, min-height row 56px, time col 48px, number container 40x40px, gap 12px, radius 16px.
 */
export function ScheduleList({
    schedules = [],
    dayName = 'Hari ini',
    dateText,
    className = '',
}: ScheduleListProps) {
    return (
        <Card className={`rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden w-full min-w-0 ${className}`}>
            <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <span className="truncate">Agenda Hari Ini</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate pl-10">
                        {dayName}{dateText ? `, ${dateText}` : ''}
                    </p>
                </div>
                <Link
                    href="/classes"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 min-h-[44px] px-2 py-1 shrink-0"
                >
                    <span>Semua Kelas</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <CardContent className="p-3 sm:p-4">
                {schedules.length === 0 ? (
                    <div className="min-h-[96px] sm:min-h-[104px] py-4 text-center text-muted-foreground flex flex-col items-center justify-center">
                        <BookOpen className="h-7 w-7 text-muted-foreground/40 mb-1" />
                        <p className="text-xs font-bold text-foreground/90">Tidak ada sesi mengajar hari ini</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Nikmati waktu Anda atau siapkan materi pembelajaran.</p>
                    </div>
                ) : (
                    <div className="space-y-2 w-full min-w-0">
                        {schedules.map((item, index) => {
                            const isCurrent = item.is_current;
                            return (
                                <div
                                    key={index}
                                    className={`group flex items-center justify-between gap-3 p-3 rounded-xl transition-all min-h-[56px] w-full min-w-0 ${
                                        isCurrent
                                            ? 'bg-primary/10 border border-primary/40 shadow-xs'
                                            : index === 0
                                            ? 'bg-card border border-primary/20 hover:border-primary/40'
                                            : 'bg-card hover:bg-muted/40 border border-border/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                                isCurrent
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
                                                {isCurrent && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[9px] font-bold animate-pulse shrink-0">
                                                        ● Live
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                                                {item.class && <span className="font-semibold text-foreground/80">Kelas {item.class}</span>}
                                                {item.class && item.time && <span>•</span>}
                                                <Clock className="h-3 w-3 inline text-muted-foreground shrink-0" />
                                                <span className="truncate">{item.time}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="shrink-0">
                                        <Link
                                            href="/classes"
                                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all active:scale-95 min-h-[44px]"
                                        >
                                            <span>Buka</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
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
