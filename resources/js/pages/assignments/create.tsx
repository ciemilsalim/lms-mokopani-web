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
    Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import PromptSettingsModal from '@/components/PromptSettingsModal';
import { Badge } from '@/components/ui/badge';

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
    formative: { bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',   border: 'border-amber-500',  text: 'text-amber-700 dark:text-amber-400',   activeBg: 'bg-amber-500' },
    summative: { bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',       border: 'border-emerald-500',    text: 'text-emerald-700 dark:text-emerald-400',       activeBg: 'bg-emerald-500' },
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
        } as any,
    });

    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiNotification, setAiNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);
    const [clickCount, setClickCount] = useState(0);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [modulAjarFound, setModulAjarFound] = useState<boolean | null>(null);

    const [openPanels, setOpenPanels] = useState<Record<number, boolean>>({
        1: true,
        2: false,
        3: false,
        4: false,
    });

    const togglePanel = (panelNumber: number) => {
        setOpenPanels(prev => ({
            ...prev,
            [panelNumber]: !prev[panelNumber]
        }));
    };

    const openNextPanel = (nextPanelNumber: number) => {
        setOpenPanels(prev => ({
            ...prev,
            [nextPanelNumber]: true
        }));
    };

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

                    const cleanAiText = (str: any): string => {
                        if (!str || typeof str !== 'string') return '';
                        let res = str
                            .replace(/&nbsp;/gi, ' ')
                            .replace(/&#39;/g, "'")
                            .replace(/&quot;/g, '"')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/\[DOKUMEN MODUL AJAR TERHUBUNG\][\s\S]*/i, '')
                            .replace(/\[SPESIFIKASI ASESMEN YANG WAJIB DIHASILKAN\][\s\S]*/i, '');
                        
                        if (res.includes('Judul Materi:') && res.includes('Uraian Materi:')) {
                            const match = res.match(/Ketepatan konsep dan penerapan materi\s+Judul Materi:\s*([^:\n]+)/i);
                            if (match) {
                                res = `Ketepatan konsep dan penerapan materi ${match[1].trim()}.`;
                            } else {
                                const match2 = res.match(/Judul Materi:\s*([^:\n]+)/i);
                                if (match2) res = match2[1].trim();
                            }
                        }
                        return res.replace(/\s+/g, ' ').trim();
                    };

                    if (suggestion.stimulus !== undefined) newConfig.stimulus = cleanAiText(suggestion.stimulus);
                    if (suggestion.criteria !== undefined) newConfig.criteria = cleanAiText(suggestion.criteria);
                    let suggestedQuestions = suggestion.questions || suggestion.pertanyaan || suggestion.soal;
                    if (suggestedQuestions !== undefined && Array.isArray(suggestedQuestions)) {
                        const totalQuestions = suggestedQuestions.length;
                        const basePoints = totalQuestions > 0 ? Math.floor(100 / totalQuestions) : 0;
                        const remainder = totalQuestions > 0 ? 100 % totalQuestions : 0;

                        newConfig.questions = suggestedQuestions.map((q: any, idx: number) => {
                            let questionOptions: any[] | undefined = undefined;
                            const rawOptions = q.options || q.pilihan || q.choices || q.opsi;
                            let declaredAnswer = cleanAiText(q.answer || q.correct_answer || q.jawaban || q.kunci_jawaban || q.kunci || q.pembahasan || q.pedoman_penskoran || q.rubrik || '').trim();

                            if (Array.isArray(rawOptions) && rawOptions.length > 0) {
                                let detectedCorrectId = '';

                                questionOptions = rawOptions.map((o: any, oIdx: number) => {
                                    let optId = '';
                                    let optText = '';
                                    let optIsCorrect = false;

                                    if (typeof o === 'string') {
                                        const prefixMatch = o.match(/^([A-Za-z])[\.\)\:\-]\s*(.*)$/);
                                        if (prefixMatch) {
                                            optId = prefixMatch[1].toLowerCase();
                                            optText = prefixMatch[2];
                                        } else {
                                            optId = ['a', 'b', 'c', 'd', 'e'][oIdx] || String.fromCharCode(97 + oIdx);
                                            optText = o;
                                        }
                                    } else if (typeof o === 'object' && o !== null) {
                                        optId = o.id || o.key || o.option || o.label || o.kode || ['a', 'b', 'c', 'd', 'e'][oIdx] || String.fromCharCode(97 + oIdx);
                                        optText = o.text || o.teks || o.label || o.option || o.jawaban || o.pilihan || '';
                                        optIsCorrect = !!o.is_correct;
                                    } else {
                                        optId = ['a', 'b', 'c', 'd', 'e'][oIdx] || String.fromCharCode(97 + oIdx);
                                        optText = String(o || '');
                                    }

                                    const finalId = String(optId || ['a', 'b', 'c', 'd', 'e'][oIdx] || String.fromCharCode(97 + oIdx)).toLowerCase();
                                    const cleanedText = cleanAiText(optText);

                                    // Detect if this option is the declared correct answer
                                    if (optIsCorrect) {
                                        detectedCorrectId = finalId;
                                    } else if (declaredAnswer) {
                                        const normDeclared = declaredAnswer.toLowerCase();
                                        if (
                                            normDeclared === finalId ||
                                            normDeclared === `opsi ${finalId}` ||
                                            normDeclared === `pilihan ${finalId}` ||
                                            normDeclared.startsWith(`${finalId}.`) ||
                                            normDeclared.startsWith(`${finalId})`) ||
                                            normDeclared.startsWith(`${finalId} `)
                                        ) {
                                            detectedCorrectId = finalId;
                                        } else if (cleanedText && (normDeclared === cleanedText.toLowerCase() || normDeclared.includes(cleanedText.toLowerCase()) || cleanedText.toLowerCase().includes(normDeclared))) {
                                            detectedCorrectId = finalId;
                                        }
                                    }

                                    return {
                                        id: finalId,
                                        text: cleanedText,
                                        is_correct: optIsCorrect
                                    };
                                });

                                // Fallback: if declaredAnswer has a leading letter (e.g. "B" or "b"), match it
                                if (!detectedCorrectId && declaredAnswer) {
                                    const letterMatch = declaredAnswer.match(/^([A-Za-z])/);
                                    if (letterMatch) {
                                        const letter = letterMatch[1].toLowerCase();
                                        if (questionOptions.some(opt => opt.id === letter)) {
                                            detectedCorrectId = letter;
                                        }
                                    }
                                }

                                // Default to first option if still not detected for multiple choice
                                if (!detectedCorrectId && questionOptions.length > 0) {
                                    detectedCorrectId = questionOptions[0].id;
                                }

                                // Mark is_correct on options
                                questionOptions = questionOptions.map(opt => ({
                                    ...opt,
                                    is_correct: opt.id === detectedCorrectId
                                }));

                                declaredAnswer = detectedCorrectId;
                            }

                            return {
                                ...q,
                                id: q.id || `q_${idx + 1}`,
                                text: cleanAiText(q.text || q.question || q.pertanyaan || q.description || q.soal || ''),
                                answer: declaredAnswer,
                                points: q.points !== undefined ? Number(q.points) : (idx < remainder ? basePoints + 1 : basePoints),
                                options: questionOptions
                            };
                        });
                    }
                    if (suggestion.indicators !== undefined && Array.isArray(suggestion.indicators)) {
                        newConfig.indicators = suggestion.indicators.map((ind: any) => ({
                            ...ind,
                            name: cleanAiText(ind.name || ind.text || ''),
                            text: cleanAiText(ind.text || ind.name || '')
                        }));
                    }
                    if (suggestion.focus !== undefined) newConfig.focus = cleanAiText(suggestion.focus);
                    if (suggestion.context !== undefined) newConfig.context = cleanAiText(suggestion.context);
                    if (suggestion.teacher_notes !== undefined) newConfig.teacher_notes = cleanAiText(suggestion.teacher_notes);
                    if (suggestion.levels !== undefined && Array.isArray(suggestion.levels)) {
                        newConfig.levels = suggestion.levels.map((lvl: any) => ({
                            ...lvl,
                            name: cleanAiText(lvl.name || ''),
                            desc: cleanAiText(lvl.desc || lvl.description || '')
                        }));
                    }
                    if (suggestion.central_topic !== undefined) newConfig.central_topic = cleanAiText(suggestion.central_topic);
                    if (suggestion.submission_mode !== undefined) newConfig.submission_mode = suggestion.submission_mode;
                    if (suggestion.instructions !== undefined) newConfig.instructions = cleanAiText(suggestion.instructions);
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

    // Completeness checkers for badge indicators
    const isPanel1Complete = !!data.subject_id && !!data.learning_objective_id && data.school_classes.length > 0;
    const isPanel2Complete = !!data.assessment_type && !!data.instrument_type;
    const isPanel3Complete = !!data.instrument_type && (
        (data.instrument_config?.questions && data.instrument_config.questions.length > 0) ||
        (data.instrument_config?.indicators && data.instrument_config.indicators.length > 0) ||
        (data.instrument_config?.criteria && data.instrument_config.criteria.length > 0) ||
        !!data.instrument_config?.stimulus
    );
    const isPanel4Complete = !!data.title && !!data.due_date && data.school_classes.length > 0;

    const selectedSubjectObj = teachings.find(t => t.subject_id === parseInt(data.subject_id));
    const selectedTpObj = objectives.find(o => o.id === parseInt(data.learning_objective_id));
    const selectedTypeName = assessment_types.find(t => t.id === data.assessment_type)?.name;
    const selectedInstObj = currentInstruments.find(i => i.id === data.instrument_type);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Penugasan Baru – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-5 sm:gap-6 min-w-0 fade-in pb-16 md:pb-0">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {/* Header Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs">
                        <div>
                            <button 
                                type="button"
                                onClick={() => window.history.back()}
                                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition mb-1 active:scale-95 cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Kembali
                            </button>
                            <h1 className="text-lg sm:text-xl font-black text-foreground">Perakit Asesmen Terpadu (PPA 2025)</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">Rancang sasaran, instrumen, rubrik/soal, hingga publikasi secara terstruktur dalam 4 panel.</p>
                        </div>

                        {/* Progress Stepper on Desktop */}
                        <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 p-2 rounded-xl border border-border/50">
                            <span className={`px-2.5 py-1 rounded-lg transition ${isPanel1Complete ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold' : 'bg-muted text-muted-foreground'}`}>
                                1. Sasaran Belajar
                            </span>
                            <span>&rarr;</span>
                            <span className={`px-2.5 py-1 rounded-lg transition ${isPanel2Complete ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold' : 'bg-muted text-muted-foreground'}`}>
                                2. Instrumen
                            </span>
                            <span>&rarr;</span>
                            <span className={`px-2.5 py-1 rounded-lg transition ${isPanel3Complete ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold' : 'bg-muted text-muted-foreground'}`}>
                                3. Butir & KKTP
                            </span>
                            <span>&rarr;</span>
                            <span className={`px-2.5 py-1 rounded-lg transition ${isPanel4Complete ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold' : 'bg-muted text-muted-foreground'}`}>
                                4. Publikasi
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* ═══════════════ PANEL 1: SASARAN BELAJAR & KELAS ═══════════════ */}
                        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all">
                            <button
                                type="button"
                                onClick={() => togglePanel(1)}
                                className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition hover:bg-muted/30 cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl font-black text-xs shrink-0 transition-colors ${
                                        isPanel1Complete ? 'bg-emerald-500 text-white shadow-xs' : 'bg-primary/10 text-primary'
                                    }`}>
                                        {isPanel1Complete ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm sm:text-base font-black text-foreground">Sasaran Belajar & Kelas</h2>
                                            {isPanel1Complete && (
                                                <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                                    Lengkap
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {selectedSubjectObj ? selectedSubjectObj.subject_name : 'Pilih Mata Pelajaran'} 
                                            {selectedTpObj ? ` • [${selectedTpObj.code}] ${selectedTpObj.description}` : ''}
                                            {data.school_classes.length > 0 ? ` • (${data.school_classes.length} Kelas)` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className={`p-1.5 rounded-xl bg-muted/60 text-muted-foreground transition-transform duration-200 ${openPanels[1] ? 'rotate-180' : ''}`}>
                                    <ChevronLeft className="h-4 w-4 -rotate-90" />
                                </div>
                            </button>

                            {openPanels[1] && (
                                <div className="p-4 sm:p-6 border-t border-border/70 space-y-5 animate-in fade-in duration-200">
                                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                                        {/* 1. Mata Pelajaran */}
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                                1. Mata Pelajaran
                                            </label>
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
                                                className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-xs sm:text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                            >
                                                <option value="">-- Pilih Mata Pelajaran --</option>
                                                {Array.from(new Set(teachings.map(t => t.subject_id))).map(id => {
                                                    const t = teachings.find(x => x.subject_id === id);
                                                    return <option key={id} value={id}>{t?.subject_name}</option>;
                                                })}
                                            </select>
                                            {errors.subject_id && <p className="text-xs text-destructive font-bold">{errors.subject_id}</p>}
                                        </div>

                                        {/* 2. Tujuan Pembelajaran (TP) */}
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                <Target className="h-3.5 w-3.5 text-primary" />
                                                2. Tujuan Pembelajaran (TP)
                                            </label>
                                            <select 
                                                value={data.learning_objective_id}
                                                onChange={(e) => setData('learning_objective_id', e.target.value)}
                                                disabled={!data.subject_id}
                                                className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-xs sm:text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition disabled:opacity-50"
                                            >
                                                <option value="">-- Pilih Tujuan Pembelajaran --</option>
                                                {objectives
                                                    .filter(obj => obj.subject_id === parseInt(data.subject_id))
                                                    .map(obj => (
                                                        <option key={obj.id} value={obj.id}>
                                                            {obj.code ? `[${obj.code}] ` : ''}{obj.description}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                            {errors.learning_objective_id && <p className="text-xs text-destructive font-bold">{errors.learning_objective_id}</p>}
                                        </div>
                                    </div>

                                    {/* 3. Kelas Sasaran */}
                                    <div className="space-y-2 pt-2 border-t border-border/50">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                <Users className="h-3.5 w-3.5 text-primary" />
                                                3. Pilih Kelas Sasaran
                                            </label>
                                            {data.subject_id && teachings.filter(t => t.subject_id === parseInt(data.subject_id)).length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const available = teachings.filter(t => t.subject_id === parseInt(data.subject_id)).map(t => t.class_id);
                                                        const allSelected = available.every(id => data.school_classes.includes(id));
                                                        setData('school_classes', allSelected ? [] : available);
                                                    }}
                                                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                                                >
                                                    {teachings.filter(t => t.subject_id === parseInt(data.subject_id)).every(t => data.school_classes.includes(t.class_id)) ? 'Batal Pilih Semua' : 'Pilih Semua Kelas'}
                                                </button>
                                            )}
                                        </div>

                                        {!data.subject_id ? (
                                            <p className="text-xs text-muted-foreground italic p-3 bg-muted/30 rounded-xl border border-dashed border-border/60">
                                                Pilih mata pelajaran terlebih dahulu untuk melihat daftar kelas yang Anda ajar.
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                                {teachings
                                                    .filter(t => t.subject_id === parseInt(data.subject_id))
                                                    .sort((a, b) => (a.class_name || '').localeCompare(b.class_name || '', undefined, { numeric: true, sensitivity: 'base' }))
                                                    .map(t => {
                                                        const isSelected = data.school_classes.includes(t.class_id);
                                                        return (
                                                            <button
                                                                key={t.class_id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const id = t.class_id;
                                                                    setData('school_classes', isSelected 
                                                                        ? data.school_classes.filter((c: number) => c !== id)
                                                                        : [...data.school_classes, id]
                                                                    );
                                                                }}
                                                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition active:scale-95 cursor-pointer ${
                                                                    isSelected
                                                                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                                                                        : 'border-border/80 bg-background hover:bg-muted/40 text-foreground font-medium'
                                                                }`}
                                                            >
                                                                <div className={`h-4 w-4 rounded-md flex items-center justify-center border shrink-0 ${
                                                                    isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/40'
                                                                }`}>
                                                                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                                                </div>
                                                                <span className="text-xs truncate">{t.class_name}</span>
                                                            </button>
                                                        );
                                                    })
                                                }
                                            </div>
                                        )}
                                        {errors.school_classes && <p className="text-xs text-destructive font-bold">{errors.school_classes}</p>}
                                    </div>

                                    {/* Action Next */}
                                    <div className="flex justify-end pt-3 border-t border-border/50">
                                        <button
                                            type="button"
                                            onClick={() => openNextPanel(2)}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 active:scale-95 transition cursor-pointer"
                                        >
                                            Lanjut ke Jenis & Instrumen &rarr;
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══════════════ PANEL 2: JENIS ASESMEN & INSTRUMEN PPA 2025 ═══════════════ */}
                        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all">
                            <button
                                type="button"
                                onClick={() => togglePanel(2)}
                                className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition hover:bg-muted/30 cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl font-black text-xs shrink-0 transition-colors ${
                                        isPanel2Complete ? 'bg-emerald-500 text-white shadow-xs' : 'bg-primary/10 text-primary'
                                    }`}>
                                        {isPanel2Complete ? <CheckCircle2 className="h-4 w-4" /> : '2'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm sm:text-base font-black text-foreground">Jenis Asesmen & Instrumen PPA 2025</h2>
                                            {isPanel2Complete && (
                                                <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                                    Lengkap
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {selectedTypeName ? selectedTypeName : 'Pilih Jenis Asesmen'} 
                                            {selectedInstObj ? ` • ${selectedInstObj.name}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className={`p-1.5 rounded-xl bg-muted/60 text-muted-foreground transition-transform duration-200 ${openPanels[2] ? 'rotate-180' : ''}`}>
                                    <ChevronLeft className="h-4 w-4 -rotate-90" />
                                </div>
                            </button>

                            {openPanels[2] && (
                                <div className="p-4 sm:p-6 border-t border-border/70 space-y-6 animate-in fade-in duration-200">
                                    {/* 1. Pilih Jenis Asesmen */}
                                    <div className="space-y-2.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            1. Pilih Jenis Asesmen (Tahapan Belajar)
                                        </label>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                            {assessment_types.map((type) => {
                                                const c = assessmentColors[type.id];
                                                const isActive = data.assessment_type === type.id;
                                                return (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setData(prev => ({
                                                                ...prev,
                                                                assessment_type: type.id as any,
                                                                instrument_type: ''
                                                            }));
                                                        }}
                                                        className={`relative flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all active:scale-95 cursor-pointer ${
                                                            isActive 
                                                            ? `${c.border} ${c.bg} shadow-sm ring-2 ring-primary/20` 
                                                            : 'border-border/80 bg-background hover:border-primary/40'
                                                        }`}
                                                    >
                                                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${isActive ? `${c.activeBg} text-white` : 'bg-muted text-muted-foreground'}`}>
                                                            {type.id === 'initial' && <Info className="h-5 w-5" />}
                                                            {type.id === 'formative' && <Target className="h-5 w-5" />}
                                                            {type.id === 'summative' && <GraduationCap className="h-5 w-5" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`font-bold text-xs sm:text-sm ${isActive ? c.text : 'text-foreground'}`}>{type.name}</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                                                {type.id === 'initial' && 'Mengecek kesiapan awal murid'}
                                                                {type.id === 'formative' && 'Umpan balik saat proses KBM'}
                                                                {type.id === 'summative' && 'Capaian akhir untuk nilai rapor'}
                                                            </p>
                                                        </div>
                                                        {isActive && (
                                                            <CheckCircle2 className={`absolute top-3 right-3 h-4 w-4 ${c.text}`} />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {errors.assessment_type && <p className="text-xs text-destructive font-bold">{errors.assessment_type}</p>}
                                    </div>

                                    {/* 2. Pilih Instrumen Penilaian */}
                                    {data.assessment_type && (
                                        <div className="space-y-3 pt-4 border-t border-border/50 animate-in fade-in duration-200">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                2. Pilih Instrumen Penilaian Standar PPA 2025
                                            </label>
                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                                                            className={`group flex flex-col items-start gap-2.5 rounded-2xl border p-3.5 text-left transition-all active:scale-95 cursor-pointer ${
                                                                isActive 
                                                                ? `${colors.border} ${colors.bg} shadow-xs ring-2 ring-primary/20` 
                                                                : 'border-border/80 bg-background hover:border-primary/40'
                                                            }`}
                                                        >
                                                            <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${isActive ? `${colors.activeBg} text-white` : 'bg-muted text-muted-foreground'}`}>
                                                                <Icon className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <p className={`text-xs font-bold ${isActive ? colors.text : 'text-foreground'}`}>{inst.name}</p>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{inst.desc}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {errors.instrument_type && <p className="text-xs text-destructive font-bold">{errors.instrument_type}</p>}
                                        </div>
                                    )}

                                    {/* Action Next */}
                                    <div className="flex justify-between items-center pt-3 border-t border-border/50">
                                        <button
                                            type="button"
                                            onClick={() => openNextPanel(1)}
                                            className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            &larr; Kembali ke Sasaran
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openNextPanel(3)}
                                            disabled={!data.assessment_type || !data.instrument_type}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                                        >
                                            Lanjut ke Isi Butir & KKTP &rarr;
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══════════════ PANEL 3: PENYUSUNAN BUTIR SOAL, RUBRIK & KKTP ═══════════════ */}
                        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all">
                            <button
                                type="button"
                                onClick={() => togglePanel(3)}
                                className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition hover:bg-muted/30 cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl font-black text-xs shrink-0 transition-colors ${
                                        isPanel3Complete ? 'bg-emerald-500 text-white shadow-xs' : 'bg-primary/10 text-primary'
                                    }`}>
                                        {isPanel3Complete ? <CheckCircle2 className="h-4 w-4" /> : '3'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm sm:text-base font-black text-foreground">Isi Instrumen, Rubrik & KKTP</h2>
                                            {isPanel3Complete && (
                                                <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                                    Lengkap
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {data.instrument_type ? `Instrumen: ${selectedInstObj?.name || data.instrument_type}` : 'Pilih jenis dan instrumen di Panel 2 terlebih dahulu'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`p-1.5 rounded-xl bg-muted/60 text-muted-foreground transition-transform duration-200 ${openPanels[3] ? 'rotate-180' : ''}`}>
                                    <ChevronLeft className="h-4 w-4 -rotate-90" />
                                </div>
                            </button>

                            {openPanels[3] && (
                                <div className="p-4 sm:p-6 border-t border-border/70 space-y-6 animate-in fade-in duration-200">
                                    {!data.instrument_type ? (
                                        <div className="p-6 text-center bg-muted/30 rounded-2xl border border-dashed border-border/80 space-y-2">
                                            <AlertCircle className="h-8 w-8 mx-auto text-amber-500/70" />
                                            <p className="text-xs font-bold text-foreground">Instrumen Belum Dipilih</p>
                                            <p className="text-[11px] text-muted-foreground">Silakan buka Panel 2 di atas dan pilih jenis asesmen beserta instrumen penilaian.</p>
                                            <button
                                                type="button"
                                                onClick={() => openNextPanel(2)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition cursor-pointer"
                                            >
                                                Buka Panel 2 (Instrumen)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* AI Generator Assistant Banner */}
                                            <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 p-4 sm:p-5 space-y-4 shadow-xs">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                                                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                                                            Asisten AI Rancang Cerdas SIPADA
                                                        </h3>
                                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                            AI otomatis merancang stimulus, {
                                                                (data.instrument_type === 'quiz_survey' || data.instrument_type === 'written_test' || data.instrument_type === 'formative_quiz') 
                                                                ? 'butir soal pilihan ganda, uraian, dan kunci jawaban' 
                                                                : 'kriteria, indikator penilaian, serta rubrik tingkat capaian'
                                                            } sesuai TP: <span className="font-bold text-primary">[{selectedTpObj?.code || 'TP Terpilih'}]</span> secara kontekstual.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsPromptModalOpen(true)}
                                                            title="Pengaturan Prompt AI"
                                                            className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                                                        >
                                                            <Settings className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleSuggestAI}
                                                            disabled={aiLoading || !data.learning_objective_id}
                                                            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                        >
                                                            <Sparkles className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
                                                            {aiLoading ? 'Sedang Merancang...' : clickCount > 0 ? 'Regenerasi Asesmen AI' : 'Rancang Butir Asesmen AI'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {aiNotification && (
                                                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${aiNotification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600' : aiNotification.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                                                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                                        <p className="leading-relaxed font-semibold">{aiNotification.message}</p>
                                                    </div>
                                                )}

                                                {aiError && (
                                                    <div className="p-3 rounded-xl border bg-red-500/10 border-red-500/20 text-red-600 flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
                                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                        <p className="leading-relaxed font-semibold">{aiError}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 1. KUIS & TES TERTULIS (QuizBuilder Layout) */}
                                            {(data.instrument_type === 'quiz_survey' || data.instrument_type === 'written_test' || data.instrument_type === 'formative_quiz') && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="text-xs sm:text-sm font-black text-foreground">Daftar Pertanyaan & Butir Soal</h3>
                                                            <p className="text-[11px] text-muted-foreground">Tentukan pertanyaan pilihan ganda, isian singkat, atau esai.</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={addQuestion}
                                                            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer active:scale-95"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Tambah Butir Soal
                                                        </button>
                                                    </div>

                                                    <div className="grid gap-3">
                                                        {(data.instrument_config?.questions || []).map((q: any, qIdx: number) => (
                                                            <div
                                                                key={qIdx}
                                                                className="group relative flex flex-col gap-3 p-4 bg-background text-card-foreground rounded-2xl border border-border hover:border-primary/40 transition-all shadow-xs"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeQuestion(qIdx)}
                                                                    className="absolute top-3 right-3 text-muted-foreground/40 hover:text-rose-500 transition-colors p-1.5 cursor-pointer"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>

                                                                <div className="flex items-start gap-3">
                                                                    <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs shrink-0">
                                                                        {qIdx + 1}
                                                                    </div>
                                                                    <div className="flex-1 space-y-3 min-w-0">
                                                                        <div className="flex flex-wrap gap-2 items-center">
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
                                                                                className="h-9 rounded-xl border border-border bg-card text-foreground px-3 text-xs font-bold outline-none focus:border-primary transition"
                                                                            >
                                                                                <option value="multiple_choice">Pilihan Ganda</option>
                                                                                <option value="short_answer">Isian Singkat</option>
                                                                                <option value="essay">Uraian / Esai</option>
                                                                            </select>

                                                                            <div className="flex items-center gap-1.5 ml-auto">
                                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bobot Poin</label>
                                                                                <input
                                                                                    type="number"
                                                                                    value={q.points !== undefined ? q.points : 1}
                                                                                    onChange={(e) => updateQuestionField(qIdx, 'points', parseInt(e.target.value) || 0)}
                                                                                    min="0"
                                                                                    className="w-14 h-9 text-center rounded-xl border border-border bg-card text-foreground px-2 text-xs font-bold outline-none focus:border-primary transition"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <textarea
                                                                            value={q.text || ''}
                                                                            onChange={(e) => updateQuestionField(qIdx, 'text', e.target.value)}
                                                                            placeholder="Tuliskan pertanyaan soal..."
                                                                            rows={2}
                                                                            className="w-full rounded-xl border border-border bg-card text-foreground px-3.5 py-2.5 text-xs outline-none focus:border-primary transition resize-none leading-relaxed"
                                                                        />

                                                                        {(q.type === 'multiple_choice' || !q.type) && (
                                                                            <div className="space-y-2 mt-2 pl-1">
                                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                                                                    Pilihan Jawaban (Klik huruf untuk set Kunci Jawaban)
                                                                                </span>
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
                                                                                                    className={`flex items-center justify-center h-7 w-7 rounded-xl text-xs font-black uppercase transition-all shrink-0 cursor-pointer ${
                                                                                                        isCorrect
                                                                                                            ? 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-500/20'
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
                                                                                                    className={`w-full h-9 rounded-xl border bg-card text-foreground px-3 text-xs outline-none transition ${
                                                                                                        isCorrect
                                                                                                            ? 'border-emerald-500 font-bold focus:border-emerald-500'
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
                                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
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
                                                                                    className="w-full h-9 rounded-xl border border-border bg-card text-foreground px-3 text-xs outline-none focus:border-emerald-500 transition"
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        {q.type === 'essay' && (
                                                                            <div className="space-y-1.5 mt-2 pl-1">
                                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
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
                                                                                    className="w-full rounded-xl border border-border bg-card text-foreground px-3.5 py-2 text-xs outline-none focus:border-emerald-500 transition leading-relaxed"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(data.instrument_config?.questions || []).length === 0 && (
                                                            <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl bg-muted/10">
                                                                <p className="text-xs text-muted-foreground font-medium">Belum ada butir pertanyaan. Klik "Tambah Butir Soal" atau gunakan "Rancang Butir Asesmen AI".</p>
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
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Stimulus / Konteks Observasi</label>
                                                            <textarea
                                                                value={data.instrument_config.stimulus || ''}
                                                                onChange={e => updateConfig('stimulus', e.target.value)}
                                                                rows={3}
                                                                placeholder="Tuliskan stimulus atau konteks unjuk kerja..."
                                                                className="w-full bg-card text-card-foreground rounded-xl border border-border p-3 text-xs focus:border-primary outline-none resize-none leading-relaxed"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="text-xs sm:text-sm font-black text-foreground">Indikator Observasi</h3>
                                                            <p className="text-[11px] text-muted-foreground">Tentukan perilaku atau kemampuan yang akan diamati</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={addIndicator}
                                                            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer active:scale-95"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Tambah Indikator
                                                        </button>
                                                    </div>

                                                    <div className="grid gap-2">
                                                        {(data.instrument_config?.indicators || []).map((ind: any, indIdx: number) => (
                                                            <div
                                                                key={indIdx}
                                                                className="flex items-center gap-3 p-3 bg-card text-card-foreground rounded-xl border border-border border-l-4 border-l-primary group relative focus-within:border-primary/50 transition-all shadow-xs"
                                                            >
                                                                <div className="h-6 w-6 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                                                                    {indIdx + 1}
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={ind.name || ind.text || ''}
                                                                    onChange={(e) => updateIndicatorText(indIdx, e.target.value)}
                                                                    placeholder="Contoh: Murid mampu menjelaskan langkah analisis..."
                                                                    className="flex-1 bg-transparent text-xs text-foreground outline-none border-none p-0 focus:ring-0"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeIndicator(indIdx)}
                                                                    className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 cursor-pointer"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {(data.instrument_config?.indicators || []).length === 0 && (
                                                            <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl bg-muted/10">
                                                                <p className="text-xs text-muted-foreground font-medium">Belum ada indikator observasi. Silakan tambahkan indikator baru.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 3. EXIT TICKET & JURNAL REFLEKTIF */}
                                            {(data.instrument_type === 'exit_ticket' || data.instrument_type === 'reflective_journal') && (
                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Stimulus / Instruksi Murid</label>
                                                        <textarea
                                                            value={data.instrument_config?.stimulus || ''}
                                                            onChange={e => updateConfig('stimulus', e.target.value)}
                                                            rows={3}
                                                            placeholder="Tuliskan instruksi penulisan jurnal refleksi murid..."
                                                            className="w-full bg-card text-card-foreground rounded-xl border border-border p-3 text-xs focus:border-primary outline-none resize-none leading-relaxed"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pertanyaan Refleksi</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const qs = [...(data.instrument_config?.questions || [])];
                                                                    qs.push({ text: '' });
                                                                    updateConfig('questions', qs);
                                                                }}
                                                                className="h-7 px-3 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition cursor-pointer"
                                                            >
                                                                + Tambah Pertanyaan
                                                            </button>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            {(data.instrument_config?.questions || []).map((q: any, qIdx: number) => (
                                                                <div key={qIdx} className="flex gap-2 items-center p-2.5 bg-card rounded-xl border border-border group shadow-xs">
                                                                    <span className="text-xs font-mono text-muted-foreground font-bold">{qIdx + 1}.</span>
                                                                    <input
                                                                        value={q.text || ''}
                                                                        onChange={e => {
                                                                            const qs = [...(data.instrument_config?.questions || [])];
                                                                            qs[qIdx] = { ...qs[qIdx], text: e.target.value };
                                                                            updateConfig('questions', qs);
                                                                        }}
                                                                        placeholder="Pertanyaan refleksi..."
                                                                        className="flex-1 bg-transparent text-xs border-none outline-none focus:ring-0 p-0"
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

                                            {/* 4. RUBRIK PROJEK / PORTOFOLIO / UNJUK KERJA */}
                                            {(data.instrument_type === 'project' || data.instrument_type === 'portfolio' || data.instrument_type === 'concept_map') && (
                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Deskripsi Tugas Projek / Portofolio</label>
                                                        <textarea
                                                            value={data.instrument_config?.stimulus || ''}
                                                            onChange={e => updateConfig('stimulus', e.target.value)}
                                                            rows={3}
                                                            placeholder="Jelaskan ruang lingkup projek atau portofolio yang harus dibuat murid..."
                                                            className="w-full bg-card text-card-foreground rounded-xl border border-border p-3 text-xs focus:border-primary outline-none resize-none leading-relaxed"
                                                        />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Jenjang Capaian Rubrik (4 Tingkat PPA 2025)</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {(data.instrument_config?.levels || []).map((lvl: any, lIdx: number) => (
                                                                <div key={lIdx} className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                                                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">{lvl.name}</span>
                                                                    <textarea
                                                                        value={lvl.desc || ''}
                                                                        onChange={e => {
                                                                            const lvls = [...(data.instrument_config?.levels || [])];
                                                                            lvls[lIdx] = { ...lvls[lIdx], desc: e.target.value };
                                                                            updateConfig('levels', lvls);
                                                                        }}
                                                                        rows={2}
                                                                        className="w-full bg-card rounded-lg border border-border p-2 text-xs outline-none focus:border-primary leading-snug resize-none"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* KKTP SECTION */}
                                            <div className="pt-4 border-t border-border/70 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-xs sm:text-sm font-black text-foreground">Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</h3>
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                                        Pendekatan: {data.instrument_config?.kktp?.approach || 'rubric'}
                                                    </Badge>
                                                </div>

                                                <div className="p-4 bg-muted/20 rounded-2xl border border-border/60 space-y-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: 'rubric', label: 'Rubrik 4 Tingkat' },
                                                            { id: 'criteria_description', label: 'Deskripsi Kriteria' },
                                                            { id: 'score_interval', label: 'Interval Nilai' },
                                                            { id: 'percentage', label: 'Persentase' }
                                                        ].map(app => (
                                                            <button
                                                                key={app.id}
                                                                type="button"
                                                                onClick={() => updateKKTP('approach', app.id)}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                                                    (data.instrument_config?.kktp?.approach || 'rubric') === app.id
                                                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                                                        : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                                                                }`}
                                                            >
                                                                {app.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Next */}
                                    <div className="flex justify-between items-center pt-3 border-t border-border/50">
                                        <button
                                            type="button"
                                            onClick={() => openNextPanel(2)}
                                            className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            &larr; Kembali ke Instrumen
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openNextPanel(4)}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 active:scale-95 transition cursor-pointer"
                                        >
                                            Lanjut ke Publikasi &rarr;
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══════════════ PANEL 4: DETAIL PUBLIKASI & TERBITKAN ═══════════════ */}
                        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all">
                            <button
                                type="button"
                                onClick={() => togglePanel(4)}
                                className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition hover:bg-muted/30 cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl font-black text-xs shrink-0 transition-colors ${
                                        isPanel4Complete ? 'bg-emerald-500 text-white shadow-xs' : 'bg-primary/10 text-primary'
                                    }`}>
                                        {isPanel4Complete ? <CheckCircle2 className="h-4 w-4" /> : '4'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm sm:text-base font-black text-foreground">Detail Publikasi & Terbitkan</h2>
                                            {isPanel4Complete && (
                                                <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                                    Siap Terbit
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {data.title ? data.title : 'Judul & Tenggat Waktu Pengumpulan'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`p-1.5 rounded-xl bg-muted/60 text-muted-foreground transition-transform duration-200 ${openPanels[4] ? 'rotate-180' : ''}`}>
                                    <ChevronLeft className="h-4 w-4 -rotate-90" />
                                </div>
                            </button>

                            {openPanels[4] && (
                                <div className="p-4 sm:p-6 border-t border-border/70 space-y-6 animate-in fade-in duration-200">
                                    {/* Pre-Flight Summary Card */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ringkasan Konfigurasi Asesmen</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                            <div className="p-3 bg-card rounded-xl border border-border/60">
                                                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Mata Pelajaran</span>
                                                <span className="font-bold text-foreground truncate block mt-0.5">{selectedSubjectObj?.subject_name || '-'}</span>
                                            </div>
                                            <div className="p-3 bg-card rounded-xl border border-border/60">
                                                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Sasaran Kelas</span>
                                                <span className="font-bold text-foreground truncate block mt-0.5">{data.school_classes.length > 0 ? `${data.school_classes.length} Kelas Terpilih` : 'Belum dipilih'}</span>
                                            </div>
                                            <div className="p-3 bg-card rounded-xl border border-border/60">
                                                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Jenis Asesmen</span>
                                                <span className="font-bold text-foreground truncate block mt-0.5">{selectedTypeName || '-'}</span>
                                            </div>
                                            <div className="p-3 bg-card rounded-xl border border-border/60">
                                                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Instrumen</span>
                                                <span className="font-bold text-foreground truncate block mt-0.5">{selectedInstObj?.name || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Fields: Judul & Instruksi */}
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                <Zap className="h-3.5 w-3.5 text-primary" />
                                                Judul Penugasan
                                            </label>
                                            <input 
                                                type="text"
                                                placeholder="Contoh: Asesmen Formatif 1 – Analisis Teks Eksplanasi"
                                                value={data.title}
                                                onChange={(e) => setData('title', e.target.value)}
                                                className="w-full h-11 rounded-xl border border-border bg-background px-4 text-xs sm:text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                            />
                                            {errors.title && <p className="text-xs text-destructive font-bold">{errors.title}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                <FileText className="h-3.5 w-3.5 text-primary" />
                                                Petunjuk / Instruksi untuk Siswa
                                            </label>
                                            <textarea 
                                                rows={5}
                                                placeholder="Jelaskan langkah pengerjaan atau kriteria tugas secara jelas untuk siswa..."
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition leading-relaxed"
                                            />
                                            {errors.description && <p className="text-xs text-destructive font-bold">{errors.description}</p>}
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                    <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                                    Tenggat Waktu Pengumpulan
                                                </label>
                                                <input 
                                                    type="datetime-local"
                                                    value={data.due_date}
                                                    onChange={(e) => {
                                                        setData('due_date', e.target.value);
                                                        checkHoliday(e.target.value);
                                                    }}
                                                    className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                                />
                                                {holidayWarning && (
                                                    <div className="flex items-start gap-2 text-[10px] font-bold text-warning bg-warning/10 p-2.5 rounded-xl border border-warning/20">
                                                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                        {holidayWarning}
                                                    </div>
                                                )}
                                                {errors.due_date && <p className="text-xs text-destructive font-bold">{errors.due_date}</p>}
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                    <Star className="h-3.5 w-3.5 text-primary" />
                                                    Nilai / Poin Maksimal
                                                </label>
                                                <input 
                                                    type="number"
                                                    value={data.max_points ?? 100}
                                                    onChange={(e) => setData('max_points', e.target.value ? parseInt(e.target.value) : 100)}
                                                    className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                                />
                                                {errors.max_points && <p className="text-xs text-destructive font-bold">{errors.max_points}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Submit */}
                                    <div className="pt-4 border-t border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => openNextPanel(3)}
                                            className="text-xs font-bold text-muted-foreground hover:text-foreground text-center sm:text-left cursor-pointer"
                                        >
                                            &larr; Kembali ke Isi Butir & KKTP
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={processing || !data.title || data.school_classes.length === 0}
                                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                                        >
                                            {processing ? 'Menerbitkan Asesmen...' : '🚀 Terbitkan Asesmen Sekarang'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
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
