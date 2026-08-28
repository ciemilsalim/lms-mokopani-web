import React, { useState, useEffect, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    ChevronLeft, ChevronRight, CheckCircle2, AlertCircle,
    BookOpen, Users, Target, GraduationCap, Info, FileText, Plus, Trash2,
    Check, Lock, Sparkles, Layers, ListChecks, Calendar, ArrowRight, Save,
    Loader2, RefreshCw, Eye, HelpCircle, Sliders, CheckSquare
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

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

// Helper to sanitize any AI output into 100% clean readable text (removes HTML, Markdown, and entity tags)
const cleanPlainText = (text: string | null | undefined): string => {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '') // remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // remove bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // remove italic
        .replace(/```(?:json|html|markdown)?/gi, '') // remove code markers
        .replace(/```/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

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
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'questions' | 'rubric'>('questions');

    // Initial Form State
    const { data, setData, post, processing, errors } = useForm({
        assessment_type: initialAssignment?.assessment_type ?? 'formative',
        instrument_type: initialAssignment?.instrument_type ?? 'written_test',
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
            indicators: [] as string[],
            focus: '',
            context: '',
            teacher_notes: '',
            submission_mode: 'hybrid',
            instructions: '',
            levels: [
                { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar namun belum konsisten.' },
                { name: 'Baik', desc: 'Siswa menguasai seluruh indikator ketuntasan dengan baik.' },
                { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa dan pemahaman mendalam.' }
            ],
            kktp: {
                approach: 'rubric',
                passing_level: 'Baik',
                threshold: 75,
            }
        },
    });

    // Filtered Subjects & Classes from teachings (Sorted naturally)
    const availableSubjects = useMemo(() => {
        const map = new Map<number, string>();
        teachings.forEach(t => map.set(t.subject_id, t.subject_name));
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    }, [teachings]);

    const availableClasses = useMemo(() => {
        if (!data.subject_id) return [];
        const classMap = new Map<number, string>();
        teachings
            .filter(t => t.subject_id === Number(data.subject_id))
            .forEach(t => classMap.set(t.class_id, t.class_name));
        
        return Array.from(classMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    }, [teachings, data.subject_id]);

    const availableObjectives = useMemo(() => {
        if (!data.subject_id) return [];
        return objectives
            .filter(o => o.subject_id === Number(data.subject_id))
            .sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
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
            setHolidayWarning(`Peringatan: Tenggat waktu bertepatan dengan hari libur (${match.title})`);
        } else {
            setHolidayWarning(null);
        }
    }, [data.due_date, holidays]);

    // Dynamic Context-Aware AI Metadata
    const aiContext = useMemo(() => {
        const inst = data.instrument_type;
        switch (inst) {
            case 'written_test':
            case 'formative_quiz':
            case 'quiz_survey':
                return {
                    name: 'Tes Tertulis / Kuis',
                    desc: 'Buat butir soal pilihan ganda, isian, atau esai beserta kunci jawaban dan rubrik ketuntasan KKTP.',
                    capabilities: ['Pilihan Ganda & Esai', 'Kunci Jawaban Otomatis', 'Rubrik Kriteria KKTP'],
                    ctaLabel: 'Buat Soal & Rubrik dengan AI',
                    manualLabel: 'Tambah Soal Manual',
                    loadingLabel: 'Menyusun Soal & Rubrik...',
                    icon: ListChecks,
                    defaultSubTab: 'questions'
                };
            case 'observation_checklist':
            case 'observation':
                return {
                    name: 'Lembar Observasi',
                    desc: 'Buat indikator observasi terstruktur, skala pengamatan guru, dan panduan rubrik penilaian.',
                    capabilities: ['Indikator Pengamatan', 'Skala Ketercapaian', 'Rubrik KKTP'],
                    ctaLabel: 'Buat Instrumen Observasi & Rubrik',
                    manualLabel: 'Tambah Indikator Manual',
                    loadingLabel: 'Menyusun Indikator & Rubrik...',
                    icon: Eye,
                    defaultSubTab: 'rubric'
                };
            case 'performance':
            case 'project':
            case 'performance_task':
            case 'assignment':
                return {
                    name: 'Tugas Kinerja / LKPD',
                    desc: 'Buat instruksi penugasan praktik, kriteria keberhasilan karya, dan rubrik penilaian kinerja.',
                    capabilities: ['Instruksi Langkah Kerja', 'Kriteria Penilaian Karya', 'Rubrik 4 Level KKTP'],
                    ctaLabel: 'Buat Panduan Tugas & Rubrik',
                    manualLabel: 'Tambah Kriteria Manual',
                    loadingLabel: 'Menyusun Tugas & Rubrik...',
                    icon: FileText,
                    defaultSubTab: 'rubric'
                };
            case 'reflective_journal':
            case 'reflection':
                return {
                    name: 'Jurnal Reflektif',
                    desc: 'Buat pertanyaan pemantik refleksi mendalam dan rubrik evaluasi kesadaran belajar siswa.',
                    capabilities: ['Pertanyaan Refleksi', 'Panduan Jawaban Siswa', 'Rubrik Evaluasi Diri'],
                    ctaLabel: 'Buat Pertanyaan & Rubrik Refleksi',
                    manualLabel: 'Tambah Pertanyaan Manual',
                    loadingLabel: 'Menyusun Pertanyaan & Rubrik...',
                    icon: HelpCircle,
                    defaultSubTab: 'questions'
                };
            case 'self_assessment':
                return {
                    name: 'Penilaian Diri',
                    desc: 'Buat lembar pernyataan checklist penilaian diri dan rubrik refleksi ketuntasan belajar.',
                    capabilities: ['Checklist Kemampuan Diri', 'Bahasa Ramah Siswa', 'Rubrik KKTP'],
                    ctaLabel: 'Buat Lembar Penilaian Diri & Rubrik',
                    manualLabel: 'Tambah Pernyataan Manual',
                    loadingLabel: 'Menyusun Penilaian Diri...',
                    icon: CheckCircle2,
                    defaultSubTab: 'rubric'
                };
            case 'peer_assessment':
                return {
                    name: 'Penilaian Antarteman',
                    desc: 'Buat kriteria pengamatan antarteman, umpan balik positif, dan rubrik kolaborasi kelompok.',
                    capabilities: ['Kriteria Kolaborasi Tim', 'Panduan Umpan Balik', 'Rubrik Antarteman'],
                    ctaLabel: 'Buat Instrumen Antarteman & Rubrik',
                    manualLabel: 'Tambah Kriteria Manual',
                    loadingLabel: 'Menyusun Antarteman & Rubrik...',
                    icon: Users,
                    defaultSubTab: 'rubric'
                };
            case 'exit_ticket':
            case 'cats':
                return {
                    name: 'Exit Ticket / CATs',
                    desc: 'Buat pertanyaan cepat 1–2 menit di akhir sesi dan rubrik identifikasi miskonsepsi.',
                    capabilities: ['Pertanyaan Cepat Ringkas', 'Identifikasi Miskonsepsi', 'Rubrik Respon Cepat'],
                    ctaLabel: 'Buat Exit Ticket & Rubrik',
                    manualLabel: 'Tambah Pertanyaan Manual',
                    loadingLabel: 'Menyusun Exit Ticket...',
                    icon: Sparkles,
                    defaultSubTab: 'questions'
                };
            case 'rubric':
            default:
                return {
                    name: 'Rubrik Kriteria KKTP',
                    desc: 'Buat deskriptor rubrik kualitatif 4 level (Perlu Bimbingan, Cukup, Baik, Sangat Baik) sesuai TP.',
                    capabilities: ['4 Level Kualitatif KKTP', 'Deskriptor Ketercapaian Jelas', 'Panduan Nilai'],
                    ctaLabel: 'Buat Rubrik KKTP dengan AI',
                    manualLabel: 'Tambah Level Kriteria',
                    loadingLabel: 'Menyusun Rubrik KKTP...',
                    icon: Layers,
                    defaultSubTab: 'rubric'
                };
        }
    }, [data.instrument_type]);

    // AI Generation Handler
    const handleAiGenerate = async () => {
        if (!data.learning_objective_id) return;
        setAiLoading(true);
        setAiSuccessMessage(null);

        try {
            const res = await axios.post(route('instructional-design.auto-suggest'), {
                learning_objective_id: Number(data.learning_objective_id),
                assessment_type: data.assessment_type || 'formative',
                instrument_type: data.instrument_type || 'written_test',
                regenerate: true
            });

            if (res.data) {
                const d = res.data;
                
                // 1. Title & Description (Clean Plain Text)
                if (d.title) {
                    setData('title', cleanPlainText(d.title));
                } else if (!data.title) {
                    const activeTp = objectives.find(o => o.id === Number(data.learning_objective_id));
                    const typeName = data.assessment_type === 'initial' ? 'Asesmen Awal' : data.assessment_type === 'summative' ? 'Asesmen Sumatif' : 'LKPD Formatif';
                    setData('title', `${typeName}: ${cleanPlainText(activeTp?.description || 'Pembelajaran')}`);
                }

                if (d.description || d.instructions || d.stimulus) {
                    setData('description', cleanPlainText(d.description || d.instructions || d.stimulus));
                }

                // 2. Process Questions (Clean Plain Text for Question & Options)
                let formattedQuestions = [...(data.instrument_config.questions || [])];
                if (d.questions && Array.isArray(d.questions) && d.questions.length > 0) {
                    formattedQuestions = d.questions.map((q: any, idx: number) => {
                        const isMcq = q.type === 'multiple_choice' || (q.options && q.options.length > 0);
                        return {
                            id: q.id || `q_${Date.now()}_${idx}`,
                            type: isMcq ? 'multiple_choice' : (q.type || 'short_answer'),
                            question: cleanPlainText(q.question || q.text || ''),
                            points: q.points || 10,
                            options: isMcq && q.options ? q.options.map((opt: any, optIdx: number) => ({
                                id: opt.id || `opt_${optIdx}_${Date.now()}`,
                                text: cleanPlainText(opt.text || opt.label || ''),
                                is_correct: Boolean(opt.is_correct || opt.id === q.answer || optIdx === 0)
                            })) : [
                                { id: `opt_1_${Date.now()}`, text: '', is_correct: true },
                                { id: `opt_2_${Date.now()}`, text: '', is_correct: false },
                            ]
                        };
                    });
                }

                // 3. Process Rubric Levels (Clean Plain Text)
                let formattedLevels = data.instrument_config.levels || [
                    { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                    { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar.' },
                    { name: 'Baik', desc: 'Siswa menguasai seluruh indikator dengan baik.' },
                    { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa.' }
                ];
                if (d.levels && Array.isArray(d.levels) && d.levels.length > 0) {
                    formattedLevels = d.levels.map((lvl: any) => ({
                        name: cleanPlainText(lvl.name || 'Level'),
                        desc: cleanPlainText(lvl.desc || lvl.description || '')
                    }));
                }

                // 4. Process Indicators (Clean Plain Text)
                let formattedIndicators = data.instrument_config.indicators || [];
                if (d.indicators && Array.isArray(d.indicators) && d.indicators.length > 0) {
                    formattedIndicators = d.indicators.map((ind: any) => cleanPlainText(typeof ind === 'string' ? ind : ind.text || ''));
                }

                setData('instrument_config', {
                    ...data.instrument_config,
                    questions: formattedQuestions,
                    levels: formattedLevels,
                    indicators: formattedIndicators,
                    criteria: cleanPlainText(d.criteria || ''),
                    stimulus: cleanPlainText(d.stimulus || ''),
                });

                // Auto select appropriate sub-tab
                if (formattedQuestions.length > 0) {
                    setActiveSubTab('questions');
                } else {
                    setActiveSubTab('rubric');
                }

                setAiSuccessMessage(`✨ Soal & Rubrik ${aiContext.name} berhasil dibuat tanpa tag HTML!`);
                setTimeout(() => setAiSuccessMessage(null), 4500);
            }
        } catch (err) {
            console.error('AI Generate Error:', err);
        } finally {
            setAiLoading(false);
        }
    };

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

    // Rubric Level Handler
    const handleRubricDescChange = (lvlIdx: number, desc: string) => {
        const currentLevels = [...(data.instrument_config.levels || [])];
        if (currentLevels[lvlIdx]) {
            currentLevels[lvlIdx].desc = desc;
            setData('instrument_config', {
                ...data.instrument_config,
                levels: currentLevels
            });
        }
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

    const toggleSelectAllClasses = () => {
        if (data.school_classes.length === availableClasses.length) {
            setData('school_classes', []);
        } else {
            setData('school_classes', availableClasses.map(c => c.id));
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
        { id: 2, label: 'Instrumen' },
        { id: 3, label: 'Detail' },
    ];

    return (
        <div className="w-full space-y-3.5 pb-24">
            {/* Header Stepper Navigation (33% Equal Width, Compact 46px Height) */}
            <div className="w-full bg-card rounded-2xl border border-border p-1.5 shadow-xs">
                <div className="grid grid-cols-3 gap-1 w-full">
                    {steps.map((step) => {
                        const isCurrent = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => setCurrentStep(step.id)}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] truncate ${
                                    isCurrent
                                        ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                        : isCompleted
                                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                            : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black shrink-0 ${
                                    isCurrent
                                        ? 'bg-primary-foreground text-primary'
                                        : isCompleted
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted-foreground/20 text-muted-foreground'
                                }`}>
                                    {isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : step.id}
                                </span>
                                <span className="truncate">{step.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Form Content Steps */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
                {/* ── STEP 1: KONTEKS PEMBELAJARAN ── */}
                {currentStep === 1 && (
                    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs fade-in">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-black text-foreground leading-tight">
                                    Konteks Pembelajaran
                                </h2>
                                <p className="text-[11px] text-muted-foreground">Langkah 1 dari 3</p>
                            </div>
                        </div>

                        {/* Subject Selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">
                                Mata Pelajaran <span className="text-destructive">*</span>
                            </label>
                            <select
                                value={data.subject_id}
                                onChange={(e) => {
                                    setData(prev => ({
                                        ...prev,
                                        subject_id: e.target.value,
                                        school_classes: [],
                                        learning_objective_id: '',
                                    }));
                                }}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[46px] cursor-pointer"
                            >
                                <option value="">Pilih mata pelajaran</option>
                                {availableSubjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            {errors.subject_id && <p className="text-xs font-bold text-destructive mt-1">{errors.subject_id}</p>}
                        </div>

                        {/* Target Class Multi-Selector */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground">
                                    Target Kelas <span className="text-destructive">*</span>
                                </label>
                                {availableClasses.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllClasses}
                                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                                    >
                                        {data.school_classes.length === availableClasses.length ? 'Batal Pilih Semua' : 'Pilih Semua Kelas'}
                                    </button>
                                )}
                            </div>

                            {!data.subject_id ? (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/80 text-muted-foreground text-xs">
                                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                                    <span>Pilih mata pelajaran terlebih dahulu untuk memilih kelas</span>
                                </div>
                            ) : availableClasses.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic p-2">Tidak ada kelas yang terhubung dengan mata pelajaran ini.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {availableClasses.map(c => {
                                        const isSelected = data.school_classes.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => toggleClass(c.id)}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 min-h-[40px] cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground shadow-xs font-black'
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
                            <label className="text-xs font-bold text-foreground">
                                Tujuan Pembelajaran (Opsional)
                            </label>
                            <select
                                value={data.learning_objective_id}
                                disabled={!data.subject_id}
                                onChange={(e) => setData('learning_objective_id', e.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[46px] cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Pilih tujuan pembelajaran</option>
                                {availableObjectives.map(o => (
                                    <option key={o.id} value={o.id}>[{o.code}] {o.description}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: TIPE ASESMEN, INSTRUMEN & ASISTEN AI KONTEKSTUAL ── */}
                {currentStep === 2 && (
                    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs fade-in">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <Target className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-black text-foreground leading-tight">
                                    Tipe & Instrumen Penilaian
                                </h2>
                                <p className="text-[11px] text-muted-foreground">Langkah 2 dari 3</p>
                            </div>
                        </div>

                        {/* 1. Assessment Type 3-Button Grid */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">
                                1. Tipe Asesmen <span className="text-destructive">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
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
                                                setData(prev => ({ ...prev, assessment_type: t.id }));
                                            }}
                                            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition min-h-[60px] cursor-pointer ${
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs font-black'
                                                    : 'bg-background hover:bg-muted/40 border-border text-foreground'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 mb-1" />
                                            <span className="text-xs font-bold leading-tight">{t.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Instrument Selection Grid */}
                        <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-bold text-foreground">
                                2. Pilih Instrumen Penilaian <span className="text-destructive">*</span>
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {(instruments[data.assessment_type] || [
                                    { id: 'written_test', name: 'Tes Tertulis / Kuis', desc: 'Soal pilihan ganda atau esai otomatis' },
                                    { id: 'assignment', name: 'Penugasan / LKPD', desc: 'Pengumpulan berkas / foto fisik' },
                                    { id: 'rubric', name: 'Rubrik Kriteria', desc: 'Penilaian dengan level kualitatif' },
                                    { id: 'observation_checklist', name: 'Observasi Kinerja', desc: 'Checklist pengamatan langsung' },
                                ]).map(inst => {
                                    const isSelected = data.instrument_type === inst.id;
                                    return (
                                        <button
                                            key={inst.id}
                                            type="button"
                                            onClick={() => setData('instrument_type', inst.id)}
                                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition min-h-[54px] cursor-pointer ${
                                                isSelected
                                                    ? 'bg-primary/10 border-primary text-foreground shadow-2xs font-bold'
                                                    : 'bg-background hover:bg-muted/40 border-border text-foreground'
                                            }`}
                                        >
                                            <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                <FileText className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate leading-tight">{inst.name}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{inst.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Context-Aware AI Assistant Card */}
                        {data.instrument_type && (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-purple-500/10 border border-primary/25 space-y-2.5 transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                                            <h4 className="text-xs font-bold text-foreground">
                                                ✨ Asisten AI Asesmen ({aiContext.name})
                                            </h4>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {aiContext.desc}
                                        </p>

                                        {/* Dynamic Capabilities Checklist */}
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {aiContext.capabilities.map((cap, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-background/80 border border-border/80 px-2 py-0.5 rounded-md text-foreground"
                                                >
                                                    <Check className="h-2.5 w-2.5 text-primary stroke-[3]" />
                                                    <span>{cap}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Button: Dynamic AI Button */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                            type="button"
                                            disabled={aiLoading || !data.learning_objective_id}
                                            onClick={handleAiGenerate}
                                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-xs hover:bg-primary/90 transition active:scale-95 cursor-pointer disabled:opacity-50"
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    <span>{aiContext.loadingLabel}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    <span>{aiContext.ctaLabel}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {!data.learning_objective_id && (
                                    <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                                        💡 Tips: Pilih Tujuan Pembelajaran (TP) pada Langkah 1 untuk mengaktifkan perumusan otomatis dari AI.
                                    </p>
                                )}

                                {aiSuccessMessage && (
                                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                        <span>{aiSuccessMessage}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. Dual Tab Editor: [ Butir Soal / Pertanyaan ] & [ Rubrik Kriteria & KKTP ] */}
                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60">
                                    <button
                                        type="button"
                                        onClick={() => setActiveSubTab('questions')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                            activeSubTab === 'questions'
                                                ? 'bg-card text-foreground shadow-2xs font-black'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <ListChecks className="h-3.5 w-3.5 text-primary" />
                                        <span>Butir Soal ({data.instrument_config.questions?.length || 0})</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSubTab('rubric')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                            activeSubTab === 'rubric'
                                                ? 'bg-card text-foreground shadow-2xs font-black'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Layers className="h-3.5 w-3.5 text-primary" />
                                        <span>Rubrik Kriteria KKTP</span>
                                    </button>
                                </div>

                                {activeSubTab === 'questions' && (
                                    <button
                                        type="button"
                                        onClick={handleAddQuestion}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground hover:bg-muted text-xs font-bold transition cursor-pointer shrink-0"
                                    >
                                        <Plus className="h-3 w-3 text-primary" />
                                        <span>{aiContext.manualLabel}</span>
                                    </button>
                                )}
                            </div>

                            {/* SUB-TAB A: QUESTIONS / PERTANYAAN */}
                            {activeSubTab === 'questions' && (
                                <div className="space-y-3">
                                    {(!data.instrument_config.questions || data.instrument_config.questions.length === 0) ? (
                                        <div className="text-center py-6 border border-dashed border-border rounded-xl p-4 bg-muted/20 space-y-1.5">
                                            <p className="text-xs font-medium text-muted-foreground">Belum ada butir soal.</p>
                                            <p className="text-[11px] text-primary font-bold">
                                                Gunakan tombol "{aiContext.ctaLabel}" di atas atau tekan "{aiContext.manualLabel}".
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {data.instrument_config.questions.map((q: any, qIdx: number) => (
                                                <div key={q.id || qIdx} className="rounded-xl border border-border bg-background p-3 space-y-2 shadow-2xs">
                                                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
                                                        <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                            Soal #{qIdx + 1}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <select
                                                                value={q.type}
                                                                onChange={(e) => handleQuestionTypeChange(qIdx, e.target.value)}
                                                                className="rounded-lg border border-border bg-card px-2 py-0.5 text-xs font-bold text-foreground outline-none"
                                                            >
                                                                <option value="multiple_choice">Pilihan Ganda</option>
                                                                <option value="short_answer">Isian Singkat</option>
                                                                <option value="essay">Uraian / Esai</option>
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveQuestion(qIdx)}
                                                                className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition"
                                                                title="Hapus Soal"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <textarea
                                                        rows={2}
                                                        placeholder={`Tuliskan teks soal #${qIdx + 1}...`}
                                                        value={q.question}
                                                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                                                        className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                                                    />

                                                    {q.type === 'multiple_choice' && (
                                                        <div className="space-y-1.5 pt-1">
                                                            <p className="text-[10px] font-bold text-muted-foreground">Pilihan Jawaban (Klik radio untuk kunci):</p>
                                                            {(q.options || []).map((opt: any, optIdx: number) => (
                                                                <div key={opt.id || optIdx} className="flex items-center gap-1.5">
                                                                    <input
                                                                        type="radio"
                                                                        name={`correct_${qIdx}`}
                                                                        checked={Boolean(opt.is_correct)}
                                                                        onChange={() => handleOptionCorrectChange(qIdx, optIdx)}
                                                                        className="h-3.5 w-3.5 text-primary focus:ring-primary cursor-pointer"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                                                                        value={opt.text}
                                                                        onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                                                                        className="flex-1 rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground outline-none"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveOption(qIdx, optIdx)}
                                                                        className="p-1 text-muted-foreground hover:text-destructive transition rounded"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddOption(qIdx)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
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

                            {/* SUB-TAB B: RUBRIK KRITERIA & 4 LEVEL KKTP */}
                            {activeSubTab === 'rubric' && (
                                <div className="space-y-3">
                                    <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Sliders className="h-3.5 w-3.5 text-primary" />
                                            <span>Rubrik Deskriptor 4 Tingkat Ketercapaian (KKTP)</span>
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Deskriptor kualitatif yang membantu guru mengevaluasi level pemahaman siswa secara objektif.
                                        </p>
                                    </div>

                                    <div className="grid gap-2.5 sm:grid-cols-2">
                                        {(data.instrument_config.levels || [
                                            { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                                            { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar.' },
                                            { name: 'Baik', desc: 'Siswa menguasai seluruh indikator dengan baik.' },
                                            { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa.' }
                                        ]).map((lvl: any, lIdx: number) => {
                                            const badgeColors = [
                                                'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900',
                                                'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900',
                                                'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900',
                                                'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900'
                                            ];
                                            return (
                                                <div key={lIdx} className="p-3 rounded-xl border border-border bg-background space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${badgeColors[lIdx % 4]}`}>
                                                            {lvl.name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-bold">
                                                            {lIdx === 0 ? 'Belum Tuntas' : lIdx === 1 ? 'Hampir Tuntas' : lIdx === 2 ? 'Tuntas (KKTP)' : 'Pengayaan'}
                                                        </span>
                                                    </div>
                                                    <textarea
                                                        rows={3}
                                                        placeholder={`Tuliskan kriteria deskriptor untuk level ${lvl.name}...`}
                                                        value={lvl.desc || ''}
                                                        onChange={(e) => handleRubricDescChange(lIdx, e.target.value)}
                                                        className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── STEP 3: INFORMASI UTAMA & PENILAIAN ── */}
                {currentStep === 3 && (
                    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs fade-in">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-black text-foreground leading-tight">
                                    Informasi & Tenggat Waktu
                                </h2>
                                <p className="text-[11px] text-muted-foreground">Langkah 3 dari 3</p>
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">
                                Judul Asesmen <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Misal: LKPD Menjelajahi Dapur Komputer"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[46px]"
                            />
                            {errors.title && <p className="text-xs font-bold text-destructive mt-1">{errors.title}</p>}
                        </div>

                        {/* Description / Instructions */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">
                                Petunjuk & Deskripsi Pengerjaan <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                rows={4}
                                placeholder="Tuliskan petunjuk pengerjaan bagi siswa..."
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[90px]"
                            />
                            {errors.description && <p className="text-xs font-bold text-destructive mt-1">{errors.description}</p>}
                        </div>

                        {/* Due Date Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">
                                Tenggat Waktu (Opsional)
                            </label>
                            <input
                                type="datetime-local"
                                value={data.due_date}
                                onChange={(e) => setData('due_date', e.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[46px] cursor-pointer"
                            />
                            {holidayWarning && (
                                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {holidayWarning}
                                </p>
                            )}
                            {errors.due_date && <p className="text-xs font-bold text-destructive mt-1">{errors.due_date}</p>}
                        </div>

                        {/* Points & KKTP Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Poin Maksimal</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={data.max_points}
                                    onChange={(e) => setData('max_points', Number(e.target.value))}
                                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Batas KKTP</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={data.passing_grade}
                                    onChange={(e) => setData('passing_grade', Number(e.target.value))}
                                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary min-h-[44px]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STICKY BOTTOM ACTION BAR (Clean & Protected) ── */}
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg py-2.5 px-3.5 sm:px-6">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                        {currentStep > 1 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition min-h-[42px] cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span>Sebelumnya</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => router.visit(route('assignments.index'))}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition min-h-[42px] cursor-pointer"
                            >
                                <span>Batal</span>
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
                                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-xs hover:bg-primary/90 active:scale-98 transition min-h-[42px] cursor-pointer"
                                >
                                    <span>{currentStep === 1 ? 'Lanjut ke Instrumen' : 'Lanjut ke Detail'}</span>
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center gap-1.5 px-5 sm:px-6 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 active:scale-98 transition min-h-[42px] cursor-pointer disabled:opacity-50"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>{processing ? 'Menyimpan...' : mode === 'create' ? 'Publikasikan Asesmen' : 'Simpan Perubahan'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default AssessmentForm;
