import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ChevronLeft, Sparkles, Settings, Save, Loader2, BookOpen, 
    Layers, ClipboardList, Eye, CheckCircle2, AlertCircle
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'clean']
    ],
};

interface ModulAjar {
    id: number;
    subject_id: number;
    school_class_id: number;
    learning_objective_id: number;
    material_id: number;
    pedagogical_model: string;
    general_info: string;
    learning_design: string;
    learning_steps: string;
    assessment_plan: string;
    kktp_details: string;
    lkpd: string;
    learning_resources: string;
    ai_prompt_used: string | null;
}

interface Objective {
    id: number;
    code: string;
    description: string;
    subject_id: number;
}

interface Teaching {
    id: number;
    subject_id: number;
    subject_name: string;
    school_class_id: number;
    class_name: string;
}

interface Material {
    id: number;
    subject_id: number;
    learning_objective_id: number;
    title: string;
}

interface EditProps {
    modulAjar: ModulAjar;
    teachings: Teaching[];
    objectives: Objective[];
    materials: Material[];
    period: string;
}

interface Assessment {
    id: number;
    title: string;
    instrument_type: string;
}

export default function Edit({ modulAjar, teachings, objectives, materials, period }: EditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Pembelajaran', href: '/lesson-plans' },
        { title: `Edit Modul Ajar #${modulAjar.id}`, href: `/lesson-plans/${modulAjar.id}/edit` },
    ];

    const [pedagogicalModel, setPedagogicalModel] = useState<string>(modulAjar.pedagogical_model || 'PBL');
    
    const [customPrompt, setCustomPrompt] = useState<string>(modulAjar.ai_prompt_used || '');
    const [isPromptEditorVisible, setIsPromptEditorVisible] = useState(false);
    
    // Loaded dynamically based on chosen TP and Subject
    const [relatedAssessments, setRelatedAssessments] = useState<{
        initial: Assessment[];
        formative: Assessment[];
        summative: Assessment[];
    }>({ initial: [], formative: [], summative: [] });
    const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);

    // AI Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiNotification, setAiNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);

    // Parse JSON from general_info if possible
    let parsedData: any = {};
    try {
        if (modulAjar.general_info && modulAjar.general_info.trim().startsWith('{')) {
            parsedData = JSON.parse(modulAjar.general_info);
        }
    } catch (e) {
        console.error("Failed to parse general_info JSON");
    }

    const [alokasiWaktu, setAlokasiWaktu] = useState(parsedData.alokasi_waktu || '');
    const [jumlahPertemuan, setJumlahPertemuan] = useState(parsedData.jumlah_pertemuan || '');
    const [dimensiProfil, setDimensiProfil] = useState<string[]>(Array.isArray(parsedData.dimensi_profil) ? parsedData.dimensi_profil : (parsedData.dimensi_profil ? [parsedData.dimensi_profil] : []));
    const [rencanaAsesmenAwal, setRencanaAsesmenAwal] = useState((parsedData.rencana_asesmen_awal || '').replace(/&nbsp;/g, ' '));
    const [lingkunganPembelajaran, setLingkunganPembelajaran] = useState(parsedData.lingkungan_pembelajaran || '');
    const [kemitraanPembelajaran, setKemitraanPembelajaran] = useState(parsedData.kemitraan_pembelajaran || '');
    const [pemanfaatanDigital, setPemanfaatanDigital] = useState(parsedData.pemanfaatan_digital || '');
    const [asesmenFormatif, setAsesmenFormatif] = useState((parsedData.asesmen_formatif || '').replace(/&nbsp;/g, ' '));
    const [asesmenSumatif, setAsesmenSumatif] = useState((parsedData.asesmen_sumatif || '').replace(/&nbsp;/g, ' '));
    const [mediaIlustrasi, setMediaIlustrasi] = useState(parsedData.media_ilustrasi || '');
    
    const [understanding, setUnderstanding] = useState((parsedData.understanding || '').replace(/&nbsp;/g, ' '));
    const [application, setApplication] = useState((parsedData.application || '').replace(/&nbsp;/g, ' '));
    const [reflection, setReflection] = useState((parsedData.reflection || '').replace(/&nbsp;/g, ' '));
    const [lkpd, setLkpd] = useState((parsedData.lkpd || modulAjar.lkpd || '').replace(/&nbsp;/g, ' '));

    const [activeTab, setActiveTab] = useState<string>('identifikasi');
    const [isSaving, setIsSaving] = useState(false);

    // Get current parameters
    const subjectInfo = teachings.find(t => t.subject_id === modulAjar.subject_id && t.school_class_id === modulAjar.school_class_id);
    const objectiveInfo = objectives.find(o => o.id === modulAjar.learning_objective_id);
    const materialInfo = materials.find(m => m.id === modulAjar.material_id);

    // Fetch related assessments asynchronusly
    useEffect(() => {
        setIsAssessmentsLoading(true);
        axios.post(route('lesson-plans.get-assessments'), {
            learning_objective_id: modulAjar.learning_objective_id,
            subject_id: modulAjar.subject_id
        })
        .then(res => {
            setRelatedAssessments({
                initial: res.data.initial || [],
                formative: res.data.formative || [],
                summative: res.data.summative || []
            });
        })
        .catch(err => {
            console.error('Failed to load related assessments', err);
        })
        .finally(() => {
            setIsAssessmentsLoading(false);
        });
    }, [modulAjar]);

    // Load default AI Prompt if none exists
    useEffect(() => {
        if (!customPrompt) {
            axios.get(route('lesson-plans.prompts.get'))
                .then(res => {
                    const targetPrompt = res.data.find((p: any) => p.key === 'modul_ajar');
                    if (targetPrompt) {
                        setCustomPrompt(targetPrompt.prompt_text);
                    }
                })
                .catch(err => console.error('Failed to load default template', err));
        }
    }, []);

    // Regenerate Modul Ajar calling AI
    const handleGenerateAI = async () => {
        setIsGenerating(true);
        setAiNotification(null);

        try {
            const response = await axios.post(route('lesson-plans.generate'), {
                learning_objective_id: modulAjar.learning_objective_id,
                material_id: modulAjar.material_id,
                pedagogical_model: pedagogicalModel,
                custom_prompt: customPrompt,
                regenerate: true // Force bypass cache
            });

            const data = response.data;
            if (data) {
                setAlokasiWaktu(data.alokasi_waktu || '');
                setJumlahPertemuan(data.jumlah_pertemuan || '');
                setDimensiProfil(Array.isArray(data.dimensi_profil) ? data.dimensi_profil : (data.dimensi_profil ? [data.dimensi_profil] : []));
                setRencanaAsesmenAwal((data.rencana_asesmen_awal || '').replace(/&nbsp;/g, ' '));
                setLingkunganPembelajaran(data.lingkungan_pembelajaran || '');
                setKemitraanPembelajaran(data.kemitraan_pembelajaran || '');
                setPemanfaatanDigital(data.pemanfaatan_digital || '');
                setMediaIlustrasi(data.media_ilustrasi || '');
                setAsesmenFormatif((data.asesmen_formatif || '').replace(/&nbsp;/g, ' '));
                setAsesmenSumatif((data.asesmen_sumatif || '').replace(/&nbsp;/g, ' '));
                setUnderstanding((data.understanding || '').replace(/&nbsp;/g, ' '));
                setApplication((data.application || '').replace(/&nbsp;/g, ' '));
                setReflection((data.reflection || '').replace(/&nbsp;/g, ' '));
                setLkpd((data.lkpd || '').replace(/&nbsp;/g, ' '));

                if (data.ai_active === false) {
                    setAiNotification({
                        message: 'API key AI tidak aktif. Form tidak dapat diisi secara otomatis.',
                        type: 'warning'
                    });
                } else {
                    setAiNotification({
                        message: 'AI berhasil meregenerasi Modul Ajar lengkap sesuai data terbaru!',
                        type: 'info'
                    });
                }
            }
        } catch (error) {
            console.error('Failed to regenerate Modul Ajar', error);
            setAiNotification({
                message: 'Gagal meregenerasi dengan AI. Silakan coba kembali.',
                type: 'error'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Save Modul Ajar updates
    const handleSave = () => {
        setIsSaving(true);

        const payload = {
            subject_id: modulAjar.subject_id,
            school_class_id: modulAjar.school_class_id,
            learning_objective_id: modulAjar.learning_objective_id,
            material_id: modulAjar.material_id,
            pedagogical_model: pedagogicalModel,
            general_info: JSON.stringify({
                alokasi_waktu: alokasiWaktu,
                jumlah_pertemuan: jumlahPertemuan,
                dimensi_profil: dimensiProfil,
                rencana_asesmen_awal: rencanaAsesmenAwal,
                lingkungan_pembelajaran: lingkunganPembelajaran,
                kemitraan_pembelajaran: kemitraanPembelajaran,
                pemanfaatan_digital: pemanfaatanDigital,
                media_ilustrasi: mediaIlustrasi,
                asesmen_formatif: asesmenFormatif,
                asesmen_sumatif: asesmenSumatif,
                understanding: understanding,
                application: application,
                reflection: reflection,
                lkpd: lkpd
            }),
            learning_design: '',
            learning_steps: '',
            assessment_plan: '',
            kktp_details: '',
            lkpd: lkpd,
            learning_resources: '',
            ai_prompt_used: customPrompt,
        };

        router.put(route('lesson-plans.update', modulAjar.id), payload, {
            onFinish: () => setIsSaving(false)
        });
    };

    const tabs = [
        { id: 'identifikasi', label: '1. Identifikasi' },
        { id: 'desain', label: '2. Desain Pembelajaran' },
        { id: 'asesmen', label: '3. Asesmen' },
        { id: 'skenario', label: '4. Skenario' },
        { id: 'lkpd', label: '5. LKPD' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Modul Ajar #${modulAjar.id} – LMS Mokopani`}>
                <style>{`
                    .ql-toolbar {
                        display: flex;
                        flex-wrap: wrap;
                    }
                    .ql-editor {
                        word-break: break-word;
                    }
                `}</style>
            </Head>

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0">
                {/* Top Back Action & Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition self-start sm:self-auto"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <h1 className="text-xl font-bold text-foreground self-start sm:self-auto">Edit Modul Ajar / RPP</h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Panel: Read Only Configuration */}
                    <div className="space-y-6 min-w-0">
                        <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                                <Layers className="h-4.5 w-4.5 text-primary" />
                                Informasi Parameter
                            </h2>

                            {/* Subject & Class Info */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Mata Pelajaran & Kelas</span>
                                <p className="text-sm font-bold text-foreground">{subjectInfo?.subject_name} ({subjectInfo?.class_name})</p>
                            </div>

                            {/* TP Info */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Tujuan Pembelajaran</span>
                                <p className="text-xs font-semibold text-foreground leading-relaxed">
                                    <span className="font-extrabold bg-muted text-foreground px-1 py-0.5 rounded mr-1">
                                        {objectiveInfo?.code}
                                    </span>
                                    {objectiveInfo?.description?.replace(/&nbsp;/g, ' ')}
                                </p>
                            </div>

                            {/* Material Info */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Materi Ajar</span>
                                <p className="text-xs font-semibold text-foreground break-words">{materialInfo?.title?.replace(/&nbsp;/g, ' ')}</p>
                            </div>

                            {/* Pedagogical Model Selectable */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block">Model Pembelajaran</label>
                                <select 
                                    value={pedagogicalModel}
                                    onChange={(e) => setPedagogicalModel(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                >
                                    <option value="PBL">Problem Based Learning (PBL)</option>
                                    <option value="PjBL">Project Based Learning (PjBL)</option>
                                    <option value="Inquiry">Inquiry Learning</option>
                                    <option value="Discovery">Discovery Learning</option>
                                    <option value="Direct">Direct Instruction</option>
                                    <option value="Kooperatif">Pembelajaran Kooperatif</option>
                                </select>
                            </div>

                            {/* Loaded related assessments */}
                            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <ClipboardList className="h-4 w-4 text-primary" />
                                    Asesmen Terkait
                                </h3>
                                
                                {isAssessmentsLoading ? (
                                    <div className="flex justify-center py-2">
                                        <Loader2 className="h-4.5 w-4.5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-[11px] leading-relaxed">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-indigo-500">Asesmen Awal:</span>
                                            <span className="text-muted-foreground text-right w-2/3 truncate">
                                                {relatedAssessments.initial.length > 0 ? relatedAssessments.initial.map(a => a.title).join(', ') : 'Belum dibuat'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-amber-500">Formatif:</span>
                                            <span className="text-muted-foreground text-right w-2/3 truncate">
                                                {relatedAssessments.formative.length > 0 ? relatedAssessments.formative.map(a => a.title).join(', ') : 'Belum dibuat'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-emerald-500">Sumatif:</span>
                                            <span className="text-muted-foreground text-right w-2/3 truncate">
                                                {relatedAssessments.summative.length > 0 ? relatedAssessments.summative.map(a => a.title).join(', ') : 'Belum dibuat'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* AI Trigger */}
                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating}
                                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 cursor-pointer"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                            Meregenerasi...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                                            Regenerasi dengan AI
                                        </>
                                    )}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => setIsPromptEditorVisible(!isPromptEditorVisible)}
                                    className="w-full h-10 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                                >
                                    <Settings className="h-4 w-4" />
                                    {isPromptEditorVisible ? 'Sembunyikan Prompt AI' : 'Lihat / Edit Prompt AI'}
                                </button>
                            </div>
                        </div>

                        {/* Prompt editor */}
                        {isPromptEditorVisible && (
                            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Edit Prompt AI (Bisa Dimodifikasi)</span>
                                </div>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    rows={10}
                                    className="w-full p-3 rounded-lg border border-border bg-popover text-xs text-foreground font-mono focus:ring-1 focus:ring-primary outline-none resize-none leading-relaxed"
                                    placeholder="Instruksi kustomisasi prompt Modul Ajar..."
                                />
                                <p className="text-[10px] text-muted-foreground italic break-words">
                                    Placeholder yang didukung: {"{subject}"}, {"{class}"}, {"{tp}"}, {"{material}"}, {"{pedagogical_model}"}, {"{initial_assessments}"}, {"{formative_assessments}"}, {"{summative_assessments}"}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Form Inputs */}
                    <div className="lg:col-span-2 space-y-6 min-w-0">
                        {aiNotification && (
                            <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs animate-in fade-in duration-200 ${
                                aiNotification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600' :
                                aiNotification.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                                'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                            }`}>
                                {aiNotification.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <Eye className="h-5 w-5 shrink-0" />}
                                <p className="leading-relaxed font-semibold">{aiNotification.message}</p>
                            </div>
                        )}

                        {isGenerating ? (
                            <div className="h-[450px] flex flex-col items-center justify-center gap-3 border border-dashed border-border bg-card rounded-2xl">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-sm font-bold text-foreground">AI sedang menyusun ulang Modul Ajar...</p>
                                <p className="text-xs text-muted-foreground">Proses ini membutuhkan waktu 10-30 detik karena merangkai secara rinci.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                                {/* Editor Tab Headers */}
                                <div className="flex border-b border-border bg-muted/10 overflow-x-auto scrollbar-none">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap transition border-b-2 outline-none cursor-pointer ${
                                                activeTab === tab.id 
                                                    ? 'border-primary text-primary bg-background' 
                                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Form Box */}
                                <div className="p-4 sm:p-6">
                                    {activeTab === 'identifikasi' && (
                                        <div className="space-y-4 animate-in fade-in duration-200">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-foreground block">Alokasi Waktu</label>
                                                    <input 
                                                        value={alokasiWaktu} 
                                                        onChange={e => setAlokasiWaktu(e.target.value)} 
                                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-foreground block">Jumlah Pertemuan</label>
                                                    <input 
                                                        value={jumlahPertemuan} 
                                                        onChange={e => setJumlahPertemuan(e.target.value)} 
                                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-foreground block">Dimensi Profil Pelajar Pancasila (P5)</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                    {['Beriman, bertakwa kepada Tuhan YME', 'Berkebinekaan Global', 'Bergotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'].map(dim => (
                                                        <label key={dim} className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input 
                                                                type="checkbox"
                                                                checked={dimensiProfil.includes(dim)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setDimensiProfil([...dimensiProfil, dim]);
                                                                    } else {
                                                                        setDimensiProfil(dimensiProfil.filter(d => d !== dim));
                                                                    }
                                                                }}
                                                                className="rounded border-border text-primary focus:ring-primary/20"
                                                            />
                                                            <span>{dim}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1 mt-4">
                                                <label className="text-xs font-bold text-foreground block">Rencana Asesmen Awal Murid (Diagnostik)</label>
                                                <textarea 
                                                    value={rencanaAsesmenAwal} 
                                                    onChange={e => setRencanaAsesmenAwal(e.target.value)} 
                                                    rows={3}
                                                    placeholder="Deskripsikan rencana Anda untuk melakukan asesmen awal..."
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'desain' && (
                                        <div className="space-y-4 animate-in fade-in duration-200">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-foreground block">Lingkungan Pembelajaran</label>
                                                <select 
                                                    value={lingkunganPembelajaran} 
                                                    onChange={e => setLingkunganPembelajaran(e.target.value)} 
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                                                >
                                                    <option value="">Pilih Lingkungan Pembelajaran</option>
                                                    <option value="Di dalam kelas (Indoor)">Di dalam kelas (Indoor)</option>
                                                    <option value="Di luar kelas (Outdoor)">Di luar kelas (Outdoor)</option>
                                                    <option value="Daring (Online/PJJ)">Daring (Online/PJJ)</option>
                                                    <option value="Campuran (Hybrid)">Campuran (Hybrid)</option>
                                                    <option value="Laboratorium / Ruang Praktik">Laboratorium / Ruang Praktik</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-foreground block">Kemitraan Pembelajaran</label>
                                                <select 
                                                    value={kemitraanPembelajaran} 
                                                    onChange={e => setKemitraanPembelajaran(e.target.value)} 
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                                                >
                                                    <option value="">Pilih Kemitraan Pembelajaran</option>
                                                    <option value="Mandiri (Guru Utama)">Mandiri (Guru Utama)</option>
                                                    <option value="Team Teaching (Guru Serumpun)">Team Teaching (Guru Serumpun)</option>
                                                    <option value="Kolaborasi Antar Mata Pelajaran">Kolaborasi Antar Mata Pelajaran</option>
                                                    <option value="Melibatkan Orang Tua / Wali Murid">Melibatkan Orang Tua / Wali Murid</option>
                                                    <option value="Mengundang Praktisi / Ahli Luar">Mengundang Praktisi / Ahli Luar</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-foreground block">Pemanfaatan Teknologi Digital</label>
                                                <input 
                                                    value={pemanfaatanDigital} 
                                                    onChange={e => setPemanfaatanDigital(e.target.value)} 
                                                    placeholder="Contoh: Penggunaan LMS, Quizizz, Proyektor Interaktif, dll"
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-foreground block">Media / Ilustrasi Pembelajaran</label>
                                                <textarea 
                                                    value={mediaIlustrasi} 
                                                    onChange={e => setMediaIlustrasi(e.target.value)} 
                                                    rows={2}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'asesmen' && (
                                        <div className="space-y-6 animate-in fade-in duration-200">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-foreground block">Asesmen Formatif (Selama Proses)</label>
                                                <ReactQuill theme="snow" modules={quillModules} value={asesmenFormatif} onChange={setAsesmenFormatif} className="h-[200px]" />
                                            </div>
                                            <div className="h-10" />
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-foreground block">Asesmen Sumatif (Akhir)</label>
                                                <ReactQuill theme="snow" modules={quillModules} value={asesmenSumatif} onChange={setAsesmenSumatif} className="h-[200px]" />
                                            </div>
                                            <div className="h-12" />
                                        </div>
                                    )}

                                    {activeTab === 'skenario' && (
                                        <div className="space-y-6 animate-in fade-in duration-200">
                                            <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 p-3 text-xs rounded border border-indigo-100 dark:border-indigo-900 mb-4">
                                                <strong>Pengingat (PPA 2025):</strong> Pastikan langkah pembelajaran dan skenario aktivitas Anda mencerminkan prinsip <strong>berkesadaran (mindful)</strong>, <strong>bermakna (meaningful)</strong>, dan <strong>menggembirakan (joyful)</strong>.
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-foreground block">1. Memahami (Understanding)</label>
                                                <ReactQuill theme="snow" modules={quillModules} value={understanding} onChange={setUnderstanding} className="h-[200px]" />
                                            </div>
                                            <div className="h-10" />
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-foreground block">2. Mengaplikasikan (Application)</label>
                                                <ReactQuill theme="snow" modules={quillModules} value={application} onChange={setApplication} className="h-[200px]" />
                                            </div>
                                            <div className="h-10" />
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-foreground block">3. Merefleksikan (Reflection)</label>
                                                <ReactQuill theme="snow" modules={quillModules} value={reflection} onChange={setReflection} className="h-[200px]" />
                                            </div>
                                            <div className="h-12" />
                                        </div>
                                    )}

                                    {activeTab === 'lkpd' && (
                                        <div className="space-y-2 animate-in fade-in duration-200">
                                            <label className="text-xs font-bold text-foreground block">Lembar Kerja Peserta Didik (LKPD)</label>
                                            <ReactQuill theme="snow" modules={quillModules} value={lkpd} onChange={setLkpd} className="h-[400px]" />
                                            <div className="h-12" />
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <div className="p-4 sm:p-6 border-t border-border bg-muted/10 flex flex-col sm:flex-row justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                                Menyimpan Perubahan...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4.5 w-4.5" />
                                                Simpan Perubahan Modul Ajar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
