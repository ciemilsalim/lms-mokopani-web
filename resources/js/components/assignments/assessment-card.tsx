import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Clock, CheckCircle2, Pencil, Trash2, ChevronRight, FileText, AlertCircle
} from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AssessmentTypeBadge, StudentSubmissionBadge } from './assessment-status-badge';

export interface AssignmentItem {
    id: number;
    title: string;
    description: string;
    subject_name: string;
    subject_id?: number;
    due_date: string | null;
    max_points: number;
    assessment_type: string | null;
    instrument_type: string | null;
    scoring_tool?: string | null;
    submissions_count: number;
    pending_grading_count?: number;
    is_accessible?: boolean;
    student_submission?: { id: number; is_graded: boolean } | null;
    topic?: string;
}

const isOverdue = (due: string | null): boolean => {
    if (!due) return false;
    return new Date(due) < new Date();
};

const instrumentLabels: Record<string, string> = {
    quiz_survey: 'Kuis/Survei', observation_checklist: 'Observasi', anecdotal_notes: 'Anekdotal',
    reflective_journal: 'Jurnal Reflektif', self_assessment: 'Penilaian Diri', peer_assessment: 'Peer Assessment',
    rubric: 'Rubrik', exit_ticket: 'Exit Ticket', concept_map: 'Peta Konsep', performance_observation: 'Observasi',
    written_test: 'Tes Tertulis', oral_test: 'Tes Lisan', performance: 'Kinerja',
    project: 'Proyek', portfolio: 'Portofolio', assignment: 'Penugasan',
    formative_quiz: 'Tes/Penugasan Singkat', guided_discussion: 'Diskusi Terpandu', structured_assignment: 'Penugasan Terstruktur',
};

interface AssessmentCardProps {
    assignment: AssignmentItem;
    isTeacher?: boolean;
    viewMode?: 'row' | 'card';
    onDelete?: (id: number) => void;
}

export function AssessmentCard({
    assignment,
    isTeacher = false,
    viewMode = 'row',
    onDelete,
}: AssessmentCardProps) {
    const overdue = isOverdue(assignment.due_date);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.get(route('assignments.edit', assignment.id));
    };

    const handleDeleteConfirm = () => {
        if (onDelete) {
            onDelete(assignment.id);
        } else {
            router.delete(route('assignments.destroy', assignment.id));
        }
    };

    const handleNavigate = () => {
        router.visit(route('assignments.show', assignment.id));
    };

    // --- Standalone Card View (used in Student view or Grid) ---
    if (viewMode === 'card') {
        const isSubmitted = Boolean(assignment.student_submission);
        const isGraded = Boolean(assignment.student_submission?.is_graded);

        return (
            <div
                onClick={handleNavigate}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
            >
                <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="rounded-xl bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary truncate max-w-[150px]">
                            {assignment.subject_name}
                        </span>
                        <StudentSubmissionBadge isSubmitted={isSubmitted} isGraded={isGraded} />
                    </div>

                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {assignment.title}
                    </h3>

                    {assignment.topic && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {assignment.topic}
                        </p>
                    )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Tenggat Waktu</p>
                        <p className={`text-xs font-semibold truncate ${overdue && !isSubmitted ? 'text-destructive font-bold' : 'text-foreground'}`}>
                            {assignment.due_date ? assignment.due_date : 'Tidak ada batas'}
                        </p>
                    </div>

                    <div className="shrink-0">
                        {!isSubmitted ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-xs group-hover:bg-primary/90 transition min-h-[36px]">
                                Kerjakan <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground group-hover:bg-muted/80 transition min-h-[36px]">
                                Lihat <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- Row View (used in Teacher Class/Subject Accordions & Flat lists) ---
    return (
        <div
            onClick={handleNavigate}
            className="group flex items-center justify-between py-3 px-3.5 sm:px-4 hover:bg-muted/40 border-l-2 border-transparent hover:border-primary transition-colors cursor-pointer active:bg-muted/60 min-h-[52px]"
        >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    assignment.assessment_type === 'initial' ? 'bg-primary' :
                    assignment.assessment_type === 'formative' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} title={assignment.assessment_type || 'Asesmen'} />

                <h3 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-sm group-hover:text-primary transition-colors">
                    {assignment.title}
                </h3>

                <span className="hidden sm:inline-flex items-center rounded-lg bg-muted/60 border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    {instrumentLabels[assignment.instrument_type || ''] || assignment.instrument_type || 'Tugas'}
                </span>

                {assignment.due_date && overdue && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive shrink-0">
                        <Clock className="h-3 w-3" /> Terlambat
                    </span>
                )}
                {!isTeacher && assignment.student_submission?.is_graded && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Dinilai
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
                {isTeacher ? (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-end">
                            {(assignment.pending_grading_count && assignment.pending_grading_count > 0) ? (
                                <span className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-300 font-extrabold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                    🟠 {assignment.pending_grading_count} Perlu Nilai
                                </span>
                            ) : assignment.submissions_count > 0 ? (
                                <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                    🟢 {assignment.submissions_count} Selesai
                                </span>
                            ) : (
                                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-lg">
                                    0 Pengumpulan
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleEdit}
                                className="rounded-xl p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                                title="Edit asesmen"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(true);
                                }}
                                className="rounded-xl p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                                title="Hapus asesmen"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs">
                        {assignment.student_submission ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Dikumpulkan</span>
                        ) : (
                            <span className="text-muted-foreground">Belum</span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Hapus Asesmen"
                message="Peringatan! Menghapus asesmen ini akan MENGHAPUS SEMUA data pengumpulan siswa dan nilai terkait secara permanen."
                onConfirm={handleDeleteConfirm}
                requireInput="DELETE"
                inputPlaceholder="Ketik DELETE untuk konfirmasi"
            />
        </div>
    );
}
