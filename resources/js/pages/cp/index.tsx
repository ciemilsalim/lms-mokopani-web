import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { Target, Plus, Trash2, Edit2, X, BookOpen, Hash, AlignLeft, Layers } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Capaian Pembelajaran', href: '/cp' },
];

interface CpItem {
    id: number;
    kode: string;
    fase: string;
    elemen: string;
    deskripsi: string;
    subject: { id: number; name: string };
}

interface Subject {
    id: number;
    name: string;
    fase: string | null;
}

interface CpIndexProps {
    cpList: CpItem[];
    subjects: Subject[];
    filters: { subject_id?: string; fase?: string };
}

const faseList = ['Fondasi', 'A', 'B', 'C', 'D', 'E', 'F'];

export default function CpIndex({ cpList, subjects, filters }: CpIndexProps) {
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        kode: '',
        fase: 'D',
        elemen: '',
        subject_id: '',
        deskripsi: '',
    });

    const openAddModal = () => {
        setEditingId(null);
        reset();
        clearErrors();
        setShowModal(true);
    };

    const openEditModal = (cp: CpItem) => {
        setEditingId(cp.id);
        setData({
            kode: cp.kode || '',
            fase: cp.fase,
            elemen: cp.elemen || '',
            subject_id: cp.subject.id.toString(),
            deskripsi: cp.deskripsi,
        });
        clearErrors();
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            put(route('cp.update', editingId), {
                onSuccess: () => { setShowModal(false); reset(); },
            });
        } else {
            post(route('cp.store'), {
                onSuccess: () => { setShowModal(false); reset(); },
            });
        }
    };

    const handleDelete = () => {
        if (deleteId) {
            router.delete(route('cp.destroy', deleteId));
            setDeleteId(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Capaian Pembelajaran – LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Capaian Pembelajaran (CP)</h1>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Kurikulum Merdeka — CP per Elemen</p>
                    </div>
                    <button onClick={openAddModal} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition shadow-sm">
                        <Plus className="h-4 w-4" /> Tambah CP
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                        value={filters.subject_id || ''}
                        onChange={(e) => router.get('/cp', { ...filters, subject_id: e.target.value }, { preserveState: true })}
                        className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">Semua Mapel</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select
                        value={filters.fase || ''}
                        onChange={(e) => router.get('/cp', { ...filters, fase: e.target.value }, { preserveState: true })}
                        className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">Semua Fase</option>
                        {faseList.map(f => <option key={f} value={f}>Fase {f}</option>)}
                    </select>
                </div>

                <div className="grid gap-4">
                    {cpList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl bg-muted/30">
                            <Target className="h-10 w-10 text-muted-foreground/50 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Belum ada Capaian Pembelajaran</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Buat CP baru berdasarkan Elemen dan Deskripsi.</p>
                        </div>
                    ) : (
                        cpList.map(cp => (
                            <div key={cp.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                            <Layers className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-foreground text-sm truncate">{cp.elemen}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">{cp.fase}</span>
                                                <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[120px] sm:max-w-none">{cp.subject.name}</span>
                                                {cp.kode && <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">[{cp.kode}]</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openEditModal(cp)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition">
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => setDeleteId(cp.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{cp.deskripsi}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl p-5 sm:p-8 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6 sm:mb-8">
                            <h3 className="text-xl font-black text-foreground">{editingId ? 'Edit Capaian Pembelajaran' : 'Tambah Capaian Pembelajaran'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-muted transition text-muted-foreground"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fase</label>
                                    <select value={data.fase} onChange={e => setData('fase', e.target.value)} className="w-full rounded-xl border border-input bg-muted/50 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
                                        {faseList.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mata Pelajaran</label>
                                    <select value={data.subject_id} onChange={e => setData('subject_id', e.target.value)} className="w-full rounded-xl border border-input bg-muted/50 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20" required>
                                        <option value="">Pilih Mapel</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    {errors.subject_id && <p className="text-[10px] text-destructive font-bold">{errors.subject_id}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nama Elemen</label>
                                <input value={data.elemen} onChange={e => setData('elemen', e.target.value)} placeholder="Contoh: Bilangan, Aljabar, atau Pancasila" className="w-full rounded-xl border border-input bg-muted/50 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20" required />
                                {errors.elemen && <p className="text-[10px] text-destructive font-bold">{errors.elemen}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Uraian CP (Deskripsi)</label>
                                <textarea value={data.deskripsi} onChange={e => setData('deskripsi', e.target.value)} rows={5} className="w-full rounded-xl border border-input bg-muted/50 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed" placeholder="Tuliskan Capaian Pembelajaran secara menyeluruh..." required />
                                {errors.deskripsi && <p className="text-[10px] text-destructive font-bold">{errors.deskripsi}</p>}
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition">Batal</button>
                                <button type="submit" disabled={processing} className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black hover:bg-primary/90 transition shadow-lg shadow-primary/20 disabled:opacity-50">
                                    {editingId ? 'Simpan Perubahan' : 'Terbitkan CP'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={() => setDeleteId(null)}
                title="Hapus Capaian Pembelajaran"
                message="CP yang dihapus tidak bisa dikembalikan. Tujuan Pembelajaran (TP) yang merujuk CP ini mungkin akan terpengaruh."
                confirmLabel="Hapus Permanen"
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
}
