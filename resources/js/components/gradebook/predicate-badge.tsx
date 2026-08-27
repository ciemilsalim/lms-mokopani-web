import React from 'react';
import { cn } from '@/lib/utils';

export interface PredicateBadgeProps {
    score: number;
    kktpThreshold?: number;
    className?: string;
}

export function PredicateBadge({ score, kktpThreshold = 75, className = '' }: PredicateBadgeProps) {
    let label = 'Sangat Baik (A)';
    let colorClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

    if (score >= 90) {
        label = 'Sangat Baik (A)';
        colorClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    } else if (score >= 80) {
        label = 'Baik (B)';
        colorClass = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    } else if (score >= kktpThreshold) {
        label = 'Cukup (C)';
        colorClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    } else {
        label = 'Perlu Bimbingan (D)';
        colorClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }

    return (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider', colorClass, className)}>
            {label}
        </span>
    );
}
