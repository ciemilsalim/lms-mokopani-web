import React from 'react';
import { ClipboardList, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ParentAcademicSummaryProps {
    avgScore: number | null;
    submittedCount: number;
    totalAssignments: number;
    pendingCount: number;
    attendancePct: number | null;
    className?: string;
}

export function ParentAcademicSummary({
    avgScore,
    submittedCount,
    totalAssignments,
    pendingCount,
    attendancePct,
    className = '',
}: ParentAcademicSummaryProps) {
    return (
        <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3', className)}>
            {/* Average Score Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Rata-Rata Nilai</span>
                </div>
                <p className={cn('text-xl font-black', (avgScore ?? 0) >= 75 ? 'text-emerald-600' : 'text-amber-600')}>
                    {avgScore ?? '-'}
                </p>
            </div>

            {/* Attendance Percentage Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-sky-600">
                    <Calendar className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Kehadiran</span>
                </div>
                <p className={cn('text-xl font-black', (attendancePct ?? 100) >= 75 ? 'text-sky-600' : 'text-rose-600')}>
                    {attendancePct ?? '-'}%
                </p>
            </div>

            {/* Assignment Progress Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-600">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tugas Dikerjakan</span>
                </div>
                <p className="text-xl font-black text-foreground">
                    {submittedCount} / {totalAssignments}
                </p>
            </div>

            {/* Pending Assignment Warning Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tugas Tertunda</span>
                </div>
                <p className={cn('text-xl font-black', pendingCount > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                    {pendingCount}
                </p>
            </div>
        </div>
    );
}
