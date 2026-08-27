import React from 'react';
import { Award, TrendingUp, Users, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GradeSummaryProps {
    classAverage: number;
    totalStudents: number;
    kktp?: number;
    highestScore?: number;
    lowestScore?: number;
    className?: string;
}

export function GradeSummary({
    classAverage,
    totalStudents,
    kktp = 75,
    highestScore = 0,
    lowestScore = 0,
    className = '',
}: GradeSummaryProps) {
    return (
        <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3', className)}>
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Rata-Rata Kelas</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-foreground">{classAverage}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4 text-indigo-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Siswa</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-foreground">{totalStudents}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4 text-amber-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Kriteria KKTP</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-foreground">{kktp}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Award className="h-4 w-4 text-emerald-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tertinggi / Terendah</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400">{highestScore}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-rose-600 dark:text-rose-400">{lowestScore}</span>
                </p>
            </div>
        </div>
    );
}
