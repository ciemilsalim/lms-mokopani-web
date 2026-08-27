import React, { useState, useMemo, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    Search, CheckCircle2, Clock, AlertCircle, Sparkles, ChevronRight,
    Activity, ListChecks, Mic, FileText, CheckSquare, RotateCcw,
    MessageSquare, Award, ArrowUpDown, Filter, Eye, Check, Loader2,
    SlidersHorizontal, UserCheck, UserX, Star, Info, ChevronDown, ChevronUp,
    ExternalLink, Send, CheckCheck
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
    const headerSentinelRef = useRef<HTMLDivElement | null>(null);

    // Submission map
    const submissionMap = useMemo(() => {
        const map: Record<number, Submission> = {};
        (assignment.submissions || []).forEach((s: Submission) => {
            map[s.student_id] = s;
        });
        return map;
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
            const local = localScores[student.id];
            return (sub && sub.score !== null && sub.score !== undefined) || (local !== '' && local !== undefined && local !== null);
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
                const local = localScores[student.id];
                const isScored = (sub && sub.score !== null && sub.score !== undefined) || (local !== '' && local !== undefined && local !== null);

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

        // Check if unchanged
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
            setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

            setTimeout(() => {
                setSavingStates((prev) => ({ ...prev, [studentId]: 'idle' }));
            }, 2500);

            // Silent Inertia reload for state integrity
            router.reload({ only: ['assignment'], preserveScroll: true });
        } catch (err) {
            setSavingStates((prev) => ({ ...prev, [studentId]: 'error' }));
            setGlobalSaveStatus('idle');
        }
    };

    // Keyboard navigation between student inputs
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

    const handleOpenDetailModal = (student: Student) => {
        const sub = submissionMap[student.id];
        const type = assignment.instrument_type;

        if (type === 'anecdotal_notes') {
            onOpenAnecdotalModal(student, sub);
        } else if (type === 'rubric') {
            onOpenRubricModal(student, sub);
        } else if (type === 'oral_test') {
            onOpenOralGrading(student);
        } else if (type === 'performance') {
            onOpenPerformanceGrading(student);
        } else if (type === 'project') {
            onOpenProjectGrading(student);
        } else if (type === 'portfolio') {
            onOpenPortfolioGrading(student);
        } else if (['observation_checklist', 'performance_observation', 'guided_discussion'].includes(type)) {
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
        setToastMessage(`✓ Berhasil: ${scoredCount} nilai siswa telah tersimpan.`);
        setTimeout(() => setToastMessage(null), 4000);
    };

    return (
        <div className="space-y-4">
            {/* Sticky Compact Header on Scroll */}
            {isStickyHeaderVisible && (
                <div className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-md py-2.5 px-4 sm:px-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {assignment.title}
                                </h4>
                                <p className="text-[10px] text-muted-foreground">
                                    {selectedClassName} • {scoredCount}/{totalStudents} Siswa Dinilai ({progressPercentage}%)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {unscoredCount > 0 && statusFilter !== 'unscored' && (
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('unscored')}
                                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
                                >
                                    <span>Lanjut {unscoredCount} Belum Dinilai</span>
                                </button>
                            )}
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                <Check className="h-3 w-3" />
                                <span>Tersimpan</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ① Minimalist Context Header */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider border border-primary/20">
                                {assessmentTypeLabel}
                            </span>
                            <span className="text-xs text-muted-foreground font-semibold">
                                {assignment.subject || 'Informatika'}
                            </span>
                        </div>
                        <h1 className="text-base sm:text-xl font-black text-foreground tracking-tight leading-snug">
                            {assignment.title}
                        </h1>
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                            <span className="text-foreground">{selectedClassName}</span>
                            <span>•</span>
                            <span>{totalStudents} Siswa Terdaftar</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {assignment.description && (
                            <button
                                type="button"
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
                            >
                                <Info className="h-3.5 w-3.5" />
                                <span>{showInstructions ? 'Tutup Panduan' : 'Detail Asesmen'}</span>
                                {showInstructions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.grade-view', selectedClassId && selectedClassId !== 'all' ? { assignment: assignment.id, class_id: selectedClassId } : assignment.id))}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition cursor-pointer"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>Split-Screen</span>
                        </button>
                    </div>
                </div>

                {/* Collapsible Instructions Details */}
                {showInstructions && assignment.description && (
                    <div className="mt-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                        <p className="font-bold text-foreground text-[11px] uppercase tracking-wider mb-1">Panduan / Deskripsi Tugas:</p>
                        <div className="whitespace-pre-line">{assignment.description}</div>
                    </div>
                )}

                {/* Class Switcher Pills (If Multi-Class) */}
                {assignedClasses.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-border/50 scrollbar-hide">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
                            Pilih Kelas:
                        </span>
                        {assignedClasses.map((cls) => {
                            const isActive = selectedClassId === cls.id || (!selectedClassId && assignedClasses[0]?.id === cls.id);
                            return (
                                <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => router.visit(route('assignments.show', { assignment: assignment.id, class_id: cls.id }), { preserveScroll: true })}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.show', { assignment: assignment.id, class_id: 'all' }), { preserveScroll: true })}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                selectedClassId === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                    : 'bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/60'
                            }`}
                        >
                            <span>Semua Siswa</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ② Actionable Progress Section */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Progres Penilaian
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-base sm:text-lg font-black text-foreground">
                                {scoredCount} dari {totalStudents} siswa sudah dinilai
                            </span>
                            <span className="text-xs font-black text-primary">
                                ({progressPercentage}%)
                            </span>
                        </div>
                    </div>

                    {/* Alert Pill for Next Action */}
                    <div>
                        {unscoredCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold">
                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                <span>{unscoredCount} siswa belum dinilai</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Semua siswa telah selesai dinilai</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* ③ Quick Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Search Box */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama atau NIS siswa..."
                        className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            statusFilter === 'scored'
                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                : 'bg-card border border-border text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                    >
                        Selesai ({scoredCount})
                    </button>
                </div>
            </div>

            {/* ④ Ultra-Compact Student Assessment List (~64px height per item) */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                {filteredStudents.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                        <UserX className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                        <p className="text-xs font-bold text-foreground">Tidak ada siswa yang sesuai filter.</p>
                        <p className="text-[11px] text-muted-foreground">Coba ubah kata kunci atau pilih filter 'Semua'.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filteredStudents.map((student, idx) => {
                            const sub = submissionMap[student.id];
                            const currentScore = localScores[student.id] ?? '';
                            const isScored = (sub && sub.score !== null && sub.score !== undefined) || (currentScore !== '' && currentScore !== undefined);
                            const effectiveScore = currentScore !== '' && currentScore !== undefined ? currentScore : (sub?.score ?? '');
                            const isSubmitted = !!sub;
                            const isPassed = isScored && assignment.passing_grade !== null && assignment.passing_grade !== undefined
                                ? Number(effectiveScore) >= assignment.passing_grade
                                : true;
                            const savingState = savingStates[student.id] || 'idle';

                            return (
                                <div
                                    key={student.id}
                                    className="px-3.5 sm:px-5 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 min-h-[64px]"
                                >
                                    {/* Left: Number + Avatar + Name + Clear Status */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span className="text-[11px] font-mono font-bold text-muted-foreground/80 w-5 shrink-0 text-center">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>

                                        <StudentAvatar
                                            photoUrl={student.photo_url}
                                            name={student.name}
                                            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shrink-0"
                                        />

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                                    {student.name}
                                                </p>
                                                {student.nis && (
                                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                                        ({student.nis})
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status Indicator: Legible Text */}
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {isScored ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                        <Check className="h-3 w-3 stroke-[3]" />
                                                        <span>Nilai: <strong>{effectiveScore}</strong></span>
                                                        {assignment.passing_grade && (
                                                            <span className={`ml-1 text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${isPassed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                                {isPassed ? 'Tuntas' : 'Remedial'}
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : isSubmitted ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                                        <Clock className="h-3 w-3" />
                                                        <span>Terkumpul (Belum Dinilai)</span>
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

                                    {/* Right: Direct Score Input & Action Button */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Inline Rapid Score Input */}
                                        <div className="relative flex items-center">
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
                                                className={`w-14 sm:w-16 h-9 px-2 text-center text-xs font-black rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                                    isScored
                                                        ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-black'
                                                        : 'border-border bg-card text-foreground placeholder:text-muted-foreground/60'
                                                }`}
                                            />
                                            {savingState === 'saving' && (
                                                <Loader2 className="absolute -right-5 h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                                            )}
                                            {savingState === 'saved' && (
                                                <Check className="absolute -right-5 h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            )}
                                        </div>

                                        {/* Detail Modal / Sheet Trigger */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenDetailModal(student)}
                                            className="px-2.5 sm:px-3 h-9 rounded-xl border border-border bg-muted/20 hover:bg-muted/60 text-xs font-bold text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                                            title="Buka Lembar Kerja Detail"
                                        >
                                            <Activity className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Detail</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ⑤ Sticky Bottom Footer: Autosave Status & Quick Finalize */}
            <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-6 -mb-6 px-4 sm:px-6 py-3 bg-card/95 backdrop-blur-md border-t border-border shadow-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                    {globalSaveStatus === 'saving' ? (
                        <span className="inline-flex items-center gap-1.5 text-primary font-bold animate-pulse">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Menyimpan nilai ke server...</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                            <CheckCheck className="h-4 w-4 text-emerald-500" />
                            <span>
                                <strong>{scoredCount}</strong> dari {totalStudents} nilai tersimpan otomatis
                                {lastSavedTime && <span className="hidden sm:inline opacity-70"> ({lastSavedTime})</span>}
                            </span>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCompleteGrading}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                            unscoredCount === 0
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                    >
                        {unscoredCount === 0 ? (
                            <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Publikasikan Hasil</span>
                            </>
                        ) : (
                            <>
                                <Send className="h-3.5 w-3.5" />
                                <span>Selesaikan Penilaian</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-16 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs font-bold animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
}

export default TeacherGradingWorkspace;
