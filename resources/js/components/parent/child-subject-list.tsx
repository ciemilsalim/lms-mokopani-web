import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Clock, CheckCircle2, FileText, Calendar } from 'lucide-react';
import { PredicateBadge } from '@/components/gradebook';
import { cn } from '@/lib/utils';

export interface AssignmentItem {
    id: number;
    title: string;
    score: any;
    max_points: number;
    status: string;
    type: string;
    tp_id: number | null;
}

export interface SubjectReportItem {
    subject_name: string;
    assignments: AssignmentItem[];
    average: number;
    description: string;
    attendance_percentage: number;
    total_meetings: number;
}

export interface ChildSubjectListProps {
    reports: SubjectReportItem[];
    className?: string;
}

export function ChildSubjectList({ reports = [], className = '' }: ChildSubjectListProps) {
    const [expandedIndexes, setExpandedIndexes] = useState<Record<number, boolean>>({});

    const toggleExpand = (index: number) => {
        setExpandedIndexes(prev => ({ ...prev, [index]: !prev[index] }));
    };

    if (reports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-2xl border border-border p-6 text-center">
                <BookOpen className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-bold text-foreground">Belum ada data nilai mata pelajaran</p>
                <p className="text-xs text-muted-foreground mt-1">Nilai akan muncul setelah bapak/ibu guru memberikan penilaian.</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-3', className)}>
            {reports.map((subject, idx) => {
                const isExpanded = expandedIndexes[idx];
                return (
                    <div key={idx} className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all">
                        {/* Summary Header */}
                        <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">{subject.subject_name}</h3>
                                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                                        <Calendar className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                                        <span>Kehadiran: {subject.attendance_percentage}%</span>
                                        <span className="text-border">•</span>
                                        <span>{subject.total_meetings} Pertemuan</span>
                                    </p>
                                </div>
                            </div>

                            {/* Score & Predicate */}
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                    <span className="text-xs sm:text-sm font-black text-foreground block">{subject.average}</span>
                                    <PredicateBadge score={subject.average} />
                                </div>

                                <button
                                    onClick={() => toggleExpand(idx)}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 text-muted-foreground transition active:scale-95 min-h-[44px] min-w-[44px]"
                                >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Expandable Accordion Body */}
                        {isExpanded && (
                            <div className="p-4 sm:p-4.5 border-t border-border/60 bg-muted/20 space-y-4 fade-in">
                                {/* Achievement Description */}
                                {subject.description && (
                                    <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                            <span>Catatan Capaian Pembelajaran Guru</span>
                                        </p>
                                        <p className="text-xs text-foreground leading-relaxed italic">{subject.description}</p>
                                    </div>
                                )}

                                {/* Assignments List */}
                                {subject.assignments.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Daftar Tugas & Asesmen
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {subject.assignments.map((item) => (
                                                <div key={item.id} className="p-3 rounded-xl bg-card border border-border/60 space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border', item.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20')}>
                                                            {item.status}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.type}</span>
                                                    </div>
                                                    <h5 className="text-xs font-bold text-foreground truncate">{item.title}</h5>
                                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                                                        <span className="text-muted-foreground font-medium">Skor Pengerjaan:</span>
                                                        <span className="font-black text-foreground">{item.score} / {item.max_points}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
