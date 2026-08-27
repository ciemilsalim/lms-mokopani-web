import React, { useState, useMemo, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    Search, CheckCircle2, Clock, AlertCircle, Sparkles, ChevronRight,
    Activity, ListChecks, Mic, FileText, CheckSquare, RotateCcw,
    MessageSquare, Award, ArrowUpDown, Filter, Eye, Check, Loader2,
    SlidersHorizontal, UserCheck, UserX, Star
} from 'lucide-react';
import { StudentAvatar } from '@/components/student-avatar';

interface Student {
    id: number;
    name: string;
    nis?: string;
    photo_url?: string;
}

interface Submission {
    id: number;
    assignment_id: number;
    student_id: number;
    score: number | null;
    feedback?: string | null;
    content?: string | null;
    submitted_at?: string;
    attempts?: number;
    is_remedial_open?: boolean;
    remedial_history?: any[];
    kktp_details?: any;
    student?: Student;
}

interface TeacherGradingWorkspaceProps {
    assignment: any;
    students: Student[];
    assignedClasses?: { id: number; name: string; students_count?: number }[];
    selectedClassId?: number | 'all';
    onOpenObservationModal: (student: Student, existingSubmission?: Submission) => void;
    onOpenAnecdotalModal: (student: Student, existingSubmission?: Submission) => void;
    onOpenRubricModal: (student: Student, existingSubmission?: Submission) => void;
    onOpenOralGrading: (student: Student) => void;
    onOpenPerformanceGrading: (student: Student) => void;
    onOpenProjectGrading: (student: Student) => void;
    onOpenPortfolioGrading: (student: Student) => void;
    onOpenGradeModal: (submission: Submission) => void;
    onOpenRemedial?: (studentId: number) => void;
}

export function TeacherGradingWorkspace({
    assignment,
    students = [],
    assignedClasses = [],
    selectedClassId,
    onOpenObservationModal,
    onOpenAnecdotalModal,
    onOpenRubricModal,
    onOpenOralGrading,
    onOpenPerformanceGrading,
    onOpenProjectGrading,
    onOpenPortfolioGrading,
    onOpenGradeModal,
    onOpenRemedial,
}: TeacherGradingWorkspaceProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'unscored' | 'scored' | 'unsubmitted'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'score_asc' | 'score_desc'>('name');

    // Local inline scores and saving states for rapid batch grading
    const [localScores, setLocalScores] = useState<Record<number, string | number>>(() => {
        const initial: Record<number, string | number> = {};
        (assignment.submissions || []).forEach((sub: Submission) => {
            if (sub.score !== null && sub.score !== undefined) {
                initial[sub.student_id] = sub.score;
            }
        });
        return initial;
    });

    const [savingStates, setSavingStates] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});

    // References to score inputs for keyboard navigation (Tab/Enter/ArrowDown/ArrowUp)
    const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    // Submission map
    const submissionMap = useMemo(() => {
        const map: Record<number, Submission> = {};
        (assignment.submissions || []).forEach((s: Submission) => {
            map[s.student_id] = s;
        });
        return map;
    }, [assignment.submissions]);

    // Summary calculations
    const totalStudents = students.length;
    const submittedCount = (assignment.submissions || []).length;
    const scoredCount = (assignment.submissions || []).filter((s: Submission) => s.score !== null && s.score !== undefined).length;
    const unscoredCount = totalStudents - scoredCount;
    const progressPercentage = totalStudents > 0 ? Math.round((scoredCount / totalStudents) * 100) : 0;

    // Filter & sort students
    const filteredStudents = useMemo(() => {
        return students
            .filter((student) => {
                const sub = submissionMap[student.id];
                const isScored = sub && sub.score !== null && sub.score !== undefined;
                const isSubmitted = !!sub;

                // Status filtering
                if (statusFilter === 'scored' && !isScored) return false;
                if (statusFilter === 'unscored' && isScored) return false;
                if (statusFilter === 'unsubmitted' && isSubmitted) return false;

                // Search query
                if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    const matchName = student.name.toLowerCase().includes(query);
                    const matchNis = student.nis?.toLowerCase().includes(query) || false;
                    return matchName || matchNis;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'name') {
                    return a.name.localeCompare(b.name, 'id');
                }
                const scoreA = submissionMap[a.id]?.score ?? -1;
                const scoreB = submissionMap[b.id]?.score ?? -1;
                if (sortBy === 'score_desc') return scoreB - scoreA;
                if (sortBy === 'score_asc') return scoreA - scoreB;
                return 0;
            });
    }, [students, submissionMap, statusFilter, searchQuery, sortBy]);

    // Handle inline quick score save
    const handleScoreBlurOrEnter = async (studentId: number) => {
        const rawScore = localScores[studentId];
        if (rawScore === '' || rawScore === undefined) return;

        const numScore = Number(rawScore);
        if (isNaN(numScore) || numScore < 0 || numScore > (assignment.max_points || 100)) return;

        // Check if unchanged
        const currentSub = submissionMap[studentId];
        if (currentSub && currentSub.score === numScore) return;

        setSavingStates((prev) => ({ ...prev, [studentId]: 'saving' }));

        try {
            await axios.post(route('assignments.grade'), {
                assignment_id: assignment.id,
                student_id: studentId,
                score: numScore,
                feedback: currentSub?.feedback || '',
                content: currentSub?.content || '',
            });

            setSavingStates((prev) => ({ ...prev, [studentId]: 'saved' }));
            setTimeout(() => {
                setSavingStates((prev) => ({ ...prev, [studentId]: 'idle' }));
            }, 2500);

            // Trigger silent background Inertia reload to sync submission counts
            router.reload({ only: ['assignment'], preserveScroll: true });
        } catch (err) {
            setSavingStates((prev) => ({ ...prev, [studentId]: 'error' }));
        }
    };

    // Keyboard navigation between student inputs
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, studentId: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleScoreBlurOrEnter(studentId);
            const nextStudent = filteredStudents[currentIndex + 1];
            if (nextStudent && inputRefs.current[nextStudent.id]) {
                inputRefs.current[nextStudent.id]?.focus();
                inputRefs.current[nextStudent.id]?.select();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextStudent = filteredStudents[currentIndex + 1];
            if (nextStudent && inputRefs.current[nextStudent.id]) {
                inputRefs.current[nextStudent.id]?.focus();
                inputRefs.current[nextStudent.id]?.select();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevStudent = filteredStudents[currentIndex - 1];
            if (prevStudent && inputRefs.current[prevStudent.id]) {
                inputRefs.current[prevStudent.id]?.focus();
                inputRefs.current[prevStudent.id]?.select();
            }
        }
    };

    const isDirectScoringInstrument = [
        'written_test',
        'formative_quiz',
        'structured_assignment',
        'assignment',
        'quiz_survey',
        'project',
        'portfolio',
        'concept_map'
    ].includes(assignment.instrument_type);

    const selectedClassName = useMemo(() => {
        if (selectedClassId === 'all') return 'Semua Kelas';
        const found = assignedClasses.find(c => c.id === selectedClassId);
        return found ? found.name : (assignedClasses[0]?.name ?? null);
    }, [selectedClassId, assignedClasses]);

    return (
        <div className="space-y-5">
            {/* Real-time Progress & Workspace Header Card */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                            <h2 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
                                Workspace Penilaian Siswa
                            </h2>
                            {selectedClassName && (
                                <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary border border-primary/20">
                                    {selectedClassName} ({totalStudents} Siswa)
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                            Masukkan nilai secara cepat atau buka lembar instrumen lengkap per siswa.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.grade-view', assignment.id))}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition active:scale-[0.98]"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>Split-Screen View</span>
                        </button>
                    </div>
                </div>

                {/* Class Switcher for Multi-Class Assignments */}
                {assignedClasses.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-border/40 scrollbar-hide">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider shrink-0">
                            Pilih Kelas:
                        </span>
                        {assignedClasses.map((cls) => {
                            const isActive = selectedClassId === cls.id || (!selectedClassId && assignedClasses[0]?.id === cls.id);
                            return (
                                <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => router.visit(route('assignments.show', { assignment: assignment.id, class_id: cls.id }), { preserveScroll: true })}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                            : 'bg-muted/40 hover:bg-muted/75 text-muted-foreground hover:text-foreground border border-border/50'
                                    }`}
                                >
                                    <span>{cls.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground font-semibold'}`}>
                                        {cls.students_count ?? 0}
                                    </span>
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.show', { assignment: assignment.id, class_id: 'all' }), { preserveScroll: true })}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                selectedClassId === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                    : 'bg-muted/40 hover:bg-muted/75 text-muted-foreground hover:text-foreground border border-border/50'
                            }`}
                        >
                            <span>Semua Siswa</span>
                        </button>
                    </div>
                )}

                {/* Progress Bar & Status Pill Counters */}
                <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-muted-foreground">
                            Progres Penilaian:{' '}
                            <strong className="text-foreground">
                                {scoredCount} dari {totalStudents} Siswa
                            </strong>
                        </span>
                        <span className="text-primary font-black">{progressPercentage}%</span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-600 transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Summary Chips Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                    <div className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Siswa</span>
                        <span className="text-base font-black text-foreground mt-0.5">{totalStudents}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Sudah Dinilai</span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{scoredCount}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Belum Dinilai</span>
                        <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">{unscoredCount}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Terkumpul</span>
                        <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">{submittedCount}</span>
                    </div>
                </div>
            </div>

            {/* Quick Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama atau NIS siswa..."
                        className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition uppercase tracking-wider ${
                            statusFilter === 'all'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Semua ({totalStudents})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('unscored')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition uppercase tracking-wider ${
                            statusFilter === 'unscored'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-card border border-border text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                        }`}
                    >
                        Belum Dinilai ({unscoredCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('scored')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition uppercase tracking-wider ${
                            statusFilter === 'scored'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-card border border-border text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                    >
                        Sudah Dinilai ({scoredCount})
                    </button>
                </div>
            </div>

            {/* High-Density Student List / Batch Workspace */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                        <UserX className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                        <p className="text-xs font-bold text-foreground">Tidak ada siswa yang sesuai kriteria.</p>
                        <p className="text-[11px] text-muted-foreground">Coba ubah kata kunci pencarian atau filter status.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {/* Table Header (Desktop) */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground items-center">
                            <div className="col-span-1">No</div>
                            <div className="col-span-4">Siswa</div>
                            <div className="col-span-3">Status Pengumpulan</div>
                            <div className="col-span-2 text-center">Nilai (0 - {assignment.max_points || 100})</div>
                            <div className="col-span-2 text-right">Aksi / Lembar Kerja</div>
                        </div>

                        {/* Student Rows */}
                        {filteredStudents.map((student, idx) => {
                            const sub = submissionMap[student.id];
                            const currentScore = localScores[student.id] ?? '';
                            const isScored = sub && sub.score !== null && sub.score !== undefined;
                            const isPassed = isScored && assignment.passing_grade !== null && assignment.passing_grade !== undefined
                                ? Number(sub.score) >= assignment.passing_grade
                                : true;
                            const savingState = savingStates[student.id] || 'idle';

                            return (
                                <div
                                    key={student.id}
                                    className="p-3.5 sm:p-4 lg:px-6 lg:py-3.5 hover:bg-muted/30 transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 items-start lg:items-center"
                                >
                                    {/* No & Student Identity */}
                                    <div className="flex items-center gap-3 w-full lg:w-auto lg:col-span-5">
                                        <span className="text-[11px] font-black text-muted-foreground w-6 shrink-0">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <StudentAvatar
                                            photoUrl={student.photo_url}
                                            name={student.name}
                                            className="h-9 w-9 rounded-xl shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                                {student.name}
                                            </p>
                                            <p className="text-[10px] font-mono text-muted-foreground">
                                                {student.nis || 'NIS -'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Submission Status & KKTP Pill */}
                                    <div className="flex items-center justify-between lg:justify-start gap-2 w-full lg:w-auto lg:col-span-3">
                                        {sub ? (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Terkumpul
                                                </span>
                                                {isScored && assignment.passing_grade && (
                                                    <span
                                                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                            isPassed
                                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                                        }`}
                                                    >
                                                        {isPassed ? 'Tuntas' : 'Remedial'}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                                                <Clock className="h-3 w-3" />
                                                Belum Mengumpulkan
                                            </span>
                                        )}
                                    </div>

                                    {/* Inline Score Input / Score Display */}
                                    <div className="flex items-center justify-between lg:justify-center gap-2 w-full lg:w-auto lg:col-span-2">
                                        <span className="text-[11px] font-bold text-muted-foreground lg:hidden">
                                            Nilai:
                                        </span>
                                        <div className="relative flex items-center">
                                            <input
                                                ref={(el) => { inputRefs.current[student.id] = el; }}
                                                type="number"
                                                min={0}
                                                max={assignment.max_points || 100}
                                                value={currentScore}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLocalScores((prev) => ({ ...prev, [student.id]: val }));
                                                }}
                                                onBlur={() => handleScoreBlurOrEnter(student.id)}
                                                onKeyDown={(e) => handleKeyDown(e, idx, student.id)}
                                                placeholder="—"
                                                className="w-18 sm:w-20 px-2.5 py-1.5 rounded-xl border border-border bg-background text-center text-xs font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                            />
                                            {savingState === 'saving' && (
                                                <Loader2 className="absolute -right-5 h-3.5 w-3.5 text-primary animate-spin" />
                                            )}
                                            {savingState === 'saved' && (
                                                <Check className="absolute -right-5 h-3.5 w-3.5 text-emerald-500" />
                                            )}
                                            {savingState === 'error' && (
                                                <AlertCircle className="absolute -right-5 h-3.5 w-3.5 text-rose-500" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons: Open Detailed Grading Modal/Drawer */}
                                    <div className="flex items-center justify-end gap-1.5 w-full lg:w-auto lg:col-span-2">
                                        {/* Remedial button if needed */}
                                        {sub && assignment.instrument_type === 'formative_quiz' && onOpenRemedial && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenRemedial(student.id)}
                                                title="Buka akses remedial"
                                                className="p-2 rounded-xl text-amber-600 hover:bg-amber-500/10 transition"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (assignment.instrument_type === 'anecdotal_notes') {
                                                    onOpenAnecdotalModal(student, sub);
                                                } else if (assignment.instrument_type === 'rubric') {
                                                    onOpenRubricModal(student, sub);
                                                } else if (assignment.instrument_type === 'performance') {
                                                    onOpenPerformanceGrading(student);
                                                } else if (assignment.instrument_type === 'performance_observation') {
                                                    onOpenObservationModal(student, sub);
                                                } else if (assignment.instrument_type === 'guided_discussion') {
                                                    onOpenObservationModal(student, sub);
                                                } else if (assignment.instrument_type === 'project') {
                                                    onOpenProjectGrading(student);
                                                } else if (assignment.instrument_type === 'portfolio') {
                                                    onOpenPortfolioGrading(student);
                                                } else if (assignment.instrument_type === 'oral_test') {
                                                    onOpenOralGrading(student);
                                                } else if (assignment.instrument_type === 'observation_checklist') {
                                                    onOpenObservationModal(student, sub);
                                                } else {
                                                    if (sub) {
                                                        onOpenGradeModal(sub);
                                                    } else {
                                                        onOpenObservationModal(student, sub);
                                                    }
                                                }
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-bold transition shadow-2xs active:scale-[0.98]"
                                        >
                                            <Eye className="h-3.5 w-3.5 text-primary" />
                                            <span>{isScored ? 'Edit Detail' : 'Beri Nilai'}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
