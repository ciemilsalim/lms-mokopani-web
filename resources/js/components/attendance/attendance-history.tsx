import React from 'react';
import { Clock, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';

export interface AttendanceHistoryItem {
    id: string | number;
    date: string;
    className: string;
    subjectName: string;
    studentsCount: number;
    presentCount: number;
}

export interface AttendanceHistoryProps {
    items?: AttendanceHistoryItem[];
    className?: string;
}

export function AttendanceHistory({ items = [], className = '' }: AttendanceHistoryProps) {
    if (items.length === 0) {
        return (
            <div className={`text-center py-6 border border-dashed border-border rounded-2xl p-4 ${className}`}>
                <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-muted-foreground">Belum ada riwayat presensi tersimpan.</p>
            </div>
        );
    }

    return (
        <div className={`space-y-2.5 ${className}`}>
            {items.map((item) => {
                const percentage = item.studentsCount > 0 ? Math.round((item.presentCount / item.studentsCount) * 100) : 0;
                return (
                    <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/40 transition min-h-[52px]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-foreground">{item.className} — {item.subjectName}</h4>
                                <p className="text-[11px] text-muted-foreground font-medium">{item.date}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                {item.presentCount}/{item.studentsCount} ({percentage}%)
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
