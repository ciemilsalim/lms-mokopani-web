import React, { useState, useMemo, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    Search, CheckCircle2, Clock, AlertCircle, Sparkles, ChevronRight,
    Activity, ListChecks, Mic, FileText, CheckSquare, RotateCcw,
    MessageSquare, Award, ArrowUpDown, Filter, Eye, Check, Loader2,
    SlidersHorizontal, UserCheck, UserX, Star, Info, ChevronDown, ChevronUp,
    ExternalLink, Send, CheckCheck, ArrowRight, ArrowLeft, Download,
    LayoutList, Table as TableIcon
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
    file_path?: string | null;
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
    selectedSubjectId?: number | null;
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

type StatusFilterType = 'all' | 'pending' | 'unsubmitted' | 'scored' | 'passed' | 'remedial';

/**
 * TeacherGradingWorkspace
 * Real Mobile-Native Formative Observation & Rapid Assessment Workspace:
 * - Ultra-narrow viewport safe (253px–430px) with 0 horizontal overflow.
 * - Highlights students who have submitted tasks and await grading.
 * - Compact mobile student card (72–92px height, full-card tap) and Spreadsheet table toggle.
 * - Legible status and 18-20px bold score.
 * - CSV export and instant next student switching workflow.
 */
export function TeacherGradingWorkspace({
    assignment,
    students = [],
    assignedClasses = [],
    selectedClassId,
    selectedSubjectId,
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
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
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

    // Helper to check if student has submitted
    const isStudentSubmitted = (sub?: Submission | null) => {
        if (!sub) return false;
        return Boolean(sub.submitted_at || sub.file_path || (sub.content && sub.content !== '{}' && sub.content !== '[]') || (sub.id && sub.id > 0));
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

    // Helper to check if student is scored
    const isStudentScored = (studentId: number, sub?: Submission | null) => {
        const subScore = getSubmissionScore(sub);
        const local = localScores[studentId];
        return (subScore !== null && subScore !== undefined) || (local !== '' && local !== undefined && local !== null);
    };

    // Helper to check if student has submitted but not yet graded ("sudah kirim tugas & belum dinilai")
    const isStudentPendingGrading = (studentId: number, sub?: Submission | null) => {
        return isStudentSubmitted(sub) && !isStudentScored(studentId, sub);
    };

    // Active class name
    const selectedClassName = useMemo(() => {
        if (selectedClassId === 'all') return 'Semua Kelas';
        const found = assignedClasses.find(c => c.id === selectedClassId);
        return found ? found.name : (assignedClasses[0]?.name ?? assignment.school_classes?.[0]?.name ?? 'Kelas 8A');
    }, [selectedClassId, assignedClasses, assignment.school_classes]);

    // Summary calculations
    const totalStudents = students.length;
    const passingGrade = assignment.passing_grade ?? 75;

    // Hitung siswa yang sudah mengumpulkan tugas tapi belum dinilai
    const pendingGradingCount = useMemo(() => {
        return students.filter(student => isStudentPendingGrading(student.id, submissionMap[student.id])).length;
    }, [students, submissionMap, localScores]);

    // Hitung siswa yang belum mengumpulkan tugas sama sekali
    const unsubmittedCount = useMemo(() => {
        return students.filter(student => {
            const sub = submissionMap[student.id];
            return !isStudentSubmitted(sub) && !isStudentScored(student.id, sub);
        }).length;
    }, [students, submissionMap, localScores]);

    // Hitung siswa yang sudah dinilai
    const scoredCount = useMemo(() => {
        return students.filter(student => isStudentScored(student.id, submissionMap[student.id])).length;
    }, [students, submissionMap, localScores]);

    // Hitung siswa tuntas
    const passedCount = useMemo(() => {
        return students.filter(student => {
            const sub = submissionMap[student.id];
            if (!isStudentScored(student.id, sub)) return false;
            const subScore = getSubmissionScore(sub);
            const local = localScores[student.id];
            const effective = (local !== '' && local !== undefined && local !== null) ? Number(local) : Number(subScore);
            return effective >= passingGrade;
        }).length;
    }, [students, submissionMap, localScores, passingGrade]);

    // Hitung siswa perlu remedial
    const remedialCount = useMemo(() => {
        return students.filter(student => {
            const sub = submissionMap[student.id];
            if (!isStudentScored(student.id, sub)) return false;
            const subScore = getSubmissionScore(sub);
            const local = localScores[student.id];
            const effective = (local !== '' && local !== undefined && local !== null) ? Number(local) : Number(subScore);
            return effective < passingGrade;
        }).length;
    }, [students, submissionMap, localScores, passingGrade]);

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
                const isScored = isStudentScored(student.id, sub);
                const hasSubmitted = isStudentSubmitted(sub);
                const isPending = hasSubmitted && !isScored;
                const isUnsub = !hasSubmitted && !isScored;
                const effective = isScored ? ((local !== '' && local !== undefined && local !== null) ? Number(local) : Number(subScore)) : null;

                // Status filtering
                if (statusFilter === 'pending' && !isPending) return false;
                if (statusFilter === 'unsubmitted' && !isUnsub) return false;
                if (statusFilter === 'scored' && !isScored) return false;
                if (statusFilter === 'passed' && (!isScored || effective === null || effective < passingGrade)) return false;
                if (statusFilter === 'remedial' && (!isScored || effective === null || effective >= passingGrade)) return false;

                // Search query
                if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    const matchName = student.name.toLowerCase().includes(query);
                    const matchNis = student.nis?.toLowerCase().includes(query) || false;
                    return matchName || matchNis;
                }

                return true;
            })
            // Siswa yang sudah mengumpulkan tugas dan belum dinilai diprioritaskan di paling atas
            .sort((a, b) => {
                const aSub = submissionMap[a.id];
                const bSub = submissionMap[b.id];
                const aPending = isStudentPendingGrading(a.id, aSub);
                const bPending = isStudentPendingGrading(b.id, bSub);

                if (aPending && !bPending) return -1;
                if (!aPending && bPending) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [students, submissionMap, localScores, statusFilter, searchQuery, passingGrade]);

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

    const handleExportCsv = () => {
        const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Nilai', 'Status KKTP', 'Pengerjaan', 'Waktu Pengumpulan', 'Umpan Balik'];
        const rows = students.map((student, idx) => {
            const sub = submissionMap[student.id];
            const subScore = getSubmissionScore(sub);
            const currentScore = localScores[student.id];
            const isScored = (subScore !== null && subScore !== undefined) || (currentScore !== '' && currentScore !== undefined);
            const effScore = isScored ? (currentScore !== '' && currentScore !== undefined ? currentScore : subScore) : '';
            const hasSubmitted = isStudentSubmitted(sub);
            const kktpStatus = !isScored ? (hasSubmitted ? 'Perlu Dinilai' : 'Belum Kumpul') : Number(effScore) >= passingGrade ? 'Tuntas' : 'Perlu Remedial';
            const workStatus = hasSubmitted ? (isScored ? 'Terkumpul & Dinilai' : 'Terkumpul (Menunggu Penilaian)') : 'Belum Kumpul';
            const submitTime = sub?.submitted_at ? `"${sub.submitted_at}"` : '-';
            const feedback = sub?.feedback ? `"${sub.feedback.replace(/"/g, '""')}"` : '';
            return [
                idx + 1,
                `"${student.nis || '-'}"`,
                `"${student.name.replace(/"/g, '""')}"`,
                `"${selectedClassName}"`,
                effScore !== '' ? effScore : '-',
                `"${kktpStatus}"`,
                `"${workStatus}"`,
                submitTime,
                feedback,
            ].join(',');
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        const safeTitle = (assignment.title || 'asesmen').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const safeClass = selectedClassName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        link.setAttribute('download', `nilai-${safeTitle}-${safeClass}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                                    {pendingGradingCount > 0 && (
                                        <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
                                            • {pendingGradingCount} perlu dinilai
                                        </span>
                                    )}
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
                            {pendingGradingCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-black border border-amber-500/30">
                                    <Clock className="h-3 w-3 animate-pulse text-amber-600 dark:text-amber-400" />
                                    <span>{pendingGradingCount} Tugas Perlu Dinilai</span>
                                </span>
                            )}
                        </div>
                        <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug line-clamp-2 overflow-wrap-anywhere">
                            {assignment.title}
                        </h1>
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                            <span className="text-foreground">{selectedClassName}</span>
                            <span>•</span>
                            <span>{totalStudents} siswa</span>
                            <span>•</span>
                            <span>KKTP: {passingGrade}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                        {/* Contextual Back Navigation */}
                        <button
                            type="button"
                            onClick={() => router.visit(
                                (selectedClassId && selectedClassId !== 'all') 
                                    ? `/classes/${selectedClassId}?tab=assignments` 
                                    : selectedSubjectId 
                                        ? `/subjects/${selectedSubjectId}` 
                                        : route('assignments.index')
                            )}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer min-h-[44px]"
                            title={
                                (selectedClassId && selectedClassId !== 'all') 
                                    ? `Kembali ke ${selectedClassName}` 
                                    : selectedSubjectId 
                                        ? 'Kembali ke Mata Pelajaran' 
                                        : 'Kembali ke Daftar Asesmen'
                            }
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Kembali</span>
                        </button>

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

                        {/* Ekspor CSV */}
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer min-h-[44px]"
                            title="Unduh daftar nilai format CSV"
                        >
                            <Download className="h-4 w-4 text-primary" />
                            <span className="hidden sm:inline">Ekspor CSV</span>
                        </button>

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

            {/* 2. Progress & Needs-Grading Alert Card */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3 w-full min-w-0 box-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Progres Penilaian Siswa
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

                    <div className="flex items-center gap-2 flex-wrap">
                        {pendingGradingCount > 0 ? (
                            <button
                                type="button"
                                onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-black min-h-[36px] hover:bg-amber-500/25 transition cursor-pointer"
                                title="Klik untuk memfilter siswa yang sudah mengirim tugas dan belum dinilai"
                            >
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </span>
                                <span>{pendingGradingCount} Tugas Perlu Dinilai</span>
                                <ArrowRight className="h-3 w-3" />
                            </button>
                        ) : scoredCount === totalStudents && totalStudents > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold min-h-[36px]">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Semua siswa telah dinilai</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground border border-border text-xs font-medium min-h-[36px]">
                                <span>{unsubmittedCount} siswa belum kumpul</span>
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

                {/* Filter Tabs & View Mode Toggle */}
                <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                                statusFilter === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Semua ({totalStudents})
                        </button>

                        {/* TAB KHUSUS: SISWA SUDAH MENGIRIM TUGAS & BELUM DINILAI */}
                        <button
                            type="button"
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 ${
                                statusFilter === 'pending'
                                    ? 'bg-amber-600 text-white shadow-xs font-black ring-2 ring-amber-500/30'
                                    : pendingGradingCount > 0
                                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 font-black'
                                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            }`}
                            title="Filter siswa yang sudah mengumpulkan tugas dan belum dinilai"
                        >
                            {pendingGradingCount > 0 && (
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                            )}
                            <Clock className="h-3.5 w-3.5" />
                            <span>Perlu Dinilai ({pendingGradingCount})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('unsubmitted')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                                statusFilter === 'unsubmitted'
                                    ? 'bg-slate-700 text-white shadow-xs font-black'
                                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Belum Kumpul ({unsubmittedCount})
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('scored')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                                statusFilter === 'scored'
                                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                                    : 'bg-card border border-border text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                        >
                            Selesai ({scoredCount})
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('passed')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                                statusFilter === 'passed'
                                    ? 'bg-emerald-700 text-white shadow-xs font-black'
                                    : 'bg-card border border-border text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                        >
                            Tuntas ({passedCount})
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('remedial')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                                statusFilter === 'remedial'
                                    ? 'bg-rose-600 text-white shadow-xs font-black'
                                    : 'bg-card border border-border text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                            }`}
                        >
                            Remedial ({remedialCount})
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center rounded-xl border border-border bg-card p-1 shrink-0 ml-1">
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`p-2 rounded-lg transition cursor-pointer ${
                                viewMode === 'cards'
                                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Tampilan Kartu Siswa"
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-lg transition cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Tampilan Matriks Tabel"
                        >
                            <TableIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. Primary Work Area: Compact Mobile Cards or Spreadsheet Table */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden w-full min-w-0 box-border">
                {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                        <UserX className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                        <p className="text-sm font-bold text-foreground">Tidak ada siswa yang sesuai filter.</p>
                        <p className="text-xs text-muted-foreground">Coba ubah kata kunci atau pilih tab 'Semua'.</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
                                    <th className="py-3 px-3.5 text-center w-12">#</th>
                                    <th className="py-3 px-3.5">Siswa</th>
                                    <th className="py-3 px-3.5 text-center">Status Pengerjaan</th>
                                    <th className="py-3 px-3.5 text-center">KKTP</th>
                                    <th className="py-3 px-3.5 text-center w-32">Nilai Cepat</th>
                                    <th className="py-3 px-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredStudents.map((student, idx) => {
                                    const sub = submissionMap[student.id];
                                    const subScore = getSubmissionScore(sub);
                                    const currentScore = localScores[student.id] ?? '';
                                    const isScored = isStudentScored(student.id, sub);
                                    const effectiveScore = currentScore !== '' && currentScore !== undefined ? currentScore : (subScore ?? '');
                                    const hasSubmitted = isStudentSubmitted(sub);
                                    const isPending = hasSubmitted && !isScored;
                                    const isPassed = isScored && assignment.passing_grade !== null && assignment.passing_grade !== undefined
                                        ? Number(effectiveScore) >= assignment.passing_grade
                                        : true;
                                    const savingState = savingStates[student.id] || 'idle';

                                    return (
                                        <tr
                                            key={student.id}
                                            className={`transition-colors ${
                                                isPending
                                                    ? 'bg-amber-500/[0.08] hover:bg-amber-500/[0.14] border-l-4 border-l-amber-500 font-semibold'
                                                    : 'hover:bg-muted/20'
                                            }`}
                                        >
                                            <td className="py-3 px-3.5 text-center font-mono font-bold text-muted-foreground">
                                                {idx + 1}
                                            </td>
                                            <td className="py-3 px-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="relative shrink-0">
                                                        <StudentAvatar
                                                            photoUrl={student.photo_url}
                                                            name={student.name}
                                                            className="h-8 w-8 rounded-lg shrink-0"
                                                        />
                                                        {isPending && (
                                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-foreground truncate flex items-center gap-1.5">
                                                            <span>{student.name}</span>
                                                            {isPending && (
                                                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                                                    PERLU DINILAI
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-[10px] font-mono text-muted-foreground">{student.nis || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3.5 text-center">
                                                {isPending ? (
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                                            <Clock className="h-3 w-3 animate-pulse text-amber-600 dark:text-amber-400" />
                                                            <span>Perlu Dinilai</span>
                                                        </span>
                                                        {sub?.submitted_at && (
                                                            <span className="text-[10px] text-muted-foreground mt-0.5">
                                                                {sub.submitted_at}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : isScored ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span>Sudah Dinilai</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                                                        <span>Belum Kumpul</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3.5 text-center">
                                                {isScored ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        isPassed
                                                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                                    }`}>
                                                        {isPassed ? 'Tuntas' : 'Remedial'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <input
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
                                                        className={`w-16 h-8 text-center text-xs font-bold rounded-lg border transition focus:outline-none focus:ring-2 ${
                                                            isPending
                                                                ? 'border-amber-400 bg-amber-500/10 text-amber-900 dark:text-amber-100 focus:ring-amber-500/30 font-black'
                                                                : 'border-border bg-card text-foreground focus:ring-primary/20'
                                                        }`}
                                                    />
                                                    {savingState === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
                                                    {savingState === 'saved' && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDetailModal(student)}
                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                        isPending
                                                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-2xs font-black'
                                                            : 'border border-border bg-background hover:bg-muted text-foreground'
                                                    }`}
                                                >
                                                    <span>{isPending ? 'Periksa' : 'Buka'}</span>
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="divide-y divide-border/60">
                        {filteredStudents.map((student, idx) => {
                            const sub = submissionMap[student.id];
                            const subScore = getSubmissionScore(sub);
                            const currentScore = localScores[student.id] ?? '';
                            const isScored = isStudentScored(student.id, sub);
                            const effectiveScore = currentScore !== '' && currentScore !== undefined ? currentScore : (subScore ?? '');
                            const hasSubmitted = isStudentSubmitted(sub);
                            const isPending = hasSubmitted && !isScored;
                            const isPassed = isScored && assignment.passing_grade !== null && assignment.passing_grade !== undefined
                                ? Number(effectiveScore) >= assignment.passing_grade
                                : true;

                            return (
                                <div
                                    key={student.id}
                                    onClick={() => handleOpenDetailModal(student)}
                                    className={`p-3.5 sm:p-4 transition-all cursor-pointer flex items-center justify-between gap-3 min-h-[76px] sm:min-h-[84px] w-full min-w-0 box-border ${
                                        isPending
                                            ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.12] active:bg-amber-500/[0.16] border-l-4 border-l-amber-500 shadow-2xs'
                                            : 'hover:bg-muted/20 active:bg-muted/40'
                                    }`}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleOpenDetailModal(student);
                                        }
                                    }}
                                >
                                    {/* Left: Number + Avatar (36x36) + Name + NIS + Legible Status */}
                                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                        <span className={`text-[10px] sm:text-11px font-mono font-bold w-4 sm:w-5 shrink-0 text-center ${
                                            isPending ? 'text-amber-700 dark:text-amber-400 font-black' : 'text-muted-foreground/70'
                                        }`}>
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>

                                        <div className="relative shrink-0">
                                            <StudentAvatar
                                                photoUrl={student.photo_url}
                                                name={student.name}
                                                className="h-9 w-9 rounded-xl shrink-0"
                                            />
                                            {isPending && (
                                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-card"></span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="text-[13px] sm:text-sm font-bold text-foreground leading-snug line-clamp-2 overflow-wrap-anywhere">
                                                    {student.name}
                                                </p>

                                                {/* TANDA MENCOLOK: SUDAH MENGIRIMKAN TUGAS */}
                                                {isPending && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0">
                                                        <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 animate-pulse" />
                                                        <span>SUDAH KIRIM TUGAS</span>
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap">
                                                {student.nis && (
                                                    <span>{student.nis}</span>
                                                )}
                                                {isPending && sub?.submitted_at && (
                                                    <span className="text-[10px] font-sans font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                                        • <FileText className="h-3 w-3" /> Dikirim {sub.submitted_at}
                                                        {sub.file_path && <span className="underline">(Lampiran Berkas)</span>}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status Indicator (Text + Icon) */}
                                            <div className="flex items-center gap-1.5 pt-0.5">
                                                {isScored ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                        <span>Dinilai</span>
                                                    </span>
                                                ) : isPending ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300">
                                                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                                        <span>Menunggu Penilaian Guru</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                                        <span>Belum mengumpulkan</span>
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
                                        ) : isPending ? (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenDetailModal(student)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer min-h-[44px]"
                                                title="Buka untuk memeriksa hasil tugas siswa"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                <span>Periksa Tugas</span>
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
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
                                                className={`w-14 h-9 px-2 text-center text-xs font-bold rounded-xl border transition focus:outline-none focus:ring-2 ${
                                                    isPending
                                                        ? 'border-amber-400 bg-amber-500/10 text-amber-900 dark:text-amber-100 focus:ring-amber-500/30 font-black'
                                                        : 'border-border bg-card text-foreground focus:ring-primary/20'
                                                }`}
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
                            unsubmittedCount === 0 && pendingGradingCount === 0
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
