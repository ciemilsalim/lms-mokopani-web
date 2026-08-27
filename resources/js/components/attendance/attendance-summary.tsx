import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react';

export interface AttendanceSummaryCounts {
    hadir: number;
    sakit: number;
    izin: number;
    alpha: number;
    total?: number;
}

export interface AttendanceSummaryProps {
    counts: AttendanceSummaryCounts;
    className?: string;
}

export function AttendanceSummary({ counts, className = '' }: AttendanceSummaryProps) {
    const total = counts.total ?? (counts.hadir + counts.sakit + counts.izin + counts.alpha);
    const percentage = total > 0 ? Math.round((counts.hadir / total) * 100) : 0;

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Tingkat Kehadiran Kelas</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{percentage}%</span>
            </div>

            {/* Status Pills Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Hadir</p>
                    <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{counts.hadir}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Sakit</p>
                    <p className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">{counts.sakit}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Izin</p>
                    <p className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-300 mt-0.5">{counts.izin}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Alpha</p>
                    <p className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-300 mt-0.5">{counts.alpha}</p>
                </div>
            </div>
        </div>
    );
}
