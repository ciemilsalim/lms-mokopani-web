import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, FileText, Image as ImageIcon, Camera, UploadCloud, AlertCircle, Target, Info, CheckSquare, Square, Star } from 'lucide-react';
import { KktpModal } from '@/components/assignments/KktpModal';
import axios from 'axios';

interface GradeSplitProps {
    assignment: any;
    students: any[];
}

export default function GradeSplitPage({ assignment, students }: GradeSplitProps) {
    const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
    const currentStudent = students[currentStudentIndex];
    
    const submission = assignment.submissions.find((s: any) => s.student_id === currentStudent?.id);
    
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
        } catch(e) {}
    }

    // Update states when student changes
    useEffect(() => {
        setScore(submission?.score ?? '');
        setFeedback(submission?.feedback ?? '');
        setKktpDetails(submission?.kktp_details ?? {});
    }, [currentStudentIndex, submission]);

    const handleSave = async () => {
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
        } catch(err) {
            showNotification('Gagal mengunggah foto.', 'error');
        } finally {
            setIsUploadingProof(false);
        }
    };

    const handleNext = () => {
        if (currentStudentIndex < students.length - 1) {
            setCurrentStudentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStudentIndex > 0) {
            setCurrentStudentIndex(prev => prev - 1);
        }
    };

    const handleRubricClick = (criterionIndex: number, levelScore: number, levelName: string) => {
        const newDetails = { ...kktpDetails, [criterionIndex]: levelName };
        setKktpDetails(newDetails);
        
        // Auto-calculate score if using simple rubric
        if (assignment.scoring_tool === 'rubric' && assignment.instrument_config?.kktp?.criteria) {
            const totalCriteria = assignment.instrument_config.kktp.criteria.length;
            const currentTotal = Object.keys(newDetails).reduce((acc, key) => {
                // simple weight logic based on string
                let val = 0;
                if (newDetails[key] === 'Sangat Baik') val = 100;
                else if (newDetails[key] === 'Baik') val = 75;
                else if (newDetails[key] === 'Cukup') val = 50;
                else if (newDetails[key] === 'Perlu Bimbingan') val = 25;
                return acc + val;
            }, 0);
            
            // Just a rough estimate for auto-scoring
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
            // Plain text fallback
            return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Teks Jawaban / Laporan Siswa
                        </span>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50/50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800/60">
                        {contentString}
                    </div>
                </div>
            );
        }

        // Handle Written Test / Objective Quiz / Quiz Response
        if (parsed.type === 'written_test' || parsed.type === 'formative_quiz' || parsed.type === 'quiz_response' || (parsed && typeof parsed === 'object' && parsed.answers && !parsed.type)) {
            const questions = assignment?.instrument_config?.questions || [];
            const answers = parsed.answers || {};

            return (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/40">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-indigo-500 text-white shadow-2xs">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                                    {parsed.type === 'written_test' ? 'Tes Tertulis / Objektif' : parsed.type === 'formative_quiz' ? 'Kuis Formatif' : 'Jawaban Evaluasi'}
                                </h4>
                                <p className="text-[10px] text-indigo-700 dark:text-indigo-300/80 font-bold">
                                    {questions.length > 0 ? `Total ${questions.length} Butir Soal` : `Total ${Object.keys(answers).length} Jawaban`}
                                </p>
                            </div>
                        </div>
                        {parsed.auto_score !== undefined && (
                            <div className="text-right">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Skor Sistem</span>
                                <span className="text-2xl font-black text-indigo-950 dark:text-indigo-100 tracking-tight">{parsed.auto_score}</span>
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
                                    <div key={q.id || idx} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2.5">
                                                <span className="h-6 w-6 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{q.text}</p>
                                                    {q.image_url && (
                                                        <img src={q.image_url} alt="Soal" className="mt-2 max-h-36 rounded-lg border border-slate-200 dark:border-slate-700 object-contain" />
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                                q.type === 'essay' 
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' 
                                                    : isCorrect 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                                                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                            }`}>
                                                {q.type === 'essay' ? 'Esai / Review' : isCorrect ? 'Benar' : 'Salah'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Jawaban Siswa:</span>
                                                <p className={`font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {isMcq ? (studentOpt?.text || studentAns || '(Tidak dijawab)') : (studentAns || '(Kosong)')}
                                                </p>
                                            </div>
                                            <div className="p-2.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Kunci / Referensi:</span>
                                                <p className="font-bold text-emerald-800 dark:text-emerald-300">
                                                    {isMcq ? (correctOpt?.text || '(Belum diatur)') : (q.correct_answer || q.answer || '(Belum diatur)')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            Object.entries(answers).map(([key, val]: [string, any], idx: number) => (
                                <div key={key} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Soal / Butir {key}</span>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{String(val || '(Kosong)')}</p>
                                    </div>
                                    <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                                </div>
                            ))
                        )}
                    </div>

                    {parsed.note && (
                        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                            <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Catatan Tambahan Siswa:</p>
                            <p className="text-xs text-amber-900 dark:text-amber-200 italic font-medium">"{parsed.note}"</p>
                        </div>
                    )}
                </div>
            );
        }

        // Handle Self Assessment
        if (parsed.type === 'self_assessment') {
            if (parsed.assessment_mode === 'checklist') {
                return (
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Penilaian Diri - Ceklis</p>
                        {(parsed.indicators || []).map((ind: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                                {ind.checked ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                                <span className={`text-xs font-medium ${ind.checked ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{ind.name}</span>
                            </div>
                        ))}
                    </div>
                );
            }
            if (parsed.assessment_mode === 'simple_rubric') {
                const levelColors: Record<string, string> = { 'Perlu Bimbingan': 'text-red-600 bg-red-50', 'Cukup': 'text-amber-600 bg-amber-50', 'Baik': 'text-blue-600 bg-blue-50', 'Sangat Baik': 'text-emerald-600 bg-emerald-50' };
                return (
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Penilaian Diri - Rubrik Sederhana</p>
                        {(parsed.indicators || []).map((ind: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                                <p className="text-xs font-bold text-foreground">{ind.name}</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase ${levelColors[ind.selected_level] || 'bg-muted text-muted-foreground'}`}>{ind.selected_level || '-'}</span>
                            </div>
                        ))}
                    </div>
                );
            }
            const feelingMap: any = {
                very_happy: { label: 'Sangat Senang', icon: '🤩' },
                happy: { label: 'Senang', icon: '😊' },
                neutral: { label: 'Kurang Senang', icon: '😐' },
            };
            return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-5">
                    <div className="flex flex-wrap gap-3">
                        <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
                            <span className="text-xl">{feelingMap[parsed.feeling]?.icon}</span>
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{feelingMap[parsed.feeling]?.label || 'Biasa Saja'}</p>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
                            <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Skala Usaha Siswa</p>
                            <p className="text-xs font-bold text-sky-700 dark:text-sky-400">{parsed.effort_scale} / 4</p>
                        </div>
                    </div>
                    {parsed.feeling_reason && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Alasan Perasaan:</p>
                            <p className="text-xs text-slate-700 dark:text-slate-250 font-medium leading-relaxed italic">"{parsed.feeling_reason}"</p>
                        </div>
                    )}
                    {parsed.reflection_notes && (
                        <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Catatan Refleksi Siswa:</p>
                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-bold italic">"{parsed.reflection_notes}"</p>
                        </div>
                    )}
                </div>
            );
        }

        // Handle Peer Assessment
        if (parsed.type === 'peer_assessment') {
            if (parsed.assessment_mode === 'checklist') {
                return (
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Penilaian Antarteman - Ceklis</p>
                            {parsed.peer_name && <span className="text-xs font-bold text-foreground">→ {parsed.peer_name}</span>}
                        </div>
                        {(parsed.indicators || []).map((ind: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                                {ind.checked ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                                <span className={`text-xs font-medium ${ind.checked ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{ind.name}</span>
                            </div>
                        ))}
                    </div>
                );
            }
            return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-5">
                    <div className="flex flex-wrap gap-3">
                        <div className="px-5 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                            <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Menilai Teman:</p>
                            <p className="text-sm font-black text-foreground">{parsed.peer_name || '-'}</p>
                        </div>
                        {parsed.rating && (
                            <div className="px-5 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} className={`h-3 w-3 ${parsed.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                                    ))}
                                </div>
                                <p className="text-xs font-black text-amber-700 dark:text-amber-400">{parsed.rating} / 5</p>
                            </div>
                        )}
                    </div>
                    {parsed.best_performer && (
                        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Terbaik di Kelompok:</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">"{parsed.best_performer}"</p>
                        </div>
                    )}
                    {parsed.obstacles && (
                        <div className="p-4 rounded-xl bg-muted border border-border shadow-sm">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Kendala Kelompok:</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{parsed.obstacles}"</p>
                        </div>
                    )}
                </div>
            );
        }

        // Handle Project / Structured Assignment / Assignment
        if (parsed.type === 'structured_assignment' || parsed.type === 'project' || parsed.type === 'assignment') {
            return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                        {parsed.type === 'structured_assignment' ? 'Jawaban LKPD Murid' : parsed.type === 'project' ? 'Deskripsi & Laporan Proyek' : 'Laporan / Teks Jawaban'}
                    </p>
                    <div className="text-sm font-semibold text-foreground whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        {parsed.answer_text || parsed.description || parsed.report_text || '(Tidak ada teks jawaban)'}
                    </div>
                    {(parsed.process_notes || parsed.analysis_notes) && (
                        <>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-4">Catatan Proses / Analisis</p>
                            <div className="text-xs font-semibold text-muted-foreground whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                                {parsed.process_notes || parsed.analysis_notes}
                            </div>
                        </>
                    )}
                </div>
            );
        }

        if (parsed.type === 'portfolio') {
            return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-3">Refleksi Portofolio</p>
                    {(parsed.reflections || []).map((ref: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Refleksi {idx + 1}</p>
                            <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{ref.answer || '-'}</p>
                        </div>
                    ))}
                </div>
            );
        }

        if (parsed.type === 'reflective_journal') {
            return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-3">Refleksi Jurnal Murid</p>
                    {(parsed.answers || []).map((ans: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{ans.question || `Pertanyaan ${idx + 1}`}</p>
                            <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{ans.answer || '-'}</p>
                        </div>
                    ))}
                </div>
            );
        }

        // Generic JSON Fallback
        return (
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-3">
                    Data Jawaban Terstruktur ({parsed.type || 'Form Data'})
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                    {Object.entries(parsed).map(([k, v]) => {
                        if (k === 'type' || k === 'submitted_offline') return null;
                        if (typeof v === 'object' && v !== null) {
                            return (
                                <div key={k} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{k}:</span>
                                    <pre className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto font-mono">{JSON.stringify(v, null, 2)}</pre>
                                </div>
                            );
                        }
                        return (
                            <div key={k} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-xs gap-2">
                                <span className="font-bold text-slate-500 uppercase tracking-wider">{k}:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{String(v || '-')}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderSubmissionContent = () => {
        const infoBanner = (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/50 flex items-start gap-3 text-left shadow-2xs shrink-0">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <Info className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-black text-blue-900 dark:text-blue-300 tracking-wide">
                        MODE PENILAIAN LAYAR TERBELAH (SPLIT-SCREEN & OFFLINE)
                    </p>
                    <p className="text-xs text-blue-800/90 dark:text-blue-300/80 leading-relaxed font-medium">
                        Halaman ini digunakan guru saat tidak memungkinkan bagi siswa untuk <span className="font-bold underline decoration-blue-400">plug-in / terhubung langsung</span> secara daring (misalnya tugas fisik, LKPD cetak, portofolio manual, atau saat siswa terkendala perangkat/sinyal). Anda dapat memfoto karya siswa melalui tombol kamera di bawah dan langsung menilai di panel kanan.
                    </p>
                </div>
            </div>
        );

        const cameraSection = (
            <div className="mt-auto pt-4 shrink-0">
                <label className={`flex items-center justify-center gap-2 w-full p-4 rounded-xl border-2 border-dashed ${isUploadingProof ? 'opacity-50 cursor-not-allowed border-slate-300 bg-slate-100' : 'cursor-pointer border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300'}`}>
                    <Camera className="w-5 h-5" />
                    <span className="font-bold text-sm">
                        {isUploadingProof ? 'Mengunggah...' : 'Kamera Portofolio (Foto Karya Siswa)'}
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
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center my-auto shadow-2xs">
                        <FileText className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-base">Siswa belum mengumpulkan tugas secara daring.</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">Gunakan fitur kamera di bawah untuk memfoto dan melampirkan karya fisik siswa jika siswa mengumpulkan secara langsung/luring di kelas.</p>
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
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl shrink-0 shadow-2xs">
                        <h4 className="font-bold text-amber-800 dark:text-amber-400">Tugas Diserahkan Langsung (Luring)</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">Siswa melapor bahwa tugas fisik telah diserahkan di kelas.</p>
                    </div>
                )}
                
                {textContent && (
                    <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
                        {renderFormattedAnswer(textContent, assignment)}
                    </div>
                )}
                
                {submission.file_path && (
                    <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col relative min-h-[400px] shadow-2xs">
                        {isImage ? (
                            <img src={`/storage/${submission.file_path}`} alt="Submission" className="object-contain w-full h-full" />
                        ) : isPdf ? (
                            <iframe src={`/storage/${submission.file_path}`} className="w-full h-full border-0" title="PDF Viewer" />
                        ) : (
                            <div className="flex items-center justify-center h-full flex-col text-slate-500 p-6 text-center">
                                <FileText className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                                <a href={`/storage/${submission.file_path}`} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center text-sm">
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
        <AppLayout title="Penilaian Layar Terbelah">
            <Head title="Penilaian Tugas" />

            <div className="min-h-[calc(100vh-65px)] md:h-[calc(100vh-65px)] flex flex-col mt-[-24px]">
                {/* Header Bar */}
                <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row justify-between items-center z-10 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href={route('assignments.show', assignment.id)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight truncate max-w-[300px]">{assignment.title}</h1>
                            <p className="text-xs text-slate-500">Mode Penilaian Layar Terbelah</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end">
                        <button
                            onClick={() => setIsKktpModalOpen(true)}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/30 dark:text-purple-400 transition uppercase tracking-widest border border-purple-200/60 dark:border-purple-800/40 shadow-2xs mr-2"
                        >
                            <Target className="h-3.5 w-3.5 text-purple-500" />
                            <span className="hidden sm:inline">Pendekatan KKTP</span>
                        </button>
                        <div className="flex items-center gap-2 mr-2">
                            <Button variant="outline" size="icon" onClick={handlePrev} disabled={currentStudentIndex === 0}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-medium w-32 text-center truncate px-2">
                                {currentStudent?.name || 'Siswa'}
                            </span>
                            <Button variant="outline" size="icon" onClick={handleNext} disabled={currentStudentIndex === students.length - 1}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <Badge variant={submission?.score !== null ? 'default' : 'secondary'} className={submission?.score !== null ? 'bg-emerald-500 hidden sm:inline-flex' : 'hidden sm:inline-flex'}>
                            {submission?.score !== null ? 'Dinilai' : 'Belum Dinilai'}
                        </Badge>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white">
                            <Save className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{isSaving ? 'Menyimpan...' : 'Simpan Nilai'}</span>
                        </Button>
                    </div>
                </div>

                {/* Split Content */}
                <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                    {/* Left Side: Student Work Viewer */}
                    <div className="w-full md:w-7/12 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col shrink-0 min-h-[350px] md:min-h-0 md:h-full">
                        {renderSubmissionContent()}
                    </div>

                    {/* Right Side: Rubric & Grading */}
                    <div className="w-full md:w-5/12 p-4 md:p-6 overflow-y-auto bg-white dark:bg-slate-900 flex flex-col gap-6 shrink-0 min-h-[450px] md:min-h-0 md:h-full">
                        
                        {/* Interactive Rubric Section */}
                        {assignment.scoring_tool === 'rubric' && assignment.instrument_config?.kktp?.criteria ? (
                            <div className="space-y-4">
                                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center">
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-500" />
                                    Rubrik Penilaian (Klik Cepat)
                                </h3>
                                
                                <div className="space-y-3">
                                {assignment.instrument_config.kktp.criteria.map((crit: any, i: number) => (
                                    <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                        <p className="font-semibold text-sm mb-3">{crit.name}</p>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                            {['Perlu Bimbingan', 'Cukup', 'Baik', 'Sangat Baik'].map((lvl) => {
                                                const isSelected = kktpDetails[i] === lvl;
                                                return (
                                                    <button
                                                        key={lvl}
                                                        onClick={() => handleRubricClick(i, 0, lvl)}
                                                        className={`text-sm p-4 py-3 rounded-lg border text-center transition-all ${
                                                            isSelected 
                                                                ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold dark:bg-indigo-900/50 dark:border-indigo-400 dark:text-indigo-200' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
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
                            <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-500 text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                                <p className="font-semibold text-slate-600 dark:text-slate-400">Tidak ada rubrik kualitatif cepat (Klik Cepat) diatur untuk asesmen ini.</p>
                                <button
                                    onClick={() => setIsKktpModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                                >
                                    <Target className="w-3.5 h-3.5" /> Lihat Info & Pendekatan KKTP
                                </button>
                            </div>
                        )}

                        {/* Final Score & Feedback */}
                        <div className="space-y-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/30 mt-auto">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Skor Akhir (0 - {assignment.max_points || 100})
                                </label>
                                <Input 
                                    type="number" 
                                    value={score} 
                                    onChange={(e) => setScore(e.target.value)}
                                    className="text-2xl font-bold w-full max-wxs h-12 text-indigo-700 dark:text-indigo-400"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Umpan Balik (Feedback)
                                </label>
                                <Textarea 
                                    placeholder="Berikan umpan balik konstruktif untuk siswa..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="min-h-[120px] bg-white dark:bg-slate-800"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Custom Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${
                    toastMessage.type === 'success' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-rose-600 text-white'
                }`}>
                    {toastMessage.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-semibold text-sm">{toastMessage.message}</span>
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
