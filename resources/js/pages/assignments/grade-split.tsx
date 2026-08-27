import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    ChevronLeft, ChevronRight, Save, CheckCircle2, FileText,
    Camera, AlertCircle, Target, Info, CheckSquare, Square, Users, ArrowRight,
    Upload, Eye, Check, Loader2, Sparkles, RefreshCw, Maximize2, X, ChevronDown, ChevronUp,
    PenTool, Image as ImageIcon
} from 'lucide-react';
import { KktpModal } from '@/components/assignments/KktpModal';
import { StudentSwitcher } from '@/components/assignments/student-switcher';
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
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
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
        const map: Record<number, { score: number | null; submitted_at?: string }> = {};
        (assignment.submissions || []).forEach((s: any) => {
            map[s.student_id] = { score: s.score, submitted_at: s.submitted_at };
        });
        return map;
    }, [assignment.submissions]);

    // Active class name
    const selectedClassName = useMemo(() => {
        if (selected_class_id === 'all') return 'Semua Kelas';
        const found = assigned_classes.find(c => c.id === selected_class_id);
        return found ? found.name : (assigned_classes[0]?.name ?? 'Kelas 8A');
    }, [selected_class_id, assigned_classes]);

    let isOffline = false;
    let textContent = submission?.content || '';
    if (submission?.content) {
        try {
            const parsed = JSON.parse(submission.content);
            isOffline = !!parsed.submitted_offline;
            if (isOffline) {
                textContent = '';
            }
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
            // Ignore if active in input/textarea
            const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''));
            
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

    // Autosave handler
    const handleSave = async (autoNext = false) => {
        if (!currentStudent) return;
        setIsSaving(true);
        setSaveStatus('saving');

        try {
            const numScore = score === '' || score === undefined || score === null ? null : Number(score);

            await axios.post(route('assignments.grade'), {
                assignment_id: assignment.id,
                student_id: currentStudent.id,
                score: numScore,
                feedback: feedback,
                kktp_details: kktpDetails
            });

            setSaveStatus('saved');
            const now = new Date();
            setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            if (autoNext && currentStudentIndex < students.length - 1) {
                setCurrentStudentIndex(prev => prev + 1);
                // On mobile, reset to work tab or keep in current workflow
            } else {
                router.reload({ only: ['assignment'], preserveScroll: true });
            }
        } catch (error) {
            setSaveStatus('idle');
            showNotification('Gagal menyimpan nilai.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Auto save on blur from score / feedback input
    const handleAutosaveOnBlur = () => {
        if (currentStudent && (score !== '' || feedback !== '')) {
            handleSave(false);
        }
    };

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentStudent) return;

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

    const isSummative = assignment.assessment_type === 'summative';
    const assessmentTypeLabel = assignment.assessment_type === 'initial' 
        ? 'Asesmen Awal' 
        : isSummative 
            ? 'Asesmen Sumatif' 
            : 'Asesmen Formatif';

    const hasRubric = assignment.scoring_tool === 'rubric' && assignment.instrument_config?.kktp?.criteria?.length > 0;

    const renderFormattedAnswer = (contentString: string, assignment: any) => {
        if (!contentString) return null;
        let parsed: any = null;
        try {
            parsed = JSON.parse(contentString);
        } catch {
            return (
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1.5">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" /> Jawaban / Laporan Siswa
                    </span>
                    <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {contentString}
                    </div>
                </div>
            );
        }

        if (parsed.type === 'written_test' || parsed.type === 'formative_quiz' || parsed.type === 'quiz_response' || (parsed && typeof parsed === 'object' && parsed.answers && !parsed.type)) {
            const questions = assignment?.instrument_config?.questions || [];
            const answers = parsed.answers || {};

            return (
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            <h4 className="text-xs font-bold text-foreground">
                                {parsed.type === 'written_test' ? 'Tes Tertulis' : 'Kuis Formatif'}
                            </h4>
                        </div>
                        {parsed.auto_score !== undefined && (
                            <span className="text-xs font-black text-primary">
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
                                <div key={q.id || idx} className="p-2.5 rounded-xl bg-card border border-border shadow-2xs space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-bold text-foreground leading-snug">
                                            {idx + 1}. {q.question || q.text}
                                        </p>
                                        <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                            isCorrect ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                        }`}>
                                            {isCorrect ? 'Benar' : 'Salah'}
                                        </span>
                                    </div>
                                    <div className="text-[11px] grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                                        <div>
                                            <span className="text-muted-foreground block text-[10px]">Jawaban:</span>
                                            <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isMcq ? (studentOpt?.text || studentAns || '—') : (studentAns || '—')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[10px]">Kunci:</span>
                                            <span className="font-bold text-emerald-600">
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

        return (
            <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-foreground whitespace-pre-wrap">
                {contentString}
            </div>
        );
    };

    // Submissions Viewer Component
    const renderSubmissionContent = () => {
        const isImage = submission?.file_path && /\.(jpeg|jpg|gif|png|webp)$/i.test(submission.file_path);
        const isPdf = submission?.file_path && /\.pdf$/i.test(submission.file_path);

        return (
            <div className="flex flex-col h-full space-y-2.5">
                {/* Collapsible Mini Guide */}
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-muted/30 border border-border text-xs">
                    <span className="font-bold text-foreground text-[11px] flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        <span>Karya Siswa (Fisik / Digital)</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowInfoBanner(!showInfoBanner)}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                        <span>{showInfoBanner ? 'Tutup Info' : 'Panduan'}</span>
                        <Info className="h-3 w-3" />
                    </button>
                </div>

                {showInfoBanner && (
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground leading-relaxed animate-in fade-in duration-150">
                        Ambil foto LKPD fisik siswa menggunakan kamera smartphone atau periksa berkas digital yang telah dikirimkan siswa. Nilai akan tersimpan otomatis.
                    </div>
                )}

                {/* Submissions Viewer / Content Area */}
                {submission && (submission.file_path || textContent || isOffline) ? (
                    <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[200px]">
                        {isOffline && !submission.file_path && (
                            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold">
                                📝 Tugas LKPD diserahkan secara fisik di kelas
                            </div>
                        )}

                        {textContent && renderFormattedAnswer(textContent, assignment)}

                        {submission.file_path && (
                            <div className="relative rounded-xl border border-border overflow-hidden bg-muted/20 min-h-[180px] flex items-center justify-center">
                                {isImage ? (
                                    <div className="relative group w-full h-full flex flex-col items-center">
                                        <img
                                            src={`/storage/${submission.file_path}`}
                                            alt="Karya Siswa"
                                            className="w-full max-h-[360px] object-contain cursor-pointer rounded-lg"
                                            onClick={() => setPreviewImageModal(`/storage/${submission.file_path}`)}
                                        />
                                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewImageModal(`/storage/${submission.file_path}`)}
                                                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition cursor-pointer"
                                                title="Perbesar Foto"
                                            >
                                                <Maximize2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : isPdf ? (
                                    <iframe src={`/storage/${submission.file_path}`} className="w-full h-[320px] border-0" title="PDF Viewer" />
                                ) : (
                                    <div className="p-6 text-center text-xs space-y-2">
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
                    /* Compact Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center p-5 text-center bg-muted/15 rounded-xl border border-dashed border-border min-h-[160px] space-y-1.5">
                        <FileText className="w-7 h-7 text-muted-foreground/40" />
                        <p className="text-xs font-bold text-foreground">Belum ada karya digital</p>
                        <p className="text-[11px] text-muted-foreground max-w-xs leading-tight">
                            Gunakan foto untuk menilai LKPD fisik atau beri nilai langsung di lembar penilaian.
                        </p>
                    </div>
                )}

                {/* Direct Action Buttons for Photo & Upload */}
                <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 shrink-0">
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

                    {/* Primary Button: Take Photo */}
                    <button
                        type="button"
                        disabled={isUploadingProof}
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                        <Camera className="w-4 h-4" />
                        <span>{isUploadingProof ? 'Mengunggah...' : (submission?.file_path ? 'Ganti Foto' : 'Ambil Foto LKPD')}</span>
                    </button>

                    {/* Secondary Button: Upload File */}
                    <button
                        type="button"
                        disabled={isUploadingProof}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-bold transition active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Upload File</span>
                    </button>
                </div>
            </div>
        );
    };

    // Grading Form Component (Score + Rubric + Feedback)
    const renderGradingForm = () => {
        return (
            <div className="flex flex-col space-y-3.5 h-full">
                {/* ① Final Score Input (Clear & Prominent) */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground">
                            Nilai Akhir (0 - {assignment.max_points || 100})
                        </label>
                        {assignment.passing_grade && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
                                KKTP: {assignment.passing_grade}
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
                            onBlur={handleAutosaveOnBlur}
                            placeholder="0"
                            className="w-full h-11 px-3 text-xl font-black text-primary bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center"
                        />
                        <span className="text-xs font-bold text-muted-foreground shrink-0">
                            / {assignment.max_points || 100}
                        </span>
                    </div>
                </div>

                {/* ② Interactive Rubric Accordion (if configured) */}
                {hasRubric && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                <span>Rubrik Kriteria Penilaian</span>
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowRubricDetails(!showRubricDetails)}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                            >
                                <span>{showRubricDetails ? 'Ringkas' : 'Perluas'}</span>
                                {showRubricDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                        </div>

                        {showRubricDetails && (
                            <div className="space-y-2 animate-in fade-in duration-150">
                                {assignment.instrument_config.kktp.criteria.map((crit: any, i: number) => (
                                    <div key={i} className="p-2.5 rounded-xl border border-border/80 bg-muted/20 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-foreground">{crit.name}</span>
                                            {kktpDetails[i] && (
                                                <span className="text-[10px] font-black text-primary px-1.5 py-0.2 rounded bg-primary/10">
                                                    {kktpDetails[i]}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-4 gap-1 text-[10px]">
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
                                                        className={`p-1.5 rounded-lg border text-center font-bold transition cursor-pointer leading-tight ${
                                                            isSelected
                                                                ? 'bg-primary text-primary-foreground border-primary shadow-2xs font-black'
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

                {/* ③ Qualitative Feedback Section */}
                <div className="space-y-2 flex-1 flex flex-col">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Umpan Balik (Feedback)</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Klik chip untuk respon cepat</span>
                    </label>

                    {/* Quick Feedback Chips */}
                    <div className="flex flex-wrap gap-1 pb-1">
                        {QUICK_FEEDBACK_CHIPS.map((chip, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => appendFeedback(chip.text)}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition active:scale-95 cursor-pointer"
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
                        onBlur={handleAutosaveOnBlur}
                        className="w-full p-2.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y min-h-[65px]"
                    />
                </div>
            </div>
        );
    };

    return (
        <AppLayout title="Penilaian Asesmen Guru">
            <Head title={`Penilaian ${assignment.title} – LMS Mokopani`} />

            <div className="min-h-[calc(100vh-70px)] flex flex-col space-y-2.5 max-w-6xl mx-auto px-3 sm:px-6 pt-2 pb-28 fade-in">
                {/* ① Compact Header Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Link 
                            href={route('assignments.show', selected_class_id && selected_class_id !== 'all' ? { assignment: assignment.id, class_id: selected_class_id } : assignment.id)} 
                            className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer shrink-0"
                            title="Kembali ke Ringkasan Asesmen"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="font-bold text-xs sm:text-sm text-foreground leading-tight truncate">
                                {assignment.title}
                            </h1>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 leading-tight">
                                <span className="font-bold text-primary">{selectedClassName}</span>
                                <span>•</span>
                                <span>{assessmentTypeLabel}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Class Dropdown & KKTP */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {assigned_classes.length > 1 && (
                            <select
                                value={selected_class_id || assigned_classes[0]?.id}
                                onChange={(e) => router.visit(route('assignments.grade-view', { assignment: assignment.id, class_id: e.target.value }), { preserveScroll: true })}
                                className="rounded-xl border border-border bg-card px-2 py-1 text-xs font-bold text-foreground outline-none cursor-pointer h-8"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition cursor-pointer h-8"
                        >
                            <Target className="h-3.5 w-3.5 text-primary" />
                            <span>KKTP</span>
                        </button>
                    </div>
                </div>

                {/* ② Student Switcher Toolbar */}
                <StudentSwitcher
                    students={students}
                    submissionsMap={submissionsMap}
                    currentIndex={currentStudentIndex}
                    onSelectIndex={(idx) => setCurrentStudentIndex(idx)}
                />

                {/* ③ Mobile Segmented Tab Switcher (Visible only on < lg) */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl border border-border lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileTab('work')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                            mobileTab === 'work'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Karya Siswa</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('grade')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                            mobileTab === 'grade'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Penilaian {score !== '' && score !== undefined && score !== null ? `(${score})` : ''}</span>
                    </button>
                </div>

                {/* ④ Responsive Workspace Content */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                    {/* Left Panel: Student Submission Viewer (Always on Desktop, Tab on Mobile) */}
                    <div className={`lg:col-span-7 border border-border rounded-2xl p-3.5 sm:p-4 bg-card flex flex-col min-h-[300px] shadow-xs ${
                        mobileTab === 'work' ? 'block' : 'hidden lg:flex'
                    }`}>
                        {renderSubmissionContent()}
                    </div>

                    {/* Right Panel: Grading Form (Always on Desktop, Tab on Mobile) */}
                    <div className={`lg:col-span-5 border border-border rounded-2xl p-3.5 sm:p-4 bg-card flex flex-col space-y-3.5 shadow-xs ${
                        mobileTab === 'grade' ? 'block' : 'hidden lg:flex'
                    }`}>
                        {renderGradingForm()}
                    </div>
                </div>
            </div>

            {/* ⑤ Sticky Bottom Action Footer (Safe-Area Guarded) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg py-2 px-4 sm:px-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
                    {/* Left: Autosave Indicator */}
                    <div className="flex items-center gap-2 text-xs">
                        {saveStatus === 'saving' ? (
                            <span className="inline-flex items-center gap-1.5 text-primary font-bold animate-pulse">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="text-[11px] sm:text-xs">Menyimpan...</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground font-medium text-[11px] sm:text-xs">
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Tersimpan {lastSavedTime && `(${lastSavedTime})`}</span>
                            </span>
                        )}
                    </div>

                    {/* Right: Previous & Save/Next Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={currentStudentIndex === 0}
                            onClick={() => setCurrentStudentIndex(prev => prev - 1)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            title="Siswa Sebelumnya"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Sebelumnya</span>
                        </button>

                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSave(true)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 active:scale-98 transition cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menyimpan...</span>
                                </>
                            ) : currentStudentIndex === students.length - 1 ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Selesai Menilai</span>
                                </>
                            ) : (
                                <>
                                    <span>Simpan & Berikutnya</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
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
                            className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300 transition"
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
                <div className={`fixed bottom-16 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-3 ${
                    toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-destructive text-destructive-foreground'
                }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{toastMessage.message}</span>
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
