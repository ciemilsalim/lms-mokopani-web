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
    initialClassId?: number | null;
    initialSubjectId?: number | null;
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
    initialClassId,
    initialSubjectId,
    materialId,
    initialData,
    existingResources = [],
    existingImages: initialExistingImages = [],
    errors = {},
    processing = false,
}: MaterialFormProps) {
    const uniqueSubjects = Array.from(
        new Map(teachings.map(t => [t.subject_id, { id: t.subject_id, name: t.subject?.name }])).values()
    );

    // Default subject auto-selection
    const defaultSubjectId = initialData?.subject_id
        || (initialSubjectId ? initialSubjectId.toString() : '')
        || (uniqueSubjects.length === 1 ? uniqueSubjects[0].id.toString() : '');

    // Default class auto-selection
    const defaultSchoolClasses = initialData?.school_classes
        || (initialClassId ? [initialClassId] : []);

    // --- Form State ---
    const [subjectId, setSubjectId] = useState(defaultSubjectId);
    const [schoolClasses, setSchoolClasses] = useState<number[]>(defaultSchoolClasses);
    const [learningObjectiveId, setLearningObjectiveId] = useState(initialData?.learning_objective_id || '');
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [externalLink, setExternalLink] = useState('');
    const [mainFile, setMainFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    // --- Progressive Disclosure Media Toggles ---
    const [showLinkInput, setShowLinkInput] = useState(Boolean(externalLink));
    const [showFileInput, setShowFileInput] = useState(Boolean(mainFile));
    const [showImageSection, setShowImageSection] = useState(false);

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

    const handleSubmit = (e: React.FormEvent, isDraft = false) => {
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
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 sm:space-y-6">
                {/* Global Error Summary */}
                {Object.keys(errors).length > 0 && (
                    <div className="rounded-2xl bg-destructive/10 p-3.5 sm:p-4 border border-destructive/20 text-destructive text-xs sm:text-sm font-medium flex flex-col gap-1.5">
                        <p className="font-bold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {mode === 'create' ? 'Gagal menyimpan materi.' : 'Gagal memperbarui materi.'} Silakan periksa kolom berikut:
                        </p>
                        <ul className="list-disc pl-5 text-xs space-y-0.5">
                            {Object.values(errors).map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ═══════ SECTION 1: Untuk Kelas (Konteks) ═══════ */}
                <MaterialFormSection
                    icon={BookOpen}
                    title="1. Untuk Siapa?"
                    description="Pilih mata pelajaran, kelas sasaran, dan tujuan pembelajaran."
                >
                    {/* Mata Pelajaran */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            Mata Pelajaran
                        </label>
                        <select
                            value={subjectId}
                            onChange={(e) => handleSubjectChange(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[44px]"
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
                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Target className="h-3.5 w-3.5 text-primary" />
                                Tujuan Pembelajaran (TP)
                            </label>
                            <span className="text-[10px] text-muted-foreground font-semibold">Opsional</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Hubungkan materi dengan TP agar pembelajaran lebih terstruktur.
                        </p>
                        <select
                            value={learningObjectiveId}
                            onChange={(e) => setLearningObjectiveId(e.target.value)}
                            disabled={!subjectId}
                            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-50 min-h-[44px]"
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
                        <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 mt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        Asisten AI Mokopani
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground">Buat draf judul dan isi materi secara otomatis berdasarkan TP.</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsPromptModalOpen(true)}
                                        title="Pengaturan Prompt AI"
                                        className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                                    >
                                        <Settings className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSuggestAI}
                                        disabled={isSuggesting}
                                        className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[40px]"
                                    >
                                        <Sparkles className={`h-3.5 w-3.5 ${isSuggesting ? 'animate-pulse' : ''}`} />
                                        {isSuggesting ? 'Merancang...' : 'Rancang dengan AI'}
                                    </button>
                                </div>
                            </div>

                            {aiNotification && (
                                <div className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs ${
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

                {/* ═══════ SECTION 2: Isi Materi ═══════ */}
                <MaterialFormSection
                    icon={AlignLeft}
                    title="2. Materinya Apa?"
                    description="Tulis judul yang jelas dan isi materi pembelajaran."
                >
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            Judul Materi
                        </label>
                        <p className="text-[11px] text-muted-foreground">Berikan judul yang mudah dipahami siswa.</p>
                        <input
                            type="text"
                            placeholder="Contoh: Algoritma dan Pemrograman Dasar"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[44px]"
                        />
                        {errors.title && <p className="text-xs text-destructive font-medium">{errors.title}</p>}
                    </div>

                    <div className="space-y-1.5 pt-2">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <AlignLeft className="h-3.5 w-3.5 text-primary" />
                            Isi Materi Pembelajaran
                        </label>
                        <div className="rounded-2xl overflow-hidden border border-border bg-card text-card-foreground">
                            <ReactQuill
                                theme="snow"
                                modules={quillModules}
                                value={content}
                                onChange={(val) => setContent(val)}
                                className="material-quill-editor text-foreground"
                                placeholder="Tuliskan isi materi pembelajaran, poin-poin penjelasan, atau panduan tugas di sini..."
                            />
                        </div>
                        {errors.content && <p className="text-xs text-destructive font-medium">{errors.content}</p>}
                    </div>
                </MaterialFormSection>

                {/* ═══════ SECTION 3: Media & Lampiran (Progressive Disclosure) ═══════ */}
                <MaterialFormSection
                    icon={Upload}
                    title="3. Tambahkan Pendukung (Opsional)"
                    description="Lengkapi materi dengan link, berkas modul, atau gambar."
                >
                    {/* Action Pills to add Media Types */}
                    <div className="flex flex-wrap gap-2 pb-1">
                        <button
                            type="button"
                            onClick={() => setShowLinkInput(!showLinkInput)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] border ${
                                showLinkInput || externalLink
                                    ? 'bg-primary/10 border-primary/40 text-primary'
                                    : 'bg-muted/50 border-border/70 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <LinkIcon className="h-3.5 w-3.5" />
                            <span>{showLinkInput || externalLink ? '✓ Link Eksternal' : '+ Tambah Link'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowFileInput(!showFileInput)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] border ${
                                showFileInput || mainFile
                                    ? 'bg-primary/10 border-primary/40 text-primary'
                                    : 'bg-muted/50 border-border/70 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Upload className="h-3.5 w-3.5" />
                            <span>{showFileInput || mainFile ? '✓ File Dokumen' : '+ Tambah File'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowImageSection(true);
                                setIsImageModalOpen(true);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] border ${
                                totalImages > 0
                                    ? 'bg-primary/10 border-primary/40 text-primary'
                                    : 'bg-muted/50 border-border/70 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ImagePlus className="h-3.5 w-3.5" />
                            <span>{totalImages > 0 ? `✓ ${totalImages} Gambar` : '+ Tambah Gambar'}</span>
                        </button>
                    </div>

                    {/* External Link Field */}
                    {showLinkInput && (
                        <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/60 fade-in">
                            <label className="flex items-center justify-between text-xs font-semibold text-foreground">
                                <span>Link / URL Pembelajaran</span>
                                <button
                                    type="button"
                                    onClick={() => { setExternalLink(''); setShowLinkInput(false); }}
                                    className="text-[11px] text-muted-foreground hover:text-destructive"
                                >
                                    Hapus
                                </button>
                            </label>
                            <input
                                type="url"
                                placeholder="https://youtube.com/... atau https://drive.google.com/..."
                                value={externalLink}
                                onChange={(e) => setExternalLink(e.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[44px]"
                            />
                            {errors.external_link && <p className="text-xs text-destructive font-medium">{errors.external_link}</p>}
                        </div>
                    )}

                    {/* Main File Upload */}
                    {showFileInput && (
                        <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/60 fade-in">
                            <label className="flex items-center justify-between text-xs font-semibold text-foreground">
                                <span>File Modul / Dokumen (PDF, DOC, PPT)</span>
                                <button
                                    type="button"
                                    onClick={() => { setMainFile(null); setShowFileInput(false); }}
                                    className="text-[11px] text-muted-foreground hover:text-destructive"
                                >
                                    Tutup
                                </button>
                            </label>
                            
                            {mainFile ? (
                                <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 border border-primary/20">
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
                            ) : (
                                <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-4 hover:border-primary/50 transition cursor-pointer min-h-[72px]">
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                        <Upload className="h-4 w-4 text-primary" />
                                        <span>Pilih File dari Perangkat (Maks. 10MB)</span>
                                    </div>
                                    <input
                                        type="file"
                                        onChange={(e) => setMainFile(e.target.files ? e.target.files[0] : null)}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Media Belajar / Images Preview */}
                    {totalImages > 0 && (
                        <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border/60 fade-in">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">
                                    Gambar Terlampir ({totalImages}/{maxImages})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsImageModalOpen(true)}
                                    className="text-xs font-bold text-primary hover:underline"
                                >
                                    + Kelola Gambar
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {existingImages.map((img) => (
                                    <div key={`existing-${img.id}`} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
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
                        </div>
                    )}

                    {/* Resources Editor */}
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

                {/* ═══════ STICKY ACTION BAR & BOTTOM BUTTONS ═══════ */}
                <div className="fixed md:static bottom-0 left-0 right-0 p-3 sm:p-0 bg-card/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-border/80 md:border-none z-30 flex items-center gap-2.5 shadow-lg md:shadow-none max-w-3xl mx-auto w-full min-w-0">
                    {/* Secondary Submit: Simpan Draft */}
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={isProcessing}
                        className="flex-1 md:w-auto px-4 py-3 rounded-xl border border-border bg-muted/70 text-foreground font-bold text-xs sm:text-sm hover:bg-muted transition active:scale-97 min-h-[48px] flex items-center justify-center gap-1.5"
                    >
                        <Save className="h-4 w-4 text-muted-foreground" />
                        <span>Simpan Draf</span>
                    </button>

                    {/* Primary Submit: Terbitkan Materi */}
                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="flex-1 md:flex-initial md:px-8 py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs sm:text-sm hover:bg-primary/90 shadow-md transition active:scale-97 disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Menerbitkan...</>
                        ) : (
                            <><Sparkles className="h-4 w-4" /> {mode === 'create' ? 'Terbitkan Materi' : 'Simpan Perubahan'}</>
                        )}
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
