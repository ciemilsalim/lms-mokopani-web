import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Heart, ChevronLeft, Save, Users, BookOpen, Calendar, Plus, CheckCircle2, Minus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Projek P5', href: '/p5' },
    { title: 'Buat Projek', href: '/p5/create' },
];

interface ClassItem { class_id: number; class_name: string; }
interface SubElement { id: number; nama: string; deskripsi: string | null; }
interface Element { id: number; nama: string; sub_elements: SubElement[]; }
interface Dimensi { id: number; kode: string; nama: string; elements: Element[]; }

interface SipadaProject {
    id: number;
    title: string;
    learning_objectives: string | null;
    activity_type: string;
    time_allocation: number;
}

interface P5CreateProps {
    classes: ClassItem[];
    dimensi: Dimensi[];
    sipada_projects: SipadaProject[];
    period: string;
}

const temaList = [
    'Gaya Hidup Berkelanjutan', 'Kearifan Lokal', 'Bhinneka Tunggal Ika',
    'Bangunlah Jiwa dan Raganya', 'Suara Demokrasi', 'Berekayasa dan Berteknologi',
    'Kewirausahaan', 'Kebekerjaan',
];

export default function P5Create({ classes, dimensi, sipada_projects, period }: P5CreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        judul: '',
        deskripsi: '',
        tema: '',
        school_class_id: '',
        dimensi_ids: [] as number[],
        sub_element_ids: [] as number[],
        alokasi_waktu: '',
        status: 'draft',
        cocurricular_id: '',
    });

    const toggleDimensi = (id: number) => {
        const dim = dimensi.find(d => d.id === id);
        if (!dim) return;
        const subIds = dim.elements.flatMap(el => el.sub_elements.map(se => se.id));

        if (data.dimensi_ids.includes(id)) {
            setData('dimensi_ids', data.dimensi_ids.filter(d => d !== id));
            setData('sub_element_ids', data.sub_element_ids.filter(sid => !subIds.includes(sid)));
        } else {
            setData('dimensi_ids', [...data.dimensi_ids, id]);
            setData('sub_element_ids', [...new Set([...data.sub_element_ids, ...subIds])]);
        }
    };

    const toggleSubElement = (subId: number) => {
        setData('sub_element_ids',
            data.sub_element_ids.includes(subId)
                ? data.sub_element_ids.filter(id => id !== subId)
                : [...data.sub_element_ids, subId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('p5.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Projek P5 – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 max-w-3xl mx-auto w-full min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition self-start sm:self-auto"
                    >
                        <ChevronLeft className="h-4 w-4" /> Kembali
                    </button>
                    <h1 className="text-xl font-bold text-foreground self-start sm:self-auto">Buat Projek P5 Baru</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <Heart className="h-4 w-4 text-rose-500" /> Informasi Projek
                        </h3>

                        {sipada_projects && sipada_projects.length > 0 && (
                            <div className="space-y-2 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                                <label className="text-xs font-semibold text-primary flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" /> Import Data dari Kokurikuler (Opsional)
                                </label>
                                <select 
                                    value={data.cocurricular_id} 
                                    onChange={e => {
                                        const selectedId = e.target.value;
                                        setData('cocurricular_id', selectedId);
                                        const project = sipada_projects.find(p => p.id.toString() === selectedId);
                                        if (project) {
                                            setData(data => ({
                                                ...data,
                                                cocurricular_id: selectedId,
                                                judul: project.title,
                                                deskripsi: project.learning_objectives || '',
                                                alokasi_waktu: project.time_allocation ? project.time_allocation.toString() : '',
                                            }));
                                        }
                                    }} 
                                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">-- Pilih Projek --</option>
                                    {sipada_projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-muted-foreground">Pilih projek dari jadwal untuk mengisi data secara otomatis.</p>
                            </div>
                        )}

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">Judul Projek</label>
                                <input value={data.judul} onChange={e => setData('judul', e.target.value)} placeholder="Contoh: Projek Kewirausahaan" className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" required />
                                {errors.judul && <p className="text-[10px] text-destructive">{errors.judul}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">Kelas</label>
                                <select value={data.school_class_id} onChange={e => setData('school_class_id', e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" required>
                                    <option value="">-- Pilih Kelas --</option>
                                    {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                                </select>
                                {errors.school_class_id && <p className="text-[10px] text-destructive">{errors.school_class_id}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Tema Projek</label>
                            <select value={data.tema} onChange={e => setData('tema', e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                                <option value="">-- Pilih Tema --</option>
                                {temaList.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Deskripsi Projek</label>
                            <textarea value={data.deskripsi} onChange={e => setData('deskripsi', e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">Alokasi Waktu (JP)</label>
                                <input type="number" value={data.alokasi_waktu} onChange={e => setData('alokasi_waktu', e.target.value)} placeholder="Contoh: 36" className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">Status</label>
                                <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                                    <option value="draft">Draft</option>
                                    <option value="active">Aktif</option>
                                    <option value="selesai">Selesai</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Dimensi P5 yang Dikembangkan</h3>
                        <p className="text-xs text-muted-foreground">Pilih dimensi Profil Pelajar Pancasila yang menjadi target projek ini.</p>

                        {dimensi.map(d => {
                            const isSelected = data.dimensi_ids.includes(d.id);
                            return (
                                <div key={d.id} className={`rounded-xl border p-5 transition-all ${isSelected ? 'border-rose-300 bg-rose-50/50 dark:border-rose-700 dark:bg-rose-900/10' : 'border-border'}`}>
                                    <div className="flex items-start gap-3 cursor-pointer" onClick={() => toggleDimensi(d.id)}>
                                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${isSelected ? 'bg-rose-500 border-rose-500 text-white' : 'border-border'}`}>
                                            {isSelected ? <Minus className="h-4 w-4" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-foreground">{d.nama}</h4>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
                                            {d.elements.map(el => (
                                                <div key={el.id}>
                                                    <p className="text-xs font-semibold text-muted-foreground mb-2.5">{el.nama}</p>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {el.sub_elements.map(se => {
                                                            const checked = data.sub_element_ids.includes(se.id);
                                                            return (
                                                                <label
                                                                    key={se.id}
                                                                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                                                                        checked
                                                                            ? 'border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-600 dark:bg-rose-900/30 dark:text-rose-300'
                                                                            : 'border-border bg-muted/50 text-muted-foreground hover:border-rose-200'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => toggleSubElement(se.id)}
                                                                        className="sr-only"
                                                                    />
                                                                    <div className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                                                                        checked ? 'bg-rose-500 border-rose-500 text-white' : 'border-border bg-background'
                                                                    }`}>
                                                                        {checked && <CheckCircle2 className="h-3 w-3" />}
                                                                    </div>
                                                                    {se.nama}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {errors.dimensi_ids && <p className="text-[10px] text-destructive">{errors.dimensi_ids}</p>}
                        {errors.sub_element_ids && <p className="text-[10px] text-destructive">{errors.sub_element_ids}</p>}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <button type="button" onClick={() => window.history.back()} className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition text-center">Batal</button>
                        <button type="submit" disabled={processing} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 shadow-sm">
                            <Save className="h-4 w-4" /> Buat Projek
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
