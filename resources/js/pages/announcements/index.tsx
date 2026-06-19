import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { 
    AlertCircle, 
    Bell, 
    Info, 
    Plus, 
    Pencil,
    Trash2, 
    X,
    Megaphone,
    Calendar,
    User
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Pengumuman', href: '/announcements' },
];

interface Announcement {
    id: number;
    title: string;
    content: string;
    priority: 'info' | 'warning' | 'important';
    teacher_name: string;
    class_name: string;
    created_at: string;
}

interface AnnouncementsProps {
    announcements: Announcement[];
    classes: { id: number; name: string }[];
    user_role: 'teacher' | 'student' | 'admin';
}

export default function Announcements({ announcements, classes, user_role }: AnnouncementsProps) {
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    
    const { data, setData, post, processing, reset, errors } = useForm({
        school_class_id: '',
        title: '',
        content: '',
        priority: 'info',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('announcements.store'), {
            onSuccess: () => {
                setShowModal(false);
                reset();
            },
        });
    };

    const handleDelete = () => {
        if (deleteId) {
            router.delete(route('announcements.destroy', deleteId));
            setDeleteId(null);
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'important':
                return 'border-l-4 border-l-destructive';
            case 'warning':
                return 'border-l-4 border-l-warning';
            default:
                return 'border-l-4 border-l-primary';
        }
    };

    const getPriorityBadgeStyle = (priority: string) => {
        switch (priority) {
            case 'important':
                return 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/15';
            case 'warning':
                return 'bg-warning/10 text-warning border-warning/20 dark:bg-warning/15';
            default:
                return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/15';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'important': return <AlertCircle className="h-4 w-4" />;
            case 'warning': return <Bell className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengumuman – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Pengumuman</h1>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                            {user_role === 'teacher' ? 'Kelola pengumuman untuk kelas Anda' : 'Informasi terbaru dari bapak/ibu guru'}
                        </p>
                    </div>
                    {user_role === 'teacher' && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/15 transition cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Buat Pengumuman
                        </button>
                    )}
                </div>

                {/* Announcement List */}
                <div className="space-y-4">
                    {announcements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
                            <Megaphone className="h-16 w-16 mb-4 opacity-20 text-primary" />
                            <p className="text-lg font-medium text-foreground">Belum ada pengumuman</p>
                            <p className="text-sm">Semua pengumuman baru akan muncul di sini.</p>
                        </div>
                    ) : (
                        announcements.map((a) => (
                            <div key={a.id} className={`group relative rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-none transition-all hover:border-primary/30 ${getPriorityStyle(a.priority)}`}>
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight ${getPriorityBadgeStyle(a.priority)}`}>
                                                {getPriorityIcon(a.priority)}
                                                {a.priority}
                                            </span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                                Untuk: {a.class_name}
                                            </span>
                                        </div>
                                        <h2 className="text-lg font-bold leading-tight text-foreground">{a.title}</h2>
                                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{a.content}</p>
                                        <div className="flex items-center gap-4 pt-2 text-[10px] font-bold text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3 text-primary" />
                                                {a.teacher_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3 text-primary" />
                                                {a.created_at}
                                            </span>
                                        </div>
                                    </div>
                                    {user_role === 'teacher' && (
                                        <div className="flex items-center gap-1 md:self-start">
                                            <Link
                                                href={route('announcements.edit', a.id)}
                                                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Pencil className="h-5 w-5" />
                                            </Link>
                                            <button 
                                                onClick={() => setDeleteId(a.id)}
                                                className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-foreground">Buat Pengumuman Baru</h3>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition cursor-pointer">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground block">Target Kelas</label>
                                <select 
                                    value={data.school_class_id}
                                    onChange={(e) => setData('school_class_id', e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
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
                                                className={`rounded-xl border py-2.5 text-xs font-bold uppercase transition cursor-pointer ${
                                                    isActive ? style : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground block">Judul</label>
                                <input 
                                    type="text"
                                    placeholder="Judul pengumuman..."
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                />
                                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground block">Isi Pengumuman</label>
                                <textarea 
                                    rows={4}
                                    placeholder="Tuliskan isi pengumuman..."
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                                ></textarea>
                                {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
                            </div>

                            <button 
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-xl bg-primary hover:bg-primary-hover py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition disabled:opacity-50 cursor-pointer"
                            >
                                {processing ? 'Menerbitkan...' : 'Terbitkan Pengumuman'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title="Hapus Pengumuman"
                message="Hapus pengumuman ini?"
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
}
