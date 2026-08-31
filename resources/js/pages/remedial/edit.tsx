import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronLeft, Save, Trash2, User, BookOpen, AlertCircle } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Remedial & Pengayaan', href: '/remedial' },
    { title: 'Detail', href: '#' },
];

interface Student {
    id: number;
    name: string;
    nis: string;
}

interface Assignment {
    id: number;
    title: string;
}

interface Subject {
    id: number;
    name: string;
}

interface Record {
    id: number;
    type: 'remedial' | 'pengayaan';
    initial_score: number | null;
    remedial_score: number | null;
    description: string | null;
    due_date: string | null;
    status: string;
    created_at: string;
    student: Student;
    assignment: Assignment;
    subject: Subject;
}

interface EditRemedialProps {
    record: Record;
}

interface Flash {
    success?: string;
    error?: string;
}

const statusOptions = [
    { value: 'assigned', label: 'Ditugaskan' },
    { value: 'in_progress', label: 'Dalam Proses' },
    { value: 'completed', label: 'Selesai' },
    { value: 'expired', label: 'Kadaluarsa' },
];

export default function EditRemedial({ record }: EditRemedialProps) {
    const { flash } = usePage<{ flash: Flash }>().props;

    const [form, setForm] = useState({
        status: record.status,
        remedial_score: record.remedial_score?.toString() || '',
        description: record.description || '',
        due_date: record.due_date || '',
    });

    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post(route('remedial.update', record.id), {
            ...form,
            remedial_score: form.remedial_score ? Number(form.remedial_score) : null,
            due_date: form.due_date || null,
        }, {
            onFinish: () => setSaving(false),
        });
    };

    const handleDelete = () => {
        router.delete(route('remedial.destroy', record.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detail ${record.type === 'remedial' ? 'Remedial' : 'Pengayaan'} – LMS Mokopani`} />

            <div className="space-y-4 sm:space-y-6 min-w-0 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full px-1 sm:px-0">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition w-fit min-h-[44px]"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                </button>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSubmit} className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-foreground mb-6">
                                Edit Record {record.type === 'remedial' ? 'Remedial' : 'Pengayaan'}
                            </h2>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">Status</label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                                        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                                    >
                                        {statusOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">
                                        Nilai {record.type === 'remedial' ? 'Remedial' : 'Pengayaan'}
                                    </label>
                                    <input
                                        type="number"
                                        value={form.remedial_score}
                                        onChange={(e) => setForm((p) => ({ ...p, remedial_score: e.target.value }))}
                                        min="0"
                                        max="100"
                                        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                                        placeholder={`Masukkan nilai setelah ${record.type === 'remedial' ? 'remedial' : 'pengayaan'}`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">Tenggat Waktu</label>
                                    <input
                                        type="date"
                                        value={form.due_date}
                                        onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                                        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-foreground">Deskripsi</label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                        rows={3}
                                        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                                        placeholder="Catatan..."
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" />
                                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>

                                {!confirmDelete ? (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(true)}
                                        className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl border border-red-200 px-6 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Hapus
                                    </button>
                                ) : (
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                        <span className="text-xs font-bold text-red-600 text-center sm:text-left mb-1 sm:mb-0">Yakin hapus?</span>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="w-full sm:w-auto rounded-xl bg-red-600 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white hover:bg-red-700 transition"
                                        >
                                            Ya, Hapus
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(false)}
                                            className="w-full sm:w-auto rounded-xl border border-border px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-muted-foreground hover:bg-muted transition"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-border/30">
                            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest">Informasi</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{record.student.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{record.student.nis}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{record.assignment.title}</p>
                                        <p className="text-[10px] text-muted-foreground">{record.subject.name}</p>
                                    </div>
                                </div>
                                <div className="border-t border-border pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tipe</span>
                                        <span className={`font-bold ${record.type === 'remedial' ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {record.type === 'remedial' ? 'Remedial' : 'Pengayaan'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Nilai Awal</span>
                                        <span className="font-bold text-foreground">{record.initial_score ?? '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Dibuat</span>
                                        <span className="font-bold text-foreground">{new Date(record.created_at).toLocaleDateString('id-ID')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {flash?.success && (
                            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-emerald-600" />
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{flash.success}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
