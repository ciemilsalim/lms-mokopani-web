import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ChevronRight, User } from 'lucide-react';

interface Student {
    id: number;
    name: string;
    nis: string;
    photo_url?: string | null;
}

interface SubmissionCardProps {
    student: Student;
    submission?: {
        id?: number;
        score?: number | null;
        feedback?: string | null;
        submitted_at?: string | null;
        file_path?: string | null;
        content?: string | null;
    } | null;
    maxPoints?: number;
    isSelected?: boolean;
    onSelect: (student: Student) => void;
}

export function SubmissionCard({
    student,
    submission,
    maxPoints = 100,
    isSelected = false,
    onSelect,
}: SubmissionCardProps) {
    const isSubmitted = Boolean(submission && (submission.submitted_at || submission.content || submission.file_path));
    const isGraded = Boolean(submission && submission.score !== null && submission.score !== undefined);

    return (
        <div
            onClick={() => onSelect(student)}
            className={`
                group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer min-h-[56px] active:scale-[0.99]
                ${isSelected
                    ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/20'
                    : 'bg-card hover:bg-muted/40 border-border'
                }
            `}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Student Avatar */}
                {student.photo_url ? (
                    <img
                        src={student.photo_url}
                        alt={student.name}
                        className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
                    />
                ) : (
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                        {student.name.charAt(0).toUpperCase()}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {student.name}
                    </h4>
                    <p className="text-[11px] font-medium text-muted-foreground truncate">
                        NIS: {student.nis || '-'}
                    </p>
                </div>
            </div>

            {/* Status & Score */}
            <div className="flex items-center gap-2.5 shrink-0 pl-2">
                {isGraded ? (
                    <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{submission?.score} / {maxPoints}</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground block mt-0.5 font-medium">Dinilai</span>
                    </div>
                ) : isSubmitted ? (
                    <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            <span>Menunggu</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground block mt-0.5 font-medium">Terkumpul</span>
                    </div>
                ) : (
                    <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-lg border border-destructive/20">
                            <AlertCircle className="h-3 w-3" />
                            <span>Belum</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground block mt-0.5 font-medium">Belum Kumpul</span>
                    </div>
                )}

                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
        </div>
    );
}
