import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { 
    Target, 
    Plus, 
    Trash2,
    Edit2,
    X,
    BookOpen,
    Hash,
    AlignLeft,
    Sparkles,
    ArrowUpDown,
    CheckCircle2,
    GripVertical,
    Save,
    RefreshCw,
    Check,
    SplitSquareHorizontal,
    CornerDownRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Tujuan Pembelajaran', href: '/learning-objectives' },
];

interface CpItem {
    id: number;
    kode: string;
    fase: string;
    elemen: string;
    deskripsi: string;
    subject: { id: number; name: string };
}

interface Objective {
    id: number;
    code: string;
    description: string;
    subject_id: number;
    subject: { name: string };
    school_class_id: number;
    cp_id?: number | null;
    capaian_pembelajaran?: CpItem | null;
    capaian_pembelajarans?: CpItem[];
    competence?: string;
    content?: string;
    formulation_method: 'direct' | 'analysis' | 'cross_element';
    order: number;
    sequencing_method?: string;
    parent_id?: number | null;
    sub_objectives?: Objective[];
}

interface Subject {
    id: number;
    name: string;
}

interface Suggestion {
    text: string;
    is_used: boolean;
}

interface HighlightItem {
    id: string;
    text: string;
    type: 'competence' | 'content';
}

interface LearningObjectiveIndexProps {
    objectives: Objective[];
    subjects: Subject[];
    cpList: CpItem[];
}

export default function LearningObjectiveIndex({ objectives, subjects, cpList }: LearningObjectiveIndexProps) {
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isAtpMode, setIsAtpMode] = useState(false);
    const [tempObjectives, setTempObjectives] = useState<Objective[]>([]);
    const [availableTps, setAvailableTps] = useState<Objective[]>([]);
    const [canvasTps, setCanvasTps] = useState<Objective[]>([]);
    const [activeTab, setActiveTab] = useState<'direct' | 'analysis' | 'cross_element'>('direct');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedCps, setSelectedCps] = useState<number[]>([]);
    const [sequencingMethod, setSequencingMethod] = useState('');
    const [directSuggestions, setDirectSuggestions] = useState<Suggestion[]>([]);
    const [highlights, setHighlights] = useState<HighlightItem[]>([]);
    const [breakdownTarget, setBreakdownTarget] = useState<Objective | null>(null);
    const [subTps, setSubTps] = useState<string[]>(['']);
    const [draggedTpId, setDraggedTpId] = useState<number | null>(null);

    useEffect(() => {
        if (isAtpMode) {
            // Extract Sub-TPs if they exist, otherwise fallback to parent TP
            let allTps: Objective[] = [];
            objectives.forEach(parent => {
                if (parent.sub_objectives && parent.sub_objectives.length > 0) {
                    // Include parent info for UI context if needed, but we mainly need the sub-tp objects
                    allTps = [...allTps, ...parent.sub_objectives.map(sub => ({
                        ...sub,
                        subject: parent.subject,
                        capaian_pembelajaran: parent.capaian_pembelajaran
                    }))];
                } else {
                    allTps = [...allTps, parent];
                }
            });

            setTempObjectives([...objectives]); // Still keep this just in case
            
            // If they already have sequencing_method, put them in canvas, else in available
            const inCanvas = allTps.filter(o => o.sequencing_method);
            const inAvailable = allTps.filter(o => !o.sequencing_method);
            
            setCanvasTps(inCanvas.length > 0 ? inCanvas.sort((a,b) => a.order - b.order) : []);
            setAvailableTps(inAvailable);
        }
    }, [isAtpMode, objectives]);

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        subject_id: '',
        school_class_id: '1', 
        code: '',
        description: '',
        cp_id: '',
        cp_ids: [] as number[],
        competence: '',
        content: '',
        formulation_method: 'direct' as 'direct' | 'analysis' | 'cross_element',
        parent_id: null as number | null,
    });

    const [tpClickCount, setTpClickCount] = useState(0);

    // Reset click count when CP, formulation method, or active tab changes to trigger fresh caching on new input
    useEffect(() => {
        setTpClickCount(0);
    }, [activeTab, data.cp_id, selectedCps]);

    useEffect(() => {
        const comps = highlights.filter(h => h.type === 'competence').map(h => h.text).join(', ');
        const conts = highlights.filter(h => h.type === 'content').map(h => h.text).join(', ');
        setData(d => ({ ...d, competence: comps, content: conts }));
    }, [highlights]);

    const handleSelection = (type: 'competence' | 'content') => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === '') return;
        
        const text = selection.toString().trim();
        
        if (!highlights.find(h => h.text === text)) {
            setHighlights([...highlights, { id: Math.random().toString(36).substring(2, 9), text, type }]);
        }
        
        selection.removeAllRanges();
    };

    const removeHighlight = (id: string) => {
        setHighlights(highlights.filter(h => h.id !== id));
    };

    const renderCpText = () => {
        const cp = cpList.find(c => c.id.toString() === data.cp_id);
        if (!cp) return null;
        
        let html = cp.deskripsi;
        const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
        
        sortedHighlights.forEach(h => {
            const colorClass = h.type === 'competence' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold px-1 rounded' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold px-1 rounded';
            html = html.split(h.text).join(`<mark class="${colorClass}">${h.text}</mark>`);
        });
        
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    };

    const openAddModal = () => {
        setEditingId(null);
        reset();
        clearErrors();
        setActiveTab('direct');
        setSelectedCps([]);
        setDirectSuggestions([]);
        setHighlights([]);
        setShowModal(true);
    };

    const openEditModal = (obj: Objective) => {
        setEditingId(obj.id);
        setData({
            subject_id: obj.subject_id.toString(),
            school_class_id: obj.school_class_id.toString(),
            code: obj.code || '',
            description: obj.description,
            cp_id: obj.cp_id?.toString() || '',
            cp_ids: obj.capaian_pembelajarans?.map(cp => cp.id) || [],
            competence: obj.competence || '',
            content: obj.content || '',
            formulation_method: obj.formulation_method,
        });
        setActiveTab(obj.formulation_method);
        setSelectedCps(obj.capaian_pembelajarans?.map(cp => cp.id) || []);
        setDirectSuggestions([]);
        
        if (obj.formulation_method === 'analysis') {
            const comps = obj.competence ? obj.competence.split(', ').filter(Boolean).map(text => ({ id: Math.random().toString(36).substring(2, 9), text, type: 'competence' as const })) : [];
            const conts = obj.content ? obj.content.split(', ').filter(Boolean).map(text => ({ id: Math.random().toString(36).substring(2, 9), text, type: 'content' as const })) : [];
            setHighlights([...comps, ...conts]);
        } else {
            setHighlights([]);
        }
        
        clearErrors();
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...data, formulation_method: activeTab, cp_ids: selectedCps };
        
        if (editingId) {
            router.put(route('learning-objectives.update', editingId), payload, {
                onSuccess: () => { setShowModal(false); reset(); },
            });
        } else {
            router.post(route('learning-objectives.store'), payload, {
                onSuccess: () => { setShowModal(false); reset(); },
            });
        }
    };

    const handleAutoSuggest = async () => {
        if (activeTab === 'direct' && !data.cp_id) return;
        if (activeTab === 'analysis' && !data.cp_id) return;
        if (activeTab === 'cross_element' && selectedCps.length < 2) return;

        setIsGenerating(true);
        try {
            const response = await axios.post(route('learning-objectives.auto-suggest'), {
                method: activeTab,
                cp_id: data.cp_id,
                cp_ids: selectedCps,
                subject_id: data.subject_id,
                regenerate: tpClickCount > 0
            });

            setTpClickCount(prev => prev + 1);

            if (activeTab === 'direct') {
                setDirectSuggestions(response.data.suggestions);
            } else if (activeTab === 'analysis') {
                const { analysis } = response.data;
                const competenceStr = analysis.competences.map((c: any) => c.verb).join(', ');
                setData({
                    ...data,
                    competence: competenceStr,
                    content: analysis.content,
                    description: `${competenceStr.charAt(0).toUpperCase() + competenceStr.slice(1)} ${analysis.content}`
                });
            } else if (activeTab === 'cross_element') {
                setData('description', response.data.suggestion);
            }
        } catch (error) {
            console.error("Auto suggest failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAutoSequence = async () => {
        if (canvasTps.length === 0) return;
        
        setIsGenerating(true);
        try {
            const response = await axios.post(route('learning-objectives.auto-sequence'), {
                subject_id: canvasTps[0].subject_id,
                school_class_id: canvasTps[0].school_class_id,
                method: sequencingMethod || 'Otomatis',
                ids: canvasTps.map(tp => tp.id)
            });
            
            const sequenced = response.data.sequenced.map((obj: any, index: number) => ({
                ...obj,
                order: index + 1
            }));
            setCanvasTps(sequenced);
            if (!sequencingMethod) setSequencingMethod('Otomatis (Taksonomi Bloom)');
        } catch (error) {
            console.error("Auto sequence failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const saveAtpOrder = () => {
        router.post(route('learning-objectives.update-order'), {
            orders: canvasTps.map((obj, index) => ({ 
                id: obj.id, 
                order: index + 1,
                time_allocation: obj.time_allocation,
                notes: obj.notes,
                sequencing_method: obj.sequencing_method
            })),
            sequencing_method: sequencingMethod || 'Manual'
        }, {
            onSuccess: () => setIsAtpMode(false)
        });
    };

    const handleDragStart = (e: React.DragEvent, id: number) => {
        setDraggedTpId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a slight delay to allow the drag image to be generated before hiding the original
        setTimeout(() => {
            const el = document.getElementById(`tp-${id}`);
            if (el) el.classList.add('opacity-50');
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent, id: number) => {
        setDraggedTpId(null);
        const el = document.getElementById(`tp-${id}`);
        if (el) el.classList.remove('opacity-50');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropToCanvas = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedTpId) return;

        const tpToMove = availableTps.find(t => t.id === draggedTpId) || canvasTps.find(t => t.id === draggedTpId);
        if (!tpToMove) return;

        // If it comes from availableTps, move it to canvasTps
        if (availableTps.some(t => t.id === draggedTpId)) {
            setAvailableTps(availableTps.filter(t => t.id !== draggedTpId));
            setCanvasTps([...canvasTps, tpToMove]);
        }
        // If it's already in canvas, reordering is handled in a separate function
    };

    const handleDropToAvailable = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedTpId) return;

        const tpToMove = canvasTps.find(t => t.id === draggedTpId);
        if (!tpToMove) return;

        setCanvasTps(canvasTps.filter(t => t.id !== draggedTpId));
        setAvailableTps([...availableTps, tpToMove]);
    };

    const handleCanvasReorder = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent firing handleDropToCanvas
        if (!draggedTpId) return;

        const isFromAvailable = availableTps.some(t => t.id === draggedTpId);
        const tpToMove = isFromAvailable ? availableTps.find(t => t.id === draggedTpId) : canvasTps.find(t => t.id === draggedTpId);
        if (!tpToMove) return;

        const newCanvasTps = [...canvasTps];
        
        if (isFromAvailable) {
            setAvailableTps(availableTps.filter(t => t.id !== draggedTpId));
            newCanvasTps.splice(targetIndex, 0, tpToMove);
        } else {
            const currentIndex = canvasTps.findIndex(t => t.id === draggedTpId);
            if (currentIndex === targetIndex) return;
            newCanvasTps.splice(currentIndex, 1);
            newCanvasTps.splice(targetIndex, 0, tpToMove);
        }
        
        setCanvasTps(newCanvasTps);
    };

    const handleCanvasTpChange = (id: number, field: 'time_allocation' | 'notes' | 'sequencing_method', value: any) => {
        setCanvasTps(canvasTps.map(tp => tp.id === id ? { ...tp, [field]: value } : tp));
    };

    const openBreakdownModal = (obj: Objective) => {
        setBreakdownTarget(obj);
        setSubTps(['', '']);
    };

    const closeBreakdownModal = () => {
        setBreakdownTarget(null);
        setSubTps(['']);
    };

    const handleAutoBreakdown = async () => {
        if (!breakdownTarget) return;
        setIsGenerating(true);
        try {
            const response = await axios.post(route('learning-objectives.auto-breakdown'), {
                description: breakdownTarget.description,
                regenerate: tpClickCount > 0
            });
            setTpClickCount(prev => prev + 1);
            if (response.data.sub_tps && response.data.sub_tps.length > 0) {
                setSubTps(response.data.sub_tps);
            }
        } catch (error) {
            console.error("Auto breakdown failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveBreakdown = () => {
        if (!breakdownTarget) return;
        
        const validTps = subTps.filter(tp => tp.trim() !== '');
        if (validTps.length === 0) {
            closeBreakdownModal();
            return;
        }

        router.post(route('learning-objectives.store'), {
            is_batch: true,
            subject_id: breakdownTarget.subject_id.toString(),
            school_class_id: breakdownTarget.school_class_id.toString(),
            cp_id: breakdownTarget.cp_id?.toString() || '',
            cp_ids: breakdownTarget.capaian_pembelajarans?.map(cp => cp.id) || [],
            parent_id: breakdownTarget.id,
            sub_tps: validTps.map((desc, index) => ({
                code: `${breakdownTarget.code || `TP ${breakdownTarget.order}`}.${index + 1}`,
                description: desc,
                competence: '',
                content: '',
                formulation_method: 'direct'
            }))
        }, {
            preserveScroll: true,
            onSuccess: () => {
                closeBreakdownModal();
            }
        });
    };

    const moveObjective = (index: number, direction: 'up' | 'down') => {
        const newObjs = [...tempObjectives];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newObjs.length) return;
        
        [newObjs[index], newObjs[targetIndex]] = [newObjs[targetIndex], newObjs[index]];
        setTempObjectives(newObjs);
    };

    const handleDelete = () => {
        if (deleteId) {
            router.delete(route('learning-objectives.destroy', deleteId));
            setDeleteId(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manajemen Perencanaan TP & ATP – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Perencanaan Pembelajaran</h1>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Manajemen Tujuan Pembelajaran (TP) & Alur (ATP)</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                            onClick={() => setIsAtpMode(!isAtpMode)}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition shadow-sm ${isAtpMode ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/80'}`}
                        >
                            <ArrowUpDown className="h-4 w-4" />
                            {isAtpMode ? 'Keluar Mode ATP' : 'Atur Alur (ATP)'}
                        </button>
                        {!isAtpMode && (
                            <button
                                onClick={openAddModal}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah TP
                            </button>
                        )}
                    </div>
                </div>

                {isAtpMode ? (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-muted/30 rounded-xl border border-dashed border-border gap-4">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold truncate">Penyusunan Alur Tujuan Pembelajaran (ATP)</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight truncate sm:whitespace-normal">Tarik TP dari kiri ke kanan untuk menyusun alur</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <select 
                                    value={sequencingMethod} 
                                    onChange={e => setSequencingMethod(e.target.value)}
                                    className="text-xs font-bold bg-background border border-border rounded-lg px-3 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-150"
                                >
                                    <option value="">Pilih Metode Pengurutan</option>
                                    <option value="Konkret ke Abstrak">Konkret ke Abstrak</option>
                                    <option value="Deduktif">Deduktif</option>
                                    <option value="Mudah ke Sulit">Mudah ke Sulit</option>
                                    <option value="Hierarki">Hierarki</option>
                                    <option value="Prosedural">Prosedural</option>
                                    <option value="Scaffolding">Scaffolding</option>
                                </select>
                                <button
                                    onClick={handleAutoSequence}
                                    disabled={isGenerating}
                                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition disabled:opacity-50"
                                >
                                    {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ArrowUpDown className="h-3 w-3" />}
                                    Terapkan Cerdas
                                </button>
                                <button
                                    onClick={saveAtpOrder}
                                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-1.5 bg-success text-success-foreground rounded-lg text-xs font-black hover:opacity-90 transition shadow-sm"
                                >
                                    <Save className="h-3 w-3" />
                                    Simpan Alur
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                            {/* Panel Kiri: TP Tersedia */}
                            <div 
                                className="col-span-1 border border-border bg-muted/10 rounded-2xl flex flex-col overflow-hidden"
                                onDragOver={handleDragOver}
                                onDrop={handleDropToAvailable}
                            >
                                <div className="p-4 bg-muted/30 border-b border-border">
                                    <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Daftar TP</h4>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Tersedia: {availableTps.length} TP</p>
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                                    {availableTps.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                            <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                            <p className="text-sm font-bold text-muted-foreground">Semua TP telah digunakan di Kanvas.</p>
                                        </div>
                                    ) : (
                                        availableTps.map((obj) => (
                                            <div 
                                                key={obj.id} 
                                                id={`tp-${obj.id}`}
                                                draggable 
                                                onDragStart={(e) => handleDragStart(e, obj.id)}
                                                onDragEnd={(e) => handleDragEnd(e, obj.id)}
                                                className="cursor-move p-4 bg-card border border-border shadow-sm rounded-xl hover:border-primary/40 transition active:cursor-grabbing"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{obj.code || 'TP'}</span>
                                                </div>
                                                <p className="text-xs font-medium text-foreground leading-relaxed line-clamp-3">{obj.description}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Panel Kanan: Kanvas */}
                            <div 
                                className="col-span-1 lg:col-span-2 border-2 border-dashed border-border bg-card rounded-2xl flex flex-col relative overflow-hidden"
                                onDragOver={handleDragOver}
                                onDrop={handleDropToCanvas}
                            >
                                <div className="p-4 bg-muted/30 border-b border-border sticky top-0 z-10">
                                    <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Kanvas Alur (ATP)</h4>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total: {canvasTps.length} TP Terurut</p>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                                    {canvasTps.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <ArrowUpDown className="h-12 w-12 text-muted-foreground/20 mb-4" />
                                            <p className="text-lg font-black text-foreground/50">Kanvas Masih Kosong</p>
                                            <p className="text-xs font-medium text-muted-foreground mt-2 max-w-sm">Tarik dan lepaskan TP dari panel sebelah kiri ke area ini untuk mulai menyusun alur.</p>
                                        </div>
                                    ) : (
                                        canvasTps.map((obj, index) => (
                                            <div 
                                                key={obj.id}
                                                id={`tp-${obj.id}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, obj.id)}
                                                onDragEnd={(e) => handleDragEnd(e, obj.id)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleCanvasReorder(e, index)}
                                                className="cursor-move flex flex-col sm:flex-row gap-4 p-4 bg-background border border-border shadow-sm rounded-xl hover:border-primary/40 transition group relative"
                                            >
                                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-[10px] font-black text-white shadow-sm border-2 border-card">
                                                    {index + 1}
                                                </div>
                                                <div className="flex flex-col items-center justify-center pl-2">
                                                    <GripVertical className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50 transition" />
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    <p className="text-sm font-medium text-foreground leading-relaxed">{obj.description}</p>
                                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="col-span-1">
                                                            <label className="text-[10px] font-black uppercase text-muted-foreground">Alokasi Waktu (JP)</label>
                                                            <input 
                                                                type="number"
                                                                value={obj.time_allocation || ''}
                                                                onChange={(e) => handleCanvasTpChange(obj.id, 'time_allocation', e.target.value)}
                                                                placeholder="Misal: 4"
                                                                className="w-full mt-1 px-3 py-1.5 text-xs bg-muted/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 sm:col-span-2">
                                                            <label className="text-[10px] font-black uppercase text-muted-foreground">Catatan / Fokus Materi</label>
                                                            <input 
                                                                type="text"
                                                                value={obj.notes || ''}
                                                                onChange={(e) => handleCanvasTpChange(obj.id, 'notes', e.target.value)}
                                                                placeholder="Materi inti yang diajarkan..."
                                                                className="w-full mt-1 px-3 py-1.5 text-xs bg-muted/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {objectives.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                                <Target className="h-16 w-16 mb-6 opacity-20" />
                                <p className="text-xl font-black text-foreground/70">Belum ada Tujuan Pembelajaran</p>
                                <p className="text-sm text-center font-medium max-w-sm mt-2">Silakan tambahkan TP menggunakan metode formulasi yang tersedia untuk mulai merancang pembelajaran.</p>
                                <button onClick={openAddModal} className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-black shadow-xl shadow-primary/20 hover:opacity-90 transition">Mulai Merumuskan TP</button>
                            </div>
                        ) : (
                            objectives.map((obj) => (
                                <div key={obj.id} className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                                    <div className="flex items-start justify-between mb-4 gap-4">
                                        <div className="flex flex-col gap-1.5 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    {obj.subject?.name}
                                                </span>
                                                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border shadow-sm ${
                                                    obj.formulation_method === 'analysis' 
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' 
                                                        : obj.formulation_method === 'cross_element' 
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' 
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
                                                }`}>
                                                    {obj.formulation_method === 'analysis' ? 'Analisis' : obj.formulation_method === 'cross_element' ? 'Lintas Elemen' : 'Salin CP'}
                                                </span>
                                            </div>
                                            {obj.capaian_pembelajaran && (
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mt-1" title={obj.capaian_pembelajaran?.elemen}>
                                                    {obj.capaian_pembelajaran?.elemen}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 shadow-sm shrink-0">
                                            <button 
                                                onClick={() => openBreakdownModal(obj)}
                                                className="h-8 flex items-center justify-center gap-1.5 px-3 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm dark:bg-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60 transition-all"
                                                title="Pecah menjadi Sub-TP"
                                            >
                                                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold uppercase hidden xl:inline-block">Pecah Sub-TP</span>
                                            </button>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
                                            <button 
                                                onClick={() => openEditModal(obj)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => setDeleteId(obj.id)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                                                title="Hapus"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
                                                <span className="text-sm font-black">{obj.order}</span>
                                            </div>
                                            <span className="text-sm font-black text-foreground tracking-tight">{obj.code || `TP ${obj.order}`}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                            {obj.description}
                                        </p>
                                    </div>
                                    {obj.sub_objectives && obj.sub_objectives.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-2">
                                            {obj.sub_objectives.map((sub) => (
                                                <div key={sub.id} className="flex items-start gap-3 pl-2 py-2 border-l-2 border-primary/20 bg-muted/20 rounded-r-lg group/sub">
                                                    <CornerDownRight className="h-4 w-4 text-primary/40 shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black text-foreground">{sub.code}</span>
                                                            <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition">
                                                                <button onClick={() => openEditModal(sub)} className="p-1 text-muted-foreground hover:text-primary"><Edit2 className="h-3 w-3" /></button>
                                                                <button onClick={() => setDeleteId(sub.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{sub.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {obj.sequencing_method && (
                                        <div className="mt-4 pt-4 border-t border-dashed flex items-center gap-2">
                                            <CheckCircle2 className="h-3 w-3 text-success" />
                                            <span className="text-[10px] font-bold text-success uppercase">{obj.sequencing_method}</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal Formulasi TP */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl rounded-xl bg-card text-card-foreground border border-border flex flex-col shadow-none animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-hidden">
                        <div className="flex shrink-0 items-start sm:items-center justify-between p-4 sm:p-6 border-b border-border/40 gap-4 bg-card z-10">
                            <div className="min-w-0">
                                <h3 className="text-2xl font-black text-foreground tracking-tight">
                                    {editingId ? 'Edit Perumusan TP' : 'Rumuskan Tujuan Pembelajaran'}
                                </h3>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1 truncate sm:whitespace-normal">Gunakan salah satu dari 3 metode perumusan</p>
                            </div>
                            <button type="button" onClick={() => setShowModal(false)} className="h-8 w-8 sm:h-10 sm:w-10 flex shrink-0 items-center justify-center rounded-xl hover:bg-muted transition text-muted-foreground">
                                <X className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                {/* Tab Selector */}
                                <div className="flex p-1 bg-muted/50 rounded-xl mb-8">
                                    {[
                                        { id: 'direct', label: 'Salin CP', desc: 'Praktis' },
                                        { id: 'analysis', label: 'Analisis', desc: 'Kompetensi & Konten' },
                                        { id: 'cross_element', label: 'Lintas Elemen', desc: 'Terintegrasi' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex-1 flex flex-col items-center py-3 rounded-md transition ${activeTab === tab.id ? 'bg-card dark:bg-popover shadow-xl border border-border/40 text-primary' : 'hover:bg-muted/50 hover:text-foreground text-muted-foreground'}`}
                                        >
                                            <span className={`text-xs font-black ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">{tab.desc}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                                    Mata Pelajaran
                                </label>
                                <select 
                                    value={data.subject_id}
                                    onChange={(e) => setData('subject_id', e.target.value)}
                                    disabled={!!editingId}
                                    className="w-full rounded-md border border-border bg-muted/30 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                >
                                    <option value="">Pilih Mapel</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {errors.subject_id && <p className="text-[10px] text-destructive font-bold">{errors.subject_id}</p>}
                            </div>

                            {activeTab === 'cross_element' ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Target className="h-3.5 w-3.5 text-primary" />
                                        Pilih Beberapa CP untuk Digabungkan
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto p-4 bg-muted/30 rounded-xl">
                                        {cpList
                                            .filter(cp => cp.subject.id.toString() === data.subject_id)
                                            .map(cp => (
                                                <label key={cp.id} className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${selectedCps.includes(cp.id) ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-background hover:border-muted-foreground/30'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedCps.includes(cp.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedCps([...selectedCps, cp.id]);
                                                            else setSelectedCps(selectedCps.filter(id => id !== cp.id));
                                                        }}
                                                        className="mt-1 rounded border-muted text-primary focus:ring-primary/20"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-tight">{cp.elemen}</span>
                                                        <span className="text-[9px] font-medium text-muted-foreground line-clamp-2">{cp.deskripsi}</span>
                                                    </div>
                                                </label>
                                            ))
                                        }
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Target className="h-3.5 w-3.5 text-primary" />
                                        Rujukan Capaian Pembelajaran (CP)
                                    </label>
                                    <select 
                                        value={data.cp_id}
                                        onChange={(e) => {
                                            setData('cp_id', e.target.value);
                                            setDirectSuggestions([]);
                                        }}
                                        className="w-full rounded-md border border-border bg-muted/30 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    >
                                        <option value="">-- Pilih Elemen CP --</option>
                                        {cpList
                                            .filter(cp => cp.subject.id.toString() === data.subject_id)
                                            .map(cp => <option key={cp.id} value={cp.id}>{cp.elemen} (Fase {cp.fase})</option>)
                                        }
                                    </select>
                                </div>
                            )}

                            {activeTab === 'direct' && directSuggestions.length > 0 && (
                                <div className="space-y-3 p-6 bg-primary/5 rounded-xl border border-primary/10 animate-in fade-in slide-in-from-bottom-2">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Pilih Kalimat TP yang Sesuai</label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {directSuggestions.map((s, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                disabled={s.is_used}
                                                onClick={() => setData('description', s.text)}
                                                className={`w-full text-left p-4 rounded-xl border transition group flex items-start justify-between gap-3 ${s.is_used ? 'bg-muted opacity-50 cursor-not-allowed border-transparent' : data.description === s.text ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border hover:border-primary/40 shadow-sm'}`}
                                            >
                                                <span className="text-sm font-medium leading-relaxed">{s.text}</span>
                                                {s.is_used ? (
                                                    <span className="shrink-0 text-[9px] font-black uppercase text-muted-foreground/60 bg-muted-foreground/10 px-2 py-1 rounded-lg">Terpakai</span>
                                                ) : data.description === s.text ? (
                                                    <Check className="h-4 w-4 shrink-0" />
                                                ) : null}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-bold text-center uppercase tracking-tighter italic">Kalimat yang sudah digunakan sebagai TP tidak dapat dipilih kembali.</p>
                                </div>
                            )}

                            {activeTab === 'analysis' && (
                                <div className="flex flex-col gap-4 p-4 sm:p-6 bg-primary/5 rounded-xl border border-primary/10">
                                    {!data.cp_id ? (
                                        <div className="p-8 bg-card border border-dashed rounded-xl text-center">
                                            <p className="text-sm text-muted-foreground font-medium">Silakan pilih rujukan Capaian Pembelajaran (CP) di atas terlebih dahulu.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col lg:flex-row gap-4">
                                            {/* Left Panel: CP Text */}
                                            <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                                                <div className="p-3 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Teks Capaian Pembelajaran</span>
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" onClick={() => handleSelection('competence')} className="text-[10px] font-black uppercase px-2 py-1.5 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition">+ Kompetensi</button>
                                                        <button type="button" onClick={() => handleSelection('content')} className="text-[10px] font-black uppercase px-2 py-1.5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition">+ Konten</button>
                                                    </div>
                                                </div>
                                                <div className="p-4 text-sm leading-relaxed overflow-y-auto max-h-60 selection:bg-primary/20 selection:text-primary">
                                                    {renderCpText()}
                                                </div>
                                                <div className="p-2.5 bg-primary/5 text-[10px] text-primary font-bold text-center border-t border-primary/10">
                                                    Blok teks di atas lalu klik tombol [+ Kompetensi] atau [+ Konten]
                                                </div>
                                            </div>
                                            
                                            {/* Right Panel: Analysis Table */}
                                            <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                                                <div className="p-3 bg-muted/30 border-b border-border">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Hasil Analisis</span>
                                                </div>
                                                <div className="flex-1 overflow-y-auto max-h-60">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-muted/10 text-[10px] uppercase text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                                                            <tr>
                                                                <th className="px-3 py-2.5 font-bold border-b border-border">Kompetensi (Kata Kerja)</th>
                                                                <th className="px-3 py-2.5 font-bold border-b border-border">Lingkup Materi (Konten)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {Array.from({ length: Math.max(highlights.filter(h => h.type === 'competence').length, highlights.filter(h => h.type === 'content').length, 1) }).map((_, i) => {
                                                                const comp = highlights.filter(h => h.type === 'competence')[i];
                                                                const cont = highlights.filter(h => h.type === 'content')[i];
                                                                if (!comp && !cont && highlights.length > 0) return null;
                                                                return (
                                                                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                                                                        <td className="px-3 py-2.5 align-top w-1/2">
                                                                            {comp && (
                                                                                <div className="flex items-start justify-between gap-2 group/item">
                                                                                    <span className="text-blue-700 dark:text-blue-400 font-medium text-xs leading-relaxed">{comp.text}</span>
                                                                                    <button type="button" onClick={() => removeHighlight(comp.id)} className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition p-0.5"><X className="h-3 w-3" /></button>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-3 py-2.5 align-top w-1/2 border-l border-border/50">
                                                                            {cont && (
                                                                                <div className="flex items-start justify-between gap-2 group/item">
                                                                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium text-xs leading-relaxed">{cont.text}</span>
                                                                                    <button type="button" onClick={() => removeHighlight(cont.id)} className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition p-0.5"><X className="h-3 w-3" /></button>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            {highlights.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={2} className="px-4 py-8 text-center text-xs text-muted-foreground font-medium italic">Belum ada hasil analisis.<br/>Mulai sorot teks CP!</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <AlignLeft className="h-3.5 w-3.5 text-primary shrink-0" />
                                        Rumusan Kalimat Tujuan Pembelajaran (TP)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAutoSuggest}
                                        disabled={isGenerating}
                                        className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition shadow-lg shadow-primary/20 disabled:opacity-50"
                                    >
                                        {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                        {activeTab === 'direct' && directSuggestions.length > 0 ? 'Segarkan Pilihan' : 'Rumuskan Otomatis'}
                                    </button>
                                </div>
                                <textarea 
                                    rows={activeTab === 'direct' && directSuggestions.length > 0 ? 2 : 4}
                                    placeholder="Tuliskan rumusan tujuan pembelajaran di sini atau klik 'Rumuskan Otomatis'..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-xl border border-border bg-muted/30 px-6 py-5 text-sm font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition leading-relaxed resize-none"
                                ></textarea>
                                {errors.description && <p className="text-[10px] text-destructive font-bold">{errors.description}</p>}
                            </div>

                                </div>
                            </div>
                            
                            <div className="shrink-0 p-4 sm:p-6 border-t border-border/40 bg-card z-10">
                                <button 
                                    type="submit"
                                    disabled={processing}
                                    className="w-full rounded-xl bg-primary py-4 text-sm font-black text-primary-foreground shadow-xl shadow-primary/30 transition hover:opacity-95 disabled:opacity-50"
                                >
                                    {processing ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Terbitkan Tujuan Pembelajaran'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title="Hapus Tujuan Pembelajaran"
                message="Peringatan! Menghapus Tujuan Pembelajaran (TP) ini akan ikut MENGHAPUS SEMUA Materi, Asesmen, Pengumpulan Siswa, Nilai, Remedial, dan Revisi Guru yang terikat secara permanen."
                confirmLabel="Hapus Permanen"
                onConfirm={handleDelete}
                requireInput="DELETE"
                inputPlaceholder="Ketik DELETE untuk konfirmasi"
            />

            {/* Breakdown Modal */}
            {breakdownTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={closeBreakdownModal} />
                    <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
                            <div>
                                <h3 className="text-lg font-black text-foreground tracking-tight">Pecah Sub-TP (ATP)</h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1">Jabarkan TP utama menjadi langkah-langkah yang lebih spesifik</p>
                            </div>
                            <button onClick={closeBreakdownModal} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition"><X className="h-4 w-4" /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Tujuan Utama (Parent)</span>
                                <p className="text-sm font-medium mt-1 leading-relaxed">{breakdownTarget.description}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-foreground uppercase tracking-widest">Daftar Sub-TP</label>
                                    <button 
                                        type="button"
                                        onClick={handleAutoBreakdown}
                                        disabled={isGenerating}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                                    >
                                        {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                        Pecah dengan AI
                                    </button>
                                </div>
                                
                                {subTps.map((tp, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                                            <span className="text-xs font-black">{index + 1}</span>
                                        </div>
                                        <textarea
                                            value={tp}
                                            onChange={(e) => {
                                                const newTps = [...subTps];
                                                newTps[index] = e.target.value;
                                                setSubTps(newTps);
                                            }}
                                            placeholder="Rumusan Sub-TP..."
                                            rows={2}
                                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition resize-none"
                                        />
                                        <button 
                                            onClick={() => setSubTps(subTps.filter((_, i) => i !== index))}
                                            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                
                                <button 
                                    onClick={() => setSubTps([...subTps, ''])}
                                    className="w-full py-3 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
                                >
                                    + Tambah Baris Sub-TP
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 border-t border-border bg-muted/20 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={closeBreakdownModal} className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition">Batal</button>
                            <button onClick={handleSaveBreakdown} disabled={isGenerating || subTps.every(t => t.trim() === '')} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-black shadow-lg shadow-primary/20 hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                Simpan Sub-TP
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
