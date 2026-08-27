import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Clock, CheckCircle2, Pencil, Trash2, ChevronRight, FileText, AlertCircle,
    MoreVertical, PenTool, BarChart3, ExternalLink
} from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AssessmentTypeBadge, StudentSubmissionBadge } from './assessment-status-badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface AssignmentItem {
    id: number;
    title: string;
    description?: string;
    subject_name: string;
    subject_id?: number;
    due_date: string | null;
    max_points: number;
    assessment_type: string | null;
    instrument_type: string | null;
    scoring_tool?: string | null;
    submissions_count: number;
    graded_count?: number;
    pending_grading_count?: number;
    unsubmitted_count?: number;
    students_count?: number;
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
    formative_quiz: 'Tes Singkat', guided_discussion: 'Diskusi Terpandu', structured_assignment: 'Penugasan Terstruktur',
};

interface AssessmentCardProps {
    assignment: AssignmentItem;
    isTeacher?: boolean;
    viewMode?: 'row' | 'card' | 'teacher-item';
    classId?: number;
    onDelete?: (id: number) => void;
}

export function AssessmentCard({
    assignment,
    isTeacher = false,
    viewMode = 'row',
    classId,
    onDelete,
}: AssessmentCardProps) {
    const overdue = isOverdue(assignment.due_date);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleEdit = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
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
        if (classId) {
            router.visit(route('assignments.show', { assignment: assignment.id, class_id: classId }));
        } else {
            router.visit(route('assignments.show', assignment.id));
        }
    };

    const handleOpenGrading = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (classId) {
            router.visit(route('assignments.grade-view', { assignment: assignment.id, class_id: classId }));
        } else {
            router.visit(route('assignments.grade-view', assignment.id));
        }
    };

    // --- Standalone Card View (used in Student view or Grid) ---
    if (viewMode === 'card') {
        const isSubmitted = Boolean(assignment.student_submission);
        const isGraded = Boolean(assignment.student_submission?.is_graded);

        return (
            <div
                onClick={handleNavigate}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
            >
                <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
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

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Tenggat</p>
                        <p className={`text-xs font-semibold truncate ${overdue && !isSubmitted ? 'text-destructive font-bold' : 'text-foreground'}`}>
                            {assignment.due_date ? assignment.due_date : 'Bebas'}
                        </p>
                    </div>

                    <div className="shrink-0">
                        {!isSubmitted ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs group-hover:bg-primary/90 transition min-h-[34px]">
                                Kerjakan <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-bold text-foreground group-hover:bg-muted/80 transition min-h-[34px]">
                                Lihat <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- Action-First Teacher Item Layout ---
    if (isTeacher) {
        const pendingCount = assignment.pending_grading_count || 0;
        const gradedCount = assignment.graded_count ?? (pendingCount === 0 ? assignment.submissions_count : 0);
        const totalStudents = assignment.students_count || 0;
        const unsubmittedCount = totalStudents > 0 ? Math.max(0, totalStudents - assignment.submissions_count) : 0;

        return (
            <div
                onClick={handleNavigate}
                className="group p-3 sm:p-3.5 bg-card hover:bg-muted/20 transition-colors cursor-pointer border-b last:border-b-0 border-border/40 space-y-2"
            >
                {/* Top: Title & Secondary Dropdown */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${
                                assignment.assessment_type === 'initial' ? 'bg-primary' :
                                assignment.assessment_type === 'formative' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                                {assignment.title}
                            </h3>
                        </div>

                        {/* Subject & TP metadata */}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground/80">{assignment.subject_name}</span>
                            {assignment.topic && (
                                <>
                                    <span>•</span>
                                    <span className="truncate max-w-[200px] sm:max-w-xs">{assignment.topic}</span>
                                </>
                            )}
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline text-[10px] bg-muted px-1.5 py-0.2 rounded font-medium">
                                {instrumentLabels[assignment.instrument_type || ''] || 'Asesmen'}
                            </span>
                        </p>
                    </div>

                    {/* Secondary Action Dropdown (⋮) */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="p-1.5 rounded-xl border border-transparent hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer h-8 w-8 flex items-center justify-center"
                                    title="Menu Opsi"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border border-border bg-card p-1">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit();
                                    }}
                                    className="gap-2 text-xs font-bold py-2 cursor-pointer rounded-lg"
                                >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Edit Asesmen</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenGrading(e);
                                    }}
                                    className="gap-2 text-xs font-bold py-2 cursor-pointer rounded-lg"
                                >
                                    <PenTool className="h-3.5 w-3.5 text-primary" />
                                    <span>Mode Split-Screen</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="gap-2 text-xs font-bold py-2 text-destructive focus:text-destructive cursor-pointer rounded-lg"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Hapus Asesmen</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Bottom: Clear Status Badges & Primary Action Button */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                    {/* Status Indicators */}
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 text-[11px]">
                        {pendingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold border border-amber-500/30">
                                <span>🟠</span>
                                <span>{pendingCount} Hasil Perlu Dinilai</span>
                            </span>
                        ) : assignment.submissions_count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                                <span>🟢</span>
                                <span>
                                    {totalStudents > 0 ? `${gradedCount}/${totalStudents} Selesai` : `${gradedCount} Selesai`}
                                </span>
                            </span>
                        ) : (
                            <span className="text-muted-foreground text-[11px] font-medium">
                                Belum ada pengumpulan
                            </span>
                        )}

                        {overdue && unsubmittedCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                                <span>🔴</span>
                                <span>{unsubmittedCount} Belum/Terlambat</span>
                            </span>
                        )}
                    </div>

                    {/* Primary CTA Button */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        {pendingCount > 0 ? (
                            <button
                                type="button"
                                onClick={handleOpenGrading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                            >
                                <PenTool className="h-3.5 w-3.5" />
                                <span>Nilai {pendingCount} Siswa</span>
                            </button>
                        ) : assignment.submissions_count > 0 ? (
                            <button
                                type="button"
                                onClick={handleNavigate}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition active:scale-95 cursor-pointer"
                            >
                                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                                <span>Lihat Rekap</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNavigate}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition active:scale-95 cursor-pointer"
                            >
                                <span>Buka</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
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

    // --- Simple Row Fallback (Flat list) ---
    return (
        <div
            onClick={handleNavigate}
            className="group flex items-center justify-between py-3 px-3.5 sm:px-4 hover:bg-muted/40 transition-colors cursor-pointer active:bg-muted/60 min-h-[50px]"
        >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    assignment.assessment_type === 'initial' ? 'bg-primary' :
                    assignment.assessment_type === 'formative' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />

                <h3 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-sm group-hover:text-primary transition-colors">
                    {assignment.title}
                </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
        </div>
    );
}

export default AssessmentCard;
