import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Loader2, AlertTriangle, X } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';

// Modular Subcomponents & Types
// Modular Subcomponents & Types
import { Teaching, Objective, CpItem, Instrument, ScoringTool } from './components/types';
import StepMaterial from './components/StepMaterial';
import StepAssessmentInitial from './components/StepAssessmentInitial';
import StepAssessmentFormative from './components/StepAssessmentFormative';
import StepAssessmentSummative from './components/StepAssessmentSummative';
import TPModal from './components/TPModal';
import PromptSettingsModal from './components/PromptSettingsModal';
import { Settings } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Materi', href: '/materials' },
    { title: 'Rancang Pembelajaran', href: '/instructional-design/create' },
];

interface InstructionalDesignProps {
    teachings: Teaching[];
    objectives: Objective[];
    instruments: Record<string, Instrument[]>;
    scoring_tools: ScoringTool[];
    cpList: CpItem[];
    period: string;
}

/**
 * Sanitize AI-generated HTML: preserve safe semantic tags for ReactQuill,
 * strip dangerous tags (script, style, iframe, etc.), and convert Markdown to HTML.
 */
const sanitizeAiHtml = (text: string | null | undefined): string => {
    if (!text) return '';
    let html = text;

    // 1. Strip dangerous tags entirely (including content)
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    html = html.replace(/<embed\b[^>]*\/?>/gi, '');

    // 2. Remove on* event attributes (onclick, onerror, etc.)
    html = html.replace(/\s+on\w+="[^"]*"/gi, '');
    html = html.replace(/\s+on\w+='[^']*'/gi, '');

    // 3. Convert Markdown to HTML if AI returned Markdown instead of HTML
    const hasHtmlTags = /<(h[1-6]|p|ul|ol|li|strong|em|blockquote|table)\b/i.test(html);
    const hasMarkdown = /^#{1,6}\s+/m.test(html) || /\*\*[^*]+\*\*/m.test(html);

    if (!hasHtmlTags && hasMarkdown) {
        html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
        html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
        html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
        html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
        html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

        html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        html = html.replace(/^[\-\*]\s+(.*)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
        html = html.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');

        html = html.replace(/^(?!<[hupol]|<li|<bl|<ta)(.+)$/gm, '<p>$1</p>');
    }

    // 4. Decode HTML entities
    html = html.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
        .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
        .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019');

    html = html.replace(/>\s{2,}</g, '> <');

    return html.trim();
};

/**
 * Clean plain text: strip all HTML/Markdown for fields like titles, question text, etc.
 */
const cleanPlainText = (text: string | null | undefined): string => {
    if (!text) return '';
    let cleaned = text
        .replace(/<[^>]*>/g, '')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/^#+\s+(.*)$/gm, '$1')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return cleaned.trim();
};

const getErrorLabel = (key: string): string => {
    switch (key) {
        case 'subject_id': return 'Mata Pelajaran';
        case 'school_class_id': return 'Kelas';
        case 'learning_objective_id': return 'Tujuan Pembelajaran (TP)';
        case 'material.title': return 'Judul Materi Ajar';
        case 'initial.title': return 'Judul Asesmen Awal';
        case 'initial.due_date': return 'Batas Waktu Asesmen Awal';
        case 'initial.instrument_type': return 'Jenis Instrumen Asesmen Awal';
        default:
            if (key.startsWith('formative.instruments.')) {
                const parts = key.split('.');
                const index = parseInt(parts[2]) + 1;
                const field = parts[parts.length - 1];
                const fieldName = field === 'title' ? 'Judul' : field === 'due_date' ? 'Batas Waktu' : 'Tipe';
                return `Asesmen Formatif ke-${index}: ${fieldName}`;
            }
            if (key.startsWith('summative.instruments.')) {
                const parts = key.split('.');
                const index = parseInt(parts[2]) + 1;
                const field = parts[parts.length - 1];
                const fieldName = field === 'title' ? 'Judul' : field === 'due_date' ? 'Batas Waktu' : 'Tipe';
                return `Asesmen Sumatif ke-${index}: ${fieldName}`;
            }
            return key;
    }
};

export default function InstructionalDesignCreate({
    teachings,
    objectives,
    instruments,
    scoring_tools,
    cpList,
    period,
}: InstructionalDesignProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [aiNotification, setAiNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);

    useEffect(() => {
        if (aiNotification) {
            const timer = setTimeout(() => {
                setAiNotification(null);
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [aiNotification]);

    // TP Modal Formulation Wizard State
    const [showTPModal, setShowTPModal] = useState(false);
    const [activeTPTab, setActiveTPTab] = useState<'direct' | 'analysis' | 'cross_element'>('direct');
    const [selectedCps, setSelectedCps] = useState<number[]>([]);
    const [directSuggestions, setDirectSuggestions] = useState<{ text: string; is_used: boolean }[]>([]);
    const [isGeneratingTP, setIsGeneratingTP] = useState(false);
    const [tpForm, setTpForm] = useState({ code: '', description: '', cp_id: '', competence: '', content: '', subject_id: '' });

    // Inertia form definition matching original structure
    const { data, setData, post, processing, errors, transform } = useForm({
        subject_id: '',
        school_class_id: '',
        learning_objective_id: '',
        teaching_id: '',

        // Step 1: Material & Activities
        material_title: '',
        material_content: '',
        pedagogical_model: 'Direct',
        activity_understanding: '',
        activity_application: '',
        activity_reflection: '',
        image_prompt: '',
        lkpd: '',
        attachment: null as File | null,
        resources: [] as any[],

        // Step 2: Initial Assessment (Diagnostic)
        initial: {
            enabled: false,
            instrument_type: '',
            scoring_tool: '',
            scoring_tool_config: {} as any,
            title: '',
            due_date: '',
            instrument_config: {
                stimulus: '',
                questions: [] as any[],
                indicators: [] as any[],
                levels: [
                    { name: 'Perlu Bimbingan', desc: '' },
                    { name: 'Cukup', desc: '' },
                    { name: 'Baik', desc: '' },
                    { name: 'Sangat Baik', desc: '' }
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
            }
        },

        // Step 3: Formative Assessment
        formative: {
            enabled: true,
            instruments: [] as any[],
        },

        // Step 4: Summative Assessment
        summative: {
            enabled: true,
            instruments: [] as any[],
        }
    });

    // Click counts to track if request is a second/regenerate request
    const [fullDraftClickCount, setFullDraftClickCount] = useState(0);
    const [experiencesClickCount, setExperiencesClickCount] = useState(0);
    const [assessmentClickCounts, setAssessmentClickCounts] = useState<Record<string, number>>({});
    const [tpClickCount, setTpClickCount] = useState(0);

    // Reset click counts when inputs change to enable fresh caching
    useEffect(() => {
        setFullDraftClickCount(0);
        setExperiencesClickCount(0);
    }, [data.learning_objective_id, data.pedagogical_model]);

    useEffect(() => {
        setAssessmentClickCounts({});
    }, [data.learning_objective_id]);

    useEffect(() => {
        setTpClickCount(0);
    }, [activeTPTab, tpForm.cp_id, selectedCps]);

    const validateStep = (step: number): Record<string, string> => {
        const stepErrors: Record<string, string> = {};

        if (step === 1) {
            if (!data.subject_id) {
                stepErrors.subject_id = 'Mata Pelajaran wajib dipilih.';
            }
            if (!data.school_class_id) {
                stepErrors.school_class_id = 'Kelas wajib dipilih.';
            }
            if (!data.learning_objective_id) {
                stepErrors.learning_objective_id = 'Tujuan Pembelajaran (TP) wajib dipilih.';
            }
            if (!data.material_title || !data.material_title.trim()) {
                stepErrors.material_title = 'Judul Materi Ajar wajib diisi.';
            }
        }

        if (step === 2) {
            if (data.initial.enabled) {
                if (!data.initial.instrument_type) {
                    stepErrors['initial.instrument_type'] = 'Jenis instrumen Asesmen Awal wajib dipilih.';
                }
                if (!data.initial.title || !data.initial.title.trim()) {
                    stepErrors['initial.title'] = 'Judul Asesmen Awal wajib diisi.';
                }
                if (!data.initial.due_date) {
                    stepErrors['initial.due_date'] = 'Batas waktu Asesmen Awal wajib diisi.';
                }
            }
        }

        if (step === 3) {
            if (data.formative.instruments) {
                data.formative.instruments.forEach((inst: any, idx: number) => {
                    if (!inst.title || !inst.title.trim()) {
                        stepErrors[`formative.instruments.${idx}.title`] = `Judul Asesmen Formatif ke-${idx + 1} wajib diisi.`;
                    }
                    if (!inst.due_date) {
                        stepErrors[`formative.instruments.${idx}.due_date`] = `Batas waktu Asesmen Formatif ke-${idx + 1} wajib diisi.`;
                    }
                });
            }
        }

        return stepErrors;
    };

    const handleStepChange = (targetStep: number) => {
        if (targetStep <= currentStep) {
            setCurrentStep(targetStep);
            setLocalErrors({});
            return;
        }

        let newErrors: Record<string, string> = {};
        for (let s = currentStep; s < targetStep; s++) {
            const stepErrors = validateStep(s);
            newErrors = { ...newErrors, ...stepErrors };
            if (Object.keys(stepErrors).length > 0) {
                setCurrentStep(s);
                break;
            }
        }

        setLocalErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            setCurrentStep(targetStep);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let allErrors: Record<string, string> = {};
        for (let s = 1; s <= 4; s++) {
            const stepErrors = validateStep(s);
            allErrors = { ...allErrors, ...stepErrors };
        }

        // Validate step 4 (summative)
        if (data.summative.instruments) {
            data.summative.instruments.forEach((inst: any, idx: number) => {
                if (!inst.title || !inst.title.trim()) {
                    allErrors[`summative.instruments.${idx}.title`] = `Judul Asesmen Sumatif ke-${idx + 1} wajib diisi.`;
                }
                if (!inst.due_date) {
                    allErrors[`summative.instruments.${idx}.due_date`] = `Batas waktu Asesmen Sumatif ke-${idx + 1} wajib diisi.`;
                }
            });
        }

        setLocalErrors(allErrors);

        if (Object.keys(allErrors).length > 0) {
            for (let s = 1; s <= 4; s++) {
                const stepErrors = validateStep(s);
                if (s === 4 && data.summative.instruments) {
                    data.summative.instruments.forEach((inst: any, idx: number) => {
                        if (!inst.title || !inst.title.trim() || !inst.due_date) {
                            stepErrors[`summative.instruments.${idx}`] = 'err';
                        }
                    });
                }
                if (Object.keys(stepErrors).length > 0) {
                    setCurrentStep(s);
                    break;
                }
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Transform flat keys to nested structure that controller expects
        transform((currentData) => ({
            subject_id: currentData.subject_id,
            school_class_id: currentData.school_class_id,
            learning_objective_id: currentData.learning_objective_id,
            teaching_id: currentData.teaching_id,

            material: {
                title: currentData.material_title,
                content: currentData.material_content,
                pedagogical_model: currentData.pedagogical_model,
                learning_environment: 'Physical', // default
                understanding_activity: currentData.activity_understanding,
                application_activity: currentData.activity_application,
                reflection_activity: currentData.activity_reflection,
                image_prompt: currentData.image_prompt,
                lkpd: currentData.lkpd,
                resources: currentData.resources,
                thumbnail: null // handled by file input or if needed
            },

            initial: currentData.initial,
            formative: {
                ...currentData.formative,
                enabled: !!(currentData.formative.instruments && currentData.formative.instruments.length > 0)
            },
            summative: {
                ...currentData.summative,
                enabled: !!(currentData.summative.instruments && currentData.summative.instruments.length > 0)
            }
        }));

        post(route('instructional-design.store'), {
            forceFormData: true,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
            e.preventDefault();
        }
    };

    // AI suggestions orchestrator: Draft the entire lesson plan in one click
    const handleSuggestFullDraft = async () => {
        if (!data.learning_objective_id) return;
        setIsSuggesting(true);

        try {
            const response = await axios.post(route('instructional-design.auto-suggest'), {
                learning_objective_id: data.learning_objective_id,
                pedagogical_model: data.pedagogical_model,
                suggest_type: 'full_draft',
                regenerate: fullDraftClickCount > 0
            });

            if (response.data) {
                setFullDraftClickCount(prev => prev + 1);
                const draft = response.data;

                if (draft.ai_active === false) {
                    setAiNotification({
                        message: 'Koneksi AI (Gemini) tidak aktif atau kuota API telah habis. Sistem secara cerdas beralih menggunakan draf offline berkualitas tinggi secara otomatis.',
                        type: 'warning'
                    });
                }

                setData((prev: any) => ({
                    ...prev,
                    material_title: cleanPlainText(draft.title) || '',
                    material_content: sanitizeAiHtml(draft.content) || '',
                    image_prompt: cleanPlainText(draft.image_prompt) || '',
                    activity_understanding: sanitizeAiHtml(draft.understanding) || '',
                    activity_application: sanitizeAiHtml(draft.application) || '',
                    activity_reflection: sanitizeAiHtml(draft.reflection) || '',
                    lkpd: sanitizeAiHtml(draft.lkpd) || ''
                }));
            }
        } catch (error) {
            console.error('Error orchestrating AI lesson draft:', error);
        } finally {
            setIsSuggesting(false);
        }
    };

    // AI suggestion for Step 1 (RPP Learning Experiences)
    const handleSuggestExperiences = async () => {
        if (!data.learning_objective_id) return;
        setIsSuggesting(true);

        try {
            const response = await axios.post(route('instructional-design.auto-suggest'), {
                learning_objective_id: data.learning_objective_id,
                pedagogical_model: data.pedagogical_model,
                suggest_type: 'experiences',
                regenerate: experiencesClickCount > 0
            });

            if (response.data) {
                setExperiencesClickCount(prev => prev + 1);
                const suggestions = response.data;

                if (suggestions.ai_active === false) {
                    setAiNotification({
                        message: 'Koneksi AI (Gemini) tidak aktif atau kuota API telah habis. Sistem secara cerdas beralih menggunakan aktivitas offline berkualitas tinggi secara otomatis.',
                        type: 'warning'
                    });
                }

                setData((prev: any) => ({
                    ...prev,
                    activity_understanding: sanitizeAiHtml(suggestions.understanding) || '',
                    activity_application: sanitizeAiHtml(suggestions.application) || '',
                    activity_reflection: sanitizeAiHtml(suggestions.reflection) || '',
                }));
            }
        } catch (error) {
            console.error('Error suggesting experiences:', error);
        } finally {
            setIsSuggesting(false);
        }
    };

    // AI suggestion for Steps 2, 3, and 4 (Assessments)
    const handleAssessmentSuggest = async (
        assessmentKey: 'initial' | 'formative' | 'summative',
        type: string,
        idx: number | null = null
    ) => {
        if (!data.learning_objective_id) return;
        setIsSuggesting(true);

        const cacheKey = `${assessmentKey}_${type}_${idx !== null ? idx : 'single'}`;
        const currentCount = assessmentClickCounts[cacheKey] || 0;

        try {
            const currentInstrument = idx !== null
                ? (data as any)[assessmentKey]?.instruments?.[idx]
                : null;
            const observationMode = currentInstrument?.instrument_config?.observation_mode || 'checklist';
            const quizMode = currentInstrument?.instrument_config?.quiz_mode || 'mcq';

            const response = await axios.post(route('instructional-design.auto-suggest'), {
                learning_objective_id: data.learning_objective_id,
                instrument_type: type,
                suggest_type: 'assessment',
                regenerate: currentCount > 0,
                material_title: data.material_title,
                material_content: data.material_content,
                observation_mode: observationMode,
                quiz_mode: quizMode
            });

            const suggestion = response.data;

            if (suggestion.ai_active === false) {
                setAiNotification({
                    message: 'Koneksi AI (Gemini) tidak aktif atau kuota API telah habis. Sistem secara cerdas beralih menggunakan instrumen offline berkualitas tinggi secara otomatis.',
                    type: 'warning'
                });
            }

            setAssessmentClickCounts(prev => ({
                ...prev,
                [cacheKey]: currentCount + 1
            }));

            setData((prevData: any) => {
                const updatedData = { ...prevData };

                if ((assessmentKey === 'formative' || assessmentKey === 'summative') && idx !== null) {
                    const instrumentsArray = [...updatedData[assessmentKey].instruments];
                    instrumentsArray[idx] = {
                        ...instrumentsArray[idx],
                        instrument_type: type,
                        instrument_config: {
                            ...instrumentsArray[idx].instrument_config,
                            stimulus: cleanPlainText(suggestion.stimulus || instrumentsArray[idx].instrument_config.stimulus),
                            observation_mode: suggestion.observation_mode || instrumentsArray[idx].instrument_config.observation_mode || 'checklist',
                            performance_mode: suggestion.performance_mode || instrumentsArray[idx].instrument_config.performance_mode || 'rubric',
                            levels: (suggestion.levels || instrumentsArray[idx].instrument_config.levels || []).map((lvl: any) => ({
                                ...lvl,
                                name: cleanPlainText(lvl.name),
                                desc: cleanPlainText(lvl.desc)
                            })),
                            development_levels: (suggestion.development_levels || instrumentsArray[idx].instrument_config.development_levels || []).map((dl: any) => ({
                                ...dl,
                                name: cleanPlainText(dl.name),
                                desc: cleanPlainText(dl.desc)
                            })),
                            questions: (suggestion.questions || instrumentsArray[idx].instrument_config.questions || []).map((q: any) => ({
                                ...q,
                                text: cleanPlainText(q.text),
                                options: (q.options || []).map((opt: any) => ({
                                    ...opt,
                                    text: cleanPlainText(opt.text)
                                }))
                            })),
                            indicators: (suggestion.indicators || instrumentsArray[idx].instrument_config.indicators || []).map((ind: any) => ({
                                ...ind,
                                name: cleanPlainText(ind.name),
                                note: cleanPlainText(ind.note || ''),
                                checked: ind.checked ?? false,
                                current_level: ind.current_level ?? 0
                            })),
                            criteria: cleanPlainText(suggestion.criteria || instrumentsArray[idx].instrument_config.criteria),
                            teacher_notes: cleanPlainText(suggestion.teacher_notes || instrumentsArray[idx].instrument_config.teacher_notes),
                            kktp: suggestion.kktp || instrumentsArray[idx].instrument_config.kktp,
                        }
                    };
                    updatedData[assessmentKey] = { ...updatedData[assessmentKey], instruments: instrumentsArray };
                } else {
                    const currentSection = updatedData[assessmentKey];
                    updatedData[assessmentKey] = {
                        ...currentSection,
                        instrument_type: type,
                        instrument_config: {
                            ...currentSection.instrument_config,
                            stimulus: cleanPlainText(suggestion.stimulus || currentSection.instrument_config.stimulus),
                            levels: (suggestion.levels || currentSection.instrument_config.levels || []).map((lvl: any) => ({
                                ...lvl,
                                name: cleanPlainText(lvl.name),
                                desc: cleanPlainText(lvl.desc)
                            })),
                            questions: (suggestion.questions || currentSection.instrument_config.questions || []).map((q: any) => ({
                                ...q,
                                text: cleanPlainText(q.text),
                                options: (q.options || []).map((opt: any) => ({
                                    ...opt,
                                    text: cleanPlainText(opt.text)
                                }))
                            })),
                            indicators: (suggestion.indicators || currentSection.instrument_config.indicators || []).map((ind: any) => ({
                                ...ind,
                                name: cleanPlainText(ind.name)
                            })),
                            criteria: cleanPlainText(suggestion.criteria || currentSection.instrument_config.criteria),
                            teacher_notes: cleanPlainText(suggestion.teacher_notes || currentSection.instrument_config.teacher_notes),
                            kktp: suggestion.kktp || currentSection.instrument_config.kktp,
                        }
                    };
                }

                return updatedData;
            });
        } catch (error) {
            console.error('Failed to suggest assessment:', error);
        } finally {
            setIsSuggesting(false);
        }
    };

    // TP Modal Formulation Suggestion
    const suggestObjectives = async () => {
        if (activeTPTab === 'direct' && !tpForm.cp_id) return;
        if (activeTPTab === 'analysis' && !tpForm.cp_id) return;
        if (activeTPTab === 'cross_element' && selectedCps.length < 2) return;

        setIsGeneratingTP(true);
        try {
            const response = await axios.post(route('learning-objectives.auto-suggest'), {
                method: activeTPTab,
                cp_id: tpForm.cp_id,
                cp_ids: selectedCps,
                subject_id: data.subject_id,
                regenerate: tpClickCount > 0
            });

            setTpClickCount(prev => prev + 1);

            if (response.data.ai_active === false) {
                setAiNotification({
                    message: 'Koneksi AI (Gemini) tidak aktif atau kuota API telah habis. Sistem secara cerdas beralih menggunakan rumusan offline berkualitas tinggi secara otomatis.',
                    type: 'warning'
                });
            }

            if (activeTPTab === 'direct') {
                const cleanedDirect = (response.data.suggestions || []).map((s: any) => ({
                    ...s,
                    text: cleanPlainText(s.text)
                }));
                setDirectSuggestions(cleanedDirect);
            } else if (activeTPTab === 'analysis') {
                const { analysis } = response.data;
                const competenceStr = cleanPlainText(analysis.competences.map((c: any) => c.verb).join(', '));
                const contentStr = cleanPlainText(analysis.content);
                setTpForm({
                    ...tpForm,
                    competence: competenceStr,
                    content: contentStr,
                    description: cleanPlainText(`${competenceStr.charAt(0).toUpperCase() + competenceStr.slice(1)} ${contentStr}`)
                });
            } else if (activeTPTab === 'cross_element') {
                setTpForm({ ...tpForm, description: cleanPlainText(response.data.suggestion || '') });
            }
        } catch (error) {
            console.error("Auto suggest TP failed", error);
        } finally {
            setIsGeneratingTP(false);
        }
    };

    // TP Formulation Save Handler
    const handleCreateTP = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tpForm.description || !data.subject_id) return;

        router.post(route('learning-objectives.store'), {
            subject_id: data.subject_id,
            school_class_id: data.school_class_id,
            code: tpForm.code,
            description: tpForm.description,
            cp_id: tpForm.cp_id,
            cp_ids: selectedCps,
            competence: tpForm.competence,
            content: tpForm.content,
            formulation_method: activeTPTab,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowTPModal(false);
                setTpForm({ code: '', description: '', cp_id: '', competence: '', content: '', subject_id: '' });
                setDirectSuggestions([]);
                setSelectedCps([]);
            }
        });
    };

    const getDefaultKKTPApproach = (assessmentKey: 'initial' | 'formative' | 'summative', instrumentType: string) => {
        if (assessmentKey === 'initial') return 'rubric';
        if (assessmentKey === 'formative') {
            if (['self_assessment', 'peer_assessment', 'reflective_journal', 'exit_ticket', 'performance_observation', 'guided_discussion'].includes(instrumentType)) {
                return 'criteria_description';
            }
            if (instrumentType === 'formative_quiz') return 'percentage';
            return 'rubric';
        }
        if (assessmentKey === 'summative') {
            if (instrumentType === 'written_test') return 'score_interval';
            return 'rubric';
        }
        return 'rubric';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rancang Pembelajaran Terpadu" />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* Steps Header bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-[16px] font-bold uppercase tracking-wider text-foreground">Rancang Pembelajaran Baru</h2>
                            <p className="text-[11px] text-muted-foreground uppercase font-mono tracking-wider mt-0.5">Tahun Ajaran: {period || '-'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowPromptModal(true)}
                            className="h-8 px-3 rounded-lg border border-border hover:border-primary/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition flex items-center gap-1.5 bg-popover"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            Konfigurasi Prompt AI
                        </button>
                    </div>

                    {/* Step Wizard indicators */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        {[
                            { step: 1, label: 'Materi & RPP' },
                            { step: 2, label: 'Asesmen Awal' },
                            { step: 3, label: 'Formatif' },
                            { step: 4, label: 'Sumatif' }
                        ].map(s => (
                            <button
                                key={s.step}
                                type="button"
                                onClick={() => handleStepChange(s.step)}
                                className={`h-8 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${
                                    currentStep === s.step
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-popover border-border text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {s.step}. {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Wizard main contents based on Step */}
                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
                    {(Object.keys(errors).length > 0 || Object.keys(localErrors).length > 0) && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
                            <div className="flex-1 space-y-1">
                                <h4 className="text-xs font-black uppercase tracking-wider text-red-700 dark:text-red-300">Terdapat Kesalahan Pengisian</h4>
                                <ul className="text-[11px] space-y-1 font-semibold list-disc list-inside text-red-600/90 dark:text-red-400/90">
                                    {Object.entries(localErrors).map(([key, err]) => (
                                        <li key={`local-${key}`}>
                                            <span className="font-bold text-red-800 dark:text-red-200">{getErrorLabel(key)}</span>: {err}
                                        </li>
                                    ))}
                                    {Object.entries(errors).map(([key, err]) => (
                                        <li key={`backend-${key}`}>
                                            <span className="font-bold text-red-800 dark:text-red-200">{getErrorLabel(key)}</span>: {err}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {currentStep === 1 && (
                        <StepMaterial
                            data={data}
                            setData={setData}
                            teachings={teachings}
                            objectives={objectives}
                            setShowTPModal={setShowTPModal}
                            processing={isSuggesting}
                            handleSuggestExperiences={handleSuggestExperiences}
                            handleSuggestFullDraft={handleSuggestFullDraft}
                            localErrors={localErrors}
                        />
                    )}

                    {currentStep === 2 && (
                        <StepAssessmentInitial
                            data={data}
                            setData={setData}
                            instruments={instruments.initial || []}
                            scoringTools={scoring_tools}
                            processing={processing}
                            isSuggesting={isSuggesting}
                            handleAssessmentSuggest={handleAssessmentSuggest}
                            getDefaultKKTPApproach={getDefaultKKTPApproach}
                            localErrors={localErrors}
                        />
                    )}

                    {currentStep === 3 && (
                        <StepAssessmentFormative
                            data={data}
                            setData={setData}
                            instruments={instruments.formative || []}
                            scoringTools={scoring_tools}
                            processing={processing}
                            isSuggesting={isSuggesting}
                            handleAssessmentSuggest={handleAssessmentSuggest}
                            getDefaultKKTPApproach={getDefaultKKTPApproach}
                            localErrors={localErrors}
                        />
                    )}

                    {currentStep === 4 && (
                        <StepAssessmentSummative
                            data={data}
                            setData={setData}
                            instruments={instruments.summative || []}
                            scoringTools={scoring_tools}
                            processing={processing}
                            isSuggesting={isSuggesting}
                            handleAssessmentSuggest={handleAssessmentSuggest}
                            getDefaultKKTPApproach={getDefaultKKTPApproach}
                            localErrors={localErrors}
                        />
                    )}

                    {/* Step Navigation footer buttons */}
                    <div className="flex items-center justify-between border-t border-border pt-6 mt-8 bg-card p-4 rounded-xl border">
                        <button
                            type="button"
                            onClick={() => handleStepChange(Math.max(currentStep - 1, 1))}
                            disabled={currentStep === 1}
                            className="h-10 px-4 rounded-lg bg-popover border border-border text-foreground hover:bg-muted/10 font-semibold text-[13px] flex items-center gap-2 transition disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" /> Kembali
                        </button>

                        <div className="flex items-center gap-3">
                            {currentStep < 4 ? (
                                <button
                                    key="btn-next-step"
                                    type="button"
                                    onClick={() => handleStepChange(currentStep + 1)}
                                    className="h-10 px-5 rounded-lg bg-primary text-white hover:bg-primary-hover font-semibold text-[13px] flex items-center gap-2 shadow-lg shadow-primary/20 transition"
                                >
                                    Lanjut <ChevronRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <button
                                    key="btn-submit-form"
                                    type="submit"
                                    disabled={processing}
                                    className="h-10 px-5 rounded-lg bg-primary text-white hover:bg-primary-hover font-semibold text-[13px] flex items-center gap-2 shadow-lg shadow-primary/20 transition disabled:opacity-50"
                                >
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Simpan Rencana Pembelajaran
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Formulation TP Modal Dialog */}
            <TPModal
                isOpen={showTPModal}
                onClose={() => setShowTPModal(false)}
                cpList={cpList}
                subjectId={data.subject_id}
                processing={isGeneratingTP}
                activeTPTab={activeTPTab}
                setActiveTPTab={setActiveTPTab}
                tpForm={tpForm}
                setTpForm={setTpForm}
                selectedCps={selectedCps}
                setSelectedCps={setSelectedCps}
                directSuggestions={directSuggestions}
                setDirectSuggestions={setDirectSuggestions}
                suggestObjectives={suggestObjectives}
                handleCreateTP={handleCreateTP}
            />

            {/* AI Prompt Settings Slide-Over/Modal */}
            <PromptSettingsModal
                isOpen={showPromptModal}
                onClose={() => setShowPromptModal(false)}
            />

            {/* AI Notification Alert */}
            {aiNotification && (
                <div className="fixed bottom-6 right-6 z-[999] flex max-w-md items-start gap-4 rounded-2xl border border-amber-500/20 bg-amber-50/95 dark:bg-amber-950/90 p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase tracking-wider">AI Offline / Quota Habis</h4>
                        <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 leading-relaxed font-semibold">
                            {aiNotification.message}
                        </p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setAiNotification(null)}
                        className="rounded-lg p-1 text-amber-900/40 hover:text-amber-900 dark:text-amber-100/40 dark:hover:text-amber-100 hover:bg-amber-500/10 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </AppLayout>
    );
}
