import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Save, Check, User, GraduationCap, FileText } from 'lucide-react';
import { PredicateBadge } from './predicate-badge';
import { cn } from '@/lib/utils';

export interface StudentGradeCardItemProps {
    studentId: number;
    studentName: string;
    studentNis?: string;
    summative: { tp_id: number; score: any; tp_code: string }[];
    initial: { id: number; score: any; type: string }[];
    formative: { id: number; score: any; type: string }[];
    sumatifAkhir: number;
    average: number;
    description: string;
    onSaveSumatifAkhir?: (studentId: number, value: number) => void;
    className?: string;
}

export function StudentGradeCard({
    studentId,
    studentName,
    studentNis,
    summative = [],
    initial = [],
    formative = [],
    sumatifAkhir,
    average,
    description,
    onSaveSumatifAkhir,
    className = '',
}: StudentGradeCardItemProps) {
    const [expanded, setExpanded] = useState(false);
    const [scoreInput, setScoreInput] = useState<number>(sumatifAkhir || Math.round(average));
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        if (onSaveSumatifAkhir) {
            onSaveSumatifAkhir(studentId, scoreInput);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const finalDisplayScore = scoreInput || Math.round(average);

    return (
        <div className={cn('rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all', className)}>
            {/* Main Header / Summary Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                        {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">{studentName}</h3>
                        <p className="text-[11px] text-muted-foreground font-medium truncate">
                            NIS: {studentNis || '-'}
                        </p>
                    </div>
                </div>

                {/* Score & Predicate Pill */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                        <div className="text-xs sm:text-sm font-black text-foreground">{finalDisplayScore}</div>
                        <PredicateBadge score={finalDisplayScore} />
                    </div>

                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 text-muted-foreground transition active:scale-95 min-h-[44px] min-w-[44px]"
                    >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Expandable Accordion Body */}
            {expanded && (
                <div className="p-4 sm:p-4.5 border-t border-border/60 bg-muted/20 space-y-4 fade-in">
                    {/* Final Score Editing Form */}
                    <div className="p-3 rounded-xl bg-card border border-border/70 space-y-2">
                        <label className="text-[11px] font-bold text-foreground block">
                            Nilai Akhir Sumatif Rapor (Editable)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={scoreInput}
                                onChange={(e) => setScoreInput(Number(e.target.value))}
                                className="w-24 h-10 px-3 rounded-xl border border-border bg-background text-sm font-bold text-foreground text-center focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                min={0}
                                max={100}
                            />
                            <button
                                onClick={handleSave}
                                className={cn(
                                    'inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl text-xs font-bold transition active:scale-95 shadow-xs',
                                    saved
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                )}
                            >
                                {saved ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        <span>Tersimpan</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        <span>Simpan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Summative TP Scores List */}
                    {summative.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Nilai Sumatif per Tujuan Pembelajaran (TP)
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {summative.map((tp) => (
                                    <div key={tp.tp_id} className="p-2.5 rounded-xl bg-card border border-border/60 text-center">
                                        <p className="text-[10px] font-bold text-muted-foreground">{tp.tp_code}</p>
                                        <p className="text-sm font-black text-foreground mt-0.5">{tp.score ?? '-'}</p>
                                    </div>
                                ))}
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
                </div>
            )}
        </div>
    );
}
