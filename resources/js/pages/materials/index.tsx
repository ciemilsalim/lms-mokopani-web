import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    FileText,
    Plus,
    Search,
    Trash2,
    ExternalLink,
    FileArchive,
    FileCode,
    FileImage,
    FileVideo,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    FilePlus,
    Lock,
    Unlock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Materi', href: '/materials' },
];

interface Material {
    id: number;
    title: string;
    subject_name: string;
    teacher_name: string;
    file_type: string | null;
    created_at: string;
    is_accessible?: boolean;
    access_status?: 'auto' | 'open' | 'locked';
}

interface TpGroup {
    tp_id: number | null;
    tp_code: string;
    tp_description: string;
    materials: Material[];
}

interface SubjectGroup {
    subject_id: number;
    subject_name: string;
    tps: TpGroup[];
    total: number;
}

interface TeacherSubjectGroup {
    subject_id: number;
    subject_name: string;
    tps: TpGroup[];
}

interface TeacherClassGroup {
    class_id: number;
    class_name: string;
    subjects: TeacherSubjectGroup[];
}

interface MaterialsProps {
    materials?: Material[];
    grouped_materials?: SubjectGroup[];
    teacher_grouped?: TeacherClassGroup[];
    active_year?: string;
    active_semester?: string;
    user_role: 'teacher' | 'student' | 'admin';
}

const getFileIcon = (type: string | null) => {
    if (!type) return FileText;
    const t = type.toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(t)) return FileText;
    if (['jpg', 'jpeg', 'png', 'svg'].includes(t)) return FileImage;
    if (['mp4', 'mov', 'avi'].includes(t)) return FileVideo;
    if (['zip', 'rar', '7z'].includes(t)) return FileArchive;
    return FileCode;
};

const getFileTypeBadge = (type: string | null) => {
    if (!type) return { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-850 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800', label: 'DOKUMEN' };
    const t = type.toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(t)) {
        return { bg: 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-350 dark:border-rose-900/30', label: t.toUpperCase() };
    }
    if (['jpg', 'jpeg', 'png', 'svg'].includes(t)) {
        return { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-350 dark:border-emerald-900/30', label: 'GAMBAR' };
    }
    if (['mp4', 'mov', 'avi'].includes(t)) {
        return { bg: 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-350 dark:border-indigo-900/30', label: 'VIDEO' };
    }
    if (['zip', 'rar', '7z'].includes(t)) {
        return { bg: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-350 dark:border-amber-900/30', label: 'ARSIP' };
    }
    return { bg: 'bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/30 dark:text-sky-350 dark:border-sky-900/30', label: t.toUpperCase() };
};

function MaterialCard({ m, onDelete, isTeacher }: { m: Material; onDelete?: (id: number) => void; isTeacher?: boolean }) {
    const Icon = getFileIcon(m.file_type);
    const isAccessible = m.is_accessible !== false;
    const badge = getFileTypeBadge(m.file_type);

    return (
        <div className={`group relative rounded-xl border border-border/80 bg-card p-5 card-hover shadow-sm ${!isAccessible ? 'opacity-60 grayscale-[30%] cursor-not-allowed' : ''}`}>
            <div className="mb-4 flex items-start justify-between">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                    <Icon className="h-6 w-6" />
                    {!isAccessible && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground">
                            <Lock className="h-2.5 w-2.5" />
                        </div>
                    )}
                </div>
                {onDelete && (
                    <button
                        onClick={() => onDelete(m.id)}
                        className="p-2 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition cursor-pointer"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider truncate">
                        {m.subject_name}
                    </span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${badge.bg}`}>
                        {badge.label}
                    </span>
                </div>
                <h3 className="line-clamp-2 text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {m.title}
                </h3>
                <p className="text-xs text-muted-foreground">Dibuat oleh {m.teacher_name}</p>
            </div>

            {isTeacher && (
                <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Akses Siswa:</span>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            const current = m.access_status || 'auto';
                            const next = current === 'auto' ? 'open' : (current === 'open' ? 'locked' : 'auto');
                            router.post(route('materials.toggle-lock', m.id), { status: next }, { preserveScroll: true });
                        }}
                        title="Klik untuk mengubah status akses siswa"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9.5px] font-extrabold tracking-wide uppercase transition cursor-pointer shadow-sm ${
                            m.access_status === 'open' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300' :
                            m.access_status === 'locked' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300' :
                            'bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300'
                        }`}
                    >
                        {m.access_status === 'open' && (
                            <>
                                <Unlock className="h-3 w-3 shrink-0" />
                                <span>Terbuka (Bebas)</span>
                            </>
                        )}
                        {m.access_status === 'locked' && (
                            <>
                                <Lock className="h-3 w-3 shrink-0" />
                                <span>Terkunci</span>
                            </>
                        )}
                        {(!m.access_status || m.access_status === 'auto') && (
                            <>
                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                                <span>Otomatis (Alur AI)</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <span className="text-[10px] font-medium text-muted-foreground">{m.created_at}</span>
                {isAccessible ? (
                    <Link
                        href={route('materials.show', m.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover hover:underline"
                    >
                        Buka Materi
                        <ExternalLink className="h-3 w-3" />
                    </Link>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground cursor-not-allowed">
                        Terkunci
                    </span>
                )}
            </div>
        </div>
    );
}

function TeacherGroupedView({ groups, search }: { groups: TeacherClassGroup[]; search: string }) {
    const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>({});
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleDelete = () => {
        if (deleteId) {
            router.delete(route('materials.destroy', deleteId));
            setDeleteId(null);
        }
    };

    const visible = groups
        .map(cls => ({
            ...cls,
            subjects: cls.subjects
                .map(subj => ({
                    ...subj,
                    tps: subj.tps.map(tp => ({
                        ...tp,
                        materials: tp.materials.filter(m => {
                            const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || m.subject_name.toLowerCase().includes(search.toLowerCase());
                            return matchSearch;
                        }),
                    })).filter(tp => tp.materials.length > 0)
                }))
                .filter(subj => subj.tps.length > 0),
        }))
        .filter(cls => cls.subjects.length > 0);

    if (visible.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BookOpen className="h-14 w-14 mb-4 opacity-25" />
                <p className="text-sm font-medium">Belum ada materi</p>
                <p className="text-[10px] mt-1 text-muted-foreground/80">Mulai rancang pembelajaran untuk membuat materi baru.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-6">
                {visible.map((cls) => {
                    const isClassOpen = expandedClasses[cls.class_id] !== false;
                    return (
                        <div key={cls.class_id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                            <button
                                onClick={() => setExpandedClasses(prev => ({ ...prev, [cls.class_id]: !isClassOpen }))}
                                className="flex w-full items-center justify-between border-b border-border bg-muted/30 px-6 py-4 text-left cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background dark:bg-popover shadow-sm border border-border/50">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-foreground truncate">{cls.class_name}</h3>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight truncate">
                                            {cls.subjects.length} mapel • {cls.subjects.reduce((sum, s) => sum + s.tps.reduce((s2, tp) => s2 + tp.materials.length, 0), 0)} materi
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 ml-2">
                                    {isClassOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                </div>
                            </button>
                            {isClassOpen && (
                                <div className="p-6 space-y-4">
                                    {cls.subjects.map((subj) => {
                                        const subjKey = `${cls.class_id}-${subj.subject_id}`;
                                        const isSubjOpen = expandedSubjects[subjKey] !== false;
                                        return (
                                            <div key={subjKey} className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedSubjects(prev => ({ ...prev, [subjKey]: !isSubjOpen }))}
                                                    className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-muted/30 transition cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
                                                            <FolderOpen className="h-4 w-4" />
                                                        </div>
                                                        <p className="text-xs font-bold text-foreground truncate">{subj.subject_name}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0 ml-3">
                                                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{subj.tps.reduce((sum, tp) => sum + tp.materials.length, 0)} materi</span>
                                                        {isSubjOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                    </div>
                                                </button>
                                                {isSubjOpen && (
                                                    <div className="px-5 pb-5 pt-3 space-y-6">
                                                        {subj.tps.map(tp => (
                                                            <div key={tp.tp_id || 'no-tp'} className="space-y-3">
                                                                <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                                                                    <div className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                                                                        {tp.tp_code}
                                                                    </div>
                                                                    <h4 className="text-xs font-bold text-foreground/80 truncate">
                                                                        {tp.tp_description}
                                                                    </h4>
                                                                </div>
                                                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                                    {tp.materials.map(m => (
                                                                        <MaterialCard key={m.id} m={m} onDelete={setDeleteId} isTeacher={true} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title="Hapus Materi"
                message="Peringatan! Menghapus data ini akan ikut MENGHAPUS SEMUA data terkait (misal: pengumpulan siswa, komentar, dll) secara permanen."
                onConfirm={handleDelete}
                requireInput="DELETE"
                inputPlaceholder="Ketik DELETE untuk konfirmasi"
            />
        </>
    );
}

function StudentGroupedView({ groups, search }: { groups: SubjectGroup[]; search: string }) {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const visible = groups
        .map(g => ({
            ...g,
            tps: g.tps.map(tp => ({
                ...tp,
                materials: tp.materials.filter(m => {
                    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
                    return matchSearch;
                }),
            })).filter(tp => tp.materials.length > 0)
        }))
        .filter(g => g.tps.length > 0);

    if (visible.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BookOpen className="h-14 w-14 mb-4 opacity-25" />
                <p className="text-sm font-medium">Belum ada materi</p>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            {visible.map((group) => {
                const isOpen = expanded[group.subject_id] !== false;
                return (
                    <div key={group.subject_id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                        <button
                            onClick={() => setExpanded(prev => ({ ...prev, [group.subject_id]: !isOpen }))}
                            className="flex w-full items-center justify-between border-b border-border bg-muted/30 px-6 py-4 text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background dark:bg-popover shadow-sm border border-border/50">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-foreground truncate">{group.subject_name}</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight truncate">
                                        {group.tps.reduce((sum, tp) => sum + tp.materials.length, 0)} materi
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary whitespace-nowrap">
                                    {group.total} total
                                </span>
                                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                            </div>
                        </button>
                        {isOpen && (
                            <div className="p-6 space-y-6">
                                {group.tps.map(tp => (
                                    <div key={tp.tp_id || 'no-tp'} className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                                            <div className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase">
                                                {tp.tp_code}
                                            </div>
                                            <h4 className="text-[13px] font-bold text-foreground/80 leading-snug">
                                                {tp.tp_description}
                                            </h4>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {tp.materials.map(m => (
                                                <MaterialCard key={m.id} m={m} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function Materials({ materials, grouped_materials, teacher_grouped, active_year, active_semester, user_role }: MaterialsProps) {
    const [search, setSearch] = useState('');
    const { flash } = usePage<{ flash: { success?: string; error?: string } }>().props;
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (flash?.success) {
            setToast({ message: flash.success, type: 'success' });
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
        if (flash?.error) {
            setToast({ message: flash.error, type: 'error' });
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Materi Pembelajaran – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6">
                {/* Header */}
                <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-5 sm:p-8 text-white shadow-xl shadow-primary/20 dark:shadow-none">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md flex-shrink-0">
                                <BookOpen className="h-6 w-6 sm:h-10 sm:w-10" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <h1 className="text-xl sm:text-2xl font-black truncate">Materi Pembelajaran</h1>
                                    {active_year && (
                                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest mt-1 sm:mt-0">
                                            {active_year} • {active_semester}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-white/70 mt-1 truncate">
                                    {user_role === 'teacher' ? 'Kelola materi pembelajaran untuk siswa Anda' : 'Pusat sumber belajar digital siswa'}
                                </p>
                            </div>
                        </div>
                        {user_role === 'teacher' && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <Link
                                    href={route('materials.create')}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition hover:bg-white/90"
                                >
                                    <FilePlus className="h-4 w-4" />
                                    Tambah
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari judul materi atau mata pelajaran..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-11 py-2.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-border dark:text-foreground dark:focus:ring-primary/20"
                    />
                </div>

                {/* Content */}
                {user_role === 'teacher' ? (
                    <TeacherGroupedView groups={teacher_grouped ?? []} search={search} />
                ) : (
                    <StudentGroupedView groups={grouped_materials ?? []} search={search} />
                )}
            </div>

            {/* Floating Premium Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[999] flex max-w-md items-center gap-3 rounded-2xl border px-5 py-3 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
                    toast.type === 'success' 
                    ? 'border-emerald-500/20 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100' 
                    : 'border-red-500/20 bg-red-50/95 dark:bg-red-950/90 text-red-900 dark:text-red-100'
                }`}>
                    {toast.type === 'success' ? (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#3dd68c] text-white shadow-sm shadow-[#3dd68c]/30">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    ) : (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm shadow-red-500/30">
                            <span className="font-black text-sm">!</span>
                        </div>
                    )}
                    <span className="text-[12px] font-black tracking-tight leading-none uppercase">{toast.message}</span>
                </div>
            )}
        </AppLayout>
    );
}
