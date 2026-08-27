import React from 'react';
import { Clock, CheckCircle2, Info, Target, GraduationCap } from 'lucide-react';

export type AssessmentType = 'initial' | 'formative' | 'summative' | string | null;

interface AssessmentTypeBadgeProps {
    type: AssessmentType;
    className?: string;
}

export function AssessmentTypeBadge({ type, className = '' }: AssessmentTypeBadgeProps) {
    if (!type) return null;

    let label = 'Asesmen';
    let style = 'bg-muted/80 text-muted-foreground border-border/60';
    let Icon = Info;

    if (type === 'initial') {
        label = 'Asesmen Awal';
        style = 'bg-primary/10 text-primary border-primary/20';
        Icon = Info;
    } else if (type === 'formative') {
        label = 'Formatif';
        style = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        Icon = Target;
    } else if (type === 'summative') {
        label = 'Sumatif';
        style = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        Icon = GraduationCap;
    }

    return (
        <span className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold ${style} ${className}`}>
            <Icon className="h-3 w-3 shrink-0" />
            <span>{label}</span>
        </span>
    );
}

interface StudentSubmissionBadgeProps {
    isSubmitted: boolean;
    isGraded: boolean;
    className?: string;
}

export function StudentSubmissionBadge({ isSubmitted, isGraded, className = '' }: StudentSubmissionBadgeProps) {
    if (isGraded) {
        return (
            <span className={`inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold ${className}`}>
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>Dinilai</span>
            </span>
        );
    }

    if (isSubmitted) {
        return (
            <span className={`inline-flex items-center gap-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2.5 py-1 text-[11px] font-bold ${className}`}>
                <Clock className="h-3 w-3 shrink-0" />
                <span>Dikumpulkan</span>
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 text-[11px] font-bold ${className}`}>
            <Clock className="h-3 w-3 shrink-0" />
            <span>Belum Dikerjakan</span>
        </span>
    );
}
