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
 * Reusable Mobile-First primary agenda section answering "Kelas apa yang saya ajar hari ini?".
 * Features direct action button [ Buka Kelas ] and Live session badges.
 */
export function ScheduleList({
    schedules = [],
    dayName = 'Hari ini',
    dateText,
    className = '',
}: ScheduleListProps) {
    return (
        <Card className={`rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden w-full min-w-0 ${className}`}>
            <div className="p-3.5 sm:p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary shrink-0" />
                        <span>Agenda Hari Ini</span>
                    </h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                        {dayName}{dateText ? `, ${dateText}` : ''}
                    </p>
                </div>
                <Link
                    href="/classes"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[44px] px-2 py-1 rounded-lg shrink-0"
                >
                    <span>Semua Kelas</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <CardContent className="p-3 sm:p-4 space-y-2.5">
                {schedules.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground flex flex-col items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-1.5" />
                        <p className="text-xs font-semibold text-foreground/80">Tidak ada sesi mengajar hari ini</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Nikmati waktu Anda atau siapkan materi pembelajaran.</p>
                    </div>
                ) : (
                    <div className="space-y-2 w-full min-w-0">
                        {schedules.map((item, index) => {
                            const isCurrent = item.is_current;
                            return (
                                <div
                                    key={index}
                                    className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl transition-all w-full min-w-0 ${
                                        isCurrent
                                            ? 'bg-primary/10 border-2 border-primary/40 shadow-xs'
                                            : index === 0
                                            ? 'bg-card border border-primary/20 hover:border-primary/40'
                                            : 'bg-card hover:bg-muted/40 border border-border/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                                                isCurrent
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {index + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                                    {item.subject}
                                                </h3>
                                                {isCurrent ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[9px] font-black animate-pulse shrink-0 shadow-2xs">
                                                        ● Sedang Berlangsung
                                                    </span>
                                                ) : index === 0 ? (
                                                    <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[9px] font-bold shrink-0">
                                                        Berikutnya
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                                                {item.class && <span className="font-semibold text-foreground/80">Kelas {item.class}</span>}
                                                {item.class && item.time && <span>•</span>}
                                                <Clock className="h-3 w-3 inline text-muted-foreground shrink-0" />
                                                <span className="truncate">{item.time}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                                        <Link
                                            href="/classes"
                                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all active:scale-95 min-h-[38px] w-full sm:w-auto"
                                        >
                                            <span>Buka Kelas</span>
                                            <ArrowRight className="h-3 w-3" />
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
