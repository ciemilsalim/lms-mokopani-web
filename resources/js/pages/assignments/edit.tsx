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
    Star,
    AlignLeft,
    Layers,
    X
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Tugas', href: '/assignments' },
    { title: 'Edit Tugas', href: '#' },
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

interface EditAssignmentProps {
    assignment: {
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
    holidays: { title: string; date: string; end: string }[];
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

export default function EditAssignment({ assignment, teachings, objectives, assessment_types, instruments, holidays, scoring_tools }: EditAssignmentProps) {
    const [holidayWarning, setHolidayWarning] = useState<string | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        assessment_type: assignment.assessment_type,
        instrument_type: assignment.instrument_type,
        scoring_tool: assignment.scoring_tool ?? '',
        scoring_tool_config: assignment.scoring_tool_config ?? {} as any,
        subject_id: assignment.subject_id.toString(),
        learning_objective_id: assignment.learning_objective_id?.toString() ?? '',
        school_classes: assignment.school_classes || [],
        title: assignment.title,
        description: assignment.description,
        due_date: assignment.due_date,
        max_points: assignment.max_points,
        passing_grade: assignment.passing_grade ?? 100,
        instrument_config: {
            stimulus: assignment.instrument_config?.stimulus ?? '',
            criteria: assignment.instrument_config?.criteria ?? '',
            questions: assignment.instrument_config?.questions ?? [],
            indicators: assignment.instrument_config?.indicators ?? [],
            focus: assignment.instrument_config?.focus ?? '',
            context: assignment.instrument_config?.context ?? '',
            teacher_notes: assignment.instrument_config?.teacher_notes ?? '',
            levels: assignment.instrument_config?.levels ?? [
                { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar namun belum konsisten.' },
                { name: 'Baik', desc: 'Siswa menguasai seluruh indikator ketuntasan dengan baik.' },
                { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa dan pemahaman mendalam.' }
            ],
            kktp: assignment.instrument_config?.kktp ?? {
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
        newInds[indIdx] = { ...newInds[indIdx], name: value, text: value };
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
        post(route('assignments.update', assignment.id));
    };

    const currentInstruments = data.assessment_type ? (instruments[data.assessment_type] || []) : [];
    const colors = assessmentColors[data.assessment_type] || assessmentColors.summative;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Tugas – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6 min-w-0 fade-in">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <h1 className="text-xl font-bold text-foreground">Edit Penugasan</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">1</span>
                            <h2 className="text-sm font-semibold text-foreground">Jenis Asesmen</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {assessment_types.map((type) => {
                                const c = assessmentColors[type.id];
                                const isActive = data.assessment_type === type.id;
                                const Icon = type.id === 'initial' ? Info : type.id === 'formative' ? Target : GraduationCap;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => {
                                            setData('assessment_type', type.id as any);
                                            setData('instrument_type', '');
                                        }}
                                        className={`relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                                            isActive
                                            ? `${c.border} ${c.bg} shadow-sm`
                                            : 'border-border bg-card hover:border-primary/50'
                                        }`}
                                    >
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-all ${isActive ? `${c.activeBg} text-white` : 'bg-muted text-muted-foreground'}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">{type.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{type.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 2: Instrument Type */}
                    {data.assessment_type && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">2</span>
                                    <h2 className="text-sm font-semibold text-foreground">Pilih Instrumen Asesmen</h2>
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
                                                className={`group flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                                                    isActive
                                                    ? `${colors.border} ${colors.bg} shadow-sm`
                                                    : 'border-border bg-card hover:border-primary/50'
                                                }`}
                                            >
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${isActive ? `${colors.activeBg} text-white` : 'bg-muted text-muted-foreground'}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-semibold text-foreground line-clamp-1">{inst.name}</h4>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{inst.desc}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.instrument_type && <p className="text-xs text-destructive mt-2">{errors.instrument_type}</p>}
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
                                        {errors.scoring_tool && <p className="text-xs text-destructive mt-1">{errors.scoring_tool}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2.5: Custom Config for Instruments */}
                    {data.instrument_type && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">2.5</span>
                                <h2 className="text-sm font-semibold text-foreground">Konfigurasi Instrumen</h2>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-6 space-y-6">

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
                                                                            const optId = String(opt?.id || ['a', 'b', 'c', 'd', 'e'][optIdx] || String.fromCharCode(97 + optIdx)).toLowerCase();
                                                                            const isCorrect = String(q.answer || '').trim().toLowerCase() === optId || opt?.is_correct === true;
                                                                            return (
                                                                                <div key={optIdx} className="flex items-center gap-2 relative group/opt">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newQs = [...(data.instrument_config?.questions || [])];
                                                                                            const newOpts = (newQs[qIdx].options || []).map((o: any, oIdx: number) => {
                                                                                                const currentId = String(o?.id || ['a', 'b', 'c', 'd', 'e'][oIdx] || String.fromCharCode(97 + oIdx)).toLowerCase();
                                                                                                return {
                                                                                                    ...o,
                                                                                                    id: currentId,
                                                                                                    is_correct: currentId === optId
                                                                                                };
                                                                                            });
                                                                                            newQs[qIdx] = { ...newQs[qIdx], answer: optId, options: newOpts };
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
                                                                                        {optId}
                                                                                    </button>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={opt?.text || (typeof opt === 'string' ? opt : '')}
                                                                                        onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                                                                        placeholder={`Opsi ${optId.toUpperCase()}`}
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
                                  data.instrument_type === 'peer_assessment') && (
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

                                {/* PETA KONSEP */}
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

                                {/* 5. LAINNYA (Rubric, Map, Oral QA, etc.) */}
                                {data.instrument_type !== 'quiz_survey' && 
                                 data.instrument_type !== 'written_test' && 
                                 data.instrument_type !== 'formative_quiz' && 
                                 data.instrument_type !== 'observation_checklist' && 
                                 data.instrument_type !== 'performance_observation' &&
                                 data.instrument_type !== 'performance' && 
                                 data.instrument_type !== 'self_assessment' && 
                                 data.instrument_type !== 'peer_assessment' &&
                                 data.instrument_type !== 'exit_ticket' && 
                                 data.instrument_type !== 'reflective_journal' && 
                                 data.instrument_type !== 'anecdotal_notes' && (
                                    <div className="space-y-4">
                                        {data.instrument_config?.stimulus !== undefined && (
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Konteks Kasus</label>
                                                <textarea
                                                    value={data.instrument_config.stimulus || ''}
                                                    onChange={e => updateConfig('stimulus', e.target.value)}
                                                    rows={4}
                                                    placeholder="Tuliskan stimulus atau contoh kasus..."
                                                    className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                                />
                                            </div>
                                        )}
                                        {data.instrument_config?.criteria !== undefined && (
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Nama Kriteria</label>
                                                <input
                                                    value={data.instrument_config.criteria || ''}
                                                    onChange={e => updateConfig('criteria', e.target.value)}
                                                    placeholder="Contoh: Kemampuan menulis kode program"
                                                    className="w-full h-8 bg-card text-card-foreground rounded border border-border px-3 text-[12px] focus:border-primary outline-none"
                                                />
                                            </div>
                                        )}
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

                    {data.assessment_type && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">3</span>
                                <h2 className="text-sm font-semibold text-foreground">Detail Penugasan</h2>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-3">
                                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 space-y-5">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                <BookOpen className="h-4 w-4 text-primary" />
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
                                            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                <Users className="h-4 w-4 text-primary" />
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
                                            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                <Target className="h-4 w-4 text-primary" />
                                                Tujuan Pembelajaran (TP)
                                            </label>
                                            <select
                                                value={data.learning_objective_id}
                                                onChange={(e) => setData('learning_objective_id', e.target.value)}
                                                disabled={!data.subject_id}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover disabled:opacity-50 transition"
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
                                        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                            <Zap className="h-4 w-4 text-primary" />
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
                                        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                            <FileText className="h-4 w-4 text-primary" />
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

                                <div className="space-y-6">
                                    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                                        <h3 className="text-xs font-semibold text-foreground">Pengaturan</h3>

                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                <CalendarIcon className="h-4 w-4 text-primary" />
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
                                            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                <Star className="h-4 w-4 text-primary" />
                                                Poin Maksimal
                                            </label>
                                            <input
                                                type="number"
                                                value={data.max_points}
                                                onChange={(e) => setData('max_points', parseInt(e.target.value))}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                            />
                                            {errors.max_points && <p className="text-xs text-destructive mt-1">{errors.max_points}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                <Target className="h-4 w-4 text-primary" />
                                                Nilai Ketuntasan (Passing Grade)
                                            </label>
                                            <input
                                                type="number"
                                                value={data.passing_grade}
                                                onChange={(e) => setData('passing_grade', parseInt(e.target.value))}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="w-full rounded-xl bg-primary hover:bg-primary-hover py-3 text-sm font-bold text-white shadow-md shadow-primary/10 transition cursor-pointer disabled:opacity-50"
                                        >
                                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>

                                    {data.instrument_type && (
                                        <div className={`rounded-xl p-6 ${colors.bg} border ${colors.border} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                            <p className={`text-[10px] font-semibold mb-2 ${colors.text}`}>Instrumen Terpilih</p>
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
