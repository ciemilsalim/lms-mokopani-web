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
    const [selectedTeaching, setSelectedTeaching] = useState<string>('');
    const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('');
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    // Get current teaching info
    const currentTeaching = teachings.find(t => t.id === parseInt(selectedTeaching));

    // Filter TPs based on selected Subject
    const filteredObjectives = currentTeaching 
        ? objectives.filter(o => o.subject_id === currentTeaching.subject_id)
        : [];

    // Filter Materials based on selected TP & Subject
    const filteredMaterials = currentTeaching && selectedObjectiveId
        ? materials.filter(m => m.subject_id === currentTeaching.subject_id && m.learning_objective_id === parseInt(selectedObjectiveId))
        : [];

    // Save Modul Ajar to DB
    const handleSave = () => {
        if (!currentTeaching || !selectedObjectiveId || !selectedMaterialId) return;
        setIsSaving(true);

        const payload = {
            subject_id: currentTeaching.subject_id,
            school_class_id: currentTeaching.school_class_id,
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
                            {/* Teaching Assignment Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">1. Mata Pelajaran & Kelas</label>
                                <select 
                                    value={selectedTeaching}
                                    onChange={(e) => {
                                        setSelectedTeaching(e.target.value);
                                        setSelectedObjectiveId('');
                                        setSelectedMaterialId('');
                                    }}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                >
                                    <option value="">-- Pilih Mapel & Kelas --</option>
                                    {teachings.map(t => (
                                        <option key={t.id} value={t.id}>{t.subject_name} ({t.class_name})</option>
                                    ))}
                                </select>
                            </div>

                            {/* TP Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2. Tujuan Pembelajaran (TP)</label>
                                <select 
                                    value={selectedObjectiveId}
                                    onChange={(e) => {
                                        setSelectedObjectiveId(e.target.value);
                                        setSelectedMaterialId('');
                                    }}
                                    disabled={!selectedTeaching}
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

