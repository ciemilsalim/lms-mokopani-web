import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    ArrowLeft, ArrowRight, Save, CheckCircle2, FileText,
    Camera, Target, Info, CheckSquare, Square, Users,
    Upload, Check, Loader2, Sparkles, Maximize2, X, ChevronDown, ChevronUp,
    PenTool, Image as ImageIcon, Mic, ExternalLink, Activity, Star, Eye
} from 'lucide-react';
import { KktpModal } from '@/components/assignments/KktpModal';
import axios from 'axios';

interface Student {
    id: number;
    name: string;
    nis?: string;
    photo_url?: string;
    school_class_id?: number;
    school_class?: string;
}

interface GradeSplitProps {
    assignment: any;
    students: Student[];
    selected_class_id?: number | 'all';
    assigned_classes?: { id: number; name: string; students_count?: number }[];
}

const QUICK_FEEDBACK_CHIPS = [
    { label: '🌟 Sangat Baik', text: 'Kerja bagus! Pemahaman materi sangat mendalam dan terstruktur.' },
    { label: '👍 Sudah Memahami', text: 'Sudah memahami konsep dengan baik. Pertahankan!' },
    { label: '💡 Perlu Perbaikan', text: 'Sudah baik, namun perhatikan kembali beberapa bagian yang belum lengkap.' },
    { label: '✍️ Lengkapi Jawaban', text: 'Mohon lengkapi penjelasan dan langkah-langkah penyelesaiannya.' },
    { label: '🔄 Perlu Remedial', text: 'Perlu ulas kembali materi dasar sebelum melanjutkan ke topik berikutnya.' },
];

/**
 * GradeSplitPage (PROMPT 20C — Mobile-First Observation Grading Workspace)
 * - Mobile (<= 639px): Single Focus Workspace with Segmented Tabs (Karya Siswa | Penilaian)
 * - Tablet (640–1023px): Adaptive Split Workspace
 * - Desktop (>= 1024px): True Split-Screen Workspace (50/50)
 * - NO RAW JSON: All observation, checklist, and quiz payloads are parsed into semantic UI.
 * - Standardized 48px Upload buttons with clean "Upload Foto" / "Upload File" labels.
 * - Sticky bottom action bar with 44px prev/next and 48px save button, guarded against overlap.
 */
export default function GradeSplitPage({
    assignment,
    students = [],
    selected_class_id,
    assigned_classes = [],
}: GradeSplitProps) {
    const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
    const currentStudent = students[currentStudentIndex];

    const submission = assignment.submissions?.find((s: any) => s.student_id === currentStudent?.id);

    // Mobile View Context: 'work' (Karya Siswa) | 'grade' (Form Penilaian)
    const [mobileTab, setMobileTab] = useState<'work' | 'grade'>('work');

    // States for grading
    const [score, setScore] = useState<number | string>(submission?.score ?? '');
    const [feedback, setFeedback] = useState(submission?.feedback ?? '');
    const [kktpDetails, setKktpDetails] = useState<any>(submission?.kktp_details ?? {});
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isUploadingProof, setIsUploadingProof] = useState(false);
    const [isKktpModalOpen, setIsKktpModalOpen] = useState(false);
    const [showInfoBanner, setShowInfoBanner] = useState(false);
    const [showRubricDetails, setShowRubricDetails] = useState(true);
    const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const scoreInputRef = useRef<HTMLInputElement | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Submissions map for switcher
    const submissionsMap = useMemo(() => {
        const map: Record<number, { score: number | null; submitted_at?: string; is_graded?: boolean }> = {};
        (assignment.submissions || []).forEach((s: any) => {
            map[s.student_id] = { 
                score: s.score, 
                submitted_at: s.submitted_at,
                is_graded: s.score !== null && s.score !== undefined
            };
        });
        return map;
    }, [assignment.submissions]);

    // Active class name
    const selectedClassName = useMemo(() => {
        if (selected_class_id === 'all') return 'Semua Kelas';
        const found = assigned_classes.find(c => c.id === selected_class_id);
        return found ? found.name : (assigned_classes[0]?.name ?? 'Kelas 8A');
    }, [selected_class_id, assigned_classes]);

    const isSummative = assignment.assessment_type === 'summative';
    const isOralTest = assignment.instrument_type === 'oral_test' || assignment.instrument_type === 'oral';
    const assessmentTypeLabel = assignment.assessment_type === 'initial' 
        ? 'Asesmen Awal' 
        : isSummative 
            ? 'Asesmen Sumatif' 
            : 'Asesmen Formatif';

    const hasRubric = assignment.scoring_tool === 'rubric' && assignment.instrument_config?.kktp?.criteria?.length > 0;

    let isOffline = false;
    let rawContent = submission?.content || '';
    if (submission?.content) {
        try {
            const parsed = JSON.parse(submission.content);
            isOffline = !!parsed.submitted_offline;
        } catch (e) {}
    }

    // Update states when student index or submission changes
    useEffect(() => {
        setScore(submission?.score ?? '');
        setFeedback(submission?.feedback ?? '');
        setKktpDetails(submission?.kktp_details ?? {});
        setSaveStatus('idle');
    }, [currentStudentIndex, submission]);

    // Keyboard Shortcuts (Arrow Left / Right, Alt+S for save)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''))) return;
            
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                if (currentStudentIndex < students.length - 1) {
                    handleSave(true);
                }
            } else if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                if (currentStudentIndex > 0) {
                    setCurrentStudentIndex(prev => prev - 1);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStudentIndex, students.length, score, feedback, kktpDetails]);

    // Save handler
    const handleSave = async (autoNext = false) => {
        if (!currentStudent || isSaving) return;
        setIsSaving(true);
        setSaveStatus('saving');

        try {
            const numScore = score === '' || score === undefined || score === null ? null : Number(score);

            await axios.post(route('assignments.grade'), {
                assignment_id: assignment.id,
                student_id: currentStudent.id,
                score: numScore,
                feedback: feedback,
                kktp_details: kktpDetails,
                content: isOralTest ? JSON.stringify({
                    type: 'oral_test',
                    question_responses: kktpDetails
                }) : submission?.content
            });

            setSaveStatus('saved');
            showNotification('Nilai berhasil disimpan!', 'success');

            if (autoNext && currentStudentIndex < students.length - 1) {
                setCurrentStudentIndex(prev => prev + 1);
            } else {
                router.reload({ only: ['assignment'], preserveScroll: true });
            }
        } catch (error) {
            setSaveStatus('idle');
            showNotification('Penilaian belum tersimpan. Coba lagi.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentStudent || isUploadingProof) return;

        setIsUploadingProof(true);
        const formData = new FormData();
        formData.append('student_id', currentStudent.id.toString());
        formData.append('file', file);

        try {
            await axios.post(route('assignments.upload-proof', assignment.id), formData);
            showNotification('Foto karya fisik berhasil disimpan!', 'success');
            router.reload({ only: ['assignment'], preserveScroll: true });
        } catch (err) {
            showNotification('Gagal mengunggah foto.', 'error');
        } finally {
            setIsUploadingProof(false);
        }
    };

    const handleRubricClick = (criterionIndex: number, levelScore: number, levelName: string) => {
        const newDetails = { ...kktpDetails, [criterionIndex]: levelName };
        setKktpDetails(newDetails);

        if (assignment.scoring_tool === 'rubric' && assignment.instrument_config?.kktp?.criteria) {
            const totalCriteria = assignment.instrument_config.kktp.criteria.length;
            const currentTotal = Object.keys(newDetails).reduce((acc, key) => {
                let val = 0;
                if (newDetails[key] === 'Sangat Baik') val = 100;
                else if (newDetails[key] === 'Baik') val = 75;
                else if (newDetails[key] === 'Cukup') val = 50;
                else if (newDetails[key] === 'Perlu Bimbingan') val = 25;
                return acc + val;
            }, 0);

            const autoScore = Math.round((currentTotal / (totalCriteria * 100)) * (assignment.max_points || 100));
            setScore(autoScore);
        }
    };

    const appendFeedback = (chipText: string) => {
        setFeedback((prev: string) => {
            if (!prev.trim()) return chipText;
            return `${prev}\n${chipText}`;
        });
    };

    /**
     * Semantic Presentation for all Submissions (RAW JSON IS NEVER USER FACING)
     */
    const renderFormattedAnswer = (contentString: string, assignment: any) => {
        if (!contentString) {
            return (
                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                    Informasi karya belum tersedia.
                </div>
            );
        }

        let parsed: any = null;
        try {
            parsed = JSON.parse(contentString);
        } catch {
            return (
                <div className="p-3.5 bg-muted/30 rounded-2xl border border-border space-y-1.5 overflow-hidden">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                        <FileText className="w-4 h-4" /> Jawaban / Catatan Siswa
                    </span>
                    <div className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed break-words">
                        {contentString}
                    </div>
                </div>
            );
        }

        // 1. Performance Observation / Observation Checklist
        if (parsed.type === 'performance_observation' || parsed.type === 'observation' || parsed.observations || parsed.checklist) {
            const indicators = assignment?.instrument_config?.indicators || [];
            const obsMap = parsed.observations || parsed.checklist || {};
            const notes = parsed.notes || parsed.note || '';
            const actionPlan = parsed.action_plan || '';

            return (
                <div className="space-y-3 w-full animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            <h4 className="text-xs font-bold text-foreground">Hasil Pengamatan Observasi</h4>
                        </div>
                    </div>

                    {/* Indicators list */}
                    {indicators.length > 0 ? (
                        <div className="space-y-1.5">
                            {indicators.map((ind: any, idx: number) => {
                                const indKey = ind.id || ind.name || ind.text || idx.toString();
                                const isChecked = !!obsMap[indKey];
                                const labelText = typeof ind === 'string' ? ind : (ind.text || ind.name || ind.description || `Indikator ${idx + 1}`);

                                return (
                                    <div
                                        key={indKey}
                                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs transition-colors ${
                                            isChecked 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200 font-bold'
                                                : 'bg-card border-border text-muted-foreground'
                                        }`}
                                    >
                                        <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border ${
                                            isChecked 
                                                ? 'bg-emerald-600 border-emerald-600 text-white' 
                                                : 'border-border bg-muted/40'
                                        }`}>
                                            {isChecked ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-[10px] text-muted-foreground/60">{idx + 1}</span>}
                                        </div>
                                        <span className="flex-1 leading-snug line-clamp-2">{labelText}</span>
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                                            isChecked ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {isChecked ? 'Muncul' : 'Belum'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">Daftar kriteria observasi tidak tercatat.</p>
                    )}

                    {/* Qualitative Notes */}
                    {notes && (
                        <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Catatan Pengamatan:</span>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{notes}</p>
                        </div>
                    )}

                    {actionPlan && (
                        <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Strategi Tindak Lanjut:</span>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{actionPlan}</p>
                        </div>
                    )}
                </div>
            );
        }

        // 2. Anecdotal Notes
        if (parsed.type === 'anecdotal') {
            return (
                <div className="space-y-2.5 w-full">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Catatan Anekdotal Guru</span>
                        <span className="text-[11px] font-mono text-muted-foreground">{parsed.date || '—'} {parsed.time || ''}</span>
                    </div>
                    {parsed.context && (
                        <div className="p-2.5 rounded-xl bg-card border border-border text-xs">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Konteks:</span>
                            <p className="text-foreground mt-0.5">{parsed.context}</p>
                        </div>
                    )}
                    {parsed.event_description && (
                        <div className="p-2.5 rounded-xl bg-card border border-border text-xs">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Deskripsi Peristiwa:</span>
                            <p className="text-foreground mt-0.5 leading-relaxed whitespace-pre-line">{parsed.event_description}</p>
                        </div>
                    )}
                    {parsed.analysis_followup && (
                        <div className="p-2.5 rounded-xl bg-card border border-border text-xs">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Analisis & Tindak Lanjut:</span>
                            <p className="text-foreground mt-0.5 leading-relaxed whitespace-pre-line">{parsed.analysis_followup}</p>
                        </div>
                    )}
                </div>
            );
        }

        // 3. Quiz / Written Test
        if (parsed.type === 'written_test' || parsed.type === 'formative_quiz' || parsed.type === 'quiz_response' || (parsed && typeof parsed === 'object' && parsed.answers && !parsed.type)) {
            const questions = assignment?.instrument_config?.questions || [];
            const answers = parsed.answers || {};

            return (
                <div className="space-y-2.5 w-full">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <h4 className="text-xs font-bold text-foreground truncate">
                                {parsed.type === 'written_test' ? 'Tes Tertulis' : 'Kuis Formatif'}
                            </h4>
                        </div>
                        {parsed.auto_score !== undefined && (
                            <span className="text-xs font-bold text-primary shrink-0">
                                Skor Auto: {parsed.auto_score}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        {questions.map((q: any, idx: number) => {
                            const studentAns = answers[q.id];
                            const isMcq = q.type === 'multiple_choice';
                            const correctOpt = isMcq ? (q.options?.find((o: any) => o.is_correct) || q.options?.find((o: any) => o.id === q.answer)) : null;
                            const studentOpt = isMcq ? q.options?.find((o: any) => o.id == studentAns) : null;
                            const isCorrect = isMcq ? (correctOpt?.id == studentAns) : (studentAns && (q.correct_answer || q.answer) && studentAns.trim().toLowerCase() == (q.correct_answer || q.answer).trim().toLowerCase());

                            return (
                                <div key={q.id || idx} className="p-3 rounded-xl bg-card border border-border shadow-xs space-y-1.5 overflow-hidden">
                                    <div className="flex items-start justify-between gap-1.5">
                                        <p className="text-xs font-bold text-foreground leading-snug break-words flex-1 min-w-0">
                                            {idx + 1}. {q.question || q.text}
                                        </p>
                                        <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                            isCorrect ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                        }`}>
                                            {isCorrect ? 'Benar' : 'Salah'}
                                        </span>
                                    </div>
                                    <div className="text-[11px] grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                                        <div className="min-w-0">
                                            <span className="text-muted-foreground block text-[10px]">Jawaban Siswa:</span>
                                            <span className={`font-bold truncate block ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isMcq ? (studentOpt?.text || studentAns || '—') : (studentAns || '—')}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-muted-foreground block text-[10px]">Kunci Jawaban:</span>
                                            <span className="font-bold text-emerald-600 truncate block">
                                                {isMcq ? (correctOpt?.text || '—') : (q.correct_answer || q.answer || '—')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Generic fallback with clean text (NEVER RAW JSON DUMP)
        return (
            <div className="p-3.5 bg-muted/30 rounded-2xl border border-border text-xs text-foreground space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Detail Pengumpulan:</span>
                <p className="text-xs text-foreground leading-relaxed">
                    {parsed.description || parsed.notes || parsed.text || 'Informasi tugas telah tercatat dalam sistem.'}
                </p>
            </div>
        );
    };

    // Submissions Viewer Component (Left Panel)
    const renderSubmissionContent = () => {
        const isImage = submission?.file_path && /\.(jpeg|jpg|gif|png|webp)$/i.test(submission.file_path);
        const isPdf = submission?.file_path && /\.pdf$/i.test(submission.file_path);

        if (isOralTest) {
            const oralQuestions = assignment?.instrument_config?.questions || assignment?.questions || [];
            return (
                <div className="flex flex-col h-full space-y-3 w-full min-w-0">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs w-full">
                        <span className="font-bold text-foreground text-xs flex items-center gap-1.5 min-w-0 truncate">
                            <Mic className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">Pedoman Pertanyaan Lisan Guru</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowInfoBanner(!showInfoBanner)}
                            className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                        >
                            <span>{showInfoBanner ? 'Tutup' : 'Panduan'}</span>
                            <Info className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {showInfoBanner && (
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-150">
                            Gunakan daftar pertanyaan di bawah ini sebagai panduan saat melakukan ujian lisan atau tanya jawab langsung dengan siswa di kelas.
                        </div>
                    )}

                    {oralQuestions.length > 0 ? (
                        <div className="flex-1 overflow-y-auto space-y-3 min-h-[140px] w-full min-w-0 pr-0.5">
                            {oralQuestions.map((q: any, idx: number) => {
                                const selectedLevel = kktpDetails[q.id] || '';
                                const qPoints = Number(q.points) || (assignment.max_points / oralQuestions.length) || 10;
                                const scoresMap = { BB: 25, LY: 50, CK: 75, MH: 100 };
                                const pct = scoresMap[selectedLevel] || 0;
                                const qScore = selectedLevel ? Math.round((pct / 100) * qPoints) : 0;
                                
                                return (
                                    <div key={q.id || idx} className="p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-2.5">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-wider">
                                                    Pertanyaan 0{idx + 1}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                                                    {qPoints} pt
                                                </span>
                                            </div>
                                            <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed">
                                                {q.question || q.text}
                                            </p>
                                            {(q.answer_guide || q.answer) && (
                                                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-[11px] space-y-0.5">
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Panduan Jawaban:</span>
                                                    <p className="text-foreground leading-relaxed pl-0.5">
                                                        {q.answer_guide || q.answer}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-muted/15 rounded-xl border border-dashed border-border min-h-[140px] space-y-2 w-full">
                            <Mic className="w-8 h-8 text-primary/60" />
                            <p className="text-xs font-bold text-foreground">Pengujian Lisan Langsung di Kelas</p>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full space-y-3 w-full min-w-0">
                {/* Header Submissions View */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs w-full">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5 min-w-0 truncate">
                        <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">Karya Siswa (Fisik / Digital)</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                        {submission?.file_path ? 'Berkas Terlampir' : isOffline ? 'Penyerahan Fisik' : 'Belum Ada Berkas'}
                    </span>
                </div>

                {/* Submissions Viewer / Content Area */}
                {submission && (submission.file_path || rawContent || isOffline) ? (
                    <div className="flex-1 overflow-y-auto space-y-3 w-full min-w-0">
                        {isOffline && !submission.file_path && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold">
                                📝 Tugas LKPD diserahkan secara fisik di kelas
                            </div>
                        )}

                        {rawContent && !isOffline && renderFormattedAnswer(rawContent, assignment)}

                        {submission.file_path && (
                            <div className="relative rounded-2xl border border-border overflow-hidden bg-muted/20 flex items-center justify-center w-full min-h-[160px]">
                                {isImage ? (
                                    <div className="relative group w-full h-full flex flex-col items-center p-1.5">
                                        <img
                                            src={`/storage/${submission.file_path}`}
                                            alt="Karya Siswa"
                                            className="w-full max-h-[360px] object-contain cursor-pointer rounded-xl"
                                            onClick={() => setPreviewImageModal(`/storage/${submission.file_path}`)}
                                        />
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewImageModal(`/storage/${submission.file_path}`)}
                                                className="p-2 rounded-xl bg-black/70 text-white hover:bg-black/90 transition cursor-pointer shadow-md"
                                                title="Perbesar Foto"
                                            >
                                                <Maximize2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : isPdf ? (
                                    <div className="p-5 text-center text-xs space-y-3 w-full">
                                        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">Dokumen PDF Terlampir</p>
                                            <p className="text-[11px] text-muted-foreground truncate max-w-xs mx-auto">{submission.file_path.split('/').pop()}</p>
                                        </div>
                                        <a
                                            href={`/storage/${submission.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            <span>Buka Dokumen PDF</span>
                                        </a>
                                    </div>
                                ) : (
                                    <div className="p-5 text-center text-xs space-y-2">
                                        <FileText className="w-8 h-8 mx-auto text-muted-foreground/50" />
                                        <a href={`/storage/${submission.file_path}`} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline block">
                                            Buka Berkas Lampiran
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Compact Clean Empty State (No giant empty space) */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-muted/15 rounded-2xl border border-dashed border-border space-y-2 w-full">
                        <FileText className="w-8 h-8 text-muted-foreground/40" />
                        <p className="text-xs font-bold text-foreground">Karya siswa belum diunggah</p>
                        <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                            Upload foto bukti fisik atau nilai langsung pada panel penilaian.
                        </p>
                    </div>
                )}

                {/* Standardized Photo & File Upload Buttons */}
                <div className="pt-2 border-t border-border/60 w-full">
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleUploadProof}
                        disabled={isUploadingProof}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleUploadProof}
                        disabled={isUploadingProof}
                    />

                    {/* Responsive Upload Buttons: stacked <= 359px, 2-cols >= 360px */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 w-full">
                        {/* Primary Button: Upload Foto (48px height) */}
                        <button
                            type="button"
                            disabled={isUploadingProof}
                            onClick={() => cameraInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50 w-full"
                        >
                            <Camera className="w-4 h-4 shrink-0" />
                            <span>{isUploadingProof ? 'Mengunggah...' : 'Upload Foto'}</span>
                        </button>

                        {/* Secondary Button: Upload File (48px height) */}
                        <button
                            type="button"
                            disabled={isUploadingProof}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-sm font-bold transition active:scale-98 cursor-pointer disabled:opacity-50 w-full"
                        >
                            <Upload className="w-4 h-4 shrink-0" />
                            <span>Upload File</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Grading Form Component (Right Panel)
    const renderGradingForm = () => {
        const isPassed = score !== '' && score !== undefined && score !== null && assignment.passing_grade !== null
            ? Number(score) >= assignment.passing_grade
            : true;

        return (
            <div className="flex flex-col space-y-3.5 h-full w-full min-w-0">
                {/* 1. Final Score Input (48px height, 18-20px font) */}
                <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 space-y-2 w-full">
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-foreground">
                            Nilai Akhir Siswa
                        </label>
                        {assignment.passing_grade && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                score !== '' && isPassed 
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                    : score !== '' && !isPassed 
                                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                                        : 'bg-background text-muted-foreground border-border'
                            }`}>
                                {score !== '' ? (isPassed ? '✓ Tuntas' : 'Remedial') : `KKTP: ${assignment.passing_grade}`}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            ref={scoreInputRef}
                            type="number"
                            min={0}
                            max={assignment.max_points || 100}
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            placeholder="0"
                            className="w-full h-12 px-3 text-xl font-bold text-primary bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center"
                        />
                        <span className="text-xs font-bold text-muted-foreground shrink-0">
                            / {assignment.max_points || 100}
                        </span>
                    </div>
                </div>

                {/* 2. Interactive Rubric Accordion (if configured) */}
                {hasRubric && !isOralTest && (
                    <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 min-w-0 truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="truncate">Rubrik Kriteria Penilaian</span>
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowRubricDetails(!showRubricDetails)}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0 cursor-pointer"
                            >
                                <span>{showRubricDetails ? 'Ringkas' : 'Perluas'}</span>
                                {showRubricDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                        </div>

                        {showRubricDetails && (
                            <div className="space-y-2 animate-in fade-in duration-150 w-full">
                                {assignment.instrument_config.kktp.criteria.map((crit: any, i: number) => (
                                    <div key={i} className="p-2.5 rounded-xl border border-border/80 bg-muted/20 space-y-1.5 w-full overflow-hidden">
                                        <div className="flex items-center justify-between text-xs gap-2">
                                            <span className="font-bold text-foreground truncate flex-1">{crit.name}</span>
                                            {kktpDetails[i] && (
                                                <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 shrink-0">
                                                    {kktpDetails[i]}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px] w-full">
                                            {[
                                                { label: 'Bimbingan', full: 'Perlu Bimbingan' },
                                                { label: 'Cukup', full: 'Cukup' },
                                                { label: 'Baik', full: 'Baik' },
                                                { label: 'Sangat Baik', full: 'Sangat Baik' }
                                            ].map((lvl) => {
                                                const isSelected = kktpDetails[i] === lvl.full;
                                                return (
                                                    <button
                                                        key={lvl.full}
                                                        type="button"
                                                        onClick={() => handleRubricClick(i, 0, lvl.full)}
                                                        className={`p-1.5 rounded-lg border text-center font-bold transition cursor-pointer leading-tight truncate ${
                                                            isSelected
                                                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                                : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                        }`}
                                                    >
                                                        {lvl.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Qualitative Feedback Section (88-104px textarea height) */}
                <div className="space-y-1.5 flex-1 flex flex-col w-full">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between gap-2">
                        <span>Umpan Balik (Feedback)</span>
                        <span className="text-[10px] text-muted-foreground font-normal shrink-0">Pilihan cepat:</span>
                    </label>

                    {/* Quick Feedback Chips */}
                    <div className="flex flex-wrap gap-1 pb-0.5 w-full">
                        {QUICK_FEEDBACK_CHIPS.map((chip, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => appendFeedback(chip.text)}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition active:scale-95 cursor-pointer"
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    <textarea
                        rows={3}
                        placeholder="Tuliskan catatan apresiasi atau perbaikan untuk siswa..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y min-h-[88px]"
                    />
                </div>
            </div>
        );
    };

    return (
        <AppLayout title="Penilaian Asesmen Guru" hideBottomNav={true}>
            <Head title={`Penilaian ${assignment.title} – LMS Mokopani`} />

            <div className="space-y-4 sm:space-y-5 fade-in pb-28 sm:pb-32 max-w-7xl mx-auto w-full min-w-0">
                {/* 1. Header (56px, Back button 44x44px) */}
                <div className="flex items-center justify-between gap-2 h-14 border-b border-border/70 pb-1.5 w-full">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Link 
                            href={route('assignments.show', selected_class_id && selected_class_id !== 'all' ? { assignment: assignment.id, class_id: selected_class_id } : assignment.id)} 
                            className="h-11 w-11 rounded-2xl border border-border bg-card text-foreground hover:bg-muted transition flex items-center justify-center cursor-pointer shrink-0"
                            title="Kembali ke Detail Asesmen"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="font-bold text-sm sm:text-base text-foreground leading-tight truncate">
                                {assignment.title}
                            </h1>
                            <p className="text-xs text-muted-foreground truncate">
                                <span className="font-bold text-foreground">{selectedClassName}</span>
                                <span> · </span>
                                <span>{assessmentTypeLabel}</span>
                            </p>
                        </div>
                    </div>

                    {/* KKTP Control (secondary context, 40px height) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {assigned_classes.length > 1 && (
                            <select
                                value={selected_class_id || assigned_classes[0]?.id}
                                onChange={(e) => router.visit(route('assignments.grade-view', { assignment: assignment.id, class_id: e.target.value }), { preserveScroll: true })}
                                className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground outline-none cursor-pointer h-10 max-w-[120px] sm:max-w-none truncate"
                            >
                                {assigned_classes.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.students_count || 0})
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsKktpModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition cursor-pointer h-10 shrink-0"
                        >
                            <Target className="h-4 w-4 text-primary" />
                            <span>KKTP</span>
                        </button>
                    </div>
                </div>

                {/* 2. Student Switcher (64px target, clean dropdown + counter) */}
                <div className="w-full max-w-full bg-card rounded-2xl border border-border/80 p-3 shadow-xs space-y-2 overflow-hidden">
                    {/* Top Row: Navigation bar + Counter + Select */}
                    <div className="flex items-center justify-between gap-2 w-full">
                        <button
                            type="button"
                            disabled={currentStudentIndex === 0}
                            onClick={() => setCurrentStudentIndex(prev => prev - 1)}
                            className="inline-flex items-center justify-center h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Sebelumnya</span>
                        </button>

                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center max-w-[calc(100%-80px)] sm:max-w-none">
                            <span className="text-xs font-bold text-primary font-mono px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                                {String(currentStudentIndex + 1).padStart(2, '0')} / {String(students.length).padStart(2, '0')}
                            </span>

                            <div className="relative min-w-0 flex-1 max-w-[200px] sm:max-w-[280px]">
                                <select
                                    value={currentStudentIndex}
                                    onChange={(e) => setCurrentStudentIndex(Number(e.target.value))}
                                    className="w-full rounded-xl border border-border bg-background pl-2.5 pr-7 py-1.5 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 truncate cursor-pointer h-10 appearance-none"
                                >
                                    {students.map((s, idx) => {
                                        const sub = submissionsMap[s.id];
                                        const scored = sub && sub.score !== null && sub.score !== undefined;
                                        const statusLabel = scored ? `✓ ${sub.score}` : '○';
                                        return (
                                            <option key={s.id} value={idx}>
                                                {String(idx + 1).padStart(2, '0')}. {s.name} ({statusLabel})
                                            </option>
                                        );
                                    })}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                    <ChevronDown className="h-4 w-4" />
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={currentStudentIndex === students.length - 1}
                            onClick={() => setCurrentStudentIndex(prev => prev + 1)}
                            className="inline-flex items-center justify-center h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                        >
                            <span className="hidden sm:inline mr-1">Berikutnya</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Bottom Row: Active Student Identity & Assessment Status */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 w-full">
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2 overflow-wrap-anywhere">
                                {currentStudent?.name}
                            </h3>
                            {currentStudent?.nis && (
                                <p className="text-xs font-mono text-muted-foreground truncate">
                                    NIS: {currentStudent.nis}
                                </p>
                            )}
                        </div>

                        <div className="shrink-0">
                            {score !== '' && score !== undefined && score !== null ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-bold border border-emerald-500/20">
                                    <Check className="h-4 w-4 stroke-[3]" />
                                    <span>Nilai <strong>{score}</strong></span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted text-muted-foreground text-xs font-medium border border-border">
                                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                                    <span>Belum dinilai</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Mobile Segmented Tab Switcher (Visible ONLY on Mobile < 640px) */}
                <div 
                    role="tablist" 
                    className="grid grid-cols-2 gap-1 p-1 bg-muted/40 rounded-2xl border border-border sm:hidden w-full h-12 box-border"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mobileTab === 'work'}
                        onClick={() => setMobileTab('work')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] truncate ${
                            mobileTab === 'work'
                                ? 'bg-background text-primary shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">Karya Siswa</span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={mobileTab === 'grade'}
                        onClick={() => setMobileTab('grade')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] truncate ${
                            mobileTab === 'grade'
                                ? 'bg-background text-primary shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <PenTool className="w-4 h-4 shrink-0" />
                        <span className="truncate">Penilaian {score !== '' && score !== undefined && score !== null ? `(${score})` : ''}</span>
                    </button>
                </div>

                {/* 4. Responsive Workspace Content: Single-Focus on Mobile, Adaptive on Tablet, True Split on Desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5 w-full">
                    {/* Left Panel: Student Submission Viewer */}
                    <div className={`border border-border/80 rounded-2xl p-4 sm:p-5 bg-card flex flex-col shadow-xs w-full overflow-hidden ${
                        mobileTab === 'work' ? 'flex' : 'hidden sm:flex'
                    }`}>
                        {renderSubmissionContent()}
                    </div>

                    {/* Right Panel: Grading Form */}
                    <div className={`border border-border/80 rounded-2xl p-4 sm:p-5 bg-card flex flex-col space-y-3 shadow-xs w-full overflow-hidden ${
                        mobileTab === 'grade' ? 'flex' : 'hidden sm:flex'
                    }`}>
                        {renderGradingForm()}
                    </div>
                </div>
            </div>

            {/* 5. Sticky Bottom Action Bar (64px + safe area, guarded against overlap) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-xl py-3 px-3.5 sm:px-6 w-full">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 w-full">
                    {/* Previous Button (44px min target) */}
                    <button
                        type="button"
                        disabled={currentStudentIndex === 0 || isSaving}
                        onClick={() => setCurrentStudentIndex(prev => prev - 1)}
                        className="inline-flex items-center justify-center h-12 w-12 sm:w-auto sm:px-4 rounded-2xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none shrink-0"
                        title="Siswa Sebelumnya"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline ml-1.5">Sebelumnya</span>
                    </button>

                    {/* Save Button (48px primary button) */}
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSave(false)}
                        className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50 flex-1 sm:flex-none sm:min-w-[200px]"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : saveStatus === 'saved' ? (
                            <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Tersimpan</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Simpan Nilai</span>
                            </>
                        )}
                    </button>

                    {/* Next Button (44px min target) */}
                    <button
                        type="button"
                        disabled={currentStudentIndex === students.length - 1 || isSaving}
                        onClick={() => setCurrentStudentIndex(prev => prev + 1)}
                        className="inline-flex items-center justify-center h-12 w-12 sm:w-auto sm:px-4 rounded-2xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none shrink-0"
                        title="Siswa Berikutnya"
                    >
                        <span className="hidden sm:inline mr-1.5">Berikutnya</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Preview Image Modal */}
            {previewImageModal && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setPreviewImageModal(null)}
                >
                    <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => setPreviewImageModal(null)}
                            className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300 transition cursor-pointer"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={previewImageModal}
                            alt="Preview Karya"
                            className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toastMessage && (
                <div className={`fixed bottom-24 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-3 ${
                    toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-destructive text-destructive-foreground'
                }`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{toastMessage.message}</span>
                </div>
            )}

            <KktpModal
                isOpen={isKktpModalOpen}
                onClose={() => setIsKktpModalOpen(false)}
                assignment={assignment}
            />
        </AppLayout>
    );
}
