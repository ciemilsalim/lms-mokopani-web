import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { Megaphone, X, ChevronLeft } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Pengumuman', href: '/announcements' },
    { title: 'Edit Pengumuman', href: '' },
];

interface Announcement {
    id: number;
    title: string;
    content: string;
    priority: 'info' | 'warning' | 'important';
    school_class_id: number | null;
}

interface EditProps {
    announcement: Announcement;
    classes: { id: number; name: string }[];
}

export default function EditAnnouncement({ announcement, classes }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        school_class_id: announcement.school_class_id?.toString() ?? '',
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('announcements.update', announcement.id));
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'important': return 'border-l-4 border-l-destructive';
            case 'warning': return 'border-l-4 border-l-warning';
            default: return 'border-l-4 border-l-primary';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Pengumuman" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0 fade-in">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition w-fit cursor-pointer"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                </button>

                <div className="max-w-3xl w-full">
                    <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-border/30">
                        <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Megaphone className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">Edit Pengumuman</h1>
                                <p className="text-sm text-muted-foreground">Perbarui informasi pengumuman</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground block">Target Kelas</label>
                                    <select
                                        value={data.school_class_id}
                                        onChange={(e) => setData('school_class_id', e.target.value)}
                                        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900 transition"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground block">Tingkat Prioritas</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['info', 'warning', 'important'].map(p => {
                                            const isActive = data.priority === p;
                                            const style = p === 'important' ? 'border-destructive bg-destructive/10 text-destructive' :
                                                        p === 'warning' ? 'border-warning bg-warning/5 text-warning' :
                                                        'border-primary bg-primary/5 text-primary';
                                            return (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setData('priority', p as any)}
                                                    className={`rounded-xl border py-3 text-xs font-bold uppercase transition cursor-pointer ${
                                                        isActive ? style : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.priority && <p className="text-xs text-destructive">{errors.priority}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground block">Judul</label>
                                <input
                                    type="text"
                                    placeholder="Judul pengumuman..."
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900 transition"
                                />
                                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground block">Isi Pengumuman</label>
                                <textarea
                                    rows={5}
                                    placeholder="Tuliskan isi pengumuman..."
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900 transition"
                                ></textarea>
                                {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition disabled:opacity-50 cursor-pointer"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.visit(route('announcements.index'))}
                                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-bold text-muted-foreground transition hover:bg-muted/50 cursor-pointer"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
