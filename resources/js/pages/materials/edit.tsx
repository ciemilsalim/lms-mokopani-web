import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, Save, Zap, Image as ImageIcon, X, Link as LinkIcon, Upload } from 'lucide-react';
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
        resources: [] as any[],
        resources_to_delete: [] as number[],
    });

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
        post(route('materials.update', material.id), {
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

                        {/* Kolom Kanan: Gambar Pendukung & Sumber Belajar */}
                        <div className="space-y-6">
                            {/* Kotak Thumbnail */}
                            <div className="rounded-3xl border border-[#2C2C3A]/20 bg-[#F1F1F4]/10 p-6 dark:border-[#2C2C3A] dark:bg-[#2C2C3A]/30 space-y-4">
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Gambar Pendukung</h4>
                                <div className="relative group cursor-pointer aspect-video rounded-2xl bg-white dark:bg-[#1B1B25] border-2 border-dashed border-[#2C2C3A]/20 dark:border-[#2C2C3A] flex flex-col items-center justify-center transition-all hover:border-[#5E6AD2] overflow-hidden">
                                    {data.thumbnail ? (
                                        <img src={URL.createObjectURL(data.thumbnail)} className="absolute inset-0 w-full h-full object-cover" />
                                    ) : material.thumbnail ? (
                                        <img src={material.thumbnail} className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <ImageIcon className="h-8 w-8 text-[#8A8F98]/40 mb-2" />
                                            <span className="text-[10px] font-bold text-muted-foreground">Upload Thumbnail Baru</span>
                                        </>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => setData('thumbnail', e.target.files ? e.target.files[0] : null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                    />
                                    {data.thumbnail && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <X onClick={(e) => { e.preventDefault(); setData('thumbnail', null) }} className="h-6 w-6 text-white" />
                                        </div>
                                    )}
                                </div>
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
        </AppLayout>
    );
}
