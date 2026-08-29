import React, { useState, useMemo, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    Search, CheckCircle2, Clock, AlertCircle, Sparkles, ChevronRight,
    Activity, ListChecks, Mic, FileText, CheckSquare, RotateCcw,
    MessageSquare, Award, ArrowUpDown, Filter, Eye, Check, Loader2,
    SlidersHorizontal, UserCheck, UserX, Star, Info, ChevronDown, ChevronUp,
    ExternalLink, Send, CheckCheck, ArrowRight
} from 'lucide-react';
import { StudentAvatar } from '@/components/student-avatar';

interface Student {
    id: number;
    name: string;
    nis?: string;
    photo_url?: string;
    school_class_id?: number;
    school_class?: string;
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

/**
 * TeacherGradingWorkspace
 * Real Mobile-Native Formative Observation & Rapid Assessment Workspace:
 * - Ultra-narrow viewport safe (253px–430px) with 0 horizontal overflow.
 * - Compact mobile student card (72–92px height, full-card tap).
 * - Legible status (○ Belum dinilai / ✓ Dinilai) and 18-20px bold score.
 * - Instant next student switching workflow.
 */
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
    const [statusFilter, setStatusFilter] = useState<'all' | 'unscored' | 'scored'>('all');
    const [showInstructions, setShowInstructions] = useState(false);
    const [globalSaveStatus, setGlobalSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);

    // Helper to get score from submission or parsed auto_score
    const getSubmissionScore = (sub?: Submission | null) => {
        if (!sub) return null;
        if (sub.score !== null && sub.score !== undefined) return sub.score;
        if (sub.content && typeof sub.content === 'string') {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.auto_score !== undefined && parsed.auto_score !== null) {
                    return parsed.auto_score;
                }
            } catch(e) {}
        }
        return null;
    };

    // Local inline scores and saving states for rapid batch grading
    const [localScores, setLocalScores] = useState<Record<number, string | number>>(() => {
        const initial: Record<number, string | number> = {};
        (assignment.submissions || []).forEach((sub: Submission) => {
            const scoreVal = sub.score !== null && sub.score !== undefined ? sub.score : (() => {
                try {
                    const parsed = JSON.parse(sub.content || '{}');
                    return parsed.auto_score ?? null;
                } catch(e) { return null; }
            })();
            if (scoreVal !== null && scoreVal !== undefined) {
                initial[sub.student_id] = scoreVal;
            }
        });
        return initial;
    });

    const [savingStates, setSavingStates] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});

    const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    // Submission map
    const submissionMap = useMemo(() => {
        const map: Record<number, Submission> = {};
        (assignment.submissions || []).forEach((s: Submission) => {
            map[s.student_id] = s;
        });
        return map;
    }, [assignment.submissions]);

    // Keep localScores synced if assignment.submissions updates
    useEffect(() => {
        const updated: Record<number, string | number> = {};
        (assignment.submissions || []).forEach((sub: Submission) => {
            const scoreVal = getSubmissionScore(sub);
            if (scoreVal !== null && scoreVal !== undefined) {
                updated[sub.student_id] = scoreVal;
            }
        });
        if (Object.keys(updated).length > 0) {
            setLocalScores(prev => ({ ...updated, ...prev }));
        }
    }, [assignment.submissions]);

    // Active class name
    const selectedClassName = useMemo(() => {
        if (selectedClassId === 'all') return 'Semua Kelas';
        const found = assignedClasses.find(c => c.id === selectedClassId);
        return found ? found.name : (assignedClasses[0]?.name ?? assignment.school_classes?.[0]?.name ?? 'Kelas 8A');
    }, [selectedClassId, assignedClasses, assignment.school_classes]);

    // Summary calculations
    const totalStudents = students.length;
    const scoredCount = useMemo(() => {
        return students.filter(student => {
            const sub = submissionMap[student.id];
            const subScore = getSubmissionScore(sub);
            const local = localScores[student.id];
            return (subScore !== null && subScore !== undefined) || (local !== '' && local !== undefined && local !== null);
        }).length;
    }, [students, submissionMap, localScores]);

    const unscoredCount = Math.max(0, totalStudents - scoredCount);
    const progressPercentage = totalStudents > 0 ? Math.round((scoredCount / totalStudents) * 100) : 0;

    // Detect scroll for compact sticky header
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 280) {
                setIsStickyHeaderVisible(true);
            } else {
                setIsStickyHeaderVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Filter & sort students
    const filteredStudents = useMemo(() => {
        return students
            .filter((student) => {
                const sub = submissionMap[student.id];
                const subScore = getSubmissionScore(sub);
                const local = localScores[student.id];
                const isScored = (subScore !== null && subScore !== undefined) || (local !== '' && local !== undefined && local !== null);

                // Status filtering: 'all' | 'unscored' | 'scored'
                if (statusFilter === 'scored' && !isScored) return false;
                if (statusFilter === 'unscored' && isScored) return false;

                // Search query
                if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    const matchName = student.name.toLowerCase().includes(query);
                    const matchNis = student.nis?.toLowerCase().includes(query) || false;
                    return matchName || matchNis;
                }

                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, submissionMap, localScores, statusFilter, searchQuery]);

    // Handle inline quick score save
    const handleScoreBlurOrEnter = async (studentId: number) => {
        const rawScore = localScores[studentId];
        if (rawScore === '' || rawScore === undefined || rawScore === null) return;

        const numScore = Number(rawScore);
        if (isNaN(numScore) || numScore < 0 || numScore > (assignment.max_points || 100)) return;

        const currentSub = submissionMap[studentId];
        if (currentSub && currentSub.score === numScore) return;

        setSavingStates((prev) => ({ ...prev, [studentId]: 'saving' }));
        setGlobalSaveStatus('saving');

        try {
            await axios.post(route('assignments.grade'), {
                assignment_id: assignment.id,
                student_id: studentId,
                score: numScore,
                feedback: currentSub?.feedback || '',
                content: currentSub?.content || '',
            });

            setSavingStates((prev) => ({ ...prev, [studentId]: 'saved' }));
            setGlobalSaveStatus('saved');
            const now = new Date();
            setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            setTimeout(() => {
                setSavingStates((prev) => ({ ...prev, [studentId]: 'idle' }));
            }, 2000);

            router.reload({ only: ['assignment'], preserveScroll: true });
        } catch (err) {
            setSavingStates((prev) => ({ ...prev, [studentId]: 'error' }));
            setGlobalSaveStatus('idle');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, studentId: number) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            handleScoreBlurOrEnter(studentId);
            if (e.key === 'Enter') {
                e.preventDefault();
                const nextStudent = filteredStudents[currentIndex + 1];
                if (nextStudent && inputRefs.current[nextStudent.id]) {
                    inputRefs.current[nextStudent.id]?.focus();
                    inputRefs.current[nextStudent.id]?.select();
                }
            }
        }
    };

    const handleOpenDetailModal = (student: Student) => {
        const sub = submissionMap[student.id];
        const type = assignment.instrument_type;

        if (type === 'anecdotal_notes') {
            onOpenAnecdotalModal(student, sub);
        } else if (type === 'rubric') {
            onOpenRubricModal(student, sub);
        } else if (type === 'oral_test' || type === 'oral') {
            onOpenOralGrading(student);
        } else if (type === 'performance') {
            onOpenPerformanceGrading(student);
        } else if (type === 'project') {
            onOpenProjectGrading(student);
        } else if (type === 'portfolio') {
            onOpenPortfolioGrading(student);
        } else if (['observation_checklist', 'performance_observation', 'guided_discussion', 'observation'].includes(type || '')) {
            onOpenObservationModal(student, sub);
        } else {
            if (sub) {
                onOpenGradeModal(sub);
            } else {
                onOpenGradeModal({
                    id: 0,
                    assignment_id: assignment.id,
                    student_id: student.id,
                    score: localScores[student.id] ? Number(localScores[student.id]) : null,
                    student: student,
                });
            }
        }
    };

    const assessmentTypeLabel = assignment.assessment_type === 'initial' 
        ? 'Asesmen Awal' 
        : assignment.assessment_type === 'summative' 
            ? 'Asesmen Sumatif' 
            : 'Asesmen Formatif';

    const handleCompleteGrading = () => {
        setToastMessage(`✓ ${scoredCount} nilai siswa telah tersimpan.`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    return (
        <div className="space-y-4 w-full max-w-full min-w-0 box-border">
            {/* Sticky Compact Header on Scroll */}
            {isStickyHeaderVisible && (
                <div className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-md py-2.5 px-3 sm:px-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 w-full min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {assignment.title}
                                </h4>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {selectedClassName} • {scoredCount}/{totalStudents} dinilai ({progressPercentage}%)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                                <Check className="h-3.5 w-3.5" />
                                <span>Tersimpan</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Assessment Context Card */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3 w-full min-w-0 box-border">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 w-full min-w-0">
                    <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider border border-primary/20">
                                {assessmentTypeLabel}
                            </span>
                            <span className="text-xs text-muted-foreground font-semibold">
                                {assignment.subject || 'Informatika'}
                            </span>
                        </div>
                        <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug line-clamp-2 overflow-wrap-anywhere">
                            {assignment.title}
                        </h1>
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                            <span className="text-foreground">{selectedClassName}</span>
                            <span>•</span>
                            <span>{totalStudents} siswa</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                        {assignment.description && (
                            <button
                                type="button"
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer min-h-[44px]"
                            >
                                <Info className="h-4 w-4" />
                                <span>{showInstructions ? 'Tutup' : 'Detail'}</span>
                                {showInstructions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.grade-view', selectedClassId && selectedClassId !== 'all' ? { assignment: assignment.id, class_id: selectedClassId } : assignment.id))}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition cursor-pointer min-h-[44px]"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span>Split-Screen</span>
                        </button>
                    </div>
                </div>

                {/* Collapsible Instructions Details */}
                {showInstructions && assignment.description && (
                    <div className="mt-2 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                        <p className="font-bold text-foreground text-[11px] uppercase tracking-wider mb-1">Panduan / Deskripsi Tugas:</p>
                        <div className="whitespace-pre-line">{assignment.description}</div>
                    </div>
                )}

                {/* Class Switcher Pills (If Multi-Class) */}
                {assignedClasses.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-border/50 scrollbar-hide">
                        {assignedClasses.map((cls) => {
                            const isActive = selectedClassId === cls.id || (!selectedClassId && assignedClasses[0]?.id === cls.id);
                            return (
                                <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => router.visit(route('assignments.show', { assignment: assignment.id, class_id: cls.id }), { preserveScroll: true })}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                            : 'bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/60'
                                    }`}
                                >
                                    <span>{cls.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground font-semibold'}`}>
                                        {cls.students_count ?? 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 2. Progress Card */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3 w-full min-w-0 box-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Progres Penilaian
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-base sm:text-lg font-bold text-foreground">
                                {scoredCount} / {totalStudents} siswa dinilai
                            </span>
                            <span className="text-xs font-bold text-primary">
                                ({progressPercentage}%)
                            </span>
                        </div>
                    </div>

                    <div>
                        {unscoredCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold min-h-[36px]">
                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                <span>{unscoredCount} siswa belum dinilai</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold min-h-[36px]">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Semua siswa telah dinilai</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar (8px height, rounded-full) */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* 3. Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 w-full min-w-0">
                {/* Search Box (48px height, 16px radius) */}
                <div className="relative flex-1 w-full min-w-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama atau NIS siswa..."
                        className="w-full pl-11 pr-4 py-2.5 bg-card border border-border/80 rounded-2xl text-sm font-medium text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[48px] box-border"
                    />
                </div>

                {/* Filter Tabs (40-44px height) */}
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                            statusFilter === 'all'
                                ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Semua ({totalStudents})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('unscored')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                            statusFilter === 'unscored'
                                ? 'bg-amber-600 text-white shadow-xs font-black'
                                : 'bg-card border border-border text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                        }`}
                    >
                        Belum ({unscoredCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('scored')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                            statusFilter === 'scored'
                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                : 'bg-card border border-border text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                    >
                        Selesai ({scoredCount})
                    </button>
                </div>
            </div>

            {/* 4. Primary Work Area: Compact Mobile Student Cards (72-92px height, full card tap) */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden w-full min-w-0 box-border">
                {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                        <UserX className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                        <p className="text-sm font-bold text-foreground">Tidak ada siswa yang sesuai filter.</p>
                        <p className="text-xs text-muted-foreground">Coba ubah kata kunci atau pilih tab 'Semua'.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/60">
                        {filteredStudents.map((student, idx) => {
                            const sub = submissionMap[student.id];
                            const subScore = getSubmissionScore(sub);
                            const currentScore = localScores[student.id] ?? '';
                            const isScored = (subScore !== null && subScore !== undefined) || (currentScore !== '' && currentScore !== undefined);
                            const effectiveScore = currentScore !== '' && currentScore !== undefined ? currentScore : (subScore ?? '');
                            const isPassed = isScored && assignment.passing_grade !== null && assignment.passing_grade !== undefined
                                ? Number(effectiveScore) >= assignment.passing_grade
                                : true;
                            const savingState = savingStates[student.id] || 'idle';

                            return (
                                <div
                                    key={student.id}
                                    onClick={() => handleOpenDetailModal(student)}
                                    className="p-3.5 sm:p-4 hover:bg-muted/20 active:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between gap-3 min-h-[76px] sm:min-h-[84px] w-full min-w-0 box-border"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleOpenDetailModal(student);
                                        }
                                    }}
                                >
                                    {/* Left: Number + Avatar (36x36) + Name (13px bold) + NIS + Legible Status */}
                                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                        <span className="text-[10px] sm:text-11px font-mono font-bold text-muted-foreground/70 w-4 sm:w-5 shrink-0 text-center">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>

                                        <StudentAvatar
                                            photoUrl={student.photo_url}
                                            name={student.name}
                                            className="h-9 w-9 rounded-xl shrink-0"
                                        />

                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <p className="text-[13px] sm:text-sm font-bold text-foreground leading-snug line-clamp-2 overflow-wrap-anywhere">
                                                {student.name}
                                            </p>
                                            
                                            {student.nis && (
                                                <p className="text-[11px] font-mono text-muted-foreground truncate">
                                                    {student.nis}
                                                </p>
                                            )}

                                            {/* Status Indicator (Text + Icon) */}
                                            <div className="flex items-center gap-1.5 pt-0.5">
                                                {isScored ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                        <span>Dinilai</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                                        <span>Belum dinilai</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Score or Action CTA */}
                                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {isScored ? (
                                            <div
                                                onClick={() => handleOpenDetailModal(student)}
                                                className="flex flex-col items-end cursor-pointer"
                                            >
                                                <span className="text-base sm:text-lg font-bold text-foreground leading-tight">
                                                    {effectiveScore}
                                                </span>
                                                {assignment.passing_grade && (
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded mt-0.5 ${
                                                        isPassed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                                    }`}>
                                                        {isPassed ? 'Tuntas' : 'Remedial'}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenDetailModal(student)}
                                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition active:scale-95 cursor-pointer min-h-[44px]"
                                            >
                                                <span>Nilai</span>
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        )}

                                        {/* Desktop-only quick inline input */}
                                        <div className="hidden md:flex items-center relative pl-2 border-l border-border/60">
                                            <input
                                                ref={(el) => { inputRefs.current[student.id] = el; }}
                                                type="number"
                                                min="0"
                                                max={assignment.max_points || 100}
                                                value={localScores[student.id] ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLocalScores((prev) => ({ ...prev, [student.id]: val }));
                                                }}
                                                onBlur={() => handleScoreBlurOrEnter(student.id)}
                                                onKeyDown={(e) => handleKeyDown(e, idx, student.id)}
                                                placeholder="—"
                                                className="w-14 h-9 px-2 text-center text-xs font-bold rounded-xl border border-border bg-card text-foreground transition focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                title="Input nilai cepat (Desktop)"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 5. Sticky Bottom Footer on Mobile: Autosave & Finish Button */}
            <div className="sticky bottom-0 z-30 -mx-3 xs:-mx-4 sm:-mx-6 -mb-6 px-4 sm:px-6 py-3 bg-card/95 backdrop-blur-md border-t border-border shadow-lg flex items-center justify-between gap-3 w-auto min-w-0">
                <div className="flex items-center gap-2 text-xs truncate">
                    {globalSaveStatus === 'saving' ? (
                        <span className="inline-flex items-center gap-1.5 text-primary font-bold animate-pulse">
                            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                            <span className="truncate">Menyimpan nilai...</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium truncate">
                            <CheckCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="truncate">
                                <strong>{scoredCount}/{totalStudents}</strong> tersimpan otomatis
                            </span>
                        </span>
                    )}
                </div>

                <div className="shrink-0">
                    <button
                        type="button"
                        onClick={handleCompleteGrading}
                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px] ${
                            unscoredCount === 0
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Selesai</span>
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-20 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs font-bold animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
}

export default TeacherGradingWorkspace;
