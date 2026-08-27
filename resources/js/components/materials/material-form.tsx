import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    BookOpen, Target, Zap, AlignLeft, Sparkles, AlertTriangle,
    ImagePlus, Upload, FileText, LinkIcon, X, ChevronLeft,
    Loader2, Settings, Save
} from 'lucide-react';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import PromptSettingsModal from '@/components/PromptSettingsModal';

import { MaterialFormSection } from './material-form-section';
import { MaterialClassSelector } from './material-class-selector';
import { MaterialImageModal } from './material-image-modal';
import { MaterialResourceEditor } from './material-resource-editor';

// --- Quill Config ---
const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'formula'],
        ['clean']
    ],
};

// --- AI Helpers (preserved from original) ---
const sanitizeAiHtml = (text: string | null | undefined): string => {
    if (!text) return '';
    let html = text;
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    html = html.replace(/<embed\b[^>]*\/?>/gi, '');
    html = html.replace(/\s+on\w+="[^"]*"/gi, '');
    html = html.replace(/\s+on\w+='[^']*'/gi, '');
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
    html = html.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
        .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
        .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019');
    html = html.replace(/>\s{2,}</g, '> <');
    return html.trim();
};

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

// --- Types ---
interface Teaching {
    id: number;
    subject_id: number;
    school_class_id: number;
    subject: { id: number; name: string };
    school_class: { id: number; name: string };
}

interface Objective {
    id: number;
    code: string;
    description: string;
    subject_id: number;
}

interface NewResource {
    id: number;
    type: 'file' | 'link';
    value: string;
    file: File | null;
    title: string;
}

interface ExistingResource {
    id: number;
    type: string;
    title: string | null;
    path: string;
    file_type: string | null;
}

interface ExistingImage {
    id: number;
    path: string;
    type: 'existing' | 'legacy';
}

export interface MaterialFormProps {
    mode: 'create' | 'edit';
    teachings: Teaching[];
    objectives: Objective[];
    // Edit-only props
    materialId?: number;
    initialData?: {
        subject_id: string;
        school_classes: number[];
        learning_objective_id: string;
        title: string;
        content: string;
        thumbnail: string | null;
    };
    existingResources?: ExistingResource[];
    existingImages?: ExistingImage[];
    errors?: Record<string, string>;
    processing?: boolean;
}

export function MaterialForm({
    mode,
    teachings,
    objectives,
    materialId,
    initialData,
    existingResources = [],
    existingImages: initialExistingImages = [],
    errors = {},
    processing = false,
}: MaterialFormProps) {
    // --- Form State ---
    const [subjectId, setSubjectId] = useState(initialData?.subject_id || '');
    const [schoolClasses, setSchoolClasses] = useState<number[]>(initialData?.school_classes || []);
    const [learningObjectiveId, setLearningObjectiveId] = useState(initialData?.learning_objective_id || '');
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [externalLink, setExternalLink] = useState('');
    const [mainFile, setMainFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    // --- Resource State ---
    const [newResources, setNewResources] = useState<NewResource[]>([]);
    const [resourcesToDelete, setResourcesToDelete] = useState<number[]>([]);

    // --- Image State ---
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

    // --- AI State ---
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [aiNotification, setAiNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);
    const [fullDraftClickCount, setFullDraftClickCount] = useState(0);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    // --- Submitting State ---
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived
    const existingImages = initialExistingImages.filter(img => !imagesToDelete.includes(img.id));
    const totalImages = existingImages.length + imageFiles.length + imageUrls.length;
    const maxImages = 6;

    const uniqueSubjects = Array.from(
        new Map(teachings.map(t => [t.subject_id, { id: t.subject_id, name: t.subject?.name }])).values()
    );

    const classesForSubject = teachings
        .filter(t => t.subject_id === parseInt(subjectId))
        .filter((value, index, self) =>
            index === self.findIndex((t) => t.school_class?.name === value.school_class?.name)
        )
        .sort((a, b) => (a.school_class?.name || '').localeCompare(b.school_class?.name || ''));

    const filteredObjectives = objectives.filter(obj => obj.subject_id === parseInt(subjectId));

    // AI notification timer
    useEffect(() => {
        if (aiNotification) {
            const timer = setTimeout(() => setAiNotification(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [aiNotification]);

    // --- Handlers ---
    const handleSubjectChange = (newSubjectId: string) => {
        setSubjectId(newSubjectId);
        setSchoolClasses([]);
        setLearningObjectiveId('');
    };

    const handleSuggestAI = async () => {
        if (!learningObjectiveId) return;
        setIsSuggesting(true);
        try {
            const response = await axios.post(route('instructional-design.auto-suggest'), {
                learning_objective_id: learningObjectiveId,
                pedagogical_model: 'Direct',
                suggest_type: 'full_draft',
                regenerate: fullDraftClickCount > 0
            });
            if (response.data) {
                setFullDraftClickCount(prev => prev + 1);
                const draft = response.data;
                if (draft.ai_active === false) {
                    setAiNotification({
                        message: 'Koneksi AI (Gemini) tidak aktif atau kuota API telah habis. Sistem secara otomatis beralih menggunakan draf offline berkualitas tinggi.',
                        type: 'warning'
                    });
                }
                if (draft.title) setTitle(cleanPlainText(draft.title));
                if (draft.content) setContent(sanitizeAiHtml(draft.content));
            }
        } catch (error) {
            console.error('Error orchestrating AI lesson draft:', error);
            setAiNotification({ message: 'Gagal menghubungi server AI. Silakan coba lagi.', type: 'error' });
        } finally {
            setIsSuggesting(false);
        }
    };

    const addResource = (type: 'file' | 'link') => {
        setNewResources(prev => [...prev, { id: Date.now(), type, value: '', file: null, title: '' }]);
    };

    const updateResource = (id: number, field: string, value: any) => {
        setNewResources(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const removeNewResource = (id: number) => {
        setNewResources(prev => prev.filter(r => r.id !== id));
    };

    const removeExistingResource = (id: number) => {
        setResourcesToDelete(prev => [...prev, id]);
    };

    const removeExistingImage = (id: number) => {
        if (id === -1) return;
        setImagesToDelete(prev => [...prev, id]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();

        if (mode === 'edit') {
            formData.append('_method', 'post');
        }

        formData.append('subject_id', subjectId);
        schoolClasses.forEach(c => formData.append('school_classes[]', c.toString()));
        if (learningObjectiveId) formData.append('learning_objective_id', learningObjectiveId);
        formData.append('title', title);
        if (content) formData.append('content', content);
        if (externalLink) formData.append('external_link', externalLink);
        if (thumbnail) formData.append('thumbnail', thumbnail);
        if (thumbnailUrl) formData.append('thumbnail_url', thumbnailUrl);
        if (mainFile) formData.append('file', mainFile);

        // Resources
        newResources.forEach((res, i) => {
            formData.append(`resources[${i}][type]`, res.type);
            formData.append(`resources[${i}][title]`, res.title || '');
            if (res.type === 'link' || (res.type as string) === 'youtube') {
                formData.append(`resources[${i}][value]`, res.value || '');
            } else if (res.file) {
                formData.append(`resources[${i}][file]`, res.file);
            }
        });

        if (mode === 'edit') {
            resourcesToDelete.forEach(id => formData.append('resources_to_delete[]', id.toString()));
            imagesToDelete.forEach(id => formData.append('images_to_delete[]', id.toString()));
        }

        // Multi-image
        imageFiles.forEach(f => formData.append('image_uploads[]', f));
        imageUrls.forEach(u => formData.append('image_urls[]', u));

        const targetRoute = mode === 'create'
            ? route('materials.store')
            : route('materials.update', materialId!);

        router.post(targetRoute, formData, {
            forceFormData: true,
            onError: () => setIsSubmitting(false),
            onFinish: () => setIsSubmitting(false),
        });
    };

    const isProcessing = processing || isSubmitting;

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 pb-20 md:pb-8">
                {/* Global Error Summary */}
                {Object.keys(errors).length > 0 && (
                    <div className="rounded-2xl bg-destructive/10 p-4 border border-destructive/20 text-destructive text-sm font-medium flex flex-col gap-1.5">
                        <p className="font-bold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {mode === 'create' ? 'Gagal menyimpan materi.' : 'Gagal memperbarui materi.'} Silakan periksa kesalahan berikut:
                        </p>
                        <ul className="list-disc pl-5 text-xs space-y-0.5">
                            {Object.values(errors).map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ═══════ SECTION 1: Konteks Pembelajaran ═══════ */}
                <MaterialFormSection
                    icon={BookOpen}
                    title="Konteks Pembelajaran"
                    description="Tentukan mata pelajaran, kelas, dan tujuan pembelajaran."
                >
                    {/* Mata Pelajaran */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <BookOpen className="h-3.5 w-3.5 text-primary/60" />
                            Mata Pelajaran
                        </label>
                        <select
                            value={subjectId}
                            onChange={(e) => handleSubjectChange(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[48px]"
                        >
                            <option value="">Pilih Mata Pelajaran</option>
                            {uniqueSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {errors.subject_id && <p className="text-xs text-destructive font-medium">{errors.subject_id}</p>}
                    </div>

                    {/* Kelas Multi-Select */}
                    <MaterialClassSelector
                        classes={classesForSubject.map(c => ({ id: c.school_class_id, name: c.school_class?.name || '' }))}
                        selectedIds={schoolClasses}
                        onChange={setSchoolClasses}
                        disabled={!subjectId}
                        error={errors.school_classes}
                    />

                    {/* Tujuan Pembelajaran */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Target className="h-3.5 w-3.5 text-primary/60" />
                            Tujuan Pembelajaran (TP)
                        </label>
                        <select
                            value={learningObjectiveId}
                            onChange={(e) => setLearningObjectiveId(e.target.value)}
                            disabled={!subjectId}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-50 min-h-[48px]"
                        >
                            <option value="">Pilih TP (Opsional)</option>
                            {filteredObjectives.map(obj => (
                                <option key={obj.id} value={obj.id}>
                                    {obj.code ? `[${obj.code}] ` : ''}{obj.description}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* AI Assistant Panel (Create Only) */}
                    {mode === 'create' && learningObjectiveId && (
                        <div className="space-y-3 p-4 rounded-2xl border border-primary/15 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        Asisten AI Mokopani
                                    </h4>
                                    <p className="text-xs text-muted-foreground">Buat draf judul dan isi materi secara otomatis berdasarkan TP.</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsPromptModalOpen(true)}
                                        title="Pengaturan Prompt AI"
                                        className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    >
                                        <Settings className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSuggestAI}
                                        disabled={isSuggesting}
                                        className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                                    >
                                        <Sparkles className={`h-4 w-4 ${isSuggesting ? 'animate-pulse' : ''}`} />
                                        {isSuggesting ? 'Merancang...' : 'Rancang dengan AI'}
                                    </button>
                                </div>
                            </div>

                            {aiNotification && (
                                <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                                    aiNotification.type === 'error'
                                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                                }`}>
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <p>{aiNotification.message}</p>
                                </div>
                            )}
                        </div>
                    )}
                </MaterialFormSection>

                {/* ═══════ SECTION 2: Informasi Materi ═══════ */}
                <MaterialFormSection
                    icon={Zap}
                    title="Informasi Materi"
                    description="Berikan judul yang jelas dan menarik."
                >
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Zap className="h-3.5 w-3.5 text-primary/60" />
                            Judul Materi
                        </label>
                        <input
                            type="text"
                            placeholder="Contoh: Algoritma dan Pemrograman Dasar"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[48px]"
                        />
                        {errors.title && <p className="text-xs text-destructive font-medium">{errors.title}</p>}
                    </div>
                </MaterialFormSection>

                {/* ═══════ SECTION 3: Isi Materi ═══════ */}
                <MaterialFormSection
                    icon={AlignLeft}
                    title="Isi Materi"
                    description="Tuliskan materi yang akan dipelajari siswa."
                >
                    <div className="space-y-2">
                        <div className="rounded-2xl overflow-hidden border border-border bg-card text-card-foreground">
                            <ReactQuill
                                theme="snow"
                                modules={quillModules}
                                value={content}
                                onChange={(val) => setContent(val)}
                                className="material-quill-editor text-foreground"
                                placeholder="Tuliskan isi materi secara detail atau ringkasan kompetensi di sini..."
                            />
                        </div>
                        {errors.content && <p className="text-xs text-destructive font-medium">{errors.content}</p>}
                    </div>
                </MaterialFormSection>

                {/* ═══════ SECTION 4: Media & Lampiran ═══════ */}
                <MaterialFormSection
                    icon={Upload}
                    title="Media & Lampiran"
                    description="Tambahkan berkas, link, dan gambar pendukung."
                >
                    {/* External Link */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <LinkIcon className="h-3.5 w-3.5 text-primary/60" />
                            Link Eksternal
                        </label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={externalLink}
                            onChange={(e) => setExternalLink(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[44px]"
                        />
                        {errors.external_link && <p className="text-xs text-destructive font-medium">{errors.external_link}</p>}
                    </div>

                    {/* Main File Upload */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">File Utama</label>
                        <div className="relative group">
                            <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all hover:border-primary/50 cursor-pointer min-h-[100px] ${
                                mainFile ? 'border-primary bg-primary/5' : 'border-border bg-muted/10'
                            }`}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm mb-2">
                                    <Upload className={`h-5 w-5 ${mainFile ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <p className="text-xs font-bold text-muted-foreground">
                                    {mainFile ? 'File Terpilih' : 'Upload File'}
                                </p>
                                <p className="mt-1 text-[10px] text-muted-foreground/60">PDF, DOC, PPT, Video (maks 10MB)</p>
                                <input
                                    type="file"
                                    onChange={(e) => setMainFile(e.target.files ? e.target.files[0] : null)}
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                />
                            </div>
                            {mainFile && (
                                <div className="mt-2 flex items-center gap-2 rounded-xl bg-primary/5 p-3 border border-primary/10">
                                    <FileText className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-xs font-bold text-primary truncate flex-1">{mainFile.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setMainFile(null)}
                                        className="p-1.5 text-muted-foreground hover:text-destructive transition rounded-lg min-h-[32px] min-w-[32px] flex items-center justify-center"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Media Belajar / Images */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-muted-foreground">
                                Media Belajar / Gambar
                            </label>
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {totalImages} / {maxImages}
                            </span>
                        </div>

                        {/* Image Preview */}
                        {totalImages > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {existingImages.map((img) => (
                                    <div key={`existing-${img.id}`} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
                                        <img src={img.path} className="w-full h-full object-cover" alt="Gambar materi" />
                                        <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                                            {img.type === 'legacy' ? 'Thumb' : 'Tersimpan'}
                                        </span>
                                    </div>
                                ))}
                                {imageFiles.map((file, idx) => (
                                    <div key={`file-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Upload ${idx + 1}`} />
                                        <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">Baru</span>
                                    </div>
                                ))}
                                {imageUrls.map((url, idx) => (
                                    <div key={`url-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
                                        <img src={url} className="w-full h-full object-cover" alt={`AI ${idx + 1}`} />
                                        <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-primary/80 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"><Sparkles className="h-2 w-2" /> AI</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {totalImages < maxImages && (
                            <button
                                type="button"
                                onClick={() => setIsImageModalOpen(true)}
                                className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed border-border bg-muted/10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group min-h-[80px]"
                            >
                                <ImagePlus className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Tambah Gambar</span>
                            </button>
                        )}
                    </div>

                    {/* Resources */}
                    <MaterialResourceEditor
                        newResources={newResources}
                        onAddResource={addResource}
                        onUpdateResource={updateResource}
                        onRemoveNewResource={removeNewResource}
                        existingResources={mode === 'edit' ? existingResources : undefined}
                        deletedResourceIds={resourcesToDelete}
                        onRemoveExistingResource={mode === 'edit' ? removeExistingResource : undefined}
                    />
                </MaterialFormSection>

                {/* ═══════ SECTION 6: Review & Submit ═══════ */}
                <div className="space-y-4 pt-2">
                    {/* Review Summary */}
                    <div className="flex flex-wrap gap-2">
                        {subjectId && uniqueSubjects.find(s => s.id === parseInt(subjectId)) && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                                <BookOpen className="h-3 w-3" />
                                {uniqueSubjects.find(s => s.id === parseInt(subjectId))?.name}
                            </span>
                        )}
                        {schoolClasses.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-foreground text-[10px] font-bold">
                                {schoolClasses.length} kelas
                            </span>
                        )}
                        {title && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-foreground text-[10px] font-bold truncate max-w-[200px]">
                                {title}
                            </span>
                        )}
                    </div>

                    {/* Primary Submit */}
                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-md hover:bg-primary/90 transition active:scale-[0.98] disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> {mode === 'create' ? 'Menerbitkan...' : 'Menyimpan...'}</>
                        ) : (
                            <><Save className="h-4 w-4" /> {mode === 'create' ? 'Terbitkan Materi' : 'Simpan Perubahan'}</>
                        )}
                    </button>

                    {/* Secondary Cancel */}
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        disabled={isProcessing}
                        className="w-full rounded-2xl border border-border py-3 text-sm font-bold text-muted-foreground hover:bg-muted/50 transition min-h-[44px]"
                    >
                        Batal
                    </button>
                </div>
            </form>

            {/* Image Modal */}
            <MaterialImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                imageFiles={imageFiles}
                setImageFiles={setImageFiles}
                imageUrls={imageUrls}
                setImageUrls={setImageUrls}
                existingImages={existingImages}
                onRemoveExistingImage={mode === 'edit' ? removeExistingImage : undefined}
                thumbnail={thumbnail}
                thumbnailUrl={thumbnailUrl}
                onSetThumbnailFile={(file) => { setThumbnail(file); setThumbnailUrl(null); }}
                onSetThumbnailUrl={(url) => { setThumbnailUrl(url); setThumbnail(null); }}
                onClearThumbnail={() => { setThumbnail(null); setThumbnailUrl(null); }}
                maxImages={maxImages}
            />

            {/* Prompt Settings Modal (Create only) */}
            {mode === 'create' && (
                <PromptSettingsModal
                    isOpen={isPromptModalOpen}
                    onClose={() => setIsPromptModalOpen(false)}
                />
            )}
        </>
    );
}
