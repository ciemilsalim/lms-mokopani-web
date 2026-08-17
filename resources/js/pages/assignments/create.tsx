import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    AlertCircle, 
    Target, 
    GraduationCap, 
    Info,
    Star,
    BookOpen,
    Users,
    ClipboardCheck,
    Eye,
    FileText,
    UserCheck,
    ListChecks,
    Ticket,
    GitBranch,
    Activity,
    PenTool,
    Mic,
    Presentation,
    FolderKanban,
    Briefcase,
    Zap,
    CheckCircle2,
    Trash2,
    Plus,
    Sparkles,
    Settings,
    AlignLeft,
    Layers,
    X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import PromptSettingsModal from '@/components/PromptSettingsModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Tugas', href: '/assignments' },
    { title: 'Buat Tugas', href: '/assignments/create' },
];

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

interface CreateAssignmentProps {
    teachings: any[];
    objectives: Objective[];
    assessment_types: { id: string; name: string }[];
    instruments: Record<string, Instrument[]>;
    holidays: { date: string; title: string; end: string }[];
    scoring_tools: any[];
}

const iconMap: Record<string, any> = {
    'clipboard-check': ClipboardCheck,
    'eye': Eye,
    'file-text': FileText,
    'book-open': BookOpen,
    'user-check': UserCheck,
    'users': Users,
    'list-checks': ListChecks,
    'ticket': Ticket,
    'git-branch': GitBranch,
    'activity': Activity,
    'pen-tool': PenTool,
    'mic': Mic,
    'presentation': Presentation,
    'folder-kanban': FolderKanban,
    'briefcase': Briefcase,
};

const assessmentColors: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
    initial:   { bg: 'bg-primary/10 text-primary border border-primary/20', border: 'border-primary', text: 'text-primary', activeBg: 'bg-primary' },
    formative: { bg: 'bg-warning/10 text-warning border border-warning/20',   border: 'border-warning',  text: 'text-warning',   activeBg: 'bg-warning' },
    summative: { bg: 'bg-success/10 text-success border border-success/20',       border: 'border-success',    text: 'text-success',       activeBg: 'bg-success' },
};

export default function CreateAssignment({ teachings, objectives, assessment_types, instruments, holidays, scoring_tools }: CreateAssignmentProps) {
    const [holidayWarning, setHolidayWarning] = useState<string | null>(null);
    
    const { data, setData, post, processing, errors } = useForm({
        assessment_type: '',
        instrument_type: '',
        scoring_tool: '',
        scoring_tool_config: {} as any,
        subject_id: '',
        learning_objective_id: '',
        school_classes: [] as number[],
        title: '',
        description: '',
        due_date: '',
        max_points: 100,
        passing_grade: 100,
        instrument_config: {
            stimulus: '',
            criteria: '',
            questions: [] as any[],
            indicators: [] as any[],
            focus: '',
            context: '',
            teacher_notes: '',
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
        } as any,
    });

    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiNotification, setAiNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);
    const [clickCount, setClickCount] = useState(0);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [modulAjarFound, setModulAjarFound] = useState<boolean | null>(null);

    useEffect(() => {
        if (aiNotification) {
            const timer = setTimeout(() => {
                setAiNotification(null);
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [aiNotification]);

    const handleSuggestAI = async () => {
        if (!data.learning_objective_id) return;
        setAiLoading(true);
        setAiError(null);

        try {
            const response = await axios.post(route('instructional-design.auto-suggest'), {
                learning_objective_id: data.learning_objective_id,
                suggest_type: 'assessment',
                assessment_type: data.assessment_type || 'summative',
                instrument_type: data.instrument_type,
                subject_id: data.subject_id,
                regenerate: clickCount > 0
            });

            if (response.data) {
                setClickCount(prev => prev + 1);
                const suggestion = response.data;
                
                if (suggestion.modul_ajar_found !== undefined) {
                    setModulAjarFound(!!suggestion.modul_ajar_found);
                }

                if (suggestion.ai_active === false) {
                    setAiNotification({
                        message: 'Koneksi AI tidak aktif atau kuota API telah habis. Sistem otomatis beralih menggunakan instrumen offline berkualitas tinggi.',
                        type: 'warning'
                    });
                } else if (suggestion.modul_ajar_found) {
                    setAiNotification({
                        message: 'AI SIPADA berhasil membaca dokumen Modul Ajar dan menyelaraskan instrumen asesmen!',
                        type: 'info'
                    });
                } else {
                    setAiNotification({
                        message: 'AI berhasil merancang instrumen penilaian kontekstual secara cerdas!',
                        type: 'info'
                    });
                }

                setData(prev => {
                    const newConfig = { ...prev.instrument_config };

                    if (suggestion.stimulus !== undefined) newConfig.stimulus = suggestion.stimulus;
                    if (suggestion.criteria !== undefined) newConfig.criteria = suggestion.criteria;
                    let suggestedQuestions = suggestion.questions || suggestion.pertanyaan;
                    if (suggestedQuestions !== undefined && Array.isArray(suggestedQuestions)) {
                        const totalQuestions = suggestedQuestions.length;
                        const basePoints = totalQuestions > 0 ? Math.floor(100 / totalQuestions) : 0;
                        const remainder = totalQuestions > 0 ? 100 % totalQuestions : 0;

                        newConfig.questions = suggestedQuestions.map((q: any, idx: number) => ({
                            ...q,
                            text: q.text || q.question || q.pertanyaan || q.description || '',
                            answer: q.answer || q.correct_answer || q.jawaban || q.kunci_jawaban || q.pembahasan || q.pedoman_penskoran || q.rubrik || '',
                            points: idx < remainder ? basePoints + 1 : basePoints,
                            options: Array.isArray(q.options || q.pilihan) ? (q.options || q.pilihan).map((o: any) => ({
                                ...o,
                                text: o.text || o.option || o.label || o.teks || ''
                            })) : undefined
                        }));
                    }
                    if (suggestion.indicators !== undefined) newConfig.indicators = suggestion.indicators;
                    if (suggestion.focus !== undefined) newConfig.focus = suggestion.focus;
                    if (suggestion.context !== undefined) newConfig.context = suggestion.context;
                    if (suggestion.teacher_notes !== undefined) newConfig.teacher_notes = suggestion.teacher_notes;
                    if (suggestion.levels !== undefined) newConfig.levels = suggestion.levels;
                    if (suggestion.central_topic !== undefined) newConfig.central_topic = suggestion.central_topic;
                    if (suggestion.submission_mode !== undefined) newConfig.submission_mode = suggestion.submission_mode;
                    if (suggestion.instructions !== undefined) newConfig.instructions = suggestion.instructions;
                    if (suggestion.keywords !== undefined) newConfig.keywords = suggestion.keywords;
                    if (suggestion.kktp !== undefined) {
                        newConfig.kktp = {
                            ...newConfig.kktp,
                            ...suggestion.kktp
                        };
                    }

                    // Pre-fill title & description safely without [object Object]
                    let suggestedTitle = '';
                    if (typeof suggestion.title === 'string' && suggestion.title.trim()) {
                        suggestedTitle = suggestion.title;
                    } else if (typeof suggestion.judul === 'string' && suggestion.judul.trim()) {
                        suggestedTitle = suggestion.judul;
                    } else if (typeof suggestion.central_topic === 'string' && suggestion.central_topic.trim()) {
                        suggestedTitle = `Peta Konsep: ${suggestion.central_topic}`;
                    } else {
                        const selObj = objectives.find(o => o.id === Number(prev.learning_objective_id));
                        if (selObj) {
                            suggestedTitle = `Asesmen ${selObj.code ? `[${selObj.code}]` : ''} ${selObj.description}`;
                        } else {
                            suggestedTitle = 'Asesmen Pembelajaran';
                        }
                    }

                    let suggestedDesc = '';
                    if (typeof suggestion.description === 'string' && suggestion.description.trim()) {
                        suggestedDesc = suggestion.description;
                    } else if (typeof suggestion.stimulus === 'string' && suggestion.stimulus.trim()) {
                        suggestedDesc = suggestion.stimulus;
                    } else if (typeof suggestion.instructions === 'string' && suggestion.instructions.trim()) {
                        suggestedDesc = suggestion.instructions;
                    } else if (typeof suggestion.deskripsi === 'string' && suggestion.deskripsi.trim()) {
                        suggestedDesc = suggestion.deskripsi;
                    }

                    return {
                        ...prev,
                        title: suggestedTitle,
                        description: suggestedDesc || prev.description,
                        instrument_config: newConfig
                    };
                });
            }
        } catch (error) {
            console.error('Error suggesting AI assessment:', error);
            setAiError('Gagal merancang asesmen dengan AI. Silakan coba lagi.');
        } finally {
            setAiLoading(false);
        }
    };

    const updateConfig = (field: string, value: any) => {
        setData('instrument_config', {
            ...data.instrument_config,
            [field]: value
        });
    };

    const updateKKTP = (field: string, value: any) => {
        setData('instrument_config', {
            ...data.instrument_config,
            kktp: {
                ...data.instrument_config?.kktp,
                [field]: value
            }
        });
    };

    const addQuestion = () => {
        const questions = data.instrument_config?.questions || [];
        const newQs = [...questions, {
            id: Date.now(),
            type: 'multiple_choice',
            text: '',
            points: 1,
            options: [
                { id: 'a', text: '' },
                { id: 'b', text: '' },
                { id: 'c', text: '' },
                { id: 'd', text: '' }
            ]
        }];
        updateConfig('questions', newQs);
    };

    const removeQuestion = (qIdx: number) => {
        const questions = data.instrument_config?.questions || [];
        const newQs = questions.filter((_: any, idx: number) => idx !== qIdx);
        updateConfig('questions', newQs);
    };

    const updateQuestionField = (qIdx: number, field: string, value: any) => {
        const questions = data.instrument_config?.questions || [];
        const newQs = [...questions];
        newQs[qIdx] = { ...newQs[qIdx], [field]: value };
        updateConfig('questions', newQs);
    };

    const updateOptionText = (qIdx: number, optIdx: number, value: string) => {
        const questions = data.instrument_config?.questions || [];
        const newQs = [...questions];
        const newOpts = [...(newQs[qIdx].options || [])];
        newOpts[optIdx] = { ...newOpts[optIdx], text: value };
        newQs[qIdx] = { ...newQs[qIdx], options: newOpts };
        updateConfig('questions', newQs);
    };

    const addIndicator = () => {
        const indicators = data.instrument_config?.indicators || [];
        const newInds = [...indicators, { name: '' }];
        updateConfig('indicators', newInds);
    };

    const removeIndicator = (indIdx: number) => {
        const indicators = data.instrument_config?.indicators || [];
        const newInds = indicators.filter((_: any, idx: number) => idx !== indIdx);
        updateConfig('indicators', newInds);
    };

    const updateIndicatorText = (indIdx: number, value: string) => {
        const indicators = data.instrument_config?.indicators || [];
        const newInds = [...indicators];
        newInds[indIdx] = { ...newInds[indIdx], name: value };
        updateConfig('indicators', newInds);
    };

    const checkHoliday = (date: string) => {
        const selected = new Date(date);
        const holiday = holidays.find(h => {
            const start = new Date(h.date);
            const end = new Date(h.end);
            return selected >= start && selected <= end;
        });
        setHolidayWarning(holiday ? `Peringatan: Tanggal ini bertepatan dengan hari libur/kegiatan: ${holiday.title}` : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('assignments.store'));
    };

    const currentInstruments = data.assessment_type ? (instruments[data.assessment_type] || []) : [];
    const colors = assessmentColors[data.assessment_type] || assessmentColors.summative;

return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Tugas Baru – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6 min-w-0 fade-in">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <button 
                                onClick={() => window.history.back()}
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition mb-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Kembali
                            </button>
                            <h1 className="text-xl font-bold text-foreground">Buat Penugasan Baru</h1>
                        </div>
                    </div>

                    <div className="space-y-8 animate-in fade-in duration-300">
                    {/* ═══════════════ STEP 1: Assessment Type ═══════════════ */}
                    <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">1</span>
                        <h2 className="text-sm font-semibold text-foreground">Pilih Jenis Asesmen</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {assessment_types.map((type) => {
                            const c = assessmentColors[type.id];
                            const isActive = data.assessment_type === type.id;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => {
                                        setData('assessment_type', type.id as any);
                                        setData('instrument_type', '');
                                    }}
                                    className={`relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                                        isActive 
                                        ? `${c.border} ${c.bg} shadow-sm` 
                                        : 'border-border bg-card hover:border-primary/50'
                                    }`}
                                >
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-all ${isActive ? `${c.activeBg} text-white` : 'bg-muted text-muted-foreground'}`}>
                                        {type.id === 'initial' && <Info className="h-6 w-6" />}
                                        {type.id === 'formative' && <Target className="h-6 w-6" />}
                                        {type.id === 'summative' && <GraduationCap className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <p className={`font-semibold text-sm ${isActive ? c.text : 'text-foreground'}`}>{type.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {type.id === 'initial' && 'Mengecek kesiapan belajar'}
                                            {type.id === 'formative' && 'Memantau progres (non-rapor)'}
                                            {type.id === 'summative' && 'Nilai akhir untuk rapor'}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <CheckCircle2 className={`absolute top-3 right-3 h-4 w-4 ${c.text}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                        {errors.assessment_type && <p className="text-xs text-red-500">{errors.assessment_type}</p>}
                    </div>

                    {/* ═══════════════ STEP 2: Instrument Type ═══════════════ */}
                    {data.assessment_type && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">2</span>
                                    <h2 className="text-sm font-semibold text-foreground">Pilih Instrumen Penilaian</h2>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {currentInstruments.map((inst) => {
                                        const Icon = iconMap[inst.icon] || FileText;
                                        const isActive = data.instrument_type === inst.id;
                                        return (
                                            <button
                                                key={inst.id}
                                                type="button"
                                                onClick={() => {
                                                    setData(prev => {
                                                        const newData = { ...prev, instrument_type: inst.id };
                                                        
                                                        // Auto-set KKTP Approach
                                                        let approach = prev.instrument_config?.kktp?.approach || 'rubric';
                                                        const criteriaIds = ['observation_checklist', 'performance_observation', 'exit_ticket', 'self_assessment', 'peer_assessment', 'guided_discussion', 'anecdotal_notes'];
                                                        const rubricIds = ['performance', 'concept_map', 'reflective_journal', 'project', 'portfolio'];
                                                        const intervalIds = ['structured_assignment', 'assignment', 'formative_quiz', 'written_test', 'oral_test', 'quiz_survey'];

                                                        if (criteriaIds.includes(inst.id)) approach = 'criteria_description';
                                                        else if (rubricIds.includes(inst.id)) approach = 'rubric';
                                                        else if (intervalIds.includes(inst.id)) approach = 'score_interval';

                                                        newData.instrument_config = {
                                                            ...newData.instrument_config,
                                                            kktp: {
                                                                ...newData.instrument_config?.kktp,
                                                                approach: approach
                                                            }
                                                        };
                                                        
                                                        return newData;
                                                    });
                                                }}
                                                className={`group flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                                                    isActive 
                                                    ? `${colors.border} ${colors.bg} shadow-sm` 
                                                    : 'border-border bg-card hover:border-primary/50'
                                                }`}
                                            >
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${isActive ? `${colors.activeBg} text-white` : 'bg-muted text-muted-foreground'}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-semibold ${isActive ? colors.text : 'text-muted-foreground'}`}>{inst.name}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{inst.desc}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.instrument_type && <p className="text-xs text-destructive mt-2">{errors.instrument_type}</p>}
                            </div>


                        </div>
                    )}

                    {/* ═══════════════ STEP 2.5: Instrument Configuration ═══════════════ */}
                    {data.instrument_type && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">2.5</span>
                                <h2 className="text-sm font-semibold text-foreground">Konfigurasi Instrumen</h2>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-6 space-y-6">

                                {/* Asisten AI Rancang Cerdas Asesmen */}
                                {!data.learning_objective_id || !data.subject_id ? (
                                    <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-5 space-y-4 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Sparkles className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">Asisten Rancang Cerdas AI</h3>
                                                <p className="text-xs text-muted-foreground">Rancang instrumen penilaian, soal pilihan ganda, essay, rubrik KKTP secara otomatis sesuai materi pelajaran.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid gap-4 md:grid-cols-2 p-1">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mata Pelajaran</label>
                                                <select 
                                                    value={data.subject_id}
                                                    onChange={(e) => {
                                                        setData(prev => ({
                                                            ...prev,
                                                            subject_id: e.target.value,
                                                            learning_objective_id: '',
                                                            school_classes: []
                                                        }));
                                                    }}
                                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 dark:bg-popover transition"
                                                >
                                                    <option value="">Pilih Mapel</option>
                                                    {Array.from(new Set(teachings.map(t => t.subject_id))).map(id => {
                                                        const t = teachings.find(x => x.subject_id === id);
                                                        return <option key={id} value={id}>{t?.subject_name}</option>;
                                                    })}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tujuan Pembelajaran (TP)</label>
                                                <select 
                                                    value={data.learning_objective_id}
                                                    onChange={(e) => setData('learning_objective_id', e.target.value)}
                                                    disabled={!data.subject_id}
                                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 dark:bg-popover transition disabled:opacity-50"
                                                >
                                                    <option value="">Pilih TP</option>
                                                    {objectives
                                                        .filter(obj => obj.subject_id === parseInt(data.subject_id))
                                                        .map(obj => (
                                                            <option key={obj.id} value={obj.id}>{obj.code ? `[${obj.code}] ` : ''}{obj.description}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">Setelah memilih Mapel dan TP, tombol rancang AI akan otomatis aktif di atas.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 p-5 space-y-4 mb-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
                                                    Asisten Rancang Cerdas AI
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    AI akan merancang stimulus, {
                                                        (data.instrument_type === 'quiz_survey' || data.instrument_type === 'written_test' || data.instrument_type === 'formative_quiz') 
                                                        ? 'soal pilihan ganda & essay, dan kunci jawaban' 
                                                        : 'kriteria, indikator penilaian, tingkat capaian'
                                                    } sesuai TP: <span className="font-semibold text-primary">[{objectives.find(o => o.id === parseInt(data.learning_objective_id))?.code || 'TP'}]</span> secara kontekstual.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPromptModalOpen(true)}
                                                    title="Pengaturan Prompt AI"
                                                    className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                                >
                                                    <Settings className="h-4.5 w-4.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSuggestAI}
                                                    disabled={aiLoading}
                                                    className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 cursor-pointer"
                                                >
                                                    <Sparkles className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
                                                    {aiLoading ? 'Sedang Merancang...' : clickCount > 0 ? 'Regenerasi Asesmen AI' : 'Rancang Asesmen dengan AI'}
                                                </button>
                                            </div>
                                        </div>

                                        {aiNotification && (
                                            <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${aiNotification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600' : aiNotification.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                                <p className="leading-relaxed font-medium">{aiNotification.message}</p>
                                            </div>
                                        )}

                                        {aiError && (
                                            <div className="p-3 rounded-lg border bg-red-500/10 border-red-500/20 text-red-600 flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
                                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <p className="leading-relaxed font-medium">{aiError}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 1. KUIS & TES TERTULIS (QuizBuilder Layout) */}
                                {(data.instrument_type === 'quiz_survey' || data.instrument_type === 'written_test' || data.instrument_type === 'formative_quiz') && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">Daftar Pertanyaan</h3>
                                                <p className="text-xs text-muted-foreground">Tentukan pertanyaan untuk mengecek pemahaman siswa</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addQuestion}
                                                className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition cursor-pointer"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Tambah Pertanyaan
                                            </button>
                                        </div>

                                        <div className="grid gap-3">
                                            {(data.instrument_config?.questions || []).map((q: any, qIdx: number) => (
                                                <div
                                                    key={qIdx}
                                                    className="group relative flex flex-col gap-3 p-4 bg-card text-card-foreground rounded-xl border border-border hover:border-primary/30 transition-all"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(qIdx)}
                                                        className="absolute top-3 right-3 text-muted-foreground/40 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>

                                                    <div className="flex items-start gap-3">
                                                        <div className="h-6 w-6 rounded bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-mono shrink-0">
                                                            Q{qIdx + 1}
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                                                            <div className="flex gap-2 items-center">
                                                                <select
                                                                    value={q.type || 'multiple_choice'}
                                                                    onChange={(e) => {
                                                                        const type = e.target.value;
                                                                        const opts = type === 'multiple_choice' ? [
                                                                            { id: 'a', text: '' },
                                                                            { id: 'b', text: '' },
                                                                            { id: 'c', text: '' },
                                                                            { id: 'd', text: '' }
                                                                        ] : [];
                                                                        updateQuestionField(qIdx, 'type', type);
                                                                        updateQuestionField(qIdx, 'options', opts);
                                                                        updateQuestionField(qIdx, 'answer', '');
                                                                        updateQuestionField(qIdx, 'correct_answer', '');
                                                                    }}
                                                                    className="h-8 rounded-lg border border-border bg-popover text-foreground px-3 text-[11px] font-semibold outline-none focus:border-primary transition"
                                                                >
                                                                    <option value="multiple_choice">Pilihan Ganda</option>
                                                                    <option value="short_answer">Isian Singkat</option>
                                                                    <option value="essay">Uraian / Esai</option>
                                                                </select>

                                                                <div className="flex items-center gap-1.5 ml-auto">
                                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bobot</label>
                                                                    <input
                                                                        type="number"
                                                                        value={q.points !== undefined ? q.points : 1}
                                                                        onChange={(e) => updateQuestionField(qIdx, 'points', parseInt(e.target.value) || 0)}
                                                                        min="0"
                                                                        className="w-14 h-8 text-center rounded-lg border border-border bg-popover text-foreground px-2 text-[11px] font-semibold outline-none focus:border-primary transition"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <textarea
                                                                value={q.text || ''}
                                                                onChange={(e) => updateQuestionField(qIdx, 'text', e.target.value)}
                                                                placeholder="Tuliskan pertanyaan..."
                                                                rows={2}
                                                                className="w-full rounded-lg border border-border bg-popover text-foreground px-3 py-2 text-[12px] outline-none focus:border-primary transition resize-none leading-relaxed"
                                                            />

                                                            {(q.type === 'multiple_choice' || !q.type) && (
                                                                <div className="space-y-2 mt-2 pl-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                                            Pilihan Jawaban (Klik huruf untuk set Kunci)
                                                                        </span>
                                                                    </div>
                                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                                        {(q.options || []).map((opt: any, optIdx: number) => {
                                                                            const isCorrect = q.answer === opt.id || opt.is_correct === true;
                                                                            return (
                                                                                <div key={optIdx} className="flex items-center gap-2 relative group/opt">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newQs = [...(data.instrument_config?.questions || [])];
                                                                                            const newOpts = (newQs[qIdx].options || []).map((o: any) => ({
                                                                                                ...o,
                                                                                                is_correct: o.id === opt.id
                                                                                            }));
                                                                                            newQs[qIdx] = { ...newQs[qIdx], answer: opt.id, options: newOpts };
                                                                                            setData('instrument_config', {
                                                                                                ...data.instrument_config,
                                                                                                questions: newQs
                                                                                            });
                                                                                        }}
                                                                                        title="Jadikan sebagai kunci jawaban"
                                                                                        className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 cursor-pointer ${
                                                                                            isCorrect
                                                                                                ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20'
                                                                                                : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                                                                        }`}
                                                                                    >
                                                                                        {opt.id}
                                                                                    </button>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={opt.text || ''}
                                                                                        onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                                                                        placeholder={`Opsi ${opt.id.toUpperCase()}`}
                                                                                        className={`w-full h-8 rounded border bg-popover text-foreground px-3 text-[11px] outline-none transition ${
                                                                                            isCorrect
                                                                                                ? 'border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                                                                                                : 'border-border focus:border-primary'
                                                                                        }`}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {q.type === 'short_answer' && (
                                                                <div className="space-y-1.5 mt-2 pl-1">
                                                                    <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">
                                                                        Kunci Jawaban Singkat
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={q.answer || q.correct_answer || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            const newQs = [...(data.instrument_config?.questions || [])];
                                                                            newQs[qIdx] = { ...newQs[qIdx], answer: val, correct_answer: val };
                                                                            setData('instrument_config', {
                                                                                ...data.instrument_config,
                                                                                questions: newQs
                                                                            });
                                                                        }}
                                                                        placeholder="Tuliskan kunci jawaban yang benar di sini..."
                                                                        className="w-full h-8 rounded border border-border bg-popover text-foreground px-3 text-[11px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition"
                                                                    />
                                                                </div>
                                                            )}

                                                            {q.type === 'essay' && (
                                                                <div className="space-y-1.5 mt-2 pl-1">
                                                                    <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">
                                                                        Pedoman Penskoran / Kunci Uraian
                                                                    </label>
                                                                    <textarea
                                                                        value={q.answer || q.correct_answer || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            const newQs = [...(data.instrument_config?.questions || [])];
                                                                            newQs[qIdx] = { ...newQs[qIdx], answer: val, correct_answer: val };
                                                                            setData('instrument_config', {
                                                                                ...data.instrument_config,
                                                                                questions: newQs
                                                                            });
                                                                        }}
                                                                        placeholder="Tuliskan petunjuk jawaban atau pedoman penilaian di sini..."
                                                                        rows={3}
                                                                        className="w-full rounded border border-border bg-popover text-foreground px-3 py-2 text-[11px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition leading-relaxed"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(data.instrument_config?.questions || []).length === 0 && (
                                                <div className="text-center py-8 border-2 border-dashed border-border rounded-xl bg-muted/10">
                                                    <p className="text-xs text-muted-foreground font-medium">Belum ada pertanyaan. Silakan tambahkan pertanyaan baru.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 2. LEMBAR OBSERVASI & KINERJA (ObservationBuilder Layout) */}
                                {(data.instrument_type === 'observation_checklist' || 
                                  data.instrument_type === 'performance_observation' ||
                                  data.instrument_type === 'performance' || 
                                  data.instrument_type === 'self_assessment' || 
                                  data.instrument_type === 'peer_assessment' ||
                                  data.instrument_type === 'guided_discussion') && (
                                    <div className="space-y-4">
                                        {data.instrument_config?.stimulus !== undefined && (
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Konteks Observasi</label>
                                                <textarea
                                                    value={data.instrument_config.stimulus || ''}
                                                    onChange={e => updateConfig('stimulus', e.target.value)}
                                                    rows={3}
                                                    placeholder="Tuliskan stimulus atau konteks unjuk kerja..."
                                                    className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">Indikator Observasi</h3>
                                                <p className="text-xs text-muted-foreground">Tentukan perilaku atau kemampuan yang akan diamati</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addIndicator}
                                                className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition cursor-pointer"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Tambah Indikator
                                            </button>
                                        </div>

                                        <div className="grid gap-2">
                                            {(data.instrument_config?.indicators || []).map((ind: any, indIdx: number) => (
                                                <div
                                                    key={indIdx}
                                                    className="flex items-center gap-3 p-3 bg-card text-card-foreground rounded border border-border border-l-2 border-l-primary group relative focus-within:border-primary/50 transition-all"
                                                >
                                                    <div className="h-6 w-6 rounded bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-mono shrink-0">
                                                        {indIdx + 1}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={ind.name || ind.text || ''}
                                                        onChange={(e) => updateIndicatorText(indIdx, e.target.value)}
                                                        placeholder="Contoh: Murid mampu menjelaskan langkah analisis..."
                                                        className="flex-1 bg-transparent text-[12px] text-foreground outline-none border-none p-0 focus:ring-0"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeIndicator(indIdx)}
                                                        className="text-muted-foreground/40 hover:text-[#EB5757] transition-colors p-1 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(data.instrument_config?.indicators || []).length === 0 && (
                                                <div className="text-center py-8 border-2 border-dashed border-border rounded-xl bg-muted/10">
                                                    <p className="text-xs text-muted-foreground font-medium">Belum ada indikator. Silakan tambahkan indikator baru.</p>
                                                </div>
                                            )}
                                        </div>

                                        {data.instrument_config?.teacher_notes !== undefined && (
                                            <div className="space-y-1.5 pt-2">
                                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Tindak Lanjut Guru</label>
                                                <textarea
                                                    value={data.instrument_config.teacher_notes || ''}
                                                    onChange={e => updateConfig('teacher_notes', e.target.value)}
                                                    rows={2}
                                                    placeholder="Tahapan evaluasi..."
                                                    className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. EXIT TICKET & JURNAL REFLEKTIF */}
                                {(data.instrument_type === 'exit_ticket' || data.instrument_type === 'reflective_journal') && (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Instruksi Murid</label>
                                            <textarea
                                                value={data.instrument_config?.stimulus || ''}
                                                onChange={e => updateConfig('stimulus', e.target.value)}
                                                rows={3}
                                                placeholder="Tuliskan instruksi penulisan jurnal refleksi murid..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Pertanyaan Refleksi</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const qs = [...(data.instrument_config?.questions || [])];
                                                        qs.push({ text: '' });
                                                        updateConfig('questions', qs);
                                                    }}
                                                    className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded transition cursor-pointer"
                                                >
                                                    + Tambah Pertanyaan
                                                </button>
                                            </div>
                                            <div className="grid gap-2">
                                                {(data.instrument_config?.questions || []).map((q: any, qIdx: number) => (
                                                    <div key={qIdx} className="flex gap-2 items-center p-2 bg-card rounded border border-border group">
                                                        <span className="text-[10px] font-mono text-muted-foreground">{qIdx + 1}.</span>
                                                        <input
                                                            value={q.text || ''}
                                                            onChange={e => {
                                                                const qs = [...(data.instrument_config?.questions || [])];
                                                                qs[qIdx] = { ...qs[qIdx], text: e.target.value };
                                                                updateConfig('questions', qs);
                                                            }}
                                                            placeholder="Pertanyaan refleksi..."
                                                            className="flex-1 bg-transparent text-[12px] border-none outline-none focus:ring-0 p-0"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const qs = (data.instrument_config?.questions || []).filter((_: any, idx: number) => idx !== qIdx);
                                                                updateConfig('questions', qs);
                                                            }}
                                                            className="text-muted-foreground/30 hover:text-red-500 transition-opacity cursor-pointer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3b. PENUGASAN TERSTRUKTUR (LKPD) */}
                                {data.instrument_type === 'structured_assignment' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Deskripsi / Instruksi LKPD</label>
                                            <textarea
                                                value={data.instrument_config?.stimulus || ''}
                                                onChange={e => updateConfig('stimulus', e.target.value)}
                                                rows={4}
                                                placeholder="Tuliskan deskripsi tugas LKPD, petunjuk pengerjaan, dan ketentuan..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Evaluasi / Rubrik Guru</label>
                                            <textarea
                                                value={data.instrument_config?.teacher_notes || ''}
                                                onChange={e => updateConfig('teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Langkah evaluasi dan pembobotan..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 4. CATATAN ANEKDOTAL */}
                                {data.instrument_type === 'anecdotal_notes' && (
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground">Fokus Pengamatan</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Interaksi sosial, Kemampuan motorik..."
                                                value={data.instrument_config?.focus || ''}
                                                onChange={(e) => updateConfig('focus', e.target.value)}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground">Konteks Kegiatan</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Bermain peran, Diskusi kelompok..."
                                                value={data.instrument_config?.context || ''}
                                                onChange={(e) => updateConfig('context', e.target.value)}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 5. PETA KONSEP */}
                                {data.instrument_type === 'concept_map' && (
                                    <div className="space-y-6">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Topik Utama Peta Konsep</label>
                                                <input
                                                    type="text"
                                                    placeholder="Contoh: Perangkat Komputer, Siklus Air, Sistem Pencernaan..."
                                                    value={data.instrument_config?.central_topic || ''}
                                                    onChange={(e) => updateConfig('central_topic', e.target.value)}
                                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metode Pengumpulan Tugas</label>
                                                <select
                                                    value={data.instrument_config?.submission_mode || 'hybrid'}
                                                    onChange={(e) => updateConfig('submission_mode', e.target.value)}
                                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition text-foreground"
                                                >
                                                    <option value="hybrid">Hibrida (Siswa Bebas Memilih Kanvas Digital / Unggah Foto)</option>
                                                    <option value="canvas">Hanya Kanvas Digital Interaktif</option>
                                                    <option value="upload">Hanya Unggah Foto/File Peta Konsep</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instruksi / Petunjuk Peta Konsep</label>
                                            <textarea
                                                placeholder="Contoh: Susunlah kata kunci di bawah ini menjadi peta konsep yang logis, hubungkan dengan garis relasi, dan berikan kata sambung yang tepat..."
                                                value={data.instrument_config?.instructions || ''}
                                                onChange={(e) => updateConfig('instructions', e.target.value)}
                                                rows={3}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition resize-none leading-relaxed text-foreground"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daftar Kata Kunci Acak (Keywords)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    id="new-keyword-input"
                                                    placeholder="Ketik kata kunci lalu tekan Enter..."
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const val = e.currentTarget.value.trim();
                                                            if (val) {
                                                                const kws = [...(data.instrument_config?.keywords || [])];
                                                                if (!kws.includes(val)) {
                                                                    updateConfig('keywords', [...kws, val]);
                                                                }
                                                                e.currentTarget.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition text-foreground"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const el = document.getElementById('new-keyword-input') as HTMLInputElement;
                                                        const val = el?.value.trim();
                                                        if (val) {
                                                            const kws = [...(data.instrument_config?.keywords || [])];
                                                            if (!kws.includes(val)) {
                                                                updateConfig('keywords', [...kws, val]);
                                                            }
                                                            el.value = '';
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                                                >
                                                    Tambah
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {(data.instrument_config?.keywords || []).map((keyword: string, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 rounded-full text-xs font-semibold animate-in scale-in duration-100"
                                                    >
                                                        {keyword}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const kws = (data.instrument_config?.keywords || []).filter((_: any, i: number) => i !== idx);
                                                                updateConfig('keywords', kws);
                                                            }}
                                                            className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 shrink-0"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                                {(data.instrument_config?.keywords || []).length === 0 && (
                                                    <p className="text-xs text-muted-foreground italic">Belum ada kata kunci. Tambahkan kata kunci di atas untuk memudahkan murid menyusun peta konsep.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 6. KKTP SECTION (KKTPSection Layout) */}
                                {data.instrument_config?.kktp && (
                                    <div className="pt-6 mt-6 border-t border-border space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/25`}>
                                                    <ListChecks className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h5 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground">Pendekatan KKTP</h5>
                                                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.05em]">Kriteria Ketercapaian</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex bg-card text-card-foreground p-1 rounded-md border border-border overflow-x-auto no-scrollbar shrink-0">
                                                {[
                                                    { id: 'criteria_description', name: 'Deskripsi', icon: AlignLeft },
                                                    { id: 'rubric', name: 'Rubrik', icon: Layers },
                                                    { id: 'score_interval', name: 'Interval', icon: Activity },
                                                    { id: 'percentage', name: 'Persentase', icon: Zap }
                                                ].map(app => (
                                                    <button
                                                        key={app.id}
                                                        type="button"
                                                        onClick={() => updateKKTP('approach', app.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                                            data.instrument_config?.kktp?.approach === app.id 
                                                            ? `bg-primary text-white shadow-sm` 
                                                            : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                                                        }`}
                                                    >
                                                        <app.icon className="h-3 w-3" />
                                                        {app.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                            {data.instrument_config?.kktp?.approach === 'criteria_description' && (
                                                <div className="space-y-4">
                                                    <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                        <Info className={`h-4 w-4 text-primary shrink-0 mt-0.5`} />
                                                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                            <span className="font-semibold text-foreground">Deskripsi Kriteria:</span> Ketuntasan didasarkan pada jumlah indikator yang tercapai.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 bg-card text-card-foreground p-4 rounded-md border border-border">
                                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Minimal Indikator:</label>
                                                        <div className="flex items-center gap-3">
                                                            <input 
                                                                type="number"
                                                                min={1}
                                                                max={(data.instrument_config?.indicators?.length || data.instrument_config?.questions?.length || 1)}
                                                                value={data.instrument_config?.kktp?.min_criteria || 2}
                                                                onChange={e => updateKKTP('min_criteria', parseInt(e.target.value))}
                                                                className="h-8 w-14 bg-popover border border-border rounded-md text-center font-mono text-[13px] text-foreground outline-none focus:border-primary"
                                                            />
                                                            <span className="text-[11px] text-muted-foreground font-mono">/ {(data.instrument_config?.indicators?.length || data.instrument_config?.questions?.length || 0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {data.instrument_config?.kktp?.approach === 'rubric' && (
                                                <div className="space-y-4">
                                                    <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                        <Info className={`h-4 w-4 text-primary shrink-0 mt-0.5`} />
                                                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                            <span className="font-semibold text-foreground">Pendekatan Rubrik:</span> Tentukan level minimum pencapaian untuk dianggap tuntas.
                                                        </p>
                                                    </div>
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        {data.instrument_config?.levels?.map((lvl: any, lvlIdx: number) => (
                                                            <div 
                                                                key={lvlIdx} 
                                                                onClick={() => updateKKTP('passing_level', lvl.name)}
                                                                className={`p-4 rounded-md border transition-all cursor-pointer relative group ${
                                                                    data.instrument_config?.kktp?.passing_level === lvl.name 
                                                                    ? `bg-popover border-primary shadow-sm` 
                                                                    : 'bg-card text-card-foreground border-border hover:bg-muted/10'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <input 
                                                                        value={lvl.name}
                                                                        onChange={e => {
                                                                            const lvls = [...(data.instrument_config?.levels || [])];
                                                                            lvls[lvlIdx] = { ...lvls[lvlIdx], name: e.target.value };
                                                                            updateConfig('levels', lvls);
                                                                        }}
                                                                        className={`w-full text-[11px] font-semibold uppercase tracking-wider bg-transparent border-none focus:ring-0 outline-none ${data.instrument_config?.kktp?.passing_level === lvl.name ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                                                                    />
                                                                    {data.instrument_config?.kktp?.passing_level === lvl.name && <CheckCircle2 className={`h-4 w-4 text-primary`} />}
                                                                </div>
                                                                <textarea 
                                                                    value={lvl.desc}
                                                                    onChange={e => {
                                                                        const lvls = [...(data.instrument_config?.levels || [])];
                                                                        lvls[lvlIdx] = { ...lvls[lvlIdx], desc: e.target.value };
                                                                        updateConfig('levels', lvls);
                                                                    }}
                                                                    rows={3}
                                                                    className="w-full bg-transparent text-[12px] text-muted-foreground leading-relaxed border-none focus:ring-0 outline-none resize-none p-0"
                                                                    placeholder="Deskripsi..."
                                                                />
                                                                {data.instrument_config?.kktp?.passing_level === lvl.name && (
                                                                    <div className={`absolute bottom-1.5 right-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-primary`}>✓ Batas Tuntas</div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {data.instrument_config?.kktp?.approach === 'score_interval' && (
                                                <div className="space-y-4">
                                                    <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                        <Activity className={`h-4 w-4 text-primary shrink-0 mt-0.5`} />
                                                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                            <span className="font-semibold text-foreground">Interval Nilai:</span> Tetapkan rentang skor (0-100) untuk tindak lanjut.
                                                        </p>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        {(data.instrument_config?.kktp?.intervals || [
                                                            { min: 0, max: 40, label: 'Belum Mencapai', desc: 'Remedial seluruhnya' },
                                                            { min: 41, max: 60, label: 'Hampir Mencapai', desc: 'Remedial bagian tertentu' },
                                                            { min: 61, max: 80, label: 'Sudah Mencapai', desc: 'Tuntas' },
                                                            { min: 81, max: 100, label: 'Sudah Mencapai', desc: 'Pengayaan' }
                                                        ]).map((iv: any, ivIdx: number) => (
                                                            <div key={ivIdx} className="flex items-center gap-4 p-3 bg-card text-card-foreground rounded-md border border-border group">
                                                                <div className="flex items-center gap-2">
                                                                    <input 
                                                                        type="number"
                                                                        value={iv.min}
                                                                        onChange={e => {
                                                                            const ivs = [...(data.instrument_config?.kktp?.intervals || [])];
                                                                            ivs[ivIdx] = { ...ivs[ivIdx], min: parseInt(e.target.value) };
                                                                            updateKKTP('intervals', ivs);
                                                                        }}
                                                                        className="h-7 w-12 bg-popover border border-border rounded text-center text-[11px] font-mono text-foreground outline-none focus:border-primary"
                                                                    />
                                                                    <span className="text-muted-foreground">-</span>
                                                                    <input 
                                                                        type="number"
                                                                        value={iv.max}
                                                                        onChange={e => {
                                                                            const ivs = [...(data.instrument_config?.kktp?.intervals || [])];
                                                                            ivs[ivIdx] = { ...ivs[ivIdx], max: parseInt(e.target.value) };
                                                                            updateKKTP('intervals', ivs);
                                                                        }}
                                                                        className="h-7 w-12 bg-popover border border-border rounded text-center text-[11px] font-mono text-foreground outline-none focus:border-primary"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 flex flex-col">
                                                                    <input 
                                                                        value={iv.label}
                                                                        onChange={e => {
                                                                            const ivs = [...(data.instrument_config?.kktp?.intervals || [])];
                                                                            ivs[ivIdx] = { ...ivs[ivIdx], label: e.target.value };
                                                                            updateKKTP('intervals', ivs);
                                                                        }}
                                                                        className="bg-transparent text-[12px] font-semibold text-foreground border-none focus:ring-0 p-0"
                                                                    />
                                                                    <input 
                                                                        value={iv.desc}
                                                                        onChange={e => {
                                                                            const ivs = [...(data.instrument_config?.kktp?.intervals || [])];
                                                                            ivs[ivIdx] = { ...ivs[ivIdx], desc: e.target.value };
                                                                            updateKKTP('intervals', ivs);
                                                                        }}
                                                                        className="bg-transparent text-[11px] text-muted-foreground border-none focus:ring-0 p-0"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {data.instrument_config?.kktp?.approach === 'percentage' && (
                                                <div className="space-y-4">
                                                    <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                        <Zap className={`h-4 w-4 text-primary shrink-0 mt-0.5`} />
                                                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                            <span className="font-semibold text-foreground">Persentase:</span> Rasio kriteria yang dicapai terhadap total.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 bg-card text-card-foreground p-4 rounded-md border border-border">
                                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Ambang Batas:</label>
                                                        <div className="flex items-center gap-3">
                                                            <input 
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                value={data.instrument_config?.kktp?.threshold || 75}
                                                                onChange={e => updateKKTP('threshold', parseInt(e.target.value))}
                                                                className="h-8 w-14 bg-popover border border-border rounded-md text-center font-mono text-[13px] text-foreground outline-none focus:border-primary"
                                                            />
                                                            <span className="text-[11px] text-muted-foreground font-mono">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    )}

                    {/* ═══════════════ STEP 3: Detail Tugas ═══════════════ */}
                    {data.assessment_type && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground text-[10px] font-semibold text-muted-foreground-foreground">3</span>
                                <h2 className="text-sm font-semibold text-foreground">Detail Penugasan</h2>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-3">
                                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 space-y-5">
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                                Mata Pelajaran
                                            </label>
                                            <select 
                                                value={data.subject_id}
                                                onChange={(e) => {
                                                    setData('subject_id', e.target.value);
                                                    setData('learning_objective_id', '');
                                                    setData('school_classes', []);
                                                }}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                            >
                                                <option value="">Pilih Mapel</option>
                                                {Array.from(new Set(teachings.map(t => t.subject_id))).map(id => {
                                                    const t = teachings.find(x => x.subject_id === id);
                                                    return <option key={id} value={id}>{t?.subject_name}</option>;
                                                })}
                                            </select>
                                            {errors.subject_id && <p className="text-xs text-destructive">{errors.subject_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                Kelas
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                {teachings.filter(t => t.subject_id === parseInt(data.subject_id)).length === 0 && (
                                                    <p className="text-xs text-muted-foreground italic col-span-2">Pilih mata pelajaran terlebih dahulu</p>
                                                )}
                                                {teachings
                                                    .filter(t => t.subject_id === parseInt(data.subject_id))
                                                    .map(t => (
                                                        <label key={t.class_id} className="flex items-center gap-2 text-sm border p-2 rounded-lg cursor-pointer hover:bg-muted/50">
                                                            <input
                                                                type="checkbox"
                                                                checked={data.school_classes.includes(t.class_id)}
                                                                onChange={(e) => {
                                                                    const id = t.class_id;
                                                                    setData('school_classes', e.target.checked 
                                                                        ? [...data.school_classes, id]
                                                                        : data.school_classes.filter((c: number) => c !== id)
                                                                    );
                                                                }}
                                                                className="rounded border-input text-primary focus:ring-primary"
                                                            />
                                                            {t.class_name}
                                                        </label>
                                                    ))
                                                }
                                            </div>
                                            {errors.school_classes && <p className="text-xs text-destructive">{errors.school_classes}</p>}
                                        </div>

                                        <div className="md:col-span-2 space-y-2">
                                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                                Tujuan Pembelajaran (TP)
                                            </label>
                                            <select 
                                                value={data.learning_objective_id}
                                                onChange={(e) => setData('learning_objective_id', e.target.value)}
                                                disabled={!data.subject_id}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition disabled:opacity-50"
                                            >
                                                <option value="">Pilih TP (Opsional)</option>
                                                {objectives
                                                    .filter(obj => obj.subject_id === parseInt(data.subject_id))
                                                    .map(obj => (
                                                        <option key={obj.id} value={obj.id}>{obj.code ? `[${obj.code}] ` : ''}{obj.description}</option>
                                                    ))
                                                }
                                            </select>
                                            {errors.learning_objective_id && <p className="text-xs text-destructive mt-1">{errors.learning_objective_id}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                                            Judul Tugas
                                        </label>
                                        <input 
                                            type="text"
                                            placeholder="Masukkan judul tugas..."
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                        />
                                        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                            Instruksi / Deskripsi
                                        </label>
                                        <textarea 
                                            rows={8}
                                            placeholder="Jelaskan detail tugas di sini..."
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition leading-relaxed"
                                        ></textarea>
                                        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                                    </div>
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                                        <h3 className="text-xs font-semibold text-foreground">Pengaturan</h3>
                                        
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                Tenggat Waktu
                                            </label>
                                            <input 
                                                type="datetime-local"
                                                value={data.due_date}
                                                onChange={(e) => {
                                                    setData('due_date', e.target.value);
                                                    checkHoliday(e.target.value);
                                                }}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                            />
                                            {holidayWarning && (
                                                <div className="flex items-start gap-2 mt-2 text-[10px] font-medium text-warning bg-warning/5 p-2.5 rounded-lg">
                                                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                                    {holidayWarning}
                                                </div>
                                            )}
                                            {errors.due_date && <p className="text-xs text-destructive">{errors.due_date}</p>}
                                        </div>

                                        {(data.instrument_config?.kktp?.approach === 'score_interval' || data.instrument_config?.kktp?.approach === 'percentage' || !data.instrument_config?.kktp) && (
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                    <Star className="h-3.5 w-3.5 text-muted-foreground" />
                                                    Poin Maksimal
                                                </label>
                                                <input 
                                                    type="number"
                                                    value={data.max_points ?? ''}
                                                    onChange={(e) => setData('max_points', e.target.value ? parseInt(e.target.value) : null)}
                                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                                />
                                                {errors.max_points && <p className="text-xs text-destructive mt-1">{errors.max_points}</p>}
                                            </div>
                                        )}

                                        <button 
                                            type="submit"
                                            disabled={processing}
                                            className="w-full rounded-xl bg-primary hover:bg-primary-hover py-3 text-sm font-bold text-white shadow-md shadow-primary/10 transition cursor-pointer disabled:opacity-50"
                                        >
                                            {processing ? 'Menerbitkan...' : 'Terbitkan Tugas'}
                                        </button>
                                    </div>

                                    {/* Instrument Info Card */}
                                    {data.instrument_type && (
                                        <div className={`rounded-xl p-4 ${colors.bg} border ${colors.border}`}>
                                            <p className={`text-[10px] font-semibold mb-1 ${colors.text}`}>Instrumen Terpilih</p>
                                            <p className="text-sm font-medium text-foreground">
                                                {currentInstruments.find(i => i.id === data.instrument_type)?.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                {currentInstruments.find(i => i.id === data.instrument_type)?.desc}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </form>
            </div>
            
            <PromptSettingsModal
                isOpen={isPromptModalOpen}
                onClose={() => setIsPromptModalOpen(false)}
            />
        </AppLayout>
    );
}
