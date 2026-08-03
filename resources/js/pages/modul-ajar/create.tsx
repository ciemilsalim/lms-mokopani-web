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
            index === self.findIndex((t) => t.school_class_id === value.school_class_id)
        );

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

            <div className="flex h-full flex-1 flex-col gap-6">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <h1 className="text-xl font-bold text-foreground">Perakit Modul Ajar Terintegrasi</h1>
                </div>

                <div className="max-w-3xl mx-auto w-full space-y-6">
                    <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Layers className="h-4.5 w-4.5 text-primary" />
                                Pilih Sumber Data Pembelajaran
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsPromptModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            >
                                <Settings className="h-3.5 w-3.5" />
                                Kelola Prompt AI
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Subject Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">1. Mata Pelajaran</label>
                                <select 
                                    value={selectedSubjectId}
                                    onChange={(e) => {
                                        setSelectedSubjectId(e.target.value);
                                        setSelectedClassIds([]);
                                        setSelectedObjectiveId('');
                                        setSelectedMaterialId('');
                                    }}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {uniqueSubjects.map(s => (
                                        <option key={s?.subject_id} value={s?.subject_id}>{s?.subject_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Classes Checkboxes */}
                            {selectedSubjectId && availableClasses.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Kelas Terkait</label>
                                    <div className="flex flex-wrap gap-3">
                                        {availableClasses.map(c => (
                                            <label key={c.school_class_id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 cursor-pointer transition">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-border text-primary focus:ring-primary"
                                                    checked={selectedClassIds.includes(c.school_class_id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedClassIds([...selectedClassIds, c.school_class_id]);
                                                        } else {
                                                            setSelectedClassIds(selectedClassIds.filter(id => id !== c.school_class_id));
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-foreground">{c.class_name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedClassIds.length === 0 && (
                                        <p className="text-xs text-amber-500 font-medium">Pilih minimal satu kelas.</p>
                                    )}
                                </div>
                            )}

                            {/* TP Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2. Tujuan Pembelajaran (TP)</label>
                                <select 
                                    value={selectedObjectiveId}
                                    onChange={(e) => {
                                        setSelectedObjectiveId(e.target.value);
                                        setSelectedMaterialId('');
                                    }}
                                    disabled={!selectedSubjectId}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition disabled:opacity-50"
                                >
                                    <option value="">-- Pilih TP --</option>
                                    {filteredObjectives.map(obj => (
                                        <option key={obj.id} value={obj.id}>{obj.code ? `[${obj.code}] ` : ''}{obj.description}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Material Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">3. Materi Ajar</label>
                                <select 
                                    value={selectedMaterialId}
                                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                                    disabled={!selectedObjectiveId}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition disabled:opacity-50"
                                >
                                    <option value="">-- Pilih Materi --</option>
                                    {filteredMaterials.map(m => (
                                        <option key={m.id} value={m.id}>{m.title}</option>
                                    ))}
                                </select>
                                {selectedObjectiveId && filteredMaterials.length === 0 && (
                                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
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
                        <div className="rounded-xl border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 p-6 space-y-4 shadow-sm animate-in fade-in duration-300">
                            <div className="flex items-start gap-3 text-indigo-700 dark:text-indigo-400">
                                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold">Siap Dirakit Menjadi Dokumen RPP</h3>
                                    <p className="text-xs leading-relaxed text-indigo-900/70 dark:text-indigo-200/70">
                                        Modul Ajar ini akan menggunakan pendekatan <strong>Pembelajaran Mendalam (Deep Learning)</strong>. Sistem akan otomatis menarik struktur <i>Understanding, Applying, Reflecting (UAR)</i>, Lembar Kerja (LKPD), serta Instrumen Asesmen dari materi yang Anda pilih untuk dirakit menjadi satu dokumen RPP siap cetak.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-8 py-3 text-sm font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95 transition disabled:opacity-50"
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

