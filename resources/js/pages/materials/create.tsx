import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { 
    ChevronLeft, 
    Upload, 
    FileText, 
    BookOpen,
    Target,
    Zap,
    AlignLeft,
    Layers,
    Link as LinkIcon,
    Globe,
    FolderOpen,
    Users,
    Image as ImageIcon,
    Trash2,
    X,
    Plus,
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'formula'],
        ['clean']
    ],
};


const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Materi', href: '/materials' },
    { title: 'Buat Materi', href: '/materials/create' },
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
    school_class_id: number;
    subject: { id: number; name: string };
    school_class: { id: number; name: string };
}

interface Resource {
    id: number;
    type: 'file' | 'link';
    value: string;
    file: File | null;
    title: string;
}

interface CreateMaterialProps {
    teachings: Teaching[];
    objectives: Objective[];
}

export default function CreateMaterial({ teachings, objectives }: CreateMaterialProps) {
    const [resources, setResources] = useState<Resource[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        subject_id: '',
        school_class_id: '',
        learning_objective_id: '',
        title: '',
        content: '',
        file: null as File | null,
        thumbnail: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('materials.store'), {
            forceFormData: true,
        });
    };

    const addResource = (type: 'file' | 'link') => {
        setResources(prev => [...prev, { id: Date.now(), type, value: '', file: null, title: '' }]);
    };

    const updateResource = (id: number, field: string, value: any) => {
        setResources(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const removeResource = (id: number) => {
        setResources(prev => prev.filter(r => r.id !== id));
    };

    // Get unique subjects from teachings
    const uniqueSubjects = Array.from(
        new Map(teachings.map(t => [t.subject_id, { id: t.subject_id, name: t.subject?.name }])).values()
    );

    // Get classes for the selected subject
    const classesForSubject = teachings.filter(t => t.subject_id === parseInt(data.subject_id));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Materi Baru – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <h1 className="text-xl font-semibold text-foreground">Buat Materi Baru</h1>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Section */}
                        <div className="rounded-xl bg-primary/5 p-4 sm:p-5 border border-primary/10">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-foreground">Informasi Dasar Materi</h2>
                                    <p className="text-xs text-muted-foreground">Pastikan materi terhubung dengan Tujuan Pembelajaran yang tepat</p>
                                </div>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                {/* Subject Select */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                                        Mata Pelajaran
                                    </label>
                                    <select 
                                        value={data.subject_id}
                                        onChange={(e) => {
                                            setData('subject_id', e.target.value);
                                            setData('school_class_id', '');
                                            setData('learning_objective_id', '');
                                        }}
                                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
                                    >
                                        <option value="">Pilih Mapel</option>
                                        {uniqueSubjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    {errors.subject_id && <p className="text-xs text-destructive">{errors.subject_id}</p>}
                                </div>

                                {/* Class Select */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                        Kelas
                                    </label>
                                    <select 
                                        value={data.school_class_id}
                                        onChange={(e) => setData('school_class_id', e.target.value)}
                                        disabled={!data.subject_id}
                                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition disabled:opacity-50"
                                    >
                                        <option value="">Pilih Kelas</option>
                                        {classesForSubject.map(t => (
                                            <option key={t.school_class_id} value={t.school_class_id}>{t.school_class?.name}</option>
                                        ))}
                                    </select>
                                    {errors.school_class_id && <p className="text-xs text-destructive">{errors.school_class_id}</p>}
                                </div>
                            </div>

                            {/* TP Select - Full Width */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                    Tujuan Pembelajaran (TP)
                                </label>
                                <select 
                                    value={data.learning_objective_id}
                                    onChange={(e) => setData('learning_objective_id', e.target.value)}
                                    disabled={!data.subject_id}
                                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition disabled:opacity-50"
                                >
                                    <option value="">Pilih TP (Opsional)</option>
                                    {objectives
                                        .filter(obj => obj.subject_id === parseInt(data.subject_id))
                                        .map(obj => (
                                            <option key={obj.id} value={obj.id}>{obj.code ? `[${obj.code}] ` : ''}{obj.description}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                                    Judul Materi
                                </label>
                                <input 
                                    type="text"
                                    placeholder="Masukkan judul materi yang menarik..."
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
                                />
                                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                    Konten / Penjelasan
                                </label>
                                <div className="rounded-xl overflow-hidden border border-border bg-card text-card-foreground">
                                    <ReactQuill 
                                        theme="snow"
                                        modules={quillModules}
                                        value={data.content}
                                        onChange={(val) => setData('content', val)}
                                        className="h-[350px] text-foreground"
                                        placeholder="Tuliskan isi materi secara detail atau ringkasan kompetensi di sini..."
                                    />
                                </div>
                                {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Thumbnail Materi */}
                        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                            <h3 className="text-xs font-semibold text-foreground">Thumbnail Materi</h3>
                            <div className="relative aspect-video rounded-lg border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center overflow-hidden group cursor-pointer">
                                {data.thumbnail ? (
                                    <img src={URL.createObjectURL(data.thumbnail)} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-card flex items-center justify-center shadow-sm group-hover:bg-primary/5 transition-all">
                                            <ImageIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary/60" />
                                        </div>
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">Upload Gambar</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => setData('thumbnail', e.target.files ? e.target.files[0] : null)} />
                            </div>
                        </div>

                        {/* File Lokal */}
                        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                            <h3 className="text-xs font-semibold text-foreground">File Lokal</h3>
                            <div className="group relative">
                                <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all hover:border-primary/50 ${data.file ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card shadow-sm mb-3">
                                        <Upload className={`h-5 w-5 ${data.file ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {data.file ? 'File Terpilih' : 'Upload File'}
                                    </p>
                                    <p className="mt-1 text-[10px] text-muted-foreground">PDF, DOC, PPT, Video</p>
                                    <input 
                                        type="file"
                                        onChange={(e) => setData('file', e.target.files ? e.target.files[0] : null)}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                    />
                                </div>
                                {data.file && (
                                    <div className="mt-2 flex items-center gap-2 rounded-md bg-primary/5 p-2.5 border border-primary/10">
                                        <FileText className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-[11px] font-medium text-primary truncate">{data.file.name}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => setData('file', null)}
                                            className="ml-auto text-muted-foreground hover:text-destructive transition p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sumber Belajar */}
                        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <h3 className="text-xs font-semibold text-foreground">Sumber Belajar</h3>
                                <div className="flex gap-1.5">
                                    <button type="button" onClick={() => addResource('link')} className="p-1.5 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 transition-all" title="Tambah Link">
                                        <LinkIcon className="h-3 w-3" />
                                    </button>
                                    <button type="button" onClick={() => addResource('file')} className="p-1.5 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 transition-all" title="Tambah File">
                                        <Upload className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {resources.map(res => (
                                    <div key={res.id} className="p-3 bg-muted/30 rounded-md border border-border space-y-2.5 group hover:border-primary/30 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded flex items-center justify-center bg-primary/10 text-primary">
                                                    {res.type === 'link' ? <Globe className="h-3 w-3" /> : <FolderOpen className="h-3 w-3" />}
                                                </div>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{res.type === 'link' ? 'Link Eksternal' : 'File Lampiran'}</span>
                                            </div>
                                            <button type="button" onClick={() => removeResource(res.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Judul sumber..."
                                            value={res.title}
                                            onChange={(e) => updateResource(res.id, 'title', e.target.value)}
                                            className="w-full h-8 rounded border border-input bg-background px-3 text-xs font-medium text-foreground focus:ring-2 focus:ring-ring outline-none transition"
                                        />
                                        {res.type === 'link' ? (
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                    <LinkIcon className="h-3 w-3 text-muted-foreground/60" />
                                                </div>
                                                <input
                                                    type="url"
                                                    placeholder="https://..."
                                                    value={res.value}
                                                    onChange={(e) => updateResource(res.id, 'value', e.target.value)}
                                                    className="w-full h-8 rounded border border-input bg-background pl-8 pr-3 text-[11px] text-foreground focus:ring-2 focus:ring-ring outline-none transition"
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <div className={`flex items-center gap-2 rounded border border-dashed p-2.5 transition ${res.file ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
                                                    <Upload className={`h-3.5 w-3.5 shrink-0 ${res.file ? 'text-primary' : 'text-muted-foreground/40'}`} />
                                                    <span className="text-[10px] font-medium text-muted-foreground truncate">
                                                        {res.file ? res.file.name : 'Pilih file...'}
                                                    </span>
                                                </div>
                                                <input 
                                                    type="file"
                                                    onChange={(e) => updateResource(res.id, 'file', e.target.files?.[0] || null)}
                                                    className="absolute inset-0 cursor-pointer opacity-0"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {resources.length === 0 && (
                                    <div className="py-6 flex flex-col items-center justify-center border border-dashed border-border rounded-md bg-muted/20">
                                        <p className="text-[10px] text-muted-foreground/40 uppercase font-bold tracking-wider">Belum ada sumber belajar</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition disabled:opacity-50"
                        >
                            {processing ? 'Menerbitkan...' : 'Terbitkan Materi'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
