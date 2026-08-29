import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Clock, CheckCircle2, Pencil, Trash2, ChevronRight, FileText, AlertCircle,
    MoreVertical, PenTool, BarChart3, ExternalLink, ArrowRight
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

const assessmentTypeLabels: Record<string, string> = {
    initial: 'Awal',
    formative: 'Formatif',
    summative: 'Sumatif',
};

interface AssessmentCardProps {
    assignment: AssignmentItem;
    isTeacher?: boolean;
    viewMode?: 'row' | 'card' | 'teacher-item';
    classId?: number;
    onDelete?: (id: number) => void;
}

/**
 * AssessmentCard
 * Mobile-Native assessment card component:
 * - 96–120px compact target height on mobile
 * - 14-15px font-bold title with 2-line clamp
 * - Concise status (e.g., "1 dari 27 terkumpul", "Belum ada pengumpulan")
 * - 44px min-height primary action button & 44x44px touch area ellipsis menu
 */
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

    // --- Standalone Card View (used in Student view) ---
    if (viewMode === 'card') {
        const isSubmitted = Boolean(assignment.student_submission);
        const isGraded = Boolean(assignment.student_submission?.is_graded);

        return (
            <div
                onClick={handleNavigate}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/40 active:scale-[0.99] cursor-pointer"
            >
                <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary truncate max-w-[150px]">
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
                            <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs group-hover:bg-primary/90 transition min-h-[44px]">
                                Kerjakan <ChevronRight className="h-4 w-4" />
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-muted px-3.5 py-2 text-xs font-bold text-foreground group-hover:bg-muted/80 transition min-h-[44px]">
                                Lihat <ChevronRight className="h-4 w-4" />
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- Action-First Teacher Item Layout (Mobile-Native Spec: 96-120px height) ---
    if (isTeacher) {
        const pendingCount = assignment.pending_grading_count || 0;
        const totalStudents = assignment.students_count || 0;
        const submissionsCount = assignment.submissions_count || 0;
        const typeBadge = assignment.assessment_type ? assessmentTypeLabels[assignment.assessment_type] || assignment.assessment_type : null;

        return (
            <div
                onClick={handleNavigate}
                className="group p-3.5 sm:p-4 bg-card hover:bg-muted/20 transition-colors cursor-pointer border-b last:border-b-0 border-border/50 flex flex-col justify-between min-h-[96px] sm:min-h-[104px] gap-2.5 w-full min-w-0 box-border"
            >
                {/* Top Row: Type Dot + Title & 44x44px Ghost Ellipsis */}
                <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                assignment.assessment_type === 'initial' ? 'bg-primary' :
                                assignment.assessment_type === 'formative' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <h3 className="text-sm sm:text-[15px] font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 overflow-wrap-anywhere">
                                {assignment.title}
                            </h3>
                        </div>

                        {/* Subject, Instrument & Type label */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-4.5 truncate">
                            <span className="font-semibold text-foreground/85">{assignment.subject_name}</span>
                            <span>•</span>
                            <span className="font-medium text-muted-foreground">{instrumentLabels[assignment.instrument_type || ''] || 'Asesmen'}</span>
                            {typeBadge && (
                                <>
                                    <span>•</span>
                                    <span className="text-[11px] font-bold text-primary/90">{typeBadge}</span>
                                </>
                            )}
                            {assignment.topic && (
                                <span className="hidden md:inline text-[11px] text-muted-foreground/80 truncate max-w-xs">
                                    • {assignment.topic}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Secondary Action Dropdown (44x44px touch area) */}
                    <div className="shrink-0 -mr-1.5 -mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer flex items-center justify-center active:scale-95"
                                    aria-label="Menu Opsi Asesmen"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border border-border bg-card p-1">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit();
                                    }}
                                    className="gap-2 text-xs font-bold py-2.5 cursor-pointer rounded-lg min-h-[44px]"
                                >
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                    <span>Edit Asesmen</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenGrading(e);
                                    }}
                                    className="gap-2 text-xs font-bold py-2.5 cursor-pointer rounded-lg min-h-[44px]"
                                >
                                    <PenTool className="h-4 w-4 text-primary" />
                                    <span>Mode Penilaian Split</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="gap-2 text-xs font-bold py-2.5 text-destructive focus:text-destructive cursor-pointer rounded-lg min-h-[44px]"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Hapus Asesmen</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Bottom Row: Clear Status & 44px Primary Action Button */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 pl-4.5 w-full min-w-0">
                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                        {pendingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-500/30">
                                <span>🟠</span>
                                <span>{pendingCount} Perlu Dinilai</span>
                            </span>
                        ) : submissionsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/20">
                                <span>🟢</span>
                                <span>
                                    {totalStudents > 0 ? `${submissionsCount} dari ${totalStudents} terkumpul` : `${submissionsCount} terkumpul`}
                                </span>
                            </span>
                        ) : (
                            <span className="text-muted-foreground text-xs font-medium truncate">
                                Belum ada pengumpulan
                            </span>
                        )}
                    </div>

                    {/* Primary CTA Button (44px target) */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        {pendingCount > 0 ? (
                            <button
                                type="button"
                                onClick={handleOpenGrading}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer min-h-[44px]"
                            >
                                <PenTool className="h-3.5 w-3.5" />
                                <span>Nilai ({pendingCount})</span>
                            </button>
                        ) : submissionsCount > 0 ? (
                            <button
                                type="button"
                                onClick={handleNavigate}
                                className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition active:scale-95 cursor-pointer min-h-[44px]"
                            >
                                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                                <span>Lihat Rekap</span>
                                <ArrowRight className="h-3.5 w-3.5 ml-0.5 text-muted-foreground" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNavigate}
                                className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition active:scale-95 cursor-pointer min-h-[44px]"
                            >
                                <span>Buka</span>
                                <ChevronRight className="h-4 w-4" />
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
            className="group flex items-center justify-between py-3.5 px-4 hover:bg-muted/40 transition-colors cursor-pointer active:bg-muted/60 min-h-[52px]"
        >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    assignment.assessment_type === 'initial' ? 'bg-primary' :
                    assignment.assessment_type === 'formative' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />

                <h3 className="text-sm font-bold text-foreground truncate max-w-sm group-hover:text-primary transition-colors">
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
