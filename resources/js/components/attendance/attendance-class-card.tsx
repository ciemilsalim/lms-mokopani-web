import React from 'react';
import { CalendarCheck, Users, ExternalLink, ChevronRight, BookOpen } from 'lucide-react';
import { AttendanceSummary, type AttendanceSummaryCounts } from './attendance-summary';

export interface AttendanceClassCardProps {
    classNameStr: string;
    subjectName?: string;
    studentsCount: number;
    counts?: AttendanceSummaryCounts;
    ssoUrl?: string;
}

export function AttendanceClassCard({
    classNameStr,
    subjectName = 'Informatika',
    studentsCount,
    counts = { hadir: 0, sakit: 0, izin: 0, alpha: 0 },
    ssoUrl = '/sso/presensi',
}: AttendanceClassCardProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-all space-y-4">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <CalendarCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-foreground">{classNameStr}</h3>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            <span>{subjectName}</span>
                            <span className="text-border">•</span>
                            <span>{studentsCount} Siswa</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Attendance Summary */}
            <AttendanceSummary counts={{ ...counts, total: studentsCount }} />

            {/* SSO Action Launcher */}
            <div className="pt-2 border-t border-border/60">
                <a
                    href={ssoUrl}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition min-h-[48px] active:scale-[0.99]"
                >
                    <span>Buka Presensi Kelas</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>
        </div>
    );
}
