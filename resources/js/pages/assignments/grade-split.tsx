import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    ChevronLeft, ChevronRight, Save, CheckCircle2, FileText,
    Camera, AlertCircle, Target, Info, CheckSquare, Square, Users, ArrowRight
} from 'lucide-react';
import { KktpModal } from '@/components/assignments/KktpModal';
import { StudentSwitcher } from '@/components/assignments/student-switcher';
import axios from 'axios';

interface GradeSplitProps {
    assignment: any;
    students: any[];
    selected_class_id?: number | 'all';
    assigned_classes?: { id: number; name: string; students_count?: number }[];
}

export default function GradeSplitPage({
    assignment,
    students = [],
    selected_class_id,
    assigned_classes = [],
}: GradeSplitProps) {
    const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
    const currentStudent = students[currentStudentIndex];

    const submission = assignment.submissions?.find((s: any) => s.student_id === currentStudent?.id);

    // States for grading
    const [score, setScore] = useState<number | string>(submission?.score ?? '');
    const [feedback, setFeedback] = useState(submission?.feedback ?? '');
    const [kktpDetails, setKktpDetails] = useState<any>(submission?.kktp_details ?? {});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingProof, setIsUploadingProof] = useState(false);
    const [isKktpModalOpen, setIsKktpModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

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

    // Update states when student changes
    useEffect(() => {
        setScore(submission?.score ?? '');
        setFeedback(submission?.feedback ?? '');
        setKktpDetails(submission?.kktp_details ?? {});
    }, [currentStudentIndex, submission]);

    const handleSave = async (autoNext = false) => {
        if (!currentStudent) return;
        setIsSaving(true);
        try {
            await axios.post(route('assignments.grade'), {
                assignment_id: assignment.id,
                student_id: currentStudent.id,
                score: score ? Number(score) : null,
                feedback: feedback,
                kktp_details: kktpDetails
            });
            showNotification('Nilai berhasil disimpan!', 'success');

            if (autoNext && currentStudentIndex < students.length - 1) {
                setCurrentStudentIndex(prev => prev + 1);
            } else {
                router.reload({ only: ['assignment'] });
            }
        } catch (error) {
            showNotification('Gagal menyimpan nilai.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentStudent) return;

        setIsUploadingProof(true);
        const formData = new FormData();
        formData.append('student_id', currentStudent.id);
        formData.append('file', file);

        try {
            await axios.post(route('assignments.upload-proof', assignment.id), formData);
            showNotification('Karya fisik berhasil difoto/diunggah!', 'success');
            router.reload({ only: ['assignment'] });
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

    const renderFormattedAnswer = (contentString: string, assignment: any) => {
        if (!contentString) return null;
        let parsed: any = null;
        try {
            parsed = JSON.parse(contentString);
        } catch {
            return (
                <div className="p-4 sm:p-5 bg-card rounded-2xl border border-border shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="text-xs font-bold text-primary flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Teks Jawaban / Laporan Siswa
                        </span>
                    </div>
                    <div className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed font-medium bg-muted/40 p-4 rounded-xl border border-border">
                        {contentString}
                    </div>
                </div>
            );
        }

        if (parsed.type === 'written_test' || parsed.type === 'formative_quiz' || parsed.type === 'quiz_response' || (parsed && typeof parsed === 'object' && parsed.answers && !parsed.type)) {
            const questions = assignment?.instrument_config?.questions || [];
            const answers = parsed.answers || {};

            return (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-2xs">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-foreground">
                                    {parsed.type === 'written_test' ? 'Tes Tertulis / Objektif' : parsed.type === 'formative_quiz' ? 'Kuis Formatif' : 'Jawaban Evaluasi'}
                                </h4>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    {questions.length > 0 ? `Total ${questions.length} Butir Soal` : `Total ${Object.keys(answers).length} Jawaban`}
                                </p>
                            </div>
                        </div>
                        {parsed.auto_score !== undefined && (
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-primary block">Skor Sistem</span>
                                <span className="text-xl sm:text-2xl font-black text-foreground">{parsed.auto_score}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {questions.length > 0 ? (
                            questions.map((q: any, idx: number) => {
                                const studentAns = answers[q.id];
                                const isMcq = q.type === 'multiple_choice';
                                const correctOpt = isMcq ? (q.options?.find((o: any) => o.is_correct) || q.options?.find((o: any) => o.id === q.answer)) : null;
                                const studentOpt = isMcq ? q.options?.find((o: any) => o.id == studentAns) : null;
                                const isCorrect = isMcq ? (correctOpt?.id == studentAns) : (studentAns && (q.correct_answer || q.answer) && studentAns.trim().toLowerCase() == (q.correct_answer || q.answer).trim().toLowerCase());

                                return (
                                    <div key={q.id || idx} className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2.5">
                                                <span className="h-6 w-6 shrink-0 rounded-lg bg-muted text-foreground font-bold text-xs flex items-center justify-center mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground leading-relaxed">{q.question || q.text}</p>
                                                    {q.image_url && (
                                                        <img src={q.image_url} alt="Soal" className="mt-2 max-h-36 rounded-xl border border-border object-contain" />
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                                q.type === 'essay'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                                                    : isCorrect
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                            }`}>
                                                {q.type === 'essay' ? 'Esai / Review' : isCorrect ? 'Benar' : 'Salah'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/60 text-xs">
                                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                                                <span className="text-[10px] font-bold text-muted-foreground block mb-1">Jawaban Siswa:</span>
                                                <p className={`font-bold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                                    {isMcq ? (studentOpt?.text || studentAns || '(Tidak dijawab)') : (studentAns || '(Kosong)')}
                                                </p>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Kunci / Referensi:</span>
                                                <p className="font-bold text-emerald-700 dark:text-emerald-300">
                                                    {isMcq ? (correctOpt?.text || '(Belum diatur)') : (q.correct_answer || q.answer || '(Belum diatur)')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            Object.entries(answers).map(([key, val]: [string, any], idx: number) => (
                                <div key={key} className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground block">Soal / Butir {key}</span>
                                        <p className="text-xs font-bold text-foreground mt-1">{String(val || '(Kosong)')}</p>
                                    </div>
                                    <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 bg-card rounded-2xl border border-border shadow-xs space-y-3">
                <p className="text-xs text-foreground whitespace-pre-wrap">{contentString}</p>
            </div>
        );
    };

    const renderSubmissionContent = () => {
        const infoBanner = (
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3 text-left shadow-2xs shrink-0">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Info className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">
                        MODE PENILAIAN GURU (MOBILE-FIRST & OFFLINE)
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        Penilaian karya fisik siswa (LKPD cetak/portofolio) dapat difoto langsung via kamera HP di bawah, atau langsung diberi nilai dan umpan balik pada panel kanan.
                    </p>
                </div>
            </div>
        );

        const cameraSection = (
            <div className="mt-auto pt-4 shrink-0">
                <label className={`flex items-center justify-center gap-2 w-full p-4 rounded-2xl border-2 border-dashed transition min-h-[48px] ${isUploadingProof ? 'opacity-50 cursor-not-allowed border-border bg-muted' : 'cursor-pointer border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary'}`}>
                    <Camera className="w-5 h-5" />
                    <span className="font-bold text-xs sm:text-sm">
                        {isUploadingProof ? 'Mengunggah...' : 'Foto / Unggah Karya Fisik Siswa'}
                    </span>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleUploadProof}
                        disabled={isUploadingProof}
                    />
                </label>
            </div>
        );

        if (!submission) {
            return (
                <div className="h-full flex flex-col justify-between space-y-4">
                    {infoBanner}
                    <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground bg-card rounded-2xl border border-dashed border-border p-8 text-center my-auto shadow-2xs">
                        <FileText className="w-12 h-12 mb-3 text-muted-foreground/40" />
                        <p className="font-bold text-foreground text-sm sm:text-base">Siswa belum mengumpulkan tugas secara daring.</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">Gunakan tombol foto karya fisik di bawah untuk menyertakan bukti penyerahan luring.</p>
                    </div>
                    {cameraSection}
                </div>
            );
        }

        const isImage = submission.file_path && /\.(jpeg|jpg|gif|png)$/i.test(submission.file_path);
        const isPdf = submission.file_path && /\.pdf$/i.test(submission.file_path);

        return (
            <div className="h-full flex flex-col space-y-4 relative">
                {infoBanner}

                {isOffline && !submission.file_path && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl shrink-0 shadow-2xs">
                        <h4 className="font-bold text-amber-700 dark:text-amber-400 text-xs">Tugas Diserahkan Langsung (Luring)</h4>
                        <p className="text-xs text-amber-800/80 dark:text-amber-300 mt-0.5">Siswa melapor bahwa tugas fisik telah diserahkan di kelas.</p>
                    </div>
                )}

                {textContent && (
                    <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
                        {renderFormattedAnswer(textContent, assignment)}
                    </div>
                )}

                {submission.file_path && (
                    <div className="flex-1 bg-muted/40 rounded-2xl border border-border overflow-hidden flex flex-col relative min-h-[300px] shadow-2xs">
                        {isImage ? (
                            <img src={`/storage/${submission.file_path}`} alt="Submission" className="object-contain w-full h-full" />
                        ) : isPdf ? (
                            <iframe src={`/storage/${submission.file_path}`} className="w-full h-full border-0" title="PDF Viewer" />
                        ) : (
                            <div className="flex items-center justify-center h-full flex-col text-muted-foreground p-6 text-center">
                                <FileText className="w-14 h-14 mb-3 text-muted-foreground/40" />
                                <a href={`/storage/${submission.file_path}`} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline flex items-center text-xs">
                                    Download / Buka File Lampiran
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {cameraSection}
            </div>
        );
    };

    return (
        <AppLayout title="Penilaian Asesmen Guru">
            <Head title={`Penilaian ${assignment.title} – LMS Mokopani`} />

            <div className="min-h-[calc(100vh-65px)] flex flex-col space-y-4 max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-16 fade-in">
                {/* Header Bar */}
                <div className="flex flex-col gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Link 
                                href={route('assignments.show', selected_class_id && selected_class_id !== 'all' ? { assignment: assignment.id, class_id: selected_class_id } : assignment.id)} 
                                className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Link>
                            <div>
                                <h1 className="font-bold text-sm sm:text-base text-foreground leading-tight truncate max-w-[260px] sm:max-w-md">{assignment.title}</h1>
                                <p className="text-xs text-muted-foreground">Mode Penilaian Split-Screen ({students.length} Siswa)</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsKktpModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition min-h-[40px] cursor-pointer"
                        >
                            <Target className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Info KKTP</span>
                        </button>
                    </div>

                    {/* Class Switcher for Multi-Class Assignments */}
                    {assigned_classes.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-border/40 scrollbar-hide">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider shrink-0">
                                Pilih Kelas:
                            </span>
                            {assigned_classes.map((cls) => {
                                const isActive = selected_class_id === cls.id || (!selected_class_id && assigned_classes[0]?.id === cls.id);
                                return (
                                    <button
                                        key={cls.id}
                                        type="button"
                                        onClick={() => router.visit(route('assignments.grade-view', { assignment: assignment.id, class_id: cls.id }), { preserveScroll: true })}
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
                                onClick={() => router.visit(route('assignments.grade-view', { assignment: assignment.id, class_id: 'all' }), { preserveScroll: true })}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    selected_class_id === 'all'
                                        ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                        : 'bg-muted/40 hover:bg-muted/75 text-muted-foreground hover:text-foreground border border-border/50'
                                }`}
                            >
                                <span>Semua Siswa</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Student Switcher Toolbar */}
                <StudentSwitcher
                    students={students}
                    currentIndex={currentStudentIndex}
                    onSelectIndex={(idx) => setCurrentStudentIndex(idx)}
                />

                {/* Split Responsive Content */}
                <div className="flex-1 flex flex-col lg:flex-row gap-5">
                    {/* Left: Student Submission Viewer */}
                    <div className="w-full lg:w-7/12 border border-border rounded-2xl p-4 bg-card flex flex-col min-h-[320px] shadow-xs">
                        {renderSubmissionContent()}
                    </div>

                    {/* Right: Rubric & Grading Form */}
                    <div className="w-full lg:w-5/12 p-4 sm:p-5 rounded-2xl border border-border bg-card flex flex-col gap-5 shadow-xs">
                        {/* Interactive Rubric Section */}
                        {assignment.scoring_tool === 'rubric' && assignment.instrument_config?.kktp?.criteria ? (
                            <div className="space-y-3">
                                <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                    <span>Rubrik Penilaian Cepat</span>
                                </h3>

                                <div className="space-y-3">
                                    {assignment.instrument_config.kktp.criteria.map((crit: any, i: number) => (
                                        <div key={i} className="border border-border rounded-xl p-3 space-y-2">
                                            <p className="font-bold text-xs text-foreground">{crit.name}</p>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {['Perlu Bimbingan', 'Cukup', 'Baik', 'Sangat Baik'].map((lvl) => {
                                                    const isSelected = kktpDetails[i] === lvl;
                                                    return (
                                                        <button
                                                            key={lvl}
                                                            type="button"
                                                            onClick={() => handleRubricClick(i, 0, lvl)}
                                                            className={`text-xs p-2.5 rounded-xl border text-center font-bold transition min-h-[40px] ${
                                                                isSelected
                                                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        >
                                                            {lvl}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-muted/40 border border-dashed border-border text-center space-y-2">
                                <p className="text-xs font-bold text-muted-foreground">Tidak ada rubrik terstruktur khusus untuk asesmen ini.</p>
                                <button
                                    type="button"
                                    onClick={() => setIsKktpModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                >
                                    <Target className="w-3.5 h-3.5" /> Lihat Pendekatan KKTP
                                </button>
                            </div>
                        )}

                        {/* Final Score & Qualitative Feedback Input */}
                        <div className="space-y-4 bg-primary/5 p-4 sm:p-5 rounded-2xl border border-primary/10 mt-auto">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-foreground">
                                    Skor Akhir (0 - {assignment.max_points || 100})
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={assignment.max_points || 100}
                                    value={score}
                                    onChange={(e) => setScore(e.target.value)}
                                    className="text-xl font-bold w-full h-12 text-primary rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-foreground">
                                    Umpan Balik (Feedback)
                                </label>
                                <Textarea
                                    rows={3}
                                    placeholder="Tuliskan catatan umpan balik untuk siswa..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground p-3 min-h-[100px]"
                                />
                            </div>

                            {/* Dual Primary Actions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleSave(false)}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-border bg-background text-foreground font-bold text-xs hover:bg-muted transition min-h-[48px] cursor-pointer"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Nilai'}</span>
                                </button>

                                <button
                                    type="button"
                                    disabled={isSaving || currentStudentIndex === students.length - 1}
                                    onClick={() => handleSave(true)}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 transition min-h-[48px] cursor-pointer disabled:opacity-40"
                                >
                                    <span>Simpan & Berikutnya</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Notification Toast */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 ${
                    toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-destructive text-destructive-foreground'
                }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-bold text-xs">{toastMessage.message}</span>
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
