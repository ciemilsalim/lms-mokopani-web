import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { PredicateBadge } from '@/components/gradebook';
import { cn } from '@/lib/utils';

export interface AssignmentResult {
    id: number;
    title: string;
    score: any;
    max_points: number;
    status: string;
    type: string;
    tp_id: number;
    is_remedial?: boolean;
    remedial_status?: string;
}

export interface SubjectResultCardProps {
    subjectName: string;
    average: number;
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
    description,
    attendancePercentage,
    totalMeetings,
    cps = [],
    className = '',
}: SubjectResultCardProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={cn('rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all', className)}>
            {/* Header info - fully clickable for mobile ergonomics */}
            <div 
                onClick={() => setExpanded(!expanded)}
                className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition select-none"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{subjectName}</h3>
                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
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
                        <span className="text-sm sm:text-base font-black text-foreground block">{average}</span>
                        <PredicateBadge score={average} />
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-muted-foreground">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>
            </div>

            {/* Expandable Accordion Body */}
            {expanded && (
                <div className="p-4 sm:p-4.5 border-t border-border/60 bg-muted/20 space-y-4 fade-in">
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
                                    <h5 className="text-xs font-bold text-foreground">{cp.label}</h5>
                                    {cp.tps.map((tp) => (
                                        <div key={tp.id} className="space-y-1.5 pt-1">
                                            <p className="text-[11px] font-semibold text-primary">{tp.label}</p>
                                            <div className="space-y-1 pl-2">
                                                {tp.assignments.map((asg) => (
                                                    <div
                                                        key={asg.id}
                                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs border border-border/40 min-h-[40px]"
                                                    >
                                                        <span className="font-medium text-foreground truncate">{asg.title}</span>
                                                        <span className="font-black text-foreground shrink-0 ml-2">{asg.score ?? '-'} / {asg.max_points}</span>
                                                    </div>
                                                ))}
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
