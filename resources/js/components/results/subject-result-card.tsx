import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { BookOpen, ChevronDown, ChevronUp, Clock, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import { PredicateBadge } from '@/components/gradebook';
import { cn } from '@/lib/utils';

export interface AssignmentResult {
    id: number;
    title: string;
    score: number | string | null;
    max_points: number;
    status: string;
    type: string;
    tp_id: number;
    is_remedial?: boolean;
    remedial_status?: string | null;
}

const typeLabels: Record<string, string> = {
    initial: 'Diagnostik',
    formative: 'Formatif',
    summative: 'Sumatif',
};

export interface SubjectResultCardProps {
    subjectName: string;
    average: number;
    tpAverage?: number | null;
    sasScore?: number | null;
    kktp?: number;
    hasSummativeData?: boolean;
    hasRemedial?: boolean;
    description: string;
    attendancePercentage: number;
    totalMeetings: number;
    cps?: {
        id: number;
        label: string;
        description: string;
        tps: {
            id: number;
            label: string;
            assignments: AssignmentResult[];
        }[];
    }[];
    className?: string;
}

export function SubjectResultCard({
    subjectName,
    average,
    tpAverage,
    sasScore,
    kktp = 75,
    hasSummativeData = true,
    hasRemedial = false,
    description,
    attendancePercentage,
    totalMeetings,
    cps = [],
    className = '',
}: SubjectResultCardProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={cn('rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all', className)}>
            {/* Header info - semantic button for keyboard & screen-reader accessibility */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{subjectName}</h3>
                            {hasRemedial && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>Remedial</span>
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>Kehadiran: {attendancePercentage}%</span>
                            <span className="text-border">•</span>
                            <span>{totalMeetings} Pertemuan</span>
                        </p>
                    </div>
                </div>

                {/* Score & Predicate */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                        <span className="text-sm sm:text-base font-black text-foreground block">
                            {hasSummativeData ? average : '-'}
                        </span>
                        {hasSummativeData ? (
                            <PredicateBadge score={average} kktpThreshold={kktp} />
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider bg-muted/60 text-muted-foreground border-border/60">
                                Belum Ada Sumatif
                            </span>
                        )}
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-muted-foreground">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>
            </button>

            {/* Expandable Accordion Body */}
            {expanded && (
                <div className="p-4 sm:p-4.5 border-t border-border/60 bg-muted/20 space-y-4 fade-in">
                    {/* Score Breakdown (Sumatif LM & SAS) */}
                    {(tpAverage !== undefined || sasScore !== undefined) && (
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-card border border-border/70 text-xs">
                            <div>
                                <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Rata-rata Sumatif (TP)</span>
                                <span className="text-sm font-black text-foreground">{tpAverage !== null && tpAverage !== undefined ? tpAverage : '-'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Sumatif Akhir (SAS)</span>
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{sasScore !== null && sasScore !== undefined ? sasScore : '-'}</span>
                            </div>
                        </div>
                    )}

                    {/* Achievement Description */}
                    {description && (
                        <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                <span>Deskripsi Capaian Pembelajaran</span>
                            </p>
                            <p className="text-xs text-foreground leading-relaxed italic">{description}</p>
                        </div>
                    )}

                    {/* CP Breakdown */}
                    {cps.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Rincian Capaian & Asesmen
                            </h4>
                            {cps.map((cp) => (
                                <div key={cp.id} className="p-3 rounded-xl bg-card border border-border/60 space-y-2">
                                    <div>
                                        <h5 className="text-xs font-bold text-foreground">{cp.label}</h5>
                                        {cp.description && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{cp.description}</p>
                                        )}
                                    </div>
                                    {cp.tps.map((tp) => (
                                        <div key={tp.id} className="space-y-1.5 pt-1">
                                            <p className="text-[11px] font-semibold text-primary leading-snug">{tp.label}</p>
                                            <div className="space-y-1.5 pl-2">
                                                {tp.assignments.map((asg) => {
                                                    const hasNumericScore = asg.score !== null && asg.score !== undefined && asg.score !== '-';
                                                    return (
                                                        <Link
                                                            key={asg.id}
                                                            href={`/assignments/${asg.id}`}
                                                            className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition text-xs border border-border/40 min-h-[44px] group"
                                                        >
                                                            <div className="min-w-0 space-y-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-medium text-foreground leading-snug group-hover:text-primary transition">
                                                                        {asg.title}
                                                                    </span>
                                                                    <ExternalLink className="h-3 w-3 text-muted-foreground/60 shrink-0 opacity-0 group-hover:opacity-100 transition" />
                                                                </div>
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="px-1.5 py-0.5 rounded bg-background/80 border border-border/60 text-[10px] font-semibold text-muted-foreground">
                                                                        {typeLabels[asg.type] || asg.type}
                                                                    </span>
                                                                    {asg.is_remedial && (
                                                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                                            Remedial
                                                                        </span>
                                                                    )}
                                                                    {!hasNumericScore && (
                                                                        <span className="text-[10px] font-medium text-muted-foreground">
                                                                            • {asg.status}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="font-black text-foreground shrink-0 ml-2">
                                                                {hasNumericScore ? `${asg.score} / ${asg.max_points}` : '-'}
                                                            </span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
