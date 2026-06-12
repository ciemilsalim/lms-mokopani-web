import React, { useRef } from 'react';
import ReactQuill from 'react-quill-new';
import { 
    BookOpen, Library, Target, Wand2, Star, Clock, 
    Upload, Trash2, Plus, Globe, Youtube, FolderOpen, Link as LinkIcon,
    Sparkles, Image, FileText
} from 'lucide-react';
import { Teaching, Objective, quillModules } from './types';

interface StepMaterialProps {
    data: any;
    setData: (key: any, value?: any) => void;
    teachings: Teaching[];
    objectives: Objective[];
    setShowTPModal: (show: boolean) => void;
    processing: boolean;
    handleSuggestExperiences: () => void;
    handleSuggestFullDraft: () => void;
    localErrors?: Record<string, string>;
}

export default function StepMaterial({
    data,
    setData,
    teachings,
    objectives,
    setShowTPModal,
    processing,
    handleSuggestExperiences,
    handleSuggestFullDraft,
    localErrors,
}: StepMaterialProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const subjectId = e.target.value;
        setData({
            ...data,
            subject_id: subjectId,
            school_classes: [],
            learning_objective_id: '',
        });
    };

    const handleObjectiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setData('learning_objective_id', id);
    };

    const addResource = (type: 'link' | 'youtube' | 'file') => {
        const newResource = {
            id: 'res_' + Math.random().toString(36).substr(2, 9),
            type,
            title: '',
            value: '',
            file: null as File | null
        };
        setData('resources', [...(data.resources || []), newResource]);
    };

    const updateResource = (id: string, field: string, value: any) => {
        const updated = (data.resources || []).map((res: any) => {
            if (res.id === id) {
                return { ...res, [field]: value };
            }
            return res;
        });
        setData('resources', updated);
    };

    const removeResource = (id: string) => {
        const filtered = (data.resources || []).filter((res: any) => res.id !== id);
        setData('resources', filtered);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setData('attachment', e.target.files[0]);
        }
    };

    const handleResourceFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            updateResource(id, 'file', file);
            updateResource(id, 'title', file.name);
        }
    };

    // Get unique subjects from teachings
    const uniqueSubjects = Array.from(
        new Map(teachings.map(t => [t.subject_id, { id: t.subject_id, name: t.subject_name }])).values()
    );

    // Get classes for the selected subject
    const classesForSubject = teachings.filter(t => t.subject_id.toString() === data.subject_id);

    // Filter TP based on subject
    const filteredObjectives = objectives.filter(obj => 
        obj.subject_id.toString() === data.subject_id
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Selection & Metadata */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-card text-card-foreground p-5 rounded-xl border border-border space-y-5">
                    <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Library className="h-4 w-4 text-primary" />
                        Pilih Kelas & Mata Pelajaran
                    </h3>

                    {/* Mapel Select */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                            Mata Pelajaran
                        </label>
                        <select
                            value={data.subject_id}
                            onChange={handleSubjectChange}
                            className={`w-full h-10 rounded-lg border bg-popover text-foreground px-4 text-[13px] font-semibold outline-none transition ${localErrors?.subject_id ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                        >
                            <option value="">-- Pilih Mapel --</option>
                            {uniqueSubjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Class Checkboxes */}
                    {data.subject_id && (
                        <div className="space-y-1.5 pt-2 border-t border-border">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                                Pilih Kelas
                            </label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {classesForSubject.map((t, idx) => (
                                    <label key={`${t.school_class_id}-${idx}`} className="flex items-center gap-2 text-sm border p-2 rounded-lg cursor-pointer hover:bg-muted/50 border-border bg-popover">
                                        <input
                                            type="checkbox"
                                            checked={data.school_classes.includes(t.school_class_id)}
                                            onChange={(e) => {
                                                const id = t.school_class_id;
                                                setData('school_classes', e.target.checked 
                                                    ? [...data.school_classes, id]
                                                    : data.school_classes.filter((c: number) => c !== id)
                                                );
                                            }}
                                            className="rounded border-input text-primary focus:ring-primary"
                                        />
                                        <span className="font-semibold text-foreground">{t.class_name}</span>
                                    </label>
                                ))}
                            </div>
                            {localErrors?.school_classes && <p className="text-xs text-destructive mt-1">{localErrors.school_classes}</p>}
                        </div>
                    )}

                    {/* TP Select */}
                    <div className="space-y-1.5 pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1 flex items-center gap-1">
                                <Target className="h-3.5 w-3.5 text-primary" />
                                Tujuan Pembelajaran (TP)
                            </label>
                            {data.subject_id && (
                                <button
                                    type="button"
                                    onClick={() => setShowTPModal(true)}
                                    className="h-5 px-1.5 text-[9px] font-bold text-primary hover:bg-primary/10 rounded transition"
                                >
                                    + Rumuskan TP
                                </button>
                            )}
                        </div>
                        <select
                            value={data.learning_objective_id}
                            onChange={handleObjectiveChange}
                            disabled={!data.subject_id}
                            className={`w-full h-10 rounded-lg border bg-popover text-foreground px-4 text-[13px] font-semibold outline-none transition disabled:opacity-50 ${localErrors?.learning_objective_id ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                        >
                            <option value="">-- Pilih Tujuan Pembelajaran --</option>
                            {filteredObjectives.map((obj) => (
                                <option key={obj.id} value={obj.id}>
                                    [{obj.code || 'TP'}] {obj.description}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Pedagogical Model & AI Magic */}
                {data.learning_objective_id && (
                    <div className="bg-card text-card-foreground p-5 rounded-xl border border-border space-y-4 animate-in fade-in duration-300">
                        <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                            <Star className="h-4 w-4 text-primary" />
                            Model Pedagogis RPP
                        </h3>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                                Model Pembelajaran
                            </label>
                            <select
                                value={data.pedagogical_model || 'Direct'}
                                onChange={(e) => setData('pedagogical_model', e.target.value)}
                                className="w-full h-10 rounded-lg border border-border bg-popover text-foreground px-4 text-[13px] font-semibold outline-none focus:border-primary transition"
                            >
                                <option value="Direct">Direct Instruction (Tatap Muka Langsung)</option>
                                <option value="PBL">Problem-Based Learning (PBL)</option>
                                <option value="PjBL">Project-Based Learning (PjBL)</option>
                                <option value="Inquiry">Inquiry Learning (Penemuan Terbimbing)</option>
                                <option value="Discovery">Discovery Learning</option>
                            </select>
                        </div>

                        {/* Premium AI Orchestrator Trigger Button */}
                        <div className="space-y-2 pt-2">
                            <button
                                type="button"
                                onClick={handleSuggestFullDraft}
                                disabled={processing}
                                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-[12px] font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                            >
                                <Sparkles className="h-4 w-4 animate-pulse" />
                                {processing ? 'Merancang Materi & RPP...' : 'Rancang Cerdas dengan AI (Materi & RPP)'}
                            </button>
                            
                            <button
                                type="button"
                                onClick={handleSuggestExperiences}
                                disabled={processing}
                                className="w-full rounded-lg border border-border bg-popover py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                <Wand2 className="h-3.5 w-3.5" />
                                {processing ? 'Merancang...' : 'Rancang 3 Tahap RPP Saja'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Material Content & Activity Editor */}
            <div className="lg:col-span-8 space-y-6">
                {/* Form fields */}
                <div className="bg-card text-card-foreground p-6 rounded-xl border border-border space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">Detail Materi Ajar</h3>
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.05em]">Rencana Pelaksanaan Pembelajaran (RPP)</p>
                        </div>
                    </div>

                    {/* Judul Materi */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                            Judul Materi Ajar
                        </label>
                        <input
                            type="text"
                            placeholder="Contoh: Pengenalan Array Satu Dimensi"
                            value={data.material_title || ''}
                            onChange={(e) => setData('material_title', e.target.value)}
                            className={`w-full h-10 rounded-lg border bg-popover text-foreground px-4 text-[13px] font-semibold outline-none transition ${localErrors?.material_title ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                        />
                    </div>

                    {/* Isi Materi */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                            Ringkasan Materi Utama
                        </label>
                        <div className="rounded-lg border border-border bg-popover overflow-hidden text-foreground">
                            <ReactQuill
                                theme="snow"
                                value={data.material_content || ''}
                                onChange={(val) => setData('material_content', val)}
                                modules={quillModules}
                                className="bg-popover min-h-[150px] text-foreground border-none"
                            />
                        </div>
                    </div>

                    {/* Ide Gambar Relevan (AI Suggestions) */}
                    {data.image_prompt && (
                        <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/10">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Image className="h-4 w-4 text-primary" /> Ide Gambar Ilustrasi Visual (AI)
                            </label>
                            <p className="text-[11.5px] text-foreground italic leading-relaxed bg-card p-3 rounded-lg border border-border/60">
                                "{data.image_prompt}"
                            </p>
                            <div className="h-28 w-full rounded-lg bg-gradient-to-br from-primary/10 via-violet-500/5 to-indigo-500/10 border border-border/80 flex flex-col items-center justify-center text-center p-4">
                                <Sparkles className="h-5 w-5 text-primary/60 mb-1.5 animate-pulse" />
                                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Representasi Ilustrasi Visual</span>
                                <span className="text-[10px] text-muted-foreground/60 mt-0.5">Prompt ini dikirimkan ke mesin ilustrator/cetak RPP</span>
                            </div>
                        </div>
                    )}

                    {/* Lembar Kerja Peserta Didik (LKPD) */}
                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Lembar Kerja Peserta Didik (LKPD)
                        </label>
                        <div className="rounded-lg border border-border bg-popover overflow-hidden text-foreground">
                            <ReactQuill
                                theme="snow"
                                value={data.lkpd || ''}
                                onChange={(val) => setData('lkpd', val)}
                                modules={quillModules}
                                className="bg-popover min-h-[150px] text-foreground border-none"
                                placeholder="Tuliskan petunjuk belajar, tugas kelompok/individu, langkah aktivitas, dan kriteria penilaian LKPD..."
                            />
                        </div>
                    </div>
                </div>

                {/* Kegiatan Pembelajaran (Understanding, Application, Reflection) */}
                {data.learning_objective_id && (
                    <div className="bg-card text-card-foreground p-6 rounded-xl border border-border space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3 pb-3 border-b border-border">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">Tahapan Aktivitas Pembelajaran</h3>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.05em]">Skenario Langkah Pembelajaran di Kelas</p>
                            </div>
                        </div>

                        {/* Tahap Memahami */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">01</div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-foreground">Tahap Memahami (Understanding)</label>
                            </div>
                            <div className="rounded-lg border border-border bg-popover overflow-hidden text-foreground">
                                <ReactQuill
                                    theme="snow"
                                    value={data.activity_understanding || ''}
                                    onChange={(val) => setData('activity_understanding', val)}
                                    modules={quillModules}
                                    className="bg-popover min-h-[100px] text-foreground border-none"
                                />
                            </div>
                        </div>

                        {/* Tahap Mengaplikasi */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">02</div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-foreground">Tahap Mengaplikasi (Application)</label>
                            </div>
                            <div className="rounded-lg border border-border bg-popover overflow-hidden text-foreground">
                                <ReactQuill
                                    theme="snow"
                                    value={data.activity_application || ''}
                                    onChange={(val) => setData('activity_application', val)}
                                    modules={quillModules}
                                    className="bg-popover min-h-[100px] text-foreground border-none"
                                />
                            </div>
                        </div>

                        {/* Tahap Merefleksi */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">03</div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-foreground">Tahap Merefleksi (Reflection)</label>
                            </div>
                            <div className="rounded-lg border border-border bg-popover overflow-hidden text-foreground">
                                <ReactQuill
                                    theme="snow"
                                    value={data.activity_reflection || ''}
                                    onChange={(val) => setData('activity_reflection', val)}
                                    modules={quillModules}
                                    className="bg-popover min-h-[100px] text-foreground border-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload & Sumber Belajar */}
                <div className="bg-card text-card-foreground p-6 rounded-xl border border-border space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Upload className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">Lampiran & Sumber Belajar</h3>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.05em]">Unggah Materi Utama & Tambah Referensi</p>
                            </div>
                        </div>
                    </div>

                    {/* File Utama */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                            Berkas Utama RPP (PDF/PPT/DOCX)
                        </label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 bg-popover"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept=".pdf,.ppt,.pptx,.docx,.doc"
                            />
                            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                <Upload className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[12px] font-semibold text-foreground">
                                    {data.attachment ? data.attachment.name : 'Klik untuk mengunggah berkas utama'}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Maksimum ukuran file: 10MB (PDF, PPT, DOCX)</p>
                            </div>
                        </div>
                    </div>

                    {/* Sumber Belajar Tambahan */}
                    <div className="space-y-3 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                                Sumber Belajar Tambahan (Opsional)
                            </label>
                            <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => addResource('link')} 
                                    className="h-6 px-2 text-[10px] font-bold text-primary border border-primary/20 hover:bg-primary/10 rounded transition flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Link
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => addResource('youtube')} 
                                    className="h-6 px-2 text-[10px] font-bold text-red-500 border border-red-500/20 hover:bg-red-500/10 rounded transition flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" /> YouTube
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => addResource('file')} 
                                    className="h-6 px-2 text-[10px] font-bold text-amber-500 border border-amber-500/20 hover:bg-amber-500/10 rounded transition flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Berkas
                                </button>
                            </div>
                        </div>

                        {/* List Sumber Tambahan */}
                        <div className="grid gap-3">
                            {(data.resources || []).map((res: any, idx: number) => (
                                <div key={res.id} className="group relative p-4 bg-popover rounded-lg border border-border hover:border-primary/20 transition-all flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded flex items-center justify-center bg-primary/10 text-primary">
                                                {res.type === 'link' ? <Globe className="h-3 w-3" /> : res.type === 'youtube' ? <Youtube className="h-3 w-3 text-red-500" /> : <FolderOpen className="h-3 w-3 text-amber-500" />}
                                            </div>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                                {res.type === 'link' ? 'Link Eksternal' : res.type === 'youtube' ? 'Video YouTube' : 'File Lampiran'}
                                            </span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeResource(res.id)} 
                                            className="text-muted-foreground/40 hover:text-[#EB5757] transition-colors p-1 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Judul sumber..."
                                        value={res.title}
                                        onChange={(e) => updateResource(res.id, 'title', e.target.value)}
                                        className="w-full h-8 rounded border border-border bg-card text-card-foreground px-3 text-[12px] font-medium focus:border-primary outline-none transition"
                                    />
                                    {res.type === 'link' || res.type === 'youtube' ? (
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                <LinkIcon className="h-3 w-3 text-muted-foreground/60" />
                                            </div>
                                            <input
                                                type="url"
                                                placeholder={res.type === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                                                value={res.value}
                                                onChange={(e) => updateResource(res.id, 'value', e.target.value)}
                                                className="w-full h-8 rounded border border-border bg-card text-card-foreground pl-8 pr-3 text-[11px] focus:border-primary outline-none transition"
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="file"
                                                onChange={(e) => handleResourceFileChange(res.id, e)}
                                                className="w-full text-[11px] text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
