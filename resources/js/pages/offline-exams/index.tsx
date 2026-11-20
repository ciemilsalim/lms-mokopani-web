import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    Printer,
    FileText,
    Sparkles,
    CheckCircle2,
    Download,
    Eye,
    Layers,
    BookOpen,
    School,
    Clock,
    RefreshCw,
    HelpCircle,
    FileCheck,
    ListOrdered,
    KeyRound,
    AlertCircle,
} from 'lucide-react';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Pelaksanaan', href: '/assignments' },
    { title: 'Soal Ujian Offline', href: '/offline-exams' },
];

interface SchoolClassItem {
    id: number;
    name: string;
}

interface SubjectItem {
    id: number;
    name: string;
    code: string;
}

interface TpItem {
    id: number;
    code: string;
    description: string;
    competence?: string | null;
    content?: string | null;
    subject_id: number;
    subject_name?: string | null;
    school_class_id?: number | null;
    school_class_name?: string | null;
}

interface Props {
    teacher: {
        id: number;
        name: string;
        nip: string;
    };
    classes: SchoolClassItem[];
    subjects: SubjectItem[];
    tps: TpItem[];
    school_name: string;
    default_time_limit: string;
}

interface QuestionItem {
    number: number;
    type: string;
    question: string;
    options?: Record<string, string> | null;
    answer: string;
    explanation: string;
    indicator?: string;
    cognitive_level?: string;
    score: number;
}

interface BlueprintItem {
    number: number;
    tp_code: string;
    material: string;
    indicator: string;
    question_type: string;
    cognitive_level: string;
}

interface AnswerKeyItem {
    number: number;
    question_type: string;
    answer: string;
    explanation: string;
    max_score: number;
}

interface ExamData {
    school_name: string;
    school_address: string;
    school_phone: string;
    school_email: string;
    school_logo?: string | null;
    headmaster_name: string;
    headmaster_nip: string;
    teacher_name: string;
    teacher_nip: string;
    class_id: number;
    class_name: string;
    subject_name: string;
    tp_id: number;
    tp_code: string;
    tp_description: string;
    period: string;
    time_limit: string;
    title: string;
    instructions: string[];
    questions: QuestionItem[];
    mc_questions: QuestionItem[];
    essay_questions: QuestionItem[];
    blueprint: BlueprintItem[];
    answer_keys: AnswerKeyItem[];
    total_score: number;
    generated_at: string;
}

export default function OfflineExamsIndex({
    teacher,
    classes = [],
    subjects = [],
    tps = [],
    school_name,
    default_time_limit = '90 Menit',
}: Props) {
    const [selectedClassId, setSelectedClassId] = useState<number | ''>(classes[0]?.id ?? '');
    const [selectedTpId, setSelectedTpId] = useState<number | ''>(tps[0]?.id ?? '');
    const [questionType, setQuestionType] = useState<'multiple_choice' | 'essay' | 'mixed'>('multiple_choice');
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [timeLimit, setTimeLimit] = useState<string>(default_time_limit);

    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'soal' | 'kisi_kisi' | 'kunci_jawaban'>('soal');

    // Filter TPs based on selected class or show all
    const availableTps = useMemo(() => {
        if (!selectedClassId) return tps;
        return tps.filter((tp) => !tp.school_class_id || tp.school_class_id === Number(selectedClassId));
    }, [tps, selectedClassId]);

    const activeTp = useMemo(() => {
        return tps.find((tp) => tp.id === Number(selectedTpId));
    }, [tps, selectedTpId]);

    // Handle Generation (AJAX Preview)
    const handleGenerate = async (forceRegenerate = false) => {
        if (!selectedClassId) {
            setErrorMessage('Silakan pilih kelas terlebih dahulu.');
            return;
        }
        if (!selectedTpId) {
            setErrorMessage('Silakan pilih Tujuan Pembelajaran (TP).');
            return;
        }

        setIsGenerating(true);
        setErrorMessage(null);

        try {
            const response = await axios.post('/offline-exams/generate', {
                school_class_id: selectedClassId,
                learning_objective_id: selectedTpId,
                question_type: questionType,
                question_count: questionCount,
                output_format: 'preview',
                time_limit: timeLimit,
                regenerate: forceRegenerate,
            });

            if (response.data?.success && response.data?.exam) {
                setExamData(response.data.exam);
            } else {
                setErrorMessage('Gagal memproses pembuatan soal. Silakan coba lagi.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memproses data.';
            setErrorMessage(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    // Direct Download PDF or DOCX via POST submit
    const handleDirectDownload = (format: 'pdf' | 'docx') => {
        if (!selectedClassId || !selectedTpId) {
            setErrorMessage('Pastikan Kelas dan TP telah dipilih sebelum mengunduh.');
            return;
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/offline-exams/generate';
        form.target = '_blank';

        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = '_token';
        tokenInput.value = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
        form.appendChild(tokenInput);

        const addField = (name: string, value: any) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = String(value);
            form.appendChild(input);
        };

        addField('school_class_id', selectedClassId);
        addField('learning_objective_id', selectedTpId);
        addField('question_type', questionType);
        addField('question_count', questionCount);
        addField('output_format', format);
        addField('time_limit', timeLimit);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pembuat Soal Asesmen Offline (TP) – LMS Mokopani" />

            <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 px-2 sm:px-4">
                {/* 1. Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-xs">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-bold">
                            <Printer className="h-3.5 w-3.5" />
                            <span>Perangkat Asesmen Kurikulum Merdeka</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <span>Generator Soal Asesmen Offline</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                                Berbasis TP
                            </span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl">
                            Buat instrumen soal ujian cetak secara otomatis sesuai identitas sekolah. Dokumen otomatis dilengkapi lembar soal siswa, serta lampiran kisi-kisi dan kunci jawaban pada lembar berikutnya.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleDirectDownload('pdf')}
                            disabled={!selectedClassId || !selectedTpId || isGenerating}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer min-h-[40px]"
                        >
                            <Download className="h-4 w-4" />
                            <span>Unduh PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDirectDownload('docx')}
                            disabled={!selectedClassId || !selectedTpId || isGenerating}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 text-foreground text-xs font-bold shadow-xs hover:bg-muted transition disabled:opacity-50 cursor-pointer min-h-[40px]"
                        >
                            <FileText className="h-4 w-4 text-primary" />
                            <span>Unduh Word (DOCS)</span>
                        </button>
                    </div>
                </div>

                {errorMessage && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* 2. Main Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Generator Form Controls (5 cols) */}
                    <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                        <div className="border-b border-border/50 pb-3">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <span>Parameter Pembuatan Soal</span>
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Tentukan sasaran kelas, TP, jenis soal, dan jumlah butir soal.
                            </p>
                        </div>

                        {/* Pilih Kelas */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <School className="h-3.5 w-3.5 text-primary" />
                                <span>Pilih Kelas Target</span>
                            </label>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                                className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs text-foreground font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
                            >
                                <option value="" disabled>-- Pilih Kelas --</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Pilih TP */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                <span>Pilih Tujuan Pembelajaran (TP)</span>
                            </label>
                            <select
                                value={selectedTpId}
                                onChange={(e) => setSelectedTpId(Number(e.target.value))}
                                className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs text-foreground font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
                            >
                                <option value="" disabled>-- Pilih TP --</option>
                                {availableTps.map((tp) => (
                                    <option key={tp.id} value={tp.id}>
                                        [{tp.code}] {tp.subject_name ? `${tp.subject_name} - ` : ''}{tp.description.substring(0, 75)}...
                                    </option>
                                ))}
                            </select>

                            {activeTp && (
                                <div className="mt-2 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1 text-muted-foreground">
                                    <div className="font-bold text-foreground flex items-center justify-between">
                                        <span>{activeTp.code}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                            {activeTp.subject_name || 'Mata Pelajaran'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-foreground">
                                        "{activeTp.description}"
                                    </p>
                                    {activeTp.content && (
                                        <p className="text-[10px] text-muted-foreground font-mono">
                                            Materi: {activeTp.content}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Pilih Jenis Soal */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5 text-primary" />
                                <span>Bentuk / Jenis Soal</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'multiple_choice', label: 'Pilihan Ganda', desc: '4 Opsi (A, B, C, D)' },
                                    { id: 'essay', label: 'Esai / Uraian', desc: 'Soal Analisis & Jawaban' },
                                    { id: 'mixed', label: 'Campuran', desc: 'PG & Esai Komplit' },
                                ].map((type) => {
                                    const isSelected = questionType === type.id;
                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setQuestionType(type.id as any)}
                                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                                                isSelected
                                                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                                                    : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/40'
                                            }`}
                                        >
                                            <span className="text-xs font-bold text-foreground">{type.label}</span>
                                            <span className="text-[10px] text-muted-foreground mt-1 leading-tight">{type.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Jumlah Soal & Waktu */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <ListOrdered className="h-3.5 w-3.5 text-primary" />
                                    <span>Jumlah Soal</span>
                                </label>
                                <select
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                                    className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs text-foreground font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
                                >
                                    {[5, 10, 15, 20, 25, 30].map((num) => (
                                        <option key={num} value={num}>
                                            {num} Butir Soal
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    <span>Alokasi Waktu</span>
                                </label>
                                <input
                                    type="text"
                                    value={timeLimit}
                                    onChange={(e) => setTimeLimit(e.target.value)}
                                    placeholder="e.g. 90 Menit"
                                    className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs text-foreground font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-border/50 space-y-2">
                            <button
                                type="button"
                                onClick={() => handleGenerate(false)}
                                disabled={isGenerating || !selectedClassId || !selectedTpId}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span>Menyusun Butir Soal & Kisi-Kisi...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        <span>Generate & Tinjau Soal (AI)</span>
                                    </>
                                )}
                            </button>

                            {examData && (
                                <button
                                    type="button"
                                    onClick={() => handleGenerate(true)}
                                    disabled={isGenerating}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border/80 bg-background text-muted-foreground hover:text-foreground text-xs font-semibold transition"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>Regenerasi dengan Varian Baru</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Live Document Preview (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        {examData ? (
                            <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
                                {/* Preview Top Bar */}
                                <div className="p-4 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('soal')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                                activeTab === 'soal'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            <span>Lembar Soal Siswa ({examData.questions.length})</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('kisi_kisi')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                                activeTab === 'kisi_kisi'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <Layers className="h-3.5 w-3.5" />
                                            <span>Lampiran 1: Kisi-Kisi</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('kunci_jawaban')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                                activeTab === 'kunci_jawaban'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <KeyRound className="h-3.5 w-3.5" />
                                            <span>Lampiran 2: Kunci & Rubrik</span>
                                        </button>
                                    </div>

                                    {/* Download shortcuts */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDirectDownload('pdf')}
                                            className="px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-700 text-xs font-bold flex items-center gap-1 transition"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            <span>PDF</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDirectDownload('docx')}
                                            className="px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 text-xs font-bold flex items-center gap-1 transition"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            <span>DOCX</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Document Canvas (A4 Paper Style) */}
                                <div className="p-6 sm:p-8 bg-background max-h-[700px] overflow-y-auto space-y-6 text-foreground font-sans border-t border-border/40 scrollbar-thin">
                                    {activeTab === 'soal' && (
                                        <div className="space-y-5">
                                            {/* Kop Sekolah */}
                                            <div className="text-center border-b-2 border-foreground/80 pb-3 space-y-0.5">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">PEMERINTAH KABUPATEN BUOL</p>
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
                                                <p className="text-base font-black uppercase text-foreground">{examData.school_name}</p>
                                                <p className="text-[10px] text-muted-foreground italic">
                                                    {examData.school_address} | Telp: {examData.school_phone}
                                                </p>
                                            </div>

                                            {/* Exam Title */}
                                            <div className="text-center space-y-0.5">
                                                <h3 className="text-sm font-black underline uppercase">{examData.title}</h3>
                                                <p className="text-[11px] font-bold text-muted-foreground">
                                                    TAHUN AJARAN {examData.period}
                                                </p>
                                            </div>

                                            {/* Identity Grid */}
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs border border-border/80 rounded-xl p-3 bg-muted/20">
                                                <div>
                                                    <span className="text-muted-foreground font-medium">Mata Pelajaran:</span>{' '}
                                                    <span className="font-bold text-foreground">{examData.subject_name}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground font-medium">Hari / Tanggal:</span>{' '}
                                                    <span className="font-mono text-muted-foreground">...................................</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground font-medium">Kelas / Rombel:</span>{' '}
                                                    <span className="font-bold text-foreground">{examData.class_name}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground font-medium">Alokasi Waktu:</span>{' '}
                                                    <span className="font-bold text-foreground">{examData.time_limit}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground font-medium">Nama Siswa:</span>{' '}
                                                    <span className="font-mono text-muted-foreground">...................................</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground font-medium">Nomor Absen:</span>{' '}
                                                    <span className="font-mono text-muted-foreground">...................................</span>
                                                </div>
                                            </div>

                                            {/* Petunjuk Umum */}
                                            {examData.instructions.length > 0 && (
                                                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] space-y-1">
                                                    <span className="font-bold text-foreground">PETUNJUK UMUM:</span>
                                                    <ol className="list-decimal pl-4 space-y-0.5 text-muted-foreground">
                                                        {examData.instructions.map((inst, i) => (
                                                            <li key={i}>{inst}</li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            )}

                                            {/* Multiple Choice Section */}
                                            {examData.mc_questions.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="font-bold text-xs uppercase bg-muted/40 p-2 rounded-lg border-l-4 border-primary">
                                                        Bagian I: Pilihan Ganda
                                                    </div>
                                                    <div className="space-y-4">
                                                        {examData.mc_questions.map((q) => (
                                                            <div key={q.number} className="text-xs space-y-1.5 pl-2">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="font-bold">{q.number}.</span>
                                                                    <div className="font-medium text-foreground">{q.question}</div>
                                                                </div>
                                                                {q.options && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-5">
                                                                        {Object.entries(q.options).map(([letter, text]) => (
                                                                            <div key={letter} className="flex items-start gap-1.5 text-muted-foreground">
                                                                                <span className="font-bold text-foreground">{letter}.</span>
                                                                                <span>{text}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Essay Section */}
                                            {examData.essay_questions.length > 0 && (
                                                <div className="space-y-3 pt-2">
                                                    <div className="font-bold text-xs uppercase bg-muted/40 p-2 rounded-lg border-l-4 border-primary">
                                                        Bagian II: Esai / Uraian
                                                    </div>
                                                    <div className="space-y-4">
                                                        {examData.essay_questions.map((q) => (
                                                            <div key={q.number} className="text-xs space-y-2 pl-2">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="font-bold">{q.number}.</span>
                                                                    <div className="font-medium text-foreground">
                                                                        <span className="font-bold text-primary mr-1.5">[Skor: {q.score}]</span>
                                                                        {q.question}
                                                                    </div>
                                                                </div>
                                                                <div className="pl-5 border-b border-dashed border-border/80 h-10"></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'kisi_kisi' && (
                                        <div className="space-y-4">
                                            <div className="border-b border-border/60 pb-3">
                                                <h4 className="text-sm font-bold uppercase text-foreground">
                                                    Lampiran Dokumen Pendidik (Pegangan Guru)
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Kisi-Kisi Penyusunan Soal Asesmen (Assessment Blueprint)
                                                </p>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs border border-border/80">
                                                    <thead className="bg-muted/60 text-foreground font-bold">
                                                        <tr>
                                                            <th className="p-2 border border-border/80 text-center w-10">No</th>
                                                            <th className="p-2 border border-border/80">Kode TP</th>
                                                            <th className="p-2 border border-border/80">Lingkup Materi</th>
                                                            <th className="p-2 border border-border/80">Indikator Soal</th>
                                                            <th className="p-2 border border-border/80 text-center">Bentuk</th>
                                                            <th className="p-2 border border-border/80 text-center">Level</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {examData.blueprint.map((bp) => (
                                                            <tr key={bp.number} className="hover:bg-muted/30">
                                                                <td className="p-2 border border-border/80 text-center font-bold">{bp.number}</td>
                                                                <td className="p-2 border border-border/80 font-mono text-[11px]">{bp.tp_code}</td>
                                                                <td className="p-2 border border-border/80 text-muted-foreground">{bp.material}</td>
                                                                <td className="p-2 border border-border/80 text-foreground">{bp.indicator}</td>
                                                                <td className="p-2 border border-border/80 text-center">{bp.question_type}</td>
                                                                <td className="p-2 border border-border/80 text-center font-bold text-primary">{bp.cognitive_level}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'kunci_jawaban' && (
                                        <div className="space-y-4">
                                            <div className="border-b border-border/60 pb-3">
                                                <h4 className="text-sm font-bold uppercase text-foreground">
                                                    Kunci Jawaban & Pedoman Penskoran
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Rubrik penilaian resmi untuk guru mata pelajaran
                                                </p>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs border border-border/80">
                                                    <thead className="bg-muted/60 text-foreground font-bold">
                                                        <tr>
                                                            <th className="p-2 border border-border/80 text-center w-10">No</th>
                                                            <th className="p-2 border border-border/80">Bentuk</th>
                                                            <th className="p-2 border border-border/80 text-center w-16">Kunci</th>
                                                            <th className="p-2 border border-border/80">Pembahasan / Rubrik Skor</th>
                                                            <th className="p-2 border border-border/80 text-center w-16">Skor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {examData.answer_keys.map((ak) => (
                                                            <tr key={ak.number} className="hover:bg-muted/30">
                                                                <td className="p-2 border border-border/80 text-center font-bold">{ak.number}</td>
                                                                <td className="p-2 border border-border/80 text-muted-foreground">{ak.question_type}</td>
                                                                <td className="p-2 border border-border/80 text-center font-black text-primary text-sm">{ak.answer}</td>
                                                                <td className="p-2 border border-border/80 text-foreground text-[11px] leading-relaxed">{ak.explanation}</td>
                                                                <td className="p-2 border border-border/80 text-center font-bold">{ak.max_score}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                                                Formula Nilai Akhir: <span className="font-bold font-mono">Nilai = (Total Skor Perolehan / {examData.total_score}) &times; 100</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Placeholder State before generation */
                            <div className="h-full min-h-[420px] rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center p-8 text-center space-y-3">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                                    <Printer className="h-7 w-7" />
                                </div>
                                <div className="space-y-1 max-w-sm">
                                    <h3 className="text-sm font-bold text-foreground">
                                        Naskah Soal Belum Digenerate
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Pilih kelas, TP, jenis soal, dan klik tombol <strong>Generate & Tinjau Soal (AI)</strong> atau langsung klik <strong>Unduh PDF / DOCS</strong>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
