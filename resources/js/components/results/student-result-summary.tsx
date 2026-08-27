import React from 'react';
import { Award, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StudentResultSummaryProps {
    overallAverage: number;
    totalSubjects: number;
    periodStr: string;
    className?: string;
}

export function StudentResultSummary({
    overallAverage,
    totalSubjects,
    periodStr,
    className = '',
}: StudentResultSummaryProps) {
    let statusLabel = 'Prestasi Sangat Baik';
    if (overallAverage >= 90) statusLabel = 'Prestasi Istimewa';
    else if (overallAverage >= 80) statusLabel = 'Prestasi Sangat Baik';
    else if (overallAverage >= 75) statusLabel = 'Tercapai Baik';
    else statusLabel = 'Perlu Peningkatan';

    return (
        <div className={cn('rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-indigo-600 p-5 sm:p-6 text-primary-foreground shadow-md space-y-4', className)}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shrink-0">
                        <Award className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Rapor Hasil Belajar Saya</h2>
                        <p className="text-[11px] font-bold text-white/80 uppercase tracking-wider">{periodStr}</p>
                    </div>
                </div>

                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/20">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{statusLabel}</span>
                </span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/20">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase text-white/70 tracking-wider flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Mata Pelajaran</span>
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-white mt-1">{totalSubjects}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase text-white/70 tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Rata-Rata Nilai</span>
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-amber-200 mt-1">{overallAverage}</p>
                </div>
            </div>
        </div>
    );
}
