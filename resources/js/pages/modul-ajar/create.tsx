import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { ChevronLeft, Layers, Save, Loader2, Info, Settings } from 'lucide-react';
import PromptSettingsModal from '@/components/PromptSettingsModal';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Pembelajaran', href: '/lesson-plans' },
    { title: 'Buat Modul Ajar', href: '/lesson-plans/create' },
];

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

interface CreateProps {
    teachings: Teaching[];
    objectives: Objective[];
    materials: Material[];
    period: string;
}

export default function Create({ teachings, objectives, materials, period }: CreateProps) {
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
    const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('');
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    // Get unique subjects
    const uniqueSubjects = Array.from(new Set(teachings.map(t => t.subject_id)))
        .map(id => teachings.find(t => t.subject_id === id));

    // Get available classes for selected subject, avoiding duplicates
    const availableClasses = teachings
        .filter(t => t.subject_id === parseInt(selectedSubjectId))
        .filter((value, index, self) => 
            index === self.findIndex((t) => t.class_name === value.class_name)
        )
        .sort((a, b) => a.class_name.localeCompare(b.class_name));

    // Filter TPs based on selected Subject
    const filteredObjectives = selectedSubjectId 
        ? objectives.filter(o => o.subject_id === parseInt(selectedSubjectId))
        : [];

    // Filter Materials based on selected TP & Subject
    const filteredMaterials = selectedSubjectId && selectedObjectiveId
        ? materials.filter(m => m.subject_id === parseInt(selectedSubjectId) && m.learning_objective_id === parseInt(selectedObjectiveId))
        : [];

    // Save Modul Ajar to DB
    const handleSave = () => {
        if (!selectedSubjectId || selectedClassIds.length === 0 || !selectedObjectiveId || !selectedMaterialId) return;
        setIsSaving(true);

        const payload = {
            subject_id: parseInt(selectedSubjectId),
            school_class_ids: selectedClassIds,
            learning_objective_id: parseInt(selectedObjectiveId),
            material_id: parseInt(selectedMaterialId),
            pedagogical_model: 'Pembelajaran Mendalam (Deep Learning)',
            general_info: JSON.stringify({}), // Empty JSON for customization
            learning_design: null,
            learning_steps: null,
            assessment_plan: null,
            kktp_details: null,
            lkpd: null,
            learning_resources: null,
        };

        router.post(route('lesson-plans.store'), payload, {
            onFinish: () => setIsSaving(false)
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Modul Ajar Baru – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-5 sm:gap-6 pb-20 md:pb-0">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition active:scale-95"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <h1 className="text-base sm:text-xl font-black text-foreground">Perakit Modul Ajar</h1>
                </div>

                <div className="max-w-3xl mx-auto w-full space-y-5 sm:space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h2 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                                <Layers className="h-4 w-4 text-primary" />
                                Sumber Data Pembelajaran
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsPromptModalOpen(true)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border bg-muted/40 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
                            >
                                <Settings className="h-3 w-3" />
                                Prompt AI
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Subject Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">1. Mata Pelajaran</label>
                                <select 
                                    value={selectedSubjectId}
                                    onChange={(e) => {
                                        setSelectedSubjectId(e.target.value);
                                        setSelectedClassIds([]);
                                        setSelectedObjectiveId('');
                                        setSelectedMaterialId('');
                                    }}
                                    className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-xs sm:text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {uniqueSubjects.map(s => (
                                        <option key={s?.subject_id} value={s?.subject_id}>{s?.subject_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Classes Checkboxes */}
                            {selectedSubjectId && availableClasses.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pilih Kelas Terkait</label>
                                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                                        {availableClasses.map(c => (
                                            <label key={c.school_class_id} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition active:scale-95 ${
                                                selectedClassIds.includes(c.school_class_id)
                                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                                    : 'border-border bg-background hover:bg-muted/50 text-foreground font-medium'
                                            }`}>
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                                    checked={selectedClassIds.includes(c.school_class_id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedClassIds([...selectedClassIds, c.school_class_id]);
                                                        } else {
                                                            setSelectedClassIds(selectedClassIds.filter(id => id !== c.school_class_id));
                                                        }
                                                    }}
                                                />
                                                <span className="text-xs">{c.class_name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedClassIds.length === 0 && (
                                        <p className="text-[11px] text-amber-500 font-bold">Pilih minimal satu kelas.</p>
                                    )}
                                </div>
                            )}

                            {/* TP Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">2. Tujuan Pembelajaran (TP)</label>
                                <select 
                                    value={selectedObjectiveId}
                                    onChange={(e) => {
                                        setSelectedObjectiveId(e.target.value);
                                        setSelectedMaterialId('');
                                    }}
                                    disabled={!selectedSubjectId}
                                    className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-xs sm:text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition disabled:opacity-50"
                                >
                                    <option value="">-- Pilih TP --</option>
                                    {filteredObjectives.map(obj => (
                                        <option key={obj.id} value={obj.id}>{obj.code ? `[${obj.code}] ` : ''}{obj.description}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Material Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">3. Materi Ajar</label>
                                <select 
                                    value={selectedMaterialId}
                                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                                    disabled={!selectedObjectiveId}
                                    className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-xs sm:text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition disabled:opacity-50"
                                >
                                    <option value="">-- Pilih Materi --</option>
                                    {filteredMaterials.map(m => (
                                        <option key={m.id} value={m.id}>{m.title}</option>
                                    ))}
                                </select>
                                {selectedObjectiveId && filteredMaterials.length === 0 && (
                                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                        <p>Belum ada materi untuk TP ini.</p>
                                        <a href={route('materials.create')} className="text-primary hover:underline font-bold mt-1 inline-block">
                                            + Buat Materi Ajar Baru
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {selectedMaterialId && (
                        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 p-5 sm:p-6 space-y-4 shadow-xs animate-in fade-in duration-300">
                            <div className="flex items-start gap-3 text-indigo-700 dark:text-indigo-400">
                                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h3 className="text-xs sm:text-sm font-bold">Siap Dirakit Menjadi Dokumen RPP</h3>
                                    <p className="text-[11px] sm:text-xs leading-relaxed text-indigo-900/70 dark:text-indigo-200/70">
                                        Modul Ajar ini akan menggunakan pendekatan <strong>Pembelajaran Mendalam (Deep Learning)</strong>. Sistem akan otomatis menyusun langkah pembelajaran, LKPD, dan instrumen asesmen.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-xs sm:text-sm font-bold shadow-md hover:bg-primary/90 active:scale-95 transition disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Merakit RPP...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Lanjut ke Wizard Modul Ajar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <PromptSettingsModal
                isOpen={isPromptModalOpen}
                onClose={() => setIsPromptModalOpen(false)}
            />
        </AppLayout>
    );
}

