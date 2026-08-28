import React, { useState, useEffect, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    ChevronLeft, CheckCircle2, AlertCircle,
    BookOpen, Users, Target, GraduationCap, Info, FileText, Plus, Trash2,
    Check, Lock, Sparkles, Layers, ListChecks, Calendar, ArrowRight,
    Loader2, Sliders, Edit3, HelpCircle, Eye, Calculator, CheckSquare, Zap,
    X, Mic
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

const defaultFormativeQuestions = [
    {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Manakah kelompok perangkat di bawah ini yang seluruhnya termasuk Input Device (perangkat masukan) pada komputer?',
        points: 20,
        options: [
            { id: 'opt_1', text: 'Keyboard, Mouse, dan Scanner', is_correct: true },
            { id: 'opt_2', text: 'Monitor, Speaker, dan Proyektor', is_correct: false },
            { id: 'opt_3', text: 'Printer, Harddisk, dan Flashdisk', is_correct: false },
            { id: 'opt_4', text: 'Processor, RAM, dan Motherboard', is_correct: false },
        ]
    },
    {
        id: 'q2',
        type: 'multiple_choice',
        question: 'Perangkat input berikut yang berfungsi untuk memasukkan suara atau rekaman audio ke dalam komputer adalah...',
        points: 20,
        options: [
            { id: 'opt_1', text: 'Mikrofon (Microphone)', is_correct: true },
            { id: 'opt_2', text: 'Speaker', is_correct: false },
            { id: 'opt_3', text: 'Webcam', is_correct: false },
            { id: 'opt_4', text: 'Headphone', is_correct: false },
        ]
    },
    {
        id: 'q3',
        type: 'multiple_choice',
        question: 'Saat berbelanja di kasir minimarket, petugas menggunakan alat pemindai barcode barang. Alat pemindai barcode tersebut termasuk kelompok...',
        points: 20,
        options: [
            { id: 'opt_1', text: 'Input Device (Perangkat Masukan)', is_correct: true },
            { id: 'opt_2', text: 'Output Device (Perangkat Keluaran)', is_correct: false },
            { id: 'opt_3', text: 'Storage Device (Media Penyimpanan)', is_correct: false },
            { id: 'opt_4', text: 'Processing Device (Unit Pemroses)', is_correct: false },
        ]
    },
    {
        id: 'q4',
        type: 'multiple_choice',
        question: 'Jika kursor pada layar komputer tidak bisa digerakkan saat digunakan, perangkat input apa yang perlu kamu periksa koneksinya?',
        points: 20,
        options: [
            { id: 'opt_1', text: 'Mouse atau Touchpad', is_correct: true },
            { id: 'opt_2', text: 'Monitor', is_correct: false },
            { id: 'opt_3', text: 'Speaker', is_correct: false },
            { id: 'opt_4', text: 'Printer', is_correct: false },
        ]
    },
    {
        id: 'q5',
        type: 'essay',
        question: 'Sebutkan 3 contoh perangkat yang termasuk Input Device pada komputer dan jelaskan fungsi masing-masing perangkat tersebut!',
        points: 20,
        options: [],
        answer_guide: 'Kriteria Jawaban: Siswa menyebutkan minimal 3 perangkat input yang tepat (misal: Keyboard, Mouse, Scanner, Mikrofon) beserta penjelasan fungsi konkretnya dengan benar.'
    }
];

const defaultPpaIntervals = [
    { min: 0, max: 40, label: '0 – 40%', status: 'Belum Tuntas', desc: 'Perlu bimbingan dan remedial di seluruh bagian.' },
    { min: 41, max: 65, label: '41 – 65%', status: 'Belum Tuntas', desc: 'Remedial di bagian yang belum dikuasai.' },
    { min: 66, max: 85, label: '66 – 85%', status: 'Tuntas (KKTP)', desc: 'Sudah mencapai ketuntasan, tidak perlu remedial.' },
    { min: 86, max: 100, label: '86 – 100%', status: 'Tuntas (Pengayaan)', desc: 'Sudah mencapai ketuntasan, perlu pengayaan atau tantangan lebih.' }
];

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

    // Initial Form State
    const { data, setData, post, processing, errors } = useForm({
        assessment_type: initialAssignment?.assessment_type ?? 'formative',
        instrument_type: initialAssignment?.instrument_type ?? 'written_test',
        scoring_tool: initialAssignment?.scoring_tool ?? '',
        scoring_tool_config: initialAssignment?.scoring_tool_config ?? {},
        subject_id: initialAssignment?.subject_id ? String(initialAssignment.subject_id) : '',
        learning_objective_id: initialAssignment?.learning_objective_id ? String(initialAssignment.learning_objective_id) : '',
        school_classes: initialAssignment?.school_classes ?? ([] as number[]),
        title: initialAssignment?.title ?? 'LKPD Formatif: Pemahaman Konsep & Penerapan Materi',
        description: initialAssignment?.description ?? 'Kerjakan 5 butir soal di bawah ini dengan teliti. Pilih opsi jawaban yang paling tepat untuk soal pilihan ganda, dan uraikan penjelasanmu pada soal esai.',
        due_date: initialAssignment?.due_date ?? '',
        max_points: initialAssignment?.max_points ?? 100,
        passing_grade: initialAssignment?.passing_grade ?? 75,
        instrument_config: {
            stimulus: initialAssignment?.instrument_config?.stimulus ?? '',
            criteria: initialAssignment?.instrument_config?.criteria ?? '',
            questions: (initialAssignment?.instrument_config?.questions && initialAssignment.instrument_config.questions.length > 0)
                ? initialAssignment.instrument_config.questions
                : defaultFormativeQuestions,
            indicators: initialAssignment?.instrument_config?.indicators ?? ([] as string[]),
            focus: initialAssignment?.instrument_config?.focus ?? '',
            context: initialAssignment?.instrument_config?.context ?? '',
            teacher_notes: initialAssignment?.instrument_config?.teacher_notes ?? '',
            submission_mode: initialAssignment?.instrument_config?.submission_mode ?? 'hybrid',
            instructions: initialAssignment?.instrument_config?.instructions ?? '',
            levels: (initialAssignment?.instrument_config?.levels && initialAssignment.instrument_config.levels.length > 0)
                ? initialAssignment.instrument_config.levels
                : [
                    { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                    { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar namun belum konsisten.' },
                    { name: 'Baik', desc: 'Siswa menguasai seluruh indikator ketuntasan dengan baik (KKTP).' },
                    { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa dan siap pengayaan.' }
                ],
            shuffle_questions: initialAssignment?.instrument_config?.shuffle_questions ?? false,
            shuffle_options: initialAssignment?.instrument_config?.shuffle_options ?? false,
            kktp: initialAssignment?.instrument_config?.kktp ?? {
                approach: 'score_interval',
                passing_level: 'Baik',
                threshold: 75,
                intervals: defaultPpaIntervals
            }
        },
    });

    // Calculate Accumulated Total Points Live from Questions
    const totalAccumulatedScore = useMemo(() => {
        const questions = data.instrument_config.questions || [];
        return questions.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0);
    }, [data.instrument_config.questions]);

    // Automatically sync max_points with accumulated question score
    useEffect(() => {
        if (totalAccumulatedScore > 0 && data.max_points !== totalAccumulatedScore) {
            setData('max_points', totalAccumulatedScore);
        }
    }, [totalAccumulatedScore]);

    // Check if current instrument is a test/quiz type
    const isTestInstrument = useMemo(() => {
        return ['formative_quiz', 'written_test', 'quiz_survey', 'quiz'].includes(data.instrument_type);
    }, [data.instrument_type]);

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
                    desc: 'Buat 5 butir soal pilihan ganda & esai lengkap dengan kunci jawaban, bobot skor, dan konversi KKTP PPA 2025.',
                    capabilities: ['Pilihan Ganda & Esai', 'Kunci Jawaban Otomatis', 'Akumulasi Skor 100 Poin', 'Konversi Interval KKTP'],
                    ctaLabel: 'Buat Soal & Kunci Jawaban dengan AI',
                    manualLabel: 'Tambah Butir Soal',
                    loadingLabel: 'Menyusun Soal, Kunci & Rubrik...',
                    icon: ListChecks,
                };
            case 'observation_checklist':
            case 'observation':
                return {
                    name: 'Lembar Observasi',
                    desc: 'Buat indikator observasi terstruktur, skala pengamatan guru, dan panduan rubrik penilaian.',
                    capabilities: ['Indikator Pengamatan', 'Skala Ketercapaian', 'Rubrik KKTP'],
                    ctaLabel: 'Buat Instrumen Observasi & Rubrik',
                    manualLabel: 'Tambah Indikator',
                    loadingLabel: 'Menyusun Indikator & Rubrik...',
                    icon: Eye,
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
                    manualLabel: 'Tambah Kriteria',
                    loadingLabel: 'Menyusun Tugas & Rubrik...',
                    icon: FileText,
                };
            case 'reflective_journal':
            case 'reflection':
                return {
                    name: 'Jurnal Reflektif',
                    desc: 'Buat pertanyaan pemantik refleksi mendalam dan rubrik evaluasi kesadaran belajar siswa.',
                    capabilities: ['Pertanyaan Refleksi', 'Panduan Jawaban Siswa', 'Rubrik Evaluasi Diri'],
                    ctaLabel: 'Buat Pertanyaan & Rubrik Refleksi',
                    manualLabel: 'Tambah Pertanyaan',
                    loadingLabel: 'Menyusun Pertanyaan & Rubrik...',
                    icon: HelpCircle,
                };
            case 'self_assessment':
                return {
                    name: 'Penilaian Diri',
                    desc: 'Buat lembar pernyataan checklist penilaian diri dan rubrik refleksi ketuntasan belajar.',
                    capabilities: ['Checklist Kemampuan Diri', 'Bahasa Ramah Siswa', 'Rubrik KKTP'],
                    ctaLabel: 'Buat Lembar Penilaian Diri & Rubrik',
                    manualLabel: 'Tambah Pernyataan',
                    loadingLabel: 'Menyusun Penilaian Diri...',
                    icon: CheckCircle2,
                };
            case 'peer_assessment':
                return {
                    name: 'Penilaian Antarteman',
                    desc: 'Buat kriteria pengamatan antarteman, umpan balik positif, dan rubrik kolaborasi kelompok.',
                    capabilities: ['Kriteria Kolaborasi Tim', 'Panduan Umpan Balik', 'Rubrik Antarteman'],
                    ctaLabel: 'Buat Instrumen Antarteman & Rubrik',
                    manualLabel: 'Tambah Kriteria',
                    loadingLabel: 'Menyusun Antarteman & Rubrik...',
                    icon: Users,
                };
            case 'exit_ticket':
            case 'cats':
                return {
                    name: 'Exit Ticket / CATs',
                    desc: 'Buat pertanyaan cepat 1–2 menit di akhir sesi dan rubrik identifikasi miskonsepsi.',
                    capabilities: ['Pertanyaan Cepat Ringkas', 'Identifikasi Miskonsepsi', 'Rubrik Respon Cepat'],
                    ctaLabel: 'Buat Exit Ticket & Rubrik',
                    manualLabel: 'Tambah Pertanyaan',
                    loadingLabel: 'Menyusun Exit Ticket...',
                    icon: Sparkles,
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
                suggest_type: 'assessment',
                assessment_type: data.assessment_type || 'formative',
                instrument_type: data.instrument_type || 'written_test',
                regenerate: true
            });

            if (res.data) {
                const d = res.data;

                // 1. Process Questions with Points & Answer Keys (Clean Plain Text)
                let formattedQuestions: any[] = [];
                if (d.questions && Array.isArray(d.questions) && d.questions.length > 0) {
                    formattedQuestions = d.questions.map((q: any, idx: number) => {
                        const isMcq = q.type === 'multiple_choice' || (q.options && q.options.length > 0);
                        return {
                            id: q.id || `q_${Date.now()}_${idx}`,
                            type: isMcq ? 'multiple_choice' : (q.type || 'short_answer'),
                            question: cleanPlainText(q.question || q.text || ''),
                            points: q.points || 20,
                            answer_guide: cleanPlainText(q.answer_guide || q.answer || ''),
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
                } else if (['written_test', 'formative_quiz', 'quiz_survey', 'quiz'].includes(data.instrument_type || 'written_test')) {
                    // Fallback to rich 5 default formative questions if API response was missing questions array
                    formattedQuestions = defaultFormativeQuestions;
                }

                // 2. Process Rubric Levels (Clean Plain Text)
                let formattedLevels = [
                    { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                    { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar namun belum konsisten.' },
                    { name: 'Baik', desc: 'Siswa menguasai seluruh indikator ketuntasan dengan baik (KKTP).' },
                    { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa dan siap pengayaan.' }
                ];
                if (d.levels && Array.isArray(d.levels) && d.levels.length > 0) {
                    formattedLevels = d.levels.map((lvl: any) => ({
                        name: cleanPlainText(lvl.name || 'Level'),
                        desc: cleanPlainText(lvl.desc || lvl.description || '')
                    }));
                }

                // 3. Process Indicators (Clean Plain Text)
                let formattedIndicators: string[] = [];
                if (d.indicators && Array.isArray(d.indicators) && d.indicators.length > 0) {
                    formattedIndicators = d.indicators.map((ind: any) => cleanPlainText(typeof ind === 'string' ? ind : ind.name || ind.text || ''));
                }

                // 4. Default Title if empty
                const activeTp = objectives.find(o => o.id === Number(data.learning_objective_id));
                const typeName = data.assessment_type === 'initial' ? 'Asesmen Awal' : data.assessment_type === 'summative' ? 'Asesmen Sumatif' : 'LKPD Formatif';
                const defaultGeneratedTitle = `${typeName}: ${cleanPlainText(activeTp?.description || 'Pembelajaran')}`;

                // Atomic state update for Inertia useForm
                setData(prev => {
                    const finalTitle = d.title ? cleanPlainText(d.title) : (prev.title || defaultGeneratedTitle);
                    const finalDesc = (d.description || d.instructions || d.stimulus) 
                        ? cleanPlainText(d.description || d.instructions || d.stimulus) 
                        : (prev.description || 'Kerjakan 5 butir soal di bawah ini dengan teliti sesuai petunjuk.');

                    return {
                        ...prev,
                        title: finalTitle,
                        description: finalDesc,
                        instrument_config: {
                            ...prev.instrument_config,
                            questions: formattedQuestions,
                            levels: formattedLevels,
                            indicators: formattedIndicators,
                            criteria: cleanPlainText(d.criteria || ''),
                            stimulus: cleanPlainText(d.stimulus || ''),
                            kktp: {
                                approach: prev.instrument_config?.kktp?.approach || 'score_interval',
                                passing_level: 'Baik',
                                threshold: 75,
                                intervals: prev.instrument_config?.kktp?.intervals || defaultPpaIntervals
                            }
                        }
                    };
                });

                setAiSuccessMessage(`✨ 5 Soal, Kunci Jawaban & Rubrik KKTP PPA 2025 berhasil disusun!`);
                setTimeout(() => setAiSuccessMessage(null), 5000);
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
            points: 20,
            options: [
                { id: `opt_1_${Date.now()}`, text: '', is_correct: true },
                { id: `opt_2_${Date.now()}`, text: '', is_correct: false },
                { id: `opt_3_${Date.now()}`, text: '', is_correct: false },
                { id: `opt_4_${Date.now()}`, text: '', is_correct: false },
            ],
            answer_guide: ''
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

    const handleQuestionPointsChange = (qIndex: number, points: number) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        currentQuestions[qIndex].points = Math.max(0, points);
        setData('instrument_config', {
            ...data.instrument_config,
            questions: currentQuestions
        });
    };

    const handleQuestionGuideChange = (qIndex: number, guide: string) => {
        const currentQuestions = [...(data.instrument_config.questions || [])];
        currentQuestions[qIndex].answer_guide = guide;
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

    // Distribute equal points (e.g. 100 / count)
    const handleEvenlyDistributePoints = () => {
        const questions = data.instrument_config.questions || [];
        if (questions.length === 0) return;
        const avg = Math.floor(100 / questions.length);
        const remainder = 100 - (avg * questions.length);
        const updated = questions.map((q: any, idx: number) => ({
            ...q,
            points: idx === 0 ? avg + remainder : avg
        }));
        setData('instrument_config', {
            ...data.instrument_config,
            questions: updated
        });
    };

    // KKTP Handlers
    const handleKktpApproachChange = (approach: string) => {
        setData('instrument_config', {
            ...data.instrument_config,
            kktp: {
                ...data.instrument_config.kktp,
                approach,
                intervals: data.instrument_config.kktp?.intervals || defaultPpaIntervals
            }
        });
    };

    const handleIntervalChange = (idx: number, field: string, val: any) => {
        const currentIntervals = [...(data.instrument_config.kktp?.intervals || defaultPpaIntervals)];
        currentIntervals[idx] = { ...currentIntervals[idx], [field]: val };
        setData('instrument_config', {
            ...data.instrument_config,
            kktp: {
                ...data.instrument_config.kktp,
                intervals: currentIntervals
            }
        });
    };

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
        { id: 2, label: 'Instrumen & Soal' },
        { id: 3, label: 'Detail' },
    ];

    const questionsCount = data.instrument_config.questions?.length || 0;
    const currentKktpApproach = data.instrument_config.kktp?.approach || 'score_interval';

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
                                <p className="text-[11px] text-muted-foreground">Langkah 1 dari 3: Pilih Mata Pelajaran & Tujuan Pembelajaran (TP)</p>
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
                                Tujuan Pembelajaran (TP) <span className="text-destructive">*</span>
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

                {/* ── STEP 2: INSTRUMEN, BUTIR SOAL & KONVERSI KKTP PPA 2025 ── */}
                {currentStep === 2 && (
                    <div className="w-full space-y-4 fade-in">
                        {/* 1. Instrument Type Selector */}
                        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                    <Target className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm sm:text-base font-black text-foreground leading-tight">
                                        Pilih Tipe & Instrumen Asesmen
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground">Langkah 2 dari 3</p>
                                </div>
                            </div>

                            {/* Assessment Type 3-Button Grid */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">
                                    Tipe Asesmen <span className="text-destructive">*</span>
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

                            {/* Instrument Selection Grid */}
                            <div className="space-y-1.5 pt-1">
                                <label className="text-xs font-bold text-foreground">
                                    Instrumen Penilaian <span className="text-destructive">*</span>
                                </label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {(instruments[data.assessment_type] || [
                                        { id: 'formative_quiz', name: 'Tes/Penugasan Singkat', desc: 'Ujian singkat atau kuis untuk memantau penguasaan materi (KKTP Interval)' },
                                        { id: 'performance_observation', name: 'Observasi', desc: 'Pengamatan keterlibatan & perilaku murid (KKTP Deskriptif)' },
                                        { id: 'structured_assignment', name: 'Kinerja / LKPD', desc: 'Lembar kerja/tugas praktik menilai proses & produk (KKTP Deskriptif)' },
                                        { id: 'oral_test', name: 'Lisan', desc: 'Tanya jawab lisan langsung untuk mengukur penalaran konsep (KKTP Interval)' },
                                    ]).map(inst => {
                                        const isSelected = data.instrument_type === inst.id;
                                        return (
                                            <button
                                                key={inst.id}
                                                type="button"
                                                onClick={() => {
                                                    let newKktpApproach = 'score_interval';
                                                    if (['performance_observation', 'observation', 'observation_checklist', 'structured_assignment', 'performance', 'assignment', 'rubric'].includes(inst.id)) {
                                                        newKktpApproach = 'rubric';
                                                    }
                                                    setData(prev => ({
                                                        ...prev,
                                                        instrument_type: inst.id,
                                                        instrument_config: {
                                                            ...prev.instrument_config,
                                                            kktp: {
                                                                ...prev.instrument_config?.kktp,
                                                                approach: newKktpApproach,
                                                            }
                                                        },
                                                        scoring_tool_config: {
                                                            ...prev.scoring_tool_config,
                                                            kktp_approach: newKktpApproach,
                                                        }
                                                    }));
                                                }}
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

                            {/* Context-Aware AI Assistant Generator Card */}
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

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            <button
                                                type="button"
                                                disabled={aiLoading || !data.learning_objective_id}
                                                onClick={handleAiGenerate}
                                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-xs hover:bg-primary/90 transition active:scale-95 cursor-pointer disabled:opacity-50"
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
                                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                                            <span>{aiSuccessMessage}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── BAGIAN DRAF SOAL, KUNCI JAWABAN & SKOR ── */}
                        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-5 shadow-xs">
                            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                        <Edit3 className="h-3.5 w-3.5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-black text-foreground">
                                            {isTestInstrument
                                                ? 'Daftar Butir Soal, Kunci Jawaban & Skor'
                                                : (data.instrument_type === 'performance_observation' || data.instrument_type === 'observation_checklist')
                                                    ? 'Lembar Observasi & Indikator Pengamatan'
                                                    : (data.instrument_type === 'structured_assignment' || data.instrument_type === 'performance')
                                                        ? 'Panduan Tugas Kinerja / LKPD'
                                                        : data.instrument_type === 'oral_test'
                                                            ? 'Panduan Asesmen & Pertanyaan Lisan'
                                                            : 'Rancangan Instrumen & Rubrik Penilaian'}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isTestInstrument
                                                ? 'Setiap soal memiliki skor mandiri dan kunci jawaban yang diakumulasi secara otomatis.'
                                                : (data.instrument_type === 'performance_observation' || data.instrument_type === 'observation_checklist')
                                                    ? 'Aspek pengamatan guru terhadap proses belajar dan keterlibatan siswa di kelas.'
                                                    : (data.instrument_type === 'structured_assignment' || data.instrument_type === 'performance')
                                                        ? 'Petunjuk kerja dan kriteria evaluasi produk/kinerja siswa.'
                                                        : data.instrument_type === 'oral_test'
                                                            ? 'Daftar pertanyaan dan pedoman penilaian respon verbal siswa.'
                                                            : 'Kriteria dan deskriptor capaian ketuntasan pembelajaran.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 1. Judul & Petunjuk Asesmen */}
                            <div className="space-y-3 p-3.5 rounded-xl bg-muted/20 border border-border/70">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground flex items-center gap-1">
                                        <span>Judul Asesmen</span> <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: LKPD Formatif - Pemahaman Konsep Komputer"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[42px]"
                                    />
                                    {errors.title && <p className="text-xs font-bold text-destructive mt-1">{errors.title}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground flex items-center gap-1">
                                        <span>Petunjuk & Deskripsi Pengerjaan Siswa</span> <span className="text-destructive">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Tuliskan petunjuk atau instruksi pengerjaan bagi siswa..."
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[75px]"
                                    />
                                    {errors.description && <p className="text-xs font-bold text-destructive mt-1">{errors.description}</p>}
                                </div>

                                {/* 🔀 Pengacakan Soal & Kunci Jawaban (HANYA MUNCUL DI TES/PENUGASAN SINGKAT) */}
                                {isTestInstrument && (
                                    <div className="grid sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/60">
                                        <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg bg-background/60 border border-border/80 hover:bg-background transition">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(data.instrument_config.shuffle_questions)}
                                                onChange={(e) => setData('instrument_config', {
                                                    ...data.instrument_config,
                                                    shuffle_questions: e.target.checked
                                                })}
                                                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                            />
                                            <div className="min-w-0">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                                    🔀 Acak Posisi Soal
                                                </span>
                                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                                    Nomor urut butir soal akan diacak otomatis saat siswa mengerjakan.
                                                </p>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg bg-background/60 border border-border/80 hover:bg-background transition">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(data.instrument_config.shuffle_options)}
                                                onChange={(e) => setData('instrument_config', {
                                                    ...data.instrument_config,
                                                    shuffle_options: e.target.checked
                                                })}
                                                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                            />
                                            <div className="min-w-0">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                                    🔀 Acak Posisi Pilihan Jawaban (A-D)
                                                </span>
                                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                                    Posisi opsi pilihan ganda dan kunci jawaban akan diacak untuk setiap siswa.
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* 2. Daftar Butir Soal & Skor Header Bar (HANYA MUNCUL DI TES/PENUGASAN SINGKAT) */}
                            {isTestInstrument && (
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                                        <div className="flex items-center gap-2">
                                            <Calculator className="h-4 w-4 text-primary shrink-0" />
                                            <div>
                                                <span className="text-xs font-black text-foreground">
                                                    Total Skor Akumulasi: <span className="text-primary font-black">{totalAccumulatedScore} Poin</span>
                                                </span>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Tersusun dari {questionsCount} butir soal (PG & Esai)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleEvenlyDistributePoints}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border text-foreground hover:bg-muted text-[11px] font-bold transition cursor-pointer"
                                                title="Bagi rata total 100 poin ke seluruh butir soal"
                                            >
                                                <Zap className="h-3 w-3 text-amber-500" />
                                                <span>Bagi Rata (100 Poin)</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddQuestion}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-black transition cursor-pointer hover:bg-primary/90"
                                            >
                                                <Plus className="h-3 w-3" />
                                                <span>{aiContext.manualLabel}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {questionsCount === 0 ? (
                                        <div className="text-center py-5 border border-dashed border-border rounded-xl p-4 bg-muted/10 space-y-1">
                                            <p className="text-xs text-muted-foreground">Belum ada butir soal yang dibuat.</p>
                                            <p className="text-[11px] text-primary font-bold">
                                                Tekan tombol "{aiContext.ctaLabel}" di atas atau "{aiContext.manualLabel}" untuk menambahkan soal.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {data.instrument_config.questions.map((q: any, qIdx: number) => (
                                                <div key={q.id || qIdx} className="rounded-xl border border-border bg-background p-3.5 space-y-2.5 shadow-2xs">
                                                    {/* Card Header: Number, Type, Points & Delete */}
                                                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                                Soal #{qIdx + 1}
                                                            </span>
                                                            <select
                                                                value={q.type}
                                                                onChange={(e) => handleQuestionTypeChange(qIdx, e.target.value)}
                                                                className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-bold text-foreground outline-none cursor-pointer"
                                                            >
                                                                <option value="multiple_choice">Pilihan Ganda</option>
                                                                <option value="short_answer">Isian Singkat</option>
                                                                <option value="essay">Uraian / Esai</option>
                                                            </select>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {/* Score / Points input */}
                                                            <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-lg border border-border/70">
                                                                <span className="text-[10px] font-bold text-muted-foreground">Skor:</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    value={q.points || 0}
                                                                    onChange={(e) => handleQuestionPointsChange(qIdx, Number(e.target.value))}
                                                                    className="w-12 text-center text-xs font-black text-primary bg-transparent outline-none"
                                                                />
                                                                <span className="text-[10px] text-muted-foreground font-bold">Poin</span>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveQuestion(qIdx)}
                                                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                                                                title="Hapus Soal"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Question Text */}
                                                    <textarea
                                                        rows={2}
                                                        placeholder="Tuliskan pertanyaan soal di sini..."
                                                        value={q.question || q.text || ''}
                                                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                                                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                                                    />

                                                    {/* Multiple Choice Options */}
                                                    {q.type === 'multiple_choice' && (
                                                        <div className="space-y-2 pt-1">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                                Pilihan Jawaban & Kunci:
                                                            </p>
                                                            <div className="space-y-1.5">
                                                                {(q.options || []).map((opt: any, optIdx: number) => {
                                                                    const optLabel = String.fromCharCode(65 + optIdx);
                                                                    const isCorrect = Boolean(opt.is_correct);
                                                                    return (
                                                                        <div key={opt.id || optIdx} className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                                                                                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black transition cursor-pointer shrink-0 ${
                                                                                    isCorrect
                                                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                                                        : 'bg-muted text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-700'
                                                                                }`}
                                                                                title={isCorrect ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan kunci jawaban benar'}
                                                                            >
                                                                                {optLabel}
                                                                            </button>
                                                                            <input
                                                                                type="text"
                                                                                placeholder={`Pilihan ${optLabel}...`}
                                                                                value={opt.text}
                                                                                onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                                                                                className={`flex-1 rounded-lg border px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary ${
                                                                                    isCorrect ? 'border-emerald-500 bg-emerald-500/5 font-semibold' : 'border-border bg-card'
                                                                                }`}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveOption(qIdx, optIdx)}
                                                                                className="p-1 text-muted-foreground hover:text-destructive rounded transition"
                                                                                title="Hapus Opsi"
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddOption(qIdx)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-1 cursor-pointer"
                                                            >
                                                                <Plus className="h-3 w-3" /> Tambah Pilihan Opsi
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Essay / Short Answer: Rubric & Answer Key Guide */}
                                                    {q.type !== 'multiple_choice' && (
                                                        <div className="space-y-1 pt-1 p-2.5 rounded-xl bg-muted/30 border border-border/70">
                                                            <label className="text-[10px] font-bold text-foreground flex items-center gap-1">
                                                                <CheckSquare className="h-3 w-3 text-primary" />
                                                                <span>Pedoman Kunci Jawaban & Rubrik Penilaian Guru</span>
                                                            </label>
                                                            <textarea
                                                                rows={2}
                                                                placeholder="Tuliskan kata kunci, indikator jawaban ideal, atau kriteria penilaian untuk memudahkan koreksi..."
                                                                value={q.answer_guide || ''}
                                                                onChange={(e) => handleQuestionGuideChange(qIdx, e.target.value)}
                                                                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 2B. Indikator Lembar Observasi (HANYA MUNCUL DI OBSERVASI) */}
                            {(data.instrument_type === 'performance_observation' || data.instrument_type === 'observation_checklist') && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-primary shrink-0" />
                                            <div>
                                                <span className="text-xs font-black text-foreground">
                                                    Indikator Pengamatan Aktivitas Pembelajaran
                                                </span>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Daftar aspek perilaku, keterampilan, atau keterlibatan yang diobservasi guru.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = data.instrument_config.indicators || [];
                                                setData('instrument_config', {
                                                    ...data.instrument_config,
                                                    indicators: [...current, '']
                                                });
                                            }}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-black transition cursor-pointer hover:bg-primary/90"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>Tambah Indikator</span>
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {(data.instrument_config.indicators && data.instrument_config.indicators.length > 0) ? (
                                            data.instrument_config.indicators.map((ind: string, indIdx: number) => (
                                                <div key={indIdx} className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-primary w-5 shrink-0 text-center">
                                                        {indIdx + 1}.
                                                    </span>
                                                    <input
                                                        type="text"
                                                        placeholder={`Contoh: Siswa aktif berkolaborasi dan menyampaikan gagasan dalam kelompok...`}
                                                        value={ind}
                                                        onChange={(e) => {
                                                            const updated = [...(data.instrument_config.indicators || [])];
                                                            updated[indIdx] = e.target.value;
                                                            setData('instrument_config', {
                                                                ...data.instrument_config,
                                                                indicators: updated
                                                            });
                                                        }}
                                                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = (data.instrument_config.indicators || []).filter((_: any, i: number) => i !== indIdx);
                                                            setData('instrument_config', {
                                                                ...data.instrument_config,
                                                                indicators: updated
                                                            });
                                                        }}
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                                                        title="Hapus Indikator"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 border border-dashed border-border rounded-xl p-4 bg-muted/10">
                                                <p className="text-xs text-muted-foreground">Belum ada indikator pengamatan.</p>
                                                <p className="text-[10px] text-primary font-bold mt-0.5">Gunakan Asisten AI di atas atau klik "Tambah Indikator" untuk menambahkan aspek observasi.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 2C. Panduan Kriteria Tugas LKPD / Kinerja (HANYA MUNCUL DI KINERJA / LKPD) */}
                            {(data.instrument_type === 'structured_assignment' || data.instrument_type === 'performance' || data.instrument_type === 'assignment') && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-primary shrink-0" />
                                            <div>
                                                <span className="text-xs font-black text-foreground">
                                                    Kriteria Keberhasilan & Instruksi LKPD
                                                </span>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Instruksi pengerjaan tugas dan kriteria kualitas karya / hasil kerja siswa.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground">
                                            Kriteria / Aspek Kualitas Tugas
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Tuliskan aspek penilaian LKPD (contoh: 1. Ketepatan analisis, 2. Kerapian penyajian data, 3. Kreativitas solusi)..."
                                            value={data.instrument_config.criteria || ''}
                                            onChange={(e) => setData('instrument_config', {
                                                ...data.instrument_config,
                                                criteria: e.target.value
                                            })}
                                            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 2D. Panduan Pertanyaan Tanya Jawab Lisan (HANYA MUNCUL DI LISAN) */}
                            {data.instrument_type === 'oral_test' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                                        <div className="flex items-center gap-2">
                                            <Mic className="h-4 w-4 text-primary shrink-0" />
                                            <div>
                                                <span className="text-xs font-black text-foreground">
                                                    Panduan Pertanyaan Tanya Jawab Lisan
                                                </span>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Daftar pertanyaan lisan konseptual dan pedoman respon siswa.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddQuestion}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-black transition cursor-pointer hover:bg-primary/90"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>Tambah Pertanyaan</span>
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(data.instrument_config.questions || []).map((q: any, qIdx: number) => (
                                            <div key={q.id || qIdx} className="rounded-xl border border-border bg-background p-3.5 space-y-2 shadow-2xs">
                                                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                                    <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                        Pertanyaan Lisan #{qIdx + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveQuestion(qIdx)}
                                                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                                                        title="Hapus Pertanyaan"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                <textarea
                                                    rows={2}
                                                    placeholder="Tuliskan pertanyaan lisan guru..."
                                                    value={q.question || q.text || ''}
                                                    onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                                                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                                                />

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-foreground">
                                                        Pedoman Jawaban Kunci / Respon yang Diharapkan:
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Kata kunci konsep yang harus dijelaskan siswa..."
                                                        value={q.answer_guide || ''}
                                                        onChange={(e) => handleQuestionGuideChange(qIdx, e.target.value)}
                                                        className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. KONVERSI KE PENDEKATAN KKTP SESUAI PPA 2025 */}
                            <div className="space-y-3 pt-3 border-t border-border/50">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                                            <Sliders className="h-4 w-4 text-primary" />
                                            <span>
                                                {currentKktpApproach === 'score_interval'
                                                    ? 'KKTP Interval Nilai (Panduan PPA 2025)'
                                                    : 'KKTP Deskripsi Kriteria Kualitatif (Panduan PPA 2025)'}
                                            </span>
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground">
                                            {currentKktpApproach === 'score_interval'
                                                ? 'Rentang nilai dan tindak lanjut pembelajaran untuk mengukur ketuntasan belajar siswa.'
                                                : 'Deskriptor 4 level kualitatif untuk mengamati tingkat ketercapaian Tujuan Pembelajaran.'}
                                        </p>
                                    </div>

                                    {/* KKTP Approach Tabs */}
                                    <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleKktpApproachChange('score_interval')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                currentKktpApproach === 'score_interval'
                                                    ? 'bg-card text-foreground shadow-2xs font-black'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Interval Nilai (PPA 2025)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleKktpApproachChange('rubric')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                currentKktpApproach === 'rubric'
                                                    ? 'bg-card text-foreground shadow-2xs font-black'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Deskripsi Kriteria
                                        </button>
                                    </div>
                                </div>

                                {/* PENDEKATAN 1: INTERVAL NILAI & TINDAK LANJUT PPA 2025 */}
                                {currentKktpApproach === 'score_interval' && (
                                    <div className="space-y-2.5">
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {(data.instrument_config.kktp?.intervals || defaultPpaIntervals).map((iv: any, ivIdx: number) => {
                                                const isPassed = iv.status.toLowerCase().includes('tuntas') || iv.status.toLowerCase().includes('pengayaan');
                                                return (
                                                    <div 
                                                        key={ivIdx} 
                                                        className={`p-3 rounded-xl border space-y-1.5 ${
                                                            isPassed 
                                                                ? 'bg-emerald-500/5 border-emerald-500/30' 
                                                                : 'bg-amber-500/5 border-amber-500/30'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-black text-foreground">{iv.label}</span>
                                                                <span className="text-[10px] text-muted-foreground">({iv.min}–{iv.max} Poin)</span>
                                                            </div>
                                                            <Badge variant={isPassed ? 'default' : 'secondary'} className="text-[9px] font-black">
                                                                {iv.status}
                                                            </Badge>
                                                        </div>
                                                        <textarea
                                                            rows={2}
                                                            value={iv.desc}
                                                            onChange={(e) => handleIntervalChange(ivIdx, 'desc', e.target.value)}
                                                            className="w-full rounded-lg border border-border/80 bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* PENDEKATAN 2: RUBRIK KUALITATIF / DESKRIPSI KRITERIA 4 LEVEL */}
                                {currentKktpApproach === 'rubric' && (
                                    <div className="grid gap-2.5 sm:grid-cols-2">
                                        {(data.instrument_config.levels || [
                                            { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                                            { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar.' },
                                            { name: 'Baik', desc: 'Siswa menguasai seluruh indikator dengan baik (KKTP).' },
                                            { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa dan siap pengayaan.' }
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
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: DETAIL TENGGAT WAKTU & PUBLIKASI ── */}
                {currentStep === 3 && (
                    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs fade-in">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-black text-foreground leading-tight">
                                    Pengaturan Nilai & Tenggat Waktu
                                </h2>
                                <p className="text-[11px] text-muted-foreground">Langkah 3 dari 3: Konfirmasi akhir sebelum mempublikasikan asesmen</p>
                            </div>
                        </div>

                        {/* Summary of Draft */}
                        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 space-y-2">
                            <h4 className="text-xs font-black text-foreground">{data.title || 'Asesmen Tanpa Judul'}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">{data.description || 'Tidak ada petunjuk pengerjaan.'}</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    {data.assessment_type === 'initial' ? 'Asesmen Awal' : data.assessment_type === 'summative' ? 'Asesmen Sumatif' : 'Asesmen Formatif'}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-bold text-primary">
                                    {questionsCount} Soal ({totalAccumulatedScore} Poin)
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    {data.school_classes.length} Kelas Target
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    KKTP: {currentKktpApproach === 'score_interval' ? 'Interval Nilai (PPA 2025)' : 'Rubrik Kualitatif'}
                                </Badge>
                            </div>
                        </div>

                        {/* Due Date Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">
                                Tenggat Waktu Pengumpulan (Opsional)
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
                                <label className="text-xs font-bold text-foreground">Poin Maksimal (Akumulasi Soal)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={data.max_points}
                                    onChange={(e) => setData('max_points', Number(e.target.value))}
                                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Batas Ketuntasan (KKTP)</label>
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
                                    <span>{currentStep === 1 ? 'Lanjut ke Instrumen & Soal' : 'Lanjut ke Pengaturan Nilai'}</span>
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
