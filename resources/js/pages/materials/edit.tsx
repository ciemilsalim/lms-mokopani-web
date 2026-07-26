import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { ChevronLeft, Save, Zap, Image as ImageIcon, X, Link as LinkIcon, Upload, AlertTriangle, ImagePlus, Loader2, Sparkles, Trash2 } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import { useState } from 'react';
import axios from 'axios';
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


interface EditMaterialProps {
    material: {
        id: number;
        title: string;
        content: string | null;
        thumbnail: string | null;
        subject_id: number;
        school_classes: number[];
        learning_objective_id: number | null;
        resources: Array<{
            id: number;
            type: string;
            title: string | null;
            path: string;
            file_type: string | null;
        }>;
    };
    teachings: any[];
    objectives: any[];
}

export default function EditMaterial({ material, teachings, objectives }: EditMaterialProps) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'post', // Required for sending files via inertia post instead of put
        subject_id: material.subject_id.toString(),
        school_classes: material.school_classes,
        learning_objective_id: material.learning_objective_id ? material.learning_objective_id.toString() : '',
        title: material.title,
        content: material.content || '',
        thumbnail: null as File | null,
        thumbnail_url: null as string | null,
        resources: [] as any[],
        resources_to_delete: [] as number[],
    });

    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [imageDescription, setImageDescription] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageModalTab, setImageModalTab] = useState<'upload' | 'ai'>('upload');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

    // Existing image resources
    const existingImages = material.resources
        .filter(r => r.type === 'image' && !imagesToDelete.includes(r.id))
        .map(r => ({ id: r.id, path: r.path.startsWith('http') ? r.path : `/storage/${r.path}`, type: 'existing' as const }));
    
    // Legacy thumbnail as virtual image
    const legacyThumb = material.thumbnail && existingImages.length === 0 ? [{ id: -1, path: material.thumbnail, type: 'legacy' as const }] : [];
    
    const allExistingImages = [...legacyThumb, ...existingImages];
    const totalImages = allExistingImages.length + imageFiles.length + imageUrls.length;
    const maxImages = 6;

    const handleGenerateImage = async () => {
        if (!imageDescription) return;
        if (totalImages >= maxImages) return;
        setIsGeneratingImage(true);
        try {
            const response = await axios.post(route('ai.generate-illustration'), {
                description: imageDescription
            });
            if (response.data?.status === 'success') {
                setImageUrls(prev => [...prev, response.data.url]);
                setImageDescription('');
                if (totalImages + 1 >= maxImages) {
                    setIsImageModalOpen(false);
                }
            }
        } catch (error) {
            console.error('Failed to generate image', error);
            alert('Gagal menghasilkan gambar. Pastikan AI terkonfigurasi dengan benar.');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const remaining = maxImages - totalImages;
        const toAdd = files.slice(0, remaining);
        setImageFiles(prev => [...prev, ...toAdd]);
        e.target.value = '';
    };

    const removeImageFile = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeImageUrl = (index: number) => {
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (id: number) => {
        if (id === -1) return; // Can't delete legacy thumbnail from here
        setImagesToDelete(prev => [...prev, id]);
    };

    const addResource = (type: 'link' | 'file') => {
        setData('resources', [
            ...data.resources,
            { id: Date.now(), type, title: '', value: '', file: null }
        ]);
    };

    const updateResource = (id: number, field: string, value: any) => {
        setData('resources', data.resources.map(res => 
            res.id === id ? { ...res, [field]: value } : res
        ));
    };

    const removeNewResource = (id: number) => {
        setData('resources', data.resources.filter(res => res.id !== id));
    };

    const removeExistingResource = (id: number) => {
        setData('resources_to_delete', [...data.resources_to_delete, id]);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('_method', 'post');
        formData.append('subject_id', data.subject_id.toString());
        data.school_classes.forEach(c => formData.append('school_classes[]', c.toString()));
        if (data.learning_objective_id) formData.append('learning_objective_id', data.learning_objective_id.toString());
        formData.append('title', data.title);
        if (data.content) formData.append('content', data.content);
        if (data.thumbnail) formData.append('thumbnail', data.thumbnail);
        if (data.thumbnail_url) formData.append('thumbnail_url', data.thumbnail_url);
        
        // Resources
        data.resources.forEach((res, i) => {
            formData.append(`resources[${i}][type]`, res.type);
            formData.append(`resources[${i}][title]`, res.title || '');
            if (res.type === 'link' || res.type === 'youtube') {
                formData.append(`resources[${i}][value]`, res.value || '');
            } else if (res.file) {
                formData.append(`resources[${i}][file]`, res.file);
            }
        });
        data.resources_to_delete.forEach(id => formData.append('resources_to_delete[]', id.toString()));
        
        // Multi-image
        imageFiles.forEach(f => formData.append('image_uploads[]', f));
        imageUrls.forEach(u => formData.append('image_urls[]', u));
        imagesToDelete.forEach(id => formData.append('images_to_delete[]', id.toString()));

        router.post(route('materials.update', material.id), formData, {
            forceFormData: true,
        });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Materi', href: '/materials' },
            { title: 'Edit Materi', href: '#' },
        ]}>
            <Head title={`Edit ${material.title} – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6 md:max-w-7xl mx-auto">
                {Object.keys(errors).length > 0 && (
                    <div className="rounded-xl bg-destructive/10 p-4 border border-destructive/20 text-destructive text-sm font-medium flex flex-col gap-1">
                        <p className="font-bold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Gagal memperbarui materi. Silakan periksa kesalahan berikut:
                        </p>
                        <ul className="list-disc pl-5 mt-1">
                            {Object.values(errors).map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <Link 
                        href={`/materials/${material.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali ke Materi
                    </Link>
                    
                    <button 
                        onClick={submit}
                        disabled={processing}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white bg-[#5E6AD2] hover:bg-[#4B55A8] transition disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>

                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="rounded-3xl bg-[#5E6AD2]/5 dark:bg-[#5E6AD2]/5 p-6 flex items-start gap-4">
                        <div className="bg-[#5E6AD2] p-3 rounded-2xl text-white">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#1B1B25] dark:text-[#F1F1F4]">Desain Materi Pembelajaran</h3>
                            <p className="text-xs text-[#8A8F98]">Edit isi materi, ubah thumbnail, atau sesuaikan kembali sumber belajar tambahan.</p>
                        </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        {/* Kolom Kiri: Judul dan Deskripsi */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-muted-foreground">Judul Materi</label>
                                <input 
                                    type="text" 
                                    placeholder="Contoh: Pengenalan Ekosistem Laut"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="w-full rounded-2xl border border-[#2C2C3A]/20 bg-[#F1F1F4]/10 px-5 py-4 text-sm font-bold focus:border-[#5E6AD2] outline-none transition dark:bg-[#2C2C3A] dark:border-[#2C2C3A]"
                                />
                                {errors.title && <div className="text-[#EB5757] text-xs mt-1">{errors.title}</div>}
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-bold text-muted-foreground">Deskripsi / Penjelasan</label>
                                <div className="rounded-xl overflow-hidden border border-border bg-card text-card-foreground">
                                    <ReactQuill 
                                        theme="snow"
                                        modules={quillModules}
                                        value={data.content}
                                        onChange={(content) => setData('content', content)}
                                        className="h-[350px] text-foreground"
                                        placeholder="Tuliskan isi materi atau ringkasan instruksional di sini... Gunakan fitur di atas untuk format teks."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Kolom Kanan: Gambar & Sumber Belajar */}
                        <div className="space-y-6">
                            {/* Media Belajar / Gambar */}
                            <div className="rounded-3xl border border-[#2C2C3A]/20 bg-[#F1F1F4]/10 p-6 dark:border-[#2C2C3A] dark:bg-[#2C2C3A]/30 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Media Belajar / Gambar</h4>
                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {totalImages} / {maxImages}
                                    </span>
                                </div>
                                
                                {/* Image Grid Preview */}
                                {totalImages > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {allExistingImages.map((img) => (
                                            <div key={`existing-${img.id}`} className="relative group aspect-video rounded-2xl overflow-hidden border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25]">
                                                <img src={img.path} className="w-full h-full object-cover" alt="Gambar materi" />
                                                {img.type === 'existing' && (
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <button type="button" onClick={() => removeExistingImage(img.id)} className="p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-white transition shadow-sm">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                                <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">{img.type === 'legacy' ? 'Thumbnail' : 'Tersimpan'}</span>
                                            </div>
                                        ))}
                                        {imageFiles.map((file, idx) => (
                                            <div key={`file-${idx}`} className="relative group aspect-video rounded-2xl overflow-hidden border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25]">
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Upload ${idx + 1}`} />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                    <button type="button" onClick={() => removeImageFile(idx)} className="p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-white transition shadow-sm">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-emerald-600/80 text-white px-1.5 py-0.5 rounded">Baru</span>
                                            </div>
                                        ))}
                                        {imageUrls.map((url, idx) => (
                                            <div key={`url-${idx}`} className="relative group aspect-video rounded-2xl overflow-hidden border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25]">
                                                <img src={url} className="w-full h-full object-cover" alt={`AI ${idx + 1}`} />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                    <button type="button" onClick={() => removeImageUrl(idx)} className="p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-white transition shadow-sm">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-indigo-600/80 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" /> AI</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Button */}
                                {totalImages < maxImages && (
                                    <button
                                        type="button"
                                        onClick={() => setIsImageModalOpen(true)}
                                        className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 border-dashed border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] hover:border-[#5E6AD2] transition-all cursor-pointer group"
                                    >
                                        <ImagePlus className="h-6 w-6 text-[#8A8F98]/40 group-hover:text-[#5E6AD2] transition" />
                                        <span className="text-[10px] font-bold text-muted-foreground">Tambah Gambar</span>
                                    </button>
                                )}
                            </div>

                            {/* Kotak Sumber Belajar */}
                            <div className="rounded-3xl border border-[#2C2C3A]/20 bg-[#F1F1F4]/10 p-6 dark:border-[#2C2C3A] dark:bg-[#2C2C3A]/30 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Sumber Belajar</h4>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => addResource('link')}
                                            className="p-1.5 rounded-lg bg-[#5E6AD2]/10 text-primary hover:bg-[#5E6AD2]/20 transition dark:bg-[#5E6AD2]/10 dark:text-[#5E6AD2]"
                                            title="Tambah Link"
                                        >
                                            <LinkIcon className="h-3.5 w-3.5" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => addResource('file')}
                                            className="p-1.5 rounded-lg bg-[#3DD68C]/10 text-[#3DD68C] hover:bg-[#3DD68C]/20 transition dark:bg-[#3DD68C]/10 dark:text-[#3DD68C]"
                                            title="Tambah File"
                                        >
                                            <Upload className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {material.resources.filter(res => !data.resources_to_delete.includes(res.id)).length === 0 && data.resources.length === 0 && (
                                        <div className="py-8 text-center border-2 border-dashed border-[#2C2C3A]/20 dark:border-[#2C2C3A] rounded-2xl">
                                            <p className="text-[10px] font-bold text-muted-foreground">Belum ada sumber belajar</p>
                                        </div>
                                    )}
                                    
                                    {/* Existing Resources */}
                                    {material.resources.filter(res => !data.resources_to_delete.includes(res.id)).map((res) => (
                                        <div key={res.id} className="relative group bg-white dark:bg-[#1B1B25] p-3 rounded-2xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] shadow-sm animate-in zoom-in-95 duration-200">
                                            <button 
                                                type="button"
                                                onClick={() => removeExistingResource(res.id)}
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#EB5757] text-white flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shadow-lg"
                                                title="Hapus Sumber"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>

                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-muted-foreground">{res.title || 'Sumber Tersimpan'}</p>
                                                {res.type === 'link' ? (
                                                    <div className="relative">
                                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#5E6AD2]" />
                                                        <input 
                                                            type="text" 
                                                            value={res.path}
                                                            readOnly
                                                            className="w-full rounded-xl border border-[#2C2C3A]/10 bg-[#F1F1F4]/10 pl-8 pr-3 py-2 text-[10px] outline-none text-muted-foreground dark:bg-[#2C2C3A] dark:border-[#2C2C3A] cursor-not-allowed"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="relative rounded-xl border border-[#2C2C3A]/10 bg-[#F1F1F4]/10 p-2 flex items-center gap-3 dark:bg-[#2C2C3A] dark:border-[#2C2C3A]">
                                                        <div className="h-7 w-7 rounded-lg bg-[#3DD68C]/10 dark:bg-[#3DD68C]/10 flex items-center justify-center text-[#3DD68C] dark:text-[#3DD68C]">
                                                            <Upload className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-muted-foreground truncate flex-1">
                                                            {res.path.split('/').pop()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* New Resources */}
                                    {data.resources.map((res) => (
                                        <div key={res.id} className="relative group bg-white dark:bg-[#1B1B25] p-3 rounded-2xl border border-[#5E6AD2]/20 dark:border-[#5E6AD2]/20 shadow-sm animate-in zoom-in-95 duration-200">
                                            <button 
                                                type="button"
                                                onClick={() => removeNewResource(res.id)}
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#EB5757] text-white flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shadow-lg"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>

                                            <div className="space-y-2">
                                                <input 
                                                    type="text"
                                                    placeholder={res.type === 'link' ? 'Judul Link (opsional)' : 'Judul File (opsional)'}
                                                    value={res.title}
                                                    onChange={(e) => updateResource(res.id, 'title', e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 text-[10px] font-black text-muted-foreground focus:ring-0 placeholder:text-[#8A8F98]/40"
                                                />

                                                {res.type === 'link' ? (
                                                    <div className="relative">
                                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#5E6AD2]" />
                                                        <input 
                                                            type="url" 
                                                            placeholder="https://..."
                                                            value={res.value}
                                                            onChange={(e) => updateResource(res.id, 'value', e.target.value)}
                                                            className="w-full rounded-xl border border-[#2C2C3A]/10 bg-[#F1F1F4]/10 pl-8 pr-3 py-2 text-[10px] focus:border-[#5E6AD2] outline-none dark:bg-[#2C2C3A] dark:border-[#2C2C3A]"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="relative cursor-pointer rounded-xl border border-[#2C2C3A]/10 bg-[#F1F1F4]/10 p-2 flex items-center gap-3 hover:bg-[#F1F1F4]/20 transition dark:bg-[#2C2C3A] dark:border-[#2C2C3A]">
                                                        <div className="h-7 w-7 rounded-lg bg-[#3DD68C]/10 dark:bg-[#3DD68C]/10 flex items-center justify-center text-[#3DD68C] dark:text-[#3DD68C]">
                                                            <Upload className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-[#8A8F98] truncate flex-1">
                                                            {res.file ? res.file.name : 'Pilih File (PDF/PPT/Video)'}
                                                        </span>
                                                        <input 
                                                            type="file" 
                                                            onChange={(e) => updateResource(res.id, 'file', e.target.files ? e.target.files[0] : null)}
                                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Tambah Gambar */}
            {isImageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <ImagePlus className="w-5 h-5 text-indigo-600" />
                                Tambah Gambar ({totalImages}/{maxImages})
                            </h3>
                            <button onClick={() => setIsImageModalOpen(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tab Selector */}
                        <div className="flex border-b border-border">
                            <button
                                type="button"
                                onClick={() => setImageModalTab('upload')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition border-b-2 ${
                                    imageModalTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Upload className="w-4 h-4" />
                                Upload Gambar
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageModalTab('ai')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition border-b-2 ${
                                    imageModalTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Sparkles className="w-4 h-4" />
                                Generate AI
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {totalImages >= maxImages && (
                                <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 p-3 text-xs rounded border border-amber-100 dark:border-amber-900 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    Batas maksimal {maxImages} gambar sudah tercapai.
                                </div>
                            )}

                            {imageModalTab === 'upload' ? (
                                <div className="space-y-3">
                                    <div className="bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 p-3 text-xs rounded border border-sky-100 dark:border-sky-900">
                                        Pilih satu atau beberapa gambar dari perangkat Anda. Format: JPG, PNG, WEBP (maks 4MB/gambar).
                                    </div>
                                    <label className={`flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                                        totalImages >= maxImages ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed' : 'border-border hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                                    }`}>
                                        <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-foreground">Klik untuk pilih gambar</p>
                                            <p className="text-xs text-muted-foreground mt-1">atau seret file ke sini</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            disabled={totalImages >= maxImages}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 p-3 text-xs rounded border border-indigo-100 dark:border-indigo-900">
                                        Ketikkan deskripsi gambar yang Anda inginkan. AI akan merender gambar secara otomatis.
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-foreground block">Deskripsi Gambar</label>
                                        <textarea
                                            value={imageDescription}
                                            onChange={(e) => setImageDescription(e.target.value)}
                                            placeholder="Contoh: Anak-anak SD sedang membaca buku di perpustakaan..."
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-indigo-500/20"
                                            rows={4}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateImage}
                                        disabled={isGeneratingImage || !imageDescription || totalImages >= maxImages}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                                    >
                                        {isGeneratingImage ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                        ) : (
                                            <><Sparkles className="w-4 h-4" /> Generate Gambar</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border flex justify-end bg-muted/10">
                            <button
                                type="button"
                                onClick={() => setIsImageModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
