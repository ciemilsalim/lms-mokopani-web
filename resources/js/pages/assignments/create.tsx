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
    Plus
} from 'lucide-react';
import { useState } from 'react';

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
        school_class_id: '',
        title: '',
        description: '',
        due_date: '',
        max_points: 100,
        instrument_config: {
            questions: [] as any[], // For quiz_survey
            indicators: [] as any[], // For observation_checklist
            focus: '', // For anecdotal_notes
            context: '', // For anecdotal_notes
        },
    });

    const addQuestion = () => {
        const newQuestion = { id: Date.now(), text: '', type: 'short_answer', options: [] };
        setData('instrument_config', {
            ...data.instrument_config,
            questions: [...data.instrument_config.questions, newQuestion]
        });
    };

    const removeQuestion = (id: number) => {
        setData('instrument_config', {
            ...data.instrument_config,
            questions: data.instrument_config.questions.filter((q: any) => q.id !== id)
        });
    };

    const updateQuestion = (id: number, field: string, value: any) => {
        setData('instrument_config', {
            ...data.instrument_config,
            questions: data.instrument_config.questions.map((q: any) => 
                q.id === id ? { ...q, [field]: value } : q
            )
        });
    };

    const addOption = (questionId: number) => {
        setData('instrument_config', {
            ...data.instrument_config,
            questions: data.instrument_config.questions.map((q: any) => 
                q.id === questionId ? { ...q, options: [...(q.options || []), { id: Date.now(), text: '' }] } : q
            )
        });
    };

    const removeOption = (questionId: number, optionId: number) => {
        setData('instrument_config', {
            ...data.instrument_config,
            questions: data.instrument_config.questions.map((q: any) => 
                q.id === questionId ? { ...q, options: q.options.filter((o: any) => o.id !== optionId) } : q
            )
        });
    };

    const updateOption = (questionId: number, optionId: number, value: string) => {
        setData('instrument_config', {
            ...data.instrument_config,
            questions: data.instrument_config.questions.map((q: any) => 
                q.id === questionId ? { ...q, options: q.options.map((o: any) => o.id === optionId ? { ...o, text: value } : o) } : q
            )
        });
    };

    const addIndicator = () => {
        const newIndicator = { id: Date.now(), text: '' };
        setData('instrument_config', {
            ...data.instrument_config,
            indicators: [...data.instrument_config.indicators, newIndicator]
        });
    };

    const removeIndicator = (id: number) => {
        setData('instrument_config', {
            ...data.instrument_config,
            indicators: data.instrument_config.indicators.filter((i: any) => i.id !== id)
        });
    };

    const updateIndicator = (id: number, value: string) => {
        setData('instrument_config', {
            ...data.instrument_config,
            indicators: data.instrument_config.indicators.map((i: any) => 
                i.id === id ? { ...i, text: value } : i
            )
        });
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

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <h1 className="text-xl font-bold text-foreground">Buat Penugasan Baru</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
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
                                                onClick={() => setData('instrument_type', inst.id)}
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
                            </div>

                            {data.instrument_type && (
                                <div className="space-y-3 pt-4 border-t border-border animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-semibold text-foreground">Pilih Alat Penskoran (Opsional)</h2>
                                    </div>
                                    <div className="max-w-md">
                                        <select
                                            value={data.scoring_tool || ''}
                                            onChange={(e) => setData('scoring_tool', e.target.value || '')}
                                            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                        >
                                            <option value="">-- Tanpa Alat Penskoran (Opsional) --</option>
                                            {scoring_tools.map((tool) => (
                                                <option key={tool.id} value={tool.id}>{tool.name} — {tool.desc}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════════ STEP 2.5: Instrument Configuration (INITIAL ONLY) ═══════════════ */}
                    {data.assessment_type === 'initial' && data.instrument_type && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground text-[10px] font-semibold text-muted-foreground-foreground">2.5</span>
                                <h2 className="text-sm font-semibold text-foreground">Konfigurasi Instrumen</h2>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                                
                                {data.instrument_type === 'quiz_survey' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground">Daftar Pertanyaan Kuis/Survei</h3>
                                                <p className="text-xs text-muted-foreground">Tentukan pertanyaan untuk mengecek pemahaman dasar siswa</p>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={addQuestion}
                                                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Tambah
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {data.instrument_config.questions.map((q: any, index: number) => (
                                                <div key={q.id} className="group relative rounded-lg border border-border bg-muted/30 p-4">
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <span className="text-[10px] font-semibold text-muted-foreground">Pertanyaan #{index + 1}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeQuestion(q.id)}
                                                            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="grid gap-3 md:grid-cols-4">
                                                        <div className="md:col-span-3">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Tuliskan pertanyaan di sini..."
                                                                value={q.text}
                                                                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
                                                            />
                                                        </div>
                                                        <div>
                                                            <select 
                                                                value={q.type}
                                                                onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
                                                            >
                                                                <option value="short_answer">Jawaban Singkat</option>
                                                                <option value="multiple_choice">Pilihan Ganda</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {q.type === 'multiple_choice' && (
                                                        <div className="mt-3 space-y-2 border-t border-border pt-3">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] font-medium text-muted-foreground">Pilihan Jawaban</p>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => addOption(q.id)}
                                                                    className="text-[10px] font-medium text-primary hover:underline"
                                                                >
                                                                    + Tambah Pilihan
                                                                </button>
                                                            </div>
                                                            <div className="grid gap-1.5">
                                                                {(q.options || []).map((opt: any, optIndex: number) => (
                                                                    <div key={opt.id} className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-medium text-muted-foreground">{String.fromCharCode(65 + optIndex)}.</span>
                                                                        <input 
                                                                            type="text" 
                                                                            placeholder={`Pilihan ${optIndex + 1}`}
                                                                            value={opt.text}
                                                                            onChange={(e) => updateOption(q.id, opt.id, e.target.value)}
                                                                            className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring transition"
                                                                        />
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => removeOption(q.id, opt.id)}
                                                                            className="text-muted-foreground hover:text-destructive transition"
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {data.instrument_config.questions.length === 0 && (
                                                <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                                                    <p className="text-xs text-muted-foreground">Belum ada pertanyaan. Klik "Tambah" untuk memulai.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {data.instrument_type === 'observation_checklist' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground">Indikator/Kriteria Observasi</h3>
                                                <p className="text-xs text-muted-foreground">Tentukan perilaku atau kemampuan yang akan diamati</p>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={addIndicator}
                                                className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Tambah
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {data.instrument_config.indicators.map((i: any, index: number) => (
                                                <div key={i.id} className="flex items-center gap-2">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-medium text-muted-foreground">{index + 1}</span>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Contoh: Dapat membedakan warna dasar..."
                                                        value={i.text}
                                                        onChange={(e) => updateIndicator(i.id, e.target.value)}
                                                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeIndicator(i.id)}
                                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            {data.instrument_config.indicators.length === 0 && (
                                                <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                                                    <p className="text-xs text-muted-foreground">Belum ada indikator. Klik "Tambah" untuk memulai.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {data.instrument_type === 'anecdotal_notes' && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground">Fokus Pengamatan</label>
                                            <input 
                                                type="text" 
                                                placeholder="Contoh: Interaksi sosial, Kemampuan motorik..."
                                                value={data.instrument_config.focus}
                                                onChange={(e) => setData('instrument_config', { ...data.instrument_config, focus: e.target.value })}
                                                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Target perilaku atau kemampuan yang ingin ditonjolkan</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground">Konteks Kegiatan</label>
                                            <input 
                                                type="text" 
                                                placeholder="Contoh: Bermain peran, Diskusi kelompok..."
                                                value={data.instrument_config.context}
                                                onChange={(e) => setData('instrument_config', { ...data.instrument_config, context: e.target.value })}
                                                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Situasi saat pengamatan dilakukan</p>
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
                                                    setData('school_class_id', '');
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
                                            <select 
                                                value={data.school_class_id}
                                                onChange={(e) => setData('school_class_id', e.target.value)}
                                                disabled={!data.subject_id}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition disabled:opacity-50"
                                            >
                                                <option value="">Pilih Kelas</option>
                                                {teachings
                                                    .filter(t => t.subject_id === parseInt(data.subject_id))
                                                    .map(t => (
                                                        <option key={t.class_id} value={t.class_id}>{t.class_name}</option>
                                                    ))
                                                }
                                            </select>
                                            {errors.school_class_id && <p className="text-xs text-destructive">{errors.school_class_id}</p>}
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

                                        <div className="space-y-2">
                                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                <Star className="h-3.5 w-3.5 text-muted-foreground" />
                                                Poin Maksimal
                                            </label>
                                            <input 
                                                type="number"
                                                value={data.max_points}
                                                onChange={(e) => setData('max_points', parseInt(e.target.value))}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                            />
                                        </div>

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
                </form>
            </div>
        </AppLayout>
    );
}
