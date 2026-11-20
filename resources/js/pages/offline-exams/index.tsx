import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    Printer,
    FileText,
    Sparkles,
    CheckCircle2,
    Download,
    Layers,
    BookOpen,
    School,
    Clock,
    RefreshCw,
    ListOrdered,
    KeyRound,
    AlertCircle,
    CheckSquare,
    Square,
    Zap,
    Info,
    Search,
    GraduationCap,
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
    grade_level?: string | null;
    grade_label?: string | null;
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
    grade_level?: string | null;
    grade_label?: string | null;
    school_class_ids?: number[];
    is_active_material?: boolean;
    material_title?: string | null;
    material_id?: number | null;
    is_sub_tp?: boolean;
    parent_tp_code?: string | null;
    order?: number;
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
    tp_code?: string;
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
    class_ids: number[];
    class_name: string;
    subject_name: string;
    tp_id: number;
    tp_ids?: number[];
    tp_code: string;
    tp_description: string;
    tp_allocations?: Array<{
        tp_id: number;
        tp_code: string;
        description: string;
        count: number;
        start_number: number;
        end_number: number;
    }>;
    total_tps?: number;
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
    // 1. Multiple Classes Checkbox State (Default to first class or all)
    const [selectedClassIds, setSelectedClassIds] = useState<number[]>(
        classes.length > 0 ? [classes[0].id] : []
    );

    // 2. Selected TPs State (Multi-selection array of TP IDs)
    const [selectedTpIds, setSelectedTpIds] = useState<number[]>([]);
    const [tpSearchQuery, setTpSearchQuery] = useState<string>('');

    // 3. Question Form States
    const [questionType, setQuestionType] = useState<'multiple_choice' | 'essay' | 'mixed'>('multiple_choice');
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [timeLimit, setTimeLimit] = useState<string>(default_time_limit);

    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'soal' | 'kisi_kisi' | 'kunci_jawaban'>('soal');

    // Toggle single class checkbox
    const handleToggleClass = (classId: number) => {
        setSelectedClassIds((prev) => {
            if (prev.includes(classId)) {
                return prev.filter((id) => id !== classId);
            } else {
                return [...prev, classId];
            }
        });
    };

    // Toggle all classes
    const handleToggleAllClasses = () => {
        if (selectedClassIds.length === classes.length) {
            setSelectedClassIds([]);
        } else {
            setSelectedClassIds(classes.map((c) => c.id));
        }
    };

    // Detect Jenjang (Grade Levels) from currently selected classes
    const selectedGradeLevels = useMemo(() => {
        const grades = classes
            .filter((c) => selectedClassIds.includes(c.id))
            .map((c) => c.grade_level)
            .filter(Boolean) as string[];
        return Array.from(new Set(grades));
    }, [classes, selectedClassIds]);

    const selectedGradeLabels = useMemo(() => {
        const labels = classes
            .filter((c) => selectedClassIds.includes(c.id))
            .map((c) => c.grade_label)
            .filter(Boolean) as string[];
        return Array.from(new Set(labels));
    }, [classes, selectedClassIds]);

    // Automatically filter available TPs based on detected class grade level
    const availableTps = useMemo(() => {
        if (selectedClassIds.length === 0) {
            return [];
        }

        return tps.filter((tp) => {
            // If classes have detected grade levels, enforce strict grade matching
            if (selectedGradeLevels.length > 0 && tp.grade_level) {
                return selectedGradeLevels.includes(tp.grade_level);
            }

            // Fallback: If TP has school_class_ids attached directly
            if (tp.school_class_ids && tp.school_class_ids.length > 0) {
                return tp.school_class_ids.some((id) => selectedClassIds.includes(id));
            }

            // If TP has no specific grade constraint, allow
            return true;
        });
    }, [tps, selectedGradeLevels, selectedClassIds]);

    // Prune invalid selected TPs when available TPs change due to grade selection switch
    useEffect(() => {
        if (availableTps.length === 0) {
            setSelectedTpIds([]);
            return;
        }

        const validIds = new Set(availableTps.map((tp) => tp.id));
        setSelectedTpIds((prev) => {
            const filtered = prev.filter((id) => validIds.has(id));
            // Default select first available TP if none selected yet
            if (filtered.length === 0 && availableTps.length > 0) {
                return [availableTps[0].id];
            }
            return filtered;
        });
    }, [availableTps]);

    // Filter available TPs by search query
    const filteredSearchedTps = useMemo(() => {
        if (!tpSearchQuery.trim()) {
            return availableTps;
        }
        const q = tpSearchQuery.toLowerCase();
        return availableTps.filter(
            (tp) =>
                tp.code.toLowerCase().includes(q) ||
                tp.description.toLowerCase().includes(q) ||
                (tp.material_title && tp.material_title.toLowerCase().includes(q)) ||
                (tp.content && tp.content.toLowerCase().includes(q))
        );
    }, [availableTps, tpSearchQuery]);

    // Group searched TPs: Active Material TPs vs General TPs
    const { activeMaterialTps, otherTps } = useMemo(() => {
        const active: TpItem[] = [];
        const other: TpItem[] = [];

        filteredSearchedTps.forEach((tp) => {
            if (tp.is_active_material) {
                active.push(tp);
            } else {
                other.push(tp);
            }
        });

        return { activeMaterialTps: active, otherTps: other };
    }, [filteredSearchedTps]);

    // Toggle TP selection (multi-select)
    const handleToggleTp = (tpId: number) => {
        setSelectedTpIds((prev) => {
            if (prev.includes(tpId)) {
                // Must leave at least one if clicked? No, let user deselect, but form checks min 1
                return prev.filter((id) => id !== tpId);
            } else {
                return [...prev, tpId];
            }
        });
    };

    // Select all visible TPs
    const handleSelectAllVisibleTps = () => {
        const allVisibleIds = filteredSearchedTps.map((tp) => tp.id);
        setSelectedTpIds((prev) => Array.from(new Set([...prev, ...allVisibleIds])));
    };

    // Clear all TP selections
    const handleClearAllTps = () => {
        setSelectedTpIds([]);
    };

    // Real-time calculation summary of question distribution per TP
    const allocationSummary = useMemo(() => {
        const k = selectedTpIds.length;
        if (k === 0) return null;
        const base = Math.floor(questionCount / k);
        const rem = questionCount % k;
        if (rem === 0) {
            return `Masing-masing tepat ${base} butir soal per TP (${base} × ${k} = ${questionCount} butir)`;
        } else {
            return `${rem} TP mendapat ${base + 1} soal & ${k - rem} TP mendapat ${base} soal (Total: ${questionCount} butir dibagi rata)`;
        }
    }, [selectedTpIds.length, questionCount]);

    // Handle Generation (AJAX Preview)
    const handleGenerate = async (forceRegenerate = false) => {
        if (selectedClassIds.length === 0) {
            setErrorMessage('Silakan centang minimal satu kelas target.');
            return;
        }
        if (selectedTpIds.length === 0) {
            setErrorMessage('Silakan pilih minimal satu Tujuan Pembelajaran (TP) atau materi yang diujikan.');
            return;
        }

        setIsGenerating(true);
        setErrorMessage(null);

        try {
            const response = await axios.post('/offline-exams/generate', {
                school_class_ids: selectedClassIds,
                learning_objective_ids: selectedTpIds,
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
        if (selectedClassIds.length === 0) {
            setErrorMessage('Pastikan minimal satu kelas telah dicentang sebelum mengunduh.');
            return;
        }
        if (selectedTpIds.length === 0) {
            setErrorMessage('Pastikan minimal satu Tujuan Pembelajaran (TP) telah dicentang sebelum mengunduh.');
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

        selectedClassIds.forEach((id) => {
            addField('school_class_ids[]', id);
        });

        selectedTpIds.forEach((id) => {
            addField('learning_objective_ids[]', id);
        });

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
            <Head title="Pembuat Soal Asesmen Offline (TP Multi) – LMS Mokopani" />

            <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 px-2 sm:px-4">
                {/* 1. Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-xs">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-bold">
                            <Printer className="h-3.5 w-3.5" />
                            <span>Perangkat Asesmen Kurikulum Merdeka</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2 flex-wrap">
                            <span>Generator Soal Asesmen Offline</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                                Berbasis Multi-TP & Materi Aktif
                            </span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl">
                            Buat instrumen soal ujian cetak secara otomatis sesuai identitas sekolah. Sistem otomatis mendeteksi jenjang kelas, membagi rata butir soal ke seluruh TP yang dipilih, serta melampirkan kisi-kisi dan kunci jawaban berbobot.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => handleDirectDownload('pdf')}
                            disabled={selectedClassIds.length === 0 || selectedTpIds.length === 0 || isGenerating}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer min-h-[40px]"
                        >
                            <Download className="h-4 w-4" />
                            <span>Unduh PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDirectDownload('docx')}
                            disabled={selectedClassIds.length === 0 || selectedTpIds.length === 0 || isGenerating}
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
                                Tentukan kelas target, pilih satu atau lebih TP/materi, dan bentuk soal yang diinginkan.
                            </p>
                        </div>

                        {/* 1. PILIH KELAS TARGET (CHECKBOX MULTI-SELECT) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <School className="h-3.5 w-3.5 text-primary" />
                                    <span>1. Pilih Kelas Target</span>
                                    <span className="text-[11px] font-normal text-muted-foreground">
                                        ({selectedClassIds.length} dipilih)
                                    </span>
                                </label>
                                {classes.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleToggleAllClasses}
                                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                                    >
                                        {selectedClassIds.length === classes.length ? 'Batal Semua' : 'Pilih Semua'}
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {classes.map((cls) => {
                                    const isChecked = selectedClassIds.includes(cls.id);
                                    return (
                                        <button
                                            key={cls.id}
                                            type="button"
                                            onClick={() => handleToggleClass(cls.id)}
                                            className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-1.5 cursor-pointer ${
                                                isChecked
                                                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs ring-1 ring-primary/40'
                                                    : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/40 font-medium'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {isChecked ? (
                                                    <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                                                ) : (
                                                    <Square className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                                                )}
                                                <span className="text-xs truncate">{cls.name}</span>
                                            </div>
                                            {cls.grade_label && (
                                                <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                                    {cls.grade_label}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Detected Jenjang Information Badge */}
                            {selectedGradeLabels.length > 0 && (
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                                    <GraduationCap className="h-3.5 w-3.5" />
                                    <span>
                                        Jenjang Terdeteksi: <strong>{selectedGradeLabels.join(', ')}</strong> (TP disaring otomatis khusus jenjang ini)
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 2. PILIH TP & SUB-TP BERDASARKAN JENJANG (MULTI-SELECT CHECKBOX CARDS) */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                                    <span>2. Pilih Tujuan Pembelajaran (TP) / Sub-TP</span>
                                    <span className="text-[11px] font-normal text-muted-foreground">
                                        ({selectedTpIds.length} TP dipilih)
                                    </span>
                                </label>
                                {availableTps.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllVisibleTps}
                                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                                        >
                                            Pilih Semua
                                        </button>
                                        <span className="text-border">|</span>
                                        <button
                                            type="button"
                                            onClick={handleClearAllTps}
                                            className="text-[11px] font-semibold text-muted-foreground hover:underline cursor-pointer"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Alert if no class selected */}
                            {selectedClassIds.length === 0 ? (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2.5">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>Silakan centang minimal satu kelas target di atas agar sistem dapat menampilkan TP yang sesuai dengan jenjang kelas tersebut.</span>
                                </div>
                            ) : availableTps.length === 0 ? (
                                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground text-xs flex items-center gap-2.5">
                                    <Info className="h-4 w-4 shrink-0" />
                                    <span>Belum ada Tujuan Pembelajaran (TP) yang terdaftar untuk jenjang {selectedGradeLabels.join(', ') || 'kelas terpilih'}.</span>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {/* Search Bar for TPs */}
                                    {availableTps.length > 3 && (
                                        <div className="relative">
                                            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={tpSearchQuery}
                                                onChange={(e) => setTpSearchQuery(e.target.value)}
                                                placeholder="Cari kode TP, materi, atau kata kunci..."
                                                className="w-full h-8.5 rounded-lg border border-border/80 bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                            />
                                        </div>
                                    )}

                                    {/* Real-time Question Division Notice Banner */}
                                    {allocationSummary && (
                                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium flex items-center gap-2">
                                            <Zap className="h-4 w-4 shrink-0 text-primary" />
                                            <span>
                                                <strong>Pembagian Rata Butir Soal:</strong> {allocationSummary}
                                            </span>
                                        </div>
                                    )}

                                    {/* Scrollable TP Cards Container */}
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                        {/* Group A: Active Material TPs */}
                                        {activeMaterialTps.length > 0 && (
                                            <div className="space-y-1.5">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-1">
                                                    <Zap className="h-3 w-3" />
                                                    <span>⭐ TP / Sub-TP dari Materi yang Sedang Aktif</span>
                                                </div>

                                                {activeMaterialTps.map((tp) => {
                                                    const isChecked = selectedTpIds.includes(tp.id);
                                                    return (
                                                        <div
                                                            key={`tp-${tp.id}`}
                                                            onClick={() => handleToggleTp(tp.id)}
                                                            className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                                                                isChecked
                                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                                                                    : 'border-border/80 bg-background hover:bg-muted/30'
                                                            }`}
                                                        >
                                                            <div className="pt-0.5 shrink-0">
                                                                {isChecked ? (
                                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                                ) : (
                                                                    <Square className="h-4 w-4 text-muted-foreground/60" />
                                                                )}
                                                            </div>

                                                            <div className="space-y-1 flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-bold text-xs text-foreground font-mono">
                                                                        {tp.code}
                                                                    </span>
                                                                    {tp.is_sub_tp && (
                                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
                                                                            Sub-TP
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20 flex items-center gap-0.5">
                                                                        <Zap className="h-2.5 w-2.5" />
                                                                        <span>Materi Aktif</span>
                                                                    </span>
                                                                    {tp.grade_label && (
                                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium">
                                                                            {tp.grade_label}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {tp.material_title && (
                                                                    <p className="text-[11px] font-semibold text-primary truncate">
                                                                        {tp.material_title}
                                                                    </p>
                                                                )}

                                                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                                    {tp.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Group B: General TPs */}
                                        {otherTps.length > 0 && (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                                    Daftar Tujuan Pembelajaran Lainnya ({selectedGradeLabels.join(', ') || 'Jenjang'})
                                                </div>

                                                {otherTps.map((tp) => {
                                                    const isChecked = selectedTpIds.includes(tp.id);
                                                    return (
                                                        <div
                                                            key={`tp-${tp.id}`}
                                                            onClick={() => handleToggleTp(tp.id)}
                                                            className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                                                                isChecked
                                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                                                                    : 'border-border/80 bg-background hover:bg-muted/30'
                                                            }`}
                                                        >
                                                            <div className="pt-0.5 shrink-0">
                                                                {isChecked ? (
                                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                                ) : (
                                                                    <Square className="h-4 w-4 text-muted-foreground/60" />
                                                                )}
                                                            </div>

                                                            <div className="space-y-1 flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-bold text-xs text-foreground font-mono">
                                                                        {tp.code}
                                                                    </span>
                                                                    {tp.is_sub_tp && (
                                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
                                                                            Sub-TP
                                                                        </span>
                                                                    )}
                                                                    {tp.subject_name && (
                                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                                                            {tp.subject_name}
                                                                        </span>
                                                                    )}
                                                                    {tp.grade_label && (
                                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium">
                                                                            {tp.grade_label}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                                    {tp.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. PILIH BENTUK / JENIS SOAL (STRICT 100% SESUAI PILIHAN) */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-primary" />
                                    <span>3. Bentuk / Jenis Soal</span>
                                </label>
                                <span className="text-[10px] text-muted-foreground italic">
                                    Hasil soal 100% konsisten
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    {
                                        id: 'multiple_choice',
                                        label: 'Pilihan Ganda',
                                        desc: 'Hanya PG 4 Opsi (A, B, C, D)',
                                    },
                                    {
                                        id: 'essay',
                                        label: 'Esai / Uraian',
                                        desc: 'Hanya Soal Uraian & Rubrik',
                                    },
                                    {
                                        id: 'mixed',
                                        label: 'Campuran',
                                        desc: 'PG & Esai Komplit',
                                    },
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

                            {/* Informational Note for Strict Mode */}
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-[11px] text-muted-foreground">
                                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>
                                    {questionType === 'essay' && `Pilihan Esai: Seluruh ${questionCount} butir soal murni berupa pertanyaan esai/uraian tanpa ada pilihan ganda.`}
                                    {questionType === 'multiple_choice' && `Pilihan PG: Seluruh ${questionCount} butir soal murni berupa pilihan ganda (A, B, C, D).`}
                                    {questionType === 'mixed' && `Pilihan Campuran: Terdiri dari kombinasi Pilihan Ganda dan Esai.`}
                                </span>
                            </div>
                        </div>

                        {/* 4. JUMLAH SOAL & WAKTU */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
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
                                disabled={isGenerating || selectedClassIds.length === 0 || selectedTpIds.length === 0}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span>Menyusun Butir Soal & Kisi-Kisi Multi-TP...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        <span>Generate & Tinjau Soal ({selectedTpIds.length} TP Terpilih)</span>
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
                                            className="px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            <span>PDF</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDirectDownload('docx')}
                                            className="px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
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
                                                <div className="col-span-2 pt-1 border-t border-border/40">
                                                    <span className="text-muted-foreground font-medium">Tujuan Pembelajaran:</span>{' '}
                                                    <span className="font-bold text-foreground">{examData.tp_code}</span>
                                                    {examData.tp_allocations && examData.tp_allocations.length > 1 && (
                                                        <span className="text-[11px] font-normal text-muted-foreground ml-1">
                                                            ({examData.tp_allocations.length} TP diujikan &mdash; butir soal dibagi rata)
                                                        </span>
                                                    )}
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

                                            {/* Multiple Choice Section (HANYA MUNCUL JIKA ADA SOAL PG) */}
                                            {examData.mc_questions.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="font-bold text-xs uppercase bg-muted/40 p-2 rounded-lg border-l-4 border-primary">
                                                        {examData.essay_questions.length > 0 ? 'Bagian I: Pilihan Ganda' : 'Daftar Soal Pilihan Ganda'}
                                                    </div>
                                                    <div className="space-y-4">
                                                        {examData.mc_questions.map((q) => (
                                                            <div key={q.number} className="text-xs space-y-1.5 pl-2">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="font-bold">{q.number}.</span>
                                                                    <div className="font-medium text-foreground">
                                                                        {q.tp_code && (
                                                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono mr-1.5">
                                                                                [{q.tp_code}]
                                                                            </span>
                                                                        )}
                                                                        {q.question}
                                                                    </div>
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

                                            {/* Essay Section (HANYA MUNCUL JIKA ADA SOAL ESAI) */}
                                            {examData.essay_questions.length > 0 && (
                                                <div className="space-y-3 pt-2">
                                                    <div className="font-bold text-xs uppercase bg-muted/40 p-2 rounded-lg border-l-4 border-primary">
                                                        {examData.mc_questions.length > 0 ? 'Bagian II: Esai / Uraian' : 'Daftar Soal Esai / Uraian'}
                                                    </div>
                                                    <div className="space-y-4">
                                                        {examData.essay_questions.map((q) => (
                                                            <div key={q.number} className="text-xs space-y-2 pl-2">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="font-bold">{q.number}.</span>
                                                                    <div className="font-medium text-foreground">
                                                                        {q.tp_code && (
                                                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono mr-1.5">
                                                                                [{q.tp_code}]
                                                                            </span>
                                                                        )}
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
                                                                <td className="p-2 border border-border/80 font-mono text-[11px] font-bold text-primary">{bp.tp_code}</td>
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
                                                    Kunci Jawaban, Pembahasan Rinci & Pedoman Rubrik
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Pedoman penilaian resmi lengkap dengan analisis opsi & rubrik penskoran analitik
                                                </p>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs border border-border/80">
                                                    <thead className="bg-muted/60 text-foreground font-bold">
                                                        <tr>
                                                            <th className="p-2 border border-border/80 text-center w-10">No</th>
                                                            <th className="p-2 border border-border/80 text-center w-24">Bentuk</th>
                                                            <th className="p-2 border border-border/80 w-44">Kunci / Kriteria</th>
                                                            <th className="p-2 border border-border/80">Pembahasan / Rubrik Penskoran</th>
                                                            <th className="p-2 border border-border/80 text-center w-16">Skor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {examData.answer_keys.map((ak) => (
                                                            <tr key={ak.number} className="hover:bg-muted/30 align-top">
                                                                <td className="p-2 border border-border/80 text-center font-bold">{ak.number}</td>
                                                                <td className="p-2 border border-border/80 text-center text-muted-foreground">{ak.question_type}</td>
                                                                <td className="p-2 border border-border/80 font-bold text-primary text-xs whitespace-pre-line leading-relaxed">
                                                                    {ak.answer}
                                                                </td>
                                                                <td className="p-2 border border-border/80 text-foreground text-[11px] leading-relaxed whitespace-pre-line">
                                                                    {ak.explanation}
                                                                </td>
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
                                        Centang kelas target, pilih satu atau lebih TP yang ingin diujikan, jenis soal, lalu klik tombol <strong>Generate & Tinjau Soal</strong> atau langsung klik <strong>Unduh PDF / DOCS</strong>.
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
