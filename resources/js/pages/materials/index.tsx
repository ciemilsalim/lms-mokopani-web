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
}

interface SubjectGroup {
    subject_id: number;
    subject_name: string;
    materials: Material[];
    total: number;
}

interface TeacherSubjectGroup {
    subject_id: number;
    subject_name: string;
    materials: Material[];
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

function MaterialCard({ m, onDelete }: { m: Material; onDelete?: (id: number) => void }) {
    const Icon = getFileIcon(m.file_type);

    return (
        <div className="group relative rounded-xl border border-[#2C2C3A]/20 bg-white p-5 shadow-sm transition-shadow hover:border-[#5E6AD2]/30 hover:shadow-md dark:border-[#2C2C3A] dark:bg-[#1B1B25] dark:hover:border-[#5E6AD2]/40 dark:hover:shadow-lg dark:hover:shadow-black/20">
            <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1F1F4]/30 text-[#8A8F98] dark:bg-[#2C2C3A] dark:text-[#8A8F98]">
                    <Icon className="h-6 w-6" />
                </div>
                {onDelete && (
                    <button
                        onClick={() => onDelete(m.id)}
                        className="p-2 text-[#8A8F98]/40 hover:text-[#EB5757] transition"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#5E6AD2] uppercase tracking-wider">
                    {m.subject_name}
                </span>
                <h3 className="line-clamp-2 text-base font-bold text-[#1B1B25] group-hover:text-[#5E6AD2] transition dark:text-[#F1F1F4]">
                    {m.title}
                </h3>
                <p className="text-xs text-[#8A8F98]">Dibuat oleh {m.teacher_name}</p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#2C2C3A]/10 pt-4 dark:border-[#2C2C3A]">
                <span className="text-[10px] font-medium text-[#8A8F98]">{m.created_at}</span>
                <Link
                    href={route('materials.show', m.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#5E6AD2] hover:underline"
                >
                    Buka Materi
                    <ExternalLink className="h-3 w-3" />
                </Link>
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
                    materials: subj.materials.filter(m => {
                        const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || m.subject_name.toLowerCase().includes(search.toLowerCase());
                        return matchSearch;
                    }),
                }))
                .filter(subj => subj.materials.length > 0),
        }))
        .filter(cls => cls.subjects.length > 0);

    if (visible.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-[#8A8F98]">
                <BookOpen className="h-14 w-14 mb-4 opacity-25" />
                <p className="text-sm font-medium">Belum ada materi</p>
                <p className="text-[10px] mt-1">Mulai rancang pembelajaran untuk membuat materi baru.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-6">
                {visible.map((cls) => {
                    const isClassOpen = expandedClasses[cls.class_id] !== false;
                    return (
                        <div key={cls.class_id} className="overflow-hidden rounded-2xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] shadow-sm">
                            <button
                                onClick={() => setExpandedClasses(prev => ({ ...prev, [cls.class_id]: !isClassOpen }))}
                                className="flex w-full items-center justify-between border-b border-[#2C2C3A]/10 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#1F1F2E]/50 px-6 py-4 text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-[#1F1F2E] shadow-sm">
                                        <BookOpen className="h-5 w-5 text-[#5E6AD2]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#1B1B25] dark:text-[#F1F1F4]">{cls.class_name}</h3>
                                        <p className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-tight">
                                            {cls.subjects.length} mapel • {cls.subjects.reduce((sum, s) => sum + s.materials.length, 0)} materi
                                        </p>
                                    </div>
                                </div>
                                {isClassOpen ? <ChevronDown className="h-5 w-5 text-[#8A8F98]" /> : <ChevronRight className="h-5 w-5 text-[#8A8F98]" />}
                            </button>
                            {isClassOpen && (
                                <div className="p-6 space-y-4">
                                    {cls.subjects.map((subj) => {
                                        const subjKey = `${cls.class_id}-${subj.subject_id}`;
                                        const isSubjOpen = expandedSubjects[subjKey] !== false;
                                        return (
                                            <div key={subjKey} className="rounded-xl border border-[#2C2C3A]/10 dark:border-[#2C2C3A]/50 bg-[#F1F1F4]/5 dark:bg-[#1F1F2E]/20 overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedSubjects(prev => ({ ...prev, [subjKey]: !isSubjOpen }))}
                                                    className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-[#F1F1F4]/10 dark:hover:bg-[#1F1F2E]/30 transition"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5E6AD2]/10 text-[#5E6AD2] shrink-0">
                                                            <FolderOpen className="h-4 w-4" />
                                                        </div>
                                                        <p className="text-xs font-bold text-[#1B1B25] dark:text-[#F1F1F4] truncate">{subj.subject_name}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0 ml-3">
                                                        <span className="text-[10px] font-medium text-[#8A8F98] whitespace-nowrap">{subj.materials.length} materi</span>
                                                        {isSubjOpen ? <ChevronDown className="h-4 w-4 text-[#8A8F98]" /> : <ChevronRight className="h-4 w-4 text-[#8A8F98]" />}
                                                    </div>
                                                </button>
                                                {isSubjOpen && (
                                                    <div className="px-5 pb-5 pt-3">
                                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                            {subj.materials.map(m => (
                                                                <MaterialCard key={m.id} m={m} onDelete={setDeleteId} />
                                                            ))}
                                                        </div>
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
                message="Apakah Anda yakin ingin menghapus materi ini?"
                onConfirm={handleDelete}
            />
        </>
    );
}

function StudentGroupedView({ groups, search }: { groups: SubjectGroup[]; search: string }) {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const visible = groups
        .map(g => ({
            ...g,
            materials: g.materials.filter(m => {
                const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
                return matchSearch;
            }),
        }))
        .filter(g => g.materials.length > 0);

    if (visible.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-[#8A8F98]">
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
                    <div key={group.subject_id} className="overflow-hidden rounded-2xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] shadow-sm transition-all hover:shadow-md">
                        <button
                            onClick={() => setExpanded(prev => ({ ...prev, [group.subject_id]: !isOpen }))}
                            className="flex w-full items-center justify-between border-b border-[#2C2C3A]/10 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#1F1F2E]/50 px-6 py-4 text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-[#1F1F2E] shadow-sm">
                                    <BookOpen className="h-5 w-5 text-[#5E6AD2]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#1B1B25] dark:text-[#F1F1F4]">{group.subject_name}</h3>
                                    <p className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-tight">
                                        {group.materials.length} materi
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="rounded-full bg-[#5E6AD2]/10 px-3 py-1 text-xs font-bold text-[#5E6AD2]">
                                    {group.total} total
                                </span>
                                {isOpen ? <ChevronDown className="h-5 w-5 text-[#8A8F98]" /> : <ChevronRight className="h-5 w-5 text-[#8A8F98]" />}
                            </div>
                        </button>
                        {isOpen && (
                            <div className="p-6">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {group.materials.map(m => (
                                        <MaterialCard key={m.id} m={m} />
                                    ))}
                                </div>
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

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-[#1B1B25] dark:text-[#F1F1F4]">Materi Pembelajaran</h1>
                            {active_year && (
                                <span className="rounded-full bg-[#F1F1F4]/50 dark:bg-[#2C2C3A] px-2.5 py-0.5 text-[10px] font-bold text-[#8A8F98] uppercase tracking-tight">
                                    {active_year} • {active_semester}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-[#8A8F98]">
                            {user_role === 'teacher' ? 'Kelola materi pembelajaran untuk siswa Anda' : 'Pusat sumber belajar digital siswa'}
                        </p>
                    </div>
                    {user_role === 'teacher' && (
                        <div className="flex items-center gap-3">
                            <Link
                                href={route('materials.create')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3DD68C] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#3DD68C]/20 transition hover:bg-[#3DD68C]/90 dark:shadow-none"
                            >
                                <FilePlus className="h-4 w-4" />
                                Tambah Materi
                            </Link>
                            <Link
                                href={route('instructional-design.create')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5E6AD2] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#5E6AD2]/20 transition hover:bg-[#5E6AD2]/90 dark:shadow-none"
                            >
                                <Plus className="h-4 w-4" />
                                Rancang Pembelajaran
                            </Link>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8F98]" />
                    <input
                        type="text"
                        placeholder="Cari judul materi atau mata pelajaran..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-[#2C2C3A]/20 bg-white px-11 py-2.5 text-sm shadow-sm outline-none focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/10 dark:border-[#2C2C3A] dark:bg-[#1B1B25] dark:text-[#F1F1F4] dark:focus:ring-[#5E6AD2]/20"
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
