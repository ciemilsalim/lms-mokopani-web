import React, { useState, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Calendar as CalendarIcon,
    BookOpen, Users, Target, GraduationCap, Info, Star, FileText, Plus, Trash2,
    Sparkles, Settings, ListChecks, PenTool, Mic, Presentation, FolderKanban, Briefcase
} from 'lucide-react';
import axios from 'axios';
import PromptSettingsModal from '@/components/PromptSettingsModal';
import { Badge } from '@/components/ui/badge';

interface Objective {
    id: number;
    code: string;
    description: string;
    subject_id: number;
}

interface Instrument {
    id: string;
    name: string;
    icon: string;
    desc: string;
}

export interface AssessmentFormProps {
    mode: 'create' | 'edit';
    initialAssignment?: {
        id: number;
        title: string;
        description: string;
        subject_id: number;
        school_classes: number[];
        learning_objective_id: number | null;
        assessment_type: string;
        instrument_type: string;
        instrument_config: any;
        scoring_tool: string | null;
        scoring_tool_config: any;
        due_date: string;
        max_points: number;
        passing_grade: number | null;
    };
    teachings: { subject_id: number; subject_name: string; class_id: number; class_name: string }[];
    objectives: Objective[];
    assessment_types: { id: string; name: string; desc?: string }[];
    instruments: Record<string, Instrument[]>;
    holidays: { title: string; date?: string; start?: string; end?: string }[];
    scoring_tools: any[];
}

export function AssessmentForm({
    mode,
    initialAssignment,
    teachings = [],
    objectives = [],
    assessment_types = [],
    instruments = {},
    holidays = [],
    scoring_tools = [],
}: AssessmentFormProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [holidayWarning, setHolidayWarning] = useState<string | null>(null);

    // Initial Form State
    const { data, setData, post, processing, errors } = useForm({
        assessment_type: initialAssignment?.assessment_type ?? '',
        instrument_type: initialAssignment?.instrument_type ?? '',
        scoring_tool: initialAssignment?.scoring_tool ?? '',
        scoring_tool_config: initialAssignment?.scoring_tool_config ?? {},
        subject_id: initialAssignment?.subject_id ? String(initialAssignment.subject_id) : '',
        learning_objective_id: initialAssignment?.learning_objective_id ? String(initialAssignment.learning_objective_id) : '',
        school_classes: initialAssignment?.school_classes ?? ([] as number[]),
        title: initialAssignment?.title ?? '',
        description: initialAssignment?.description ?? '',
        due_date: initialAssignment?.due_date ?? '',
        max_points: initialAssignment?.max_points ?? 100,
        passing_grade: initialAssignment?.passing_grade ?? 75,
        instrument_config: initialAssignment?.instrument_config ?? {
            stimulus: '',
            criteria: '',
            questions: [] as any[],
            indicators: [] as any[],
            focus: '',
            context: '',
            teacher_notes: '',
            central_topic: '',
            submission_mode: 'hybrid',
            instructions: '',
            keywords: [] as string[],
            levels: [
                { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar namun belum konsisten.' },
                { name: 'Baik', desc: 'Siswa menguasai seluruh indikator ketuntasan dengan baik.' },
                { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa dan pemahaman mendalam.' }
            ],
            kktp: {
                approach: 'rubric',
                passing_level: 'Baik',
                min_criteria: 2,
                threshold: 75,
                intervals: [
                    { min: 0, max: 40, label: 'Belum Mencapai', desc: 'Perlu remedial seluruhnya' },
                    { min: 41, max: 60, label: 'Hampir Mencapai', desc: 'Perlu remedial di bagian tertentu' },
                    { min: 61, max: 80, label: 'Sudah Mencapai', desc: 'Tuntas' },
                    { min: 81, max: 100, label: 'Sudah Mencapai', desc: 'Perlu pengayaan' }
                ]
            }
        },
    });

    const [aiLoading, setAiLoading] = useState(false);
    const [aiNotification, setAiNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);

    // Filtered Subjects & Classes from teachings
    const availableSubjects = React.useMemo(() => {
        const map = new Map<number, string>();
        teachings.forEach(t => map.set(t.subject_id, t.subject_name));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [teachings]);

    const availableClasses = React.useMemo(() => {
        if (!data.subject_id) return [];
        return teachings
            .filter(t => t.subject_id === Number(data.subject_id))
            .map(t => ({ id: t.class_id, name: t.class_name }));
    }, [teachings, data.subject_id]);

    const availableObjectives = React.useMemo(() => {
        if (!data.subject_id) return [];
        return objectives.filter(o => o.subject_id === Number(data.subject_id));
    }, [objectives, data.subject_id]);

    // Check Holiday Warning
    useEffect(() => {
        if (!data.due_date) {
            setHolidayWarning(null);
            return;
        }
        const selectedDate = data.due_date.split('T')[0];
        const match = holidays.find(h => {
            const hStart = h.start || h.date;
            const hEnd = h.end || hStart;
            return selectedDate >= hStart! && selectedDate <= hEnd!;
        });
        if (match) {
            setHolidayWarning(`Peringatan: Tenggat waktu berada pada hari libur (${match.title})`);
        } else {
            setHolidayWarning(null);
        }
    }, [data.due_date, holidays]);

    // Question Builder Handlers
    const handleAddQuestion = () => {
        const newQuestion = {
            id: `q_${Date.now()}`,
            type: 'multiple_choice',
            question: '',
            points: 10,
            options: [
                { id: `opt_1_${Date.now()}`, text: '', is_correct: true },
                { id: `opt_2_${Date.now()}`, text: '', is_correct: false },
                { id: `opt_3_${Date.now()}`, text: '', is_correct: false },
                { id: `opt_4_${Date.now()}`, text: '', is_correct: false },
            ]
        };
        const currentQuestions = data.instrument_config.questions || [];
        setData('instrument_config', {
            ...data.instrument_config,
            questions: [...currentQuestions, newQuestion]
        });
    };

    const handleRemoveQuestion = (qIndex: number) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        currentQuestions.splice(qIndex, 1);
        setData('instrument_config', {
            ...data.instrument_config,
            questions: currentQuestions
        });
    };

    const handleQuestionTextChange = (qIndex: number, text: string) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        currentQuestions[qIndex].question = text;
        setData('instrument_config', {
            ...data.instrument_config,
            questions: currentQuestions
        });
    };

    const handleQuestionTypeChange = (qIndex: number, type: string) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        currentQuestions[qIndex].type = type;
        if (type === 'multiple_choice' && (!currentQuestions[qIndex].options || currentQuestions[qIndex].options.length === 0)) {
            currentQuestions[qIndex].options = [
                { id: `opt_1_${Date.now()}`, text: '', is_correct: true },
                { id: `opt_2_${Date.now()}`, text: '', is_correct: false },
            ];
        }
        setData('instrument_config', {
            ...data.instrument_config,
            questions: currentQuestions
        });
    };

    const handleOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        currentQuestions[qIndex].options[optIndex].text = text;
        setData('instrument_config', {
            ...data.instrument_config,
            questions: currentQuestions
        });
    };

    const handleOptionCorrectChange = (qIndex: number, optIndex: number) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        currentQuestions[qIndex].options = currentQuestions[qIndex].options.map((opt: any, idx: number) => ({
            ...opt,
            is_correct: idx === optIndex
        }));
        setData('instrument_config', {
            ...data.instrument_config,
            questions: currentQuestions
        });
    };

    const handleAddOption = (qIndex: number) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        const options = currentQuestions[qIndex].options || [];
        options.push({
            id: `opt_${options.length + 1}_${Date.now()}`,
            text: '',
            is_correct: false
        });
        currentQuestions[qIndex].options = options;
        setData('instrument_config', {
            ...data.instrument_config,
            questions: currentQuestions
        });
    };

    const handleRemoveOption = (qIndex: number, optIndex: number) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        currentQuestions[qIndex].options.splice(optIndex, 1);
        setData('instrument_config', {
            ...data.instrument_config,
            questions: currentQuestions
        });
    };

    // Toggle Class Selection
    const toggleClass = (classId: number) => {
        const exists = data.school_classes.includes(classId);
        if (exists) {
            setData('school_classes', data.school_classes.filter(id => id !== classId));
        } else {
            setData('school_classes', [...data.school_classes, classId]);
        }
    };

    // Final Form Submission Handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'create') {
            post(route('assignments.store'));
        } else if (initialAssignment) {
            post(route('assignments.update', initialAssignment.id));
        }
    };

    const steps = [
        { id: 1, label: 'Konteks' },
        { id: 2, label: 'Tipe & Instrumen' },
        { id: 3, label: 'Informasi Utama' },
        { id: 4, label: 'Soal / Instrumen' },
        { id: 5, label: 'Penilaian & Review' },
    ];

    return (
        <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto pb-24">
            {/* Header Stepper Navigation */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-hide">
                    {steps.map((step) => {
                        const isCurrent = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => setCurrentStep(step.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 min-h-[40px] ${
                                    isCurrent
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : isCompleted
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                                    isCurrent ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : step.id}
                                </span>
                                <span className="whitespace-nowrap">{step.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Form Content Steps */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── STEP 1: KONTEKS ── */}
                {currentStep === 1 && (
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-xs fade-in">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <BookOpen className="h-4 w-4" />
                            </div>
                            <h2 className="text-base font-bold text-foreground">Langkah 1: Konteks Pembelajaran</h2>
                        </div>

                        {/* Subject Selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Mata Pelajaran <span className="text-destructive">*</span></label>
                            <select
                                value={data.subject_id}
                                onChange={(e) => setData('subject_id', e.target.value)}
                                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[48px]"
                            >
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {availableSubjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            {errors.subject_id && <p className="text-xs font-bold text-destructive mt-1">{errors.subject_id}</p>}
                        </div>

                        {/* Class Multi-Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground">Target Kelas <span className="text-destructive">*</span></label>
                            {availableClasses.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">Pilih mata pelajaran terlebih dahulu.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {availableClasses.map(c => {
                                        const isSelected = data.school_classes.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => toggleClass(c.id)}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 min-h-[44px] ${
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                                        : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {c.name} {isSelected && '✓'}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.school_classes && <p className="text-xs font-bold text-destructive mt-1">{errors.school_classes}</p>}
                        </div>

                        {/* Objective / TP Selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Tujuan Pembelajaran (TP)</label>
                            <select
                                value={data.learning_objective_id}
                                onChange={(e) => setData('learning_objective_id', e.target.value)}
                                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[48px]"
                            >
                                <option value="">-- Pilih Tujuan Pembelajaran (Opsional) --</option>
                                {availableObjectives.map(o => (
                                    <option key={o.id} value={o.id}>[{o.code}] {o.description}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: TIPE & INSTRUMEN ── */}
                {currentStep === 2 && (
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-xs fade-in">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Target className="h-4 w-4" />
                            </div>
                            <h2 className="text-base font-bold text-foreground">Langkah 2: Tipe Asesmen & Instrumen</h2>
                        </div>

                        {/* Assessment Type Segmented Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground">Tipe Asesmen <span className="text-destructive">*</span></label>
                            <div className="grid grid-cols-3 gap-2.5">
                                {[
                                    { id: 'initial', name: 'Asesmen Awal', icon: Info },
                                    { id: 'formative', name: 'Formatif', icon: Target },
                                    { id: 'summative', name: 'Sumatif', icon: GraduationCap },
                                ].map(t => {
                                    const isSelected = data.assessment_type === t.id;
                                    const Icon = t.icon;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => {
                                                setData(prev => ({ ...prev, assessment_type: t.id, instrument_type: '' }));
                                            }}
                                            className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border text-center transition min-h-[70px] ${
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                    : 'bg-background hover:bg-muted/40 border-border text-foreground'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 mb-1" />
                                            <span className="text-xs font-bold">{t.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Instrument Selection Grid */}
                        {data.assessment_type && (
                            <div className="space-y-2 pt-2">
                                <label className="text-xs font-bold text-foreground">Pilih Instrumen Penilaian</label>
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                    {(instruments[data.assessment_type] || []).map(inst => {
                                        const isSelected = data.instrument_type === inst.id;
                                        return (
                                            <button
                                                key={inst.id}
                                                type="button"
                                                onClick={() => setData('instrument_type', inst.id)}
                                                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition min-h-[60px] ${
                                                    isSelected
                                                        ? 'bg-primary/10 border-primary shadow-xs'
                                                        : 'bg-background hover:bg-muted/40 border-border'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">{inst.name}</p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{inst.desc}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP 3: INFORMASI UTAMA ── */}
                {currentStep === 3 && (
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-xs fade-in">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <FileText className="h-4 w-4" />
                            </div>
                            <h2 className="text-base font-bold text-foreground">Langkah 3: Informasi Utama Asesmen</h2>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Judul Asesmen <span className="text-destructive">*</span></label>
                            <input
                                type="text"
                                placeholder="Misal: Ulangan Harian Bab 2 Logika Algoritma"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[48px]"
                            />
                            {errors.title && <p className="text-xs font-bold text-destructive mt-1">{errors.title}</p>}
                        </div>

                        {/* Description / Instructions */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Petunjuk & Deskripsi Pengerjaan <span className="text-destructive">*</span></label>
                            <textarea
                                rows={5}
                                placeholder="Tuliskan petunjuk pengerjaan bagi siswa..."
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[120px]"
                            />
                            {errors.description && <p className="text-xs font-bold text-destructive mt-1">{errors.description}</p>}
                        </div>
                    </div>
                )}

                {/* ── STEP 4: SOAL / QUESTION BUILDER ── */}
                {currentStep === 4 && (
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-xs fade-in">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <ListChecks className="h-4 w-4" />
                                </div>
                                <h2 className="text-base font-bold text-foreground">Langkah 4: Penyusun Soal & Instrumen</h2>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddQuestion}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition min-h-[40px]"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Tambah Soal</span>
                            </button>
                        </div>

                        {/* Question List */}
                        {(!data.instrument_config.questions || data.instrument_config.questions.length === 0) ? (
                            <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl p-6">
                                <p className="text-xs font-bold text-muted-foreground">Belum ada soal ditambahkan.</p>
                                <button
                                    type="button"
                                    onClick={handleAddQuestion}
                                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition min-h-[44px]"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Tambah Soal Pertama</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {data.instrument_config.questions.map((q: any, qIdx: number) => (
                                    <div key={q.id || qIdx} className="rounded-2xl border border-border bg-background p-4 space-y-3.5 shadow-2xs">
                                        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                                            <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                                Soal #{qIdx + 1}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={q.type}
                                                    onChange={(e) => handleQuestionTypeChange(qIdx, e.target.value)}
                                                    className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold text-foreground outline-none"
                                                >
                                                    <option value="multiple_choice">Pilihan Ganda</option>
                                                    <option value="short_answer">Isian Singkat</option>
                                                    <option value="essay">Esai / Uraian</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveQuestion(qIdx)}
                                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                                                    title="Hapus Soal"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Question Textarea */}
                                        <textarea
                                            rows={3}
                                            placeholder={`Tuliskan isi pertanyaan soal #${qIdx + 1}...`}
                                            value={q.question}
                                            onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                                            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                        />

                                        {/* Multiple Choice Options Builder */}
                                        {q.type === 'multiple_choice' && (
                                            <div className="space-y-2 pt-1">
                                                <p className="text-[11px] font-bold text-muted-foreground">Opsi Jawaban (Tandai yang Benar):</p>
                                                {(q.options || []).map((opt: any, optIdx: number) => (
                                                    <div key={opt.id || optIdx} className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name={`correct_${qIdx}`}
                                                            checked={Boolean(opt.is_correct)}
                                                            onChange={() => handleOptionCorrectChange(qIdx, optIdx)}
                                                            className="h-4 w-4 text-primary focus:ring-primary cursor-pointer"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                                                            value={opt.text}
                                                            onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                                                            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary min-h-[40px]"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveOption(qIdx, optIdx)}
                                                            className="p-1.5 text-muted-foreground hover:text-destructive transition rounded-lg"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddOption(qIdx)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-1"
                                                >
                                                    <Plus className="h-3 w-3" /> Tambah Opsi
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP 5: PENILAIAN & TINJAUAN ── */}
                {currentStep === 5 && (
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-xs fade-in">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <GraduationCap className="h-4 w-4" />
                            </div>
                            <h2 className="text-base font-bold text-foreground">Langkah 5: Penilaian & Tenggat Waktu</h2>
                        </div>

                        {/* Due Date Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Tenggat Waktu <span className="text-destructive">*</span></label>
                            <input
                                type="datetime-local"
                                value={data.due_date}
                                onChange={(e) => setData('due_date', e.target.value)}
                                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[48px]"
                            />
                            {holidayWarning && (
                                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {holidayWarning}
                                </p>
                            )}
                            {errors.due_date && <p className="text-xs font-bold text-destructive mt-1">{errors.due_date}</p>}
                        </div>

                        {/* Points Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Poin Maksimal</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={data.max_points}
                                    onChange={(e) => setData('max_points', Number(e.target.value))}
                                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary min-h-[48px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Batas KKTP</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={data.passing_grade}
                                    onChange={(e) => setData('passing_grade', Number(e.target.value))}
                                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary min-h-[48px]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Sticky Bottom Stepper Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/80 p-3 sm:p-4 shadow-lg">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                        <button
                            type="button"
                            disabled={currentStep === 1}
                            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition min-h-[48px] disabled:opacity-40 cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Sebelumnya</span>
                        </button>

                        {currentStep < 5 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition min-h-[48px] cursor-pointer"
                            >
                                <span>Berikutnya</span>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition min-h-[48px] active:scale-95 cursor-pointer"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{processing ? 'Menyimpan...' : mode === 'create' ? 'Publikasikan Asesmen' : 'Simpan Perubahan'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
