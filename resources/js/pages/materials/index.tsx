import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, Plus, Search, Library, Filter, Layers, Users } from 'lucide-react';
import { SectionHeader, EmptyState } from '@/components/dashboard';
import { MaterialCard, type MaterialItemProps } from '@/components/materials';
import { ConfirmDialog } from '@/components/confirm-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Bahan Materi', href: '/materials' },
];

interface TpGroup {
    tp_id: number | null;
    tp_code: string;
    tp_description: string;
    materials: MaterialItemProps[];
}

interface SubjectGroup {
    subject_id: number;
    subject_name: string;
    tps: TpGroup[];
    total?: number;
}

interface TeacherClassGroup {
    class_id: number;
    class_name: string;
    subjects: SubjectGroup[];
}

interface MaterialsIndexProps {
    materials?: MaterialItemProps[];
    grouped_materials?: SubjectGroup[];
    teacher_grouped?: TeacherClassGroup[];
    active_year?: string;
    active_semester?: string;
    user_role: 'teacher' | 'student' | 'admin';
}

export default function MaterialsIndex({
    grouped_materials = [],
    teacher_grouped = [],
    active_year,
    active_semester,
    user_role = 'teacher',
}: MaterialsIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const isTeacher = user_role === 'teacher' || user_role === 'admin';

    // Flatten all materials into a unified array with context
    const allMaterials = useMemo(() => {
        const list: MaterialItemProps[] = [];

        if (teacher_grouped && teacher_grouped.length > 0) {
            teacher_grouped.forEach((cGroup) => {
                cGroup.subjects?.forEach((sGroup) => {
                    sGroup.tps?.forEach((tp) => {
                        tp.materials?.forEach((mat) => {
                            list.push({
                                ...mat,
                                class_name: cGroup.class_name,
                                tp_code: tp.tp_code,
                            });
                        });
                    });
                });
            });
        } else if (grouped_materials && grouped_materials.length > 0) {
            grouped_materials.forEach((sGroup) => {
                sGroup.tps?.forEach((tp) => {
                    tp.materials?.forEach((mat) => {
                        list.push({
                            ...mat,
                            tp_code: tp.tp_code,
                        });
                    });
                });
            });
        }

        // Deduplicate materials by ID (in case material assigned to multiple classes)
        const map = new Map<number, MaterialItemProps>();
        list.forEach((item) => {
            if (!map.has(item.id)) {
                map.set(item.id, item);
            } else {
                // Combine class names if multi-class
                const existing = map.get(item.id)!;
                if (item.class_name && existing.class_name && !existing.class_name.includes(item.class_name)) {
                    existing.class_name = `${existing.class_name}, ${item.class_name}`;
                }
            }
        });

        return Array.from(map.values());
    }, [teacher_grouped, grouped_materials]);

    // Unique Subject options for filter
    const subjectOptions = useMemo(() => {
        const set = new Set<string>();
        allMaterials.forEach((m) => {
            if (m.subject_name) set.add(m.subject_name);
        });
        return Array.from(set);
    }, [allMaterials]);

    // Unique Class options for filter
    const classOptions = useMemo(() => {
        const set = new Set<string>();
        allMaterials.forEach((m) => {
            if (m.class_name) {
                m.class_name.split(', ').forEach((c) => set.add(c));
            }
        });
        return Array.from(set);
    }, [allMaterials]);

    // Filtered materials based on search and selected dropdowns
    const filteredMaterials = useMemo(() => {
        return allMaterials.filter((m) => {
            const matchesSearch =
                !searchQuery.trim() ||
                m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.tp_code && m.tp_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (m.class_name && m.class_name.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesSubject =
                selectedSubject === 'all' || m.subject_name === selectedSubject;

            const matchesClass =
                selectedClass === 'all' ||
                (m.class_name && m.class_name.includes(selectedClass));

            return matchesSearch && matchesSubject && matchesClass;
        });
    }, [allMaterials, searchQuery, selectedSubject, selectedClass]);

    const handleDeleteConfirm = () => {
        if (deleteId) {
            router.delete(route('materials.destroy', deleteId), {
                preserveScroll: true,
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bahan Materi - LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-16 md:pb-6 max-w-7xl mx-auto w-full min-w-0">
                {/* Header & Primary CTA */}
                <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                            Bahan Materi
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                            {filteredMaterials.length} Materi tersedia • Periode {active_year || '2026/2027'} ({active_semester || 'Ganjil'})
                        </p>
                    </div>

                    {isTeacher && (
                        <Link
                            href={route('materials.create')}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-extrabold shadow-sm hover:bg-primary/90 transition active:scale-97 min-h-[40px] sm:min-h-[44px] shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Tambah Materi</span>
                        </Link>
                    )}
                </div>

                {/* Search & Filter Controls (Compact) */}
                <div className="space-y-2">
                    {/* Search Bar */}
                    <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari materi, mata pelajaran, atau TP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm rounded-xl bg-card border border-border/70 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition shadow-2xs placeholder:text-muted-foreground/60"
                        />
                    </div>

                    {/* Filter Row: Mapel & Kelas Side-by-Side */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Filter Mapel */}
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="h-10 px-3 text-xs rounded-xl bg-card border border-border/70 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition shadow-2xs cursor-pointer w-full"
                        >
                            <option value="all">Semua Mapel</option>
                            {subjectOptions.map((subj) => (
                                <option key={subj} value={subj}>
                                    {subj}
                                </option>
                            ))}
                        </select>

                        {/* Filter Kelas */}
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="h-10 px-3 text-xs rounded-xl bg-card border border-border/70 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition shadow-2xs cursor-pointer w-full"
                        >
                            <option value="all">Semua Kelas</option>
                            {classOptions.map((cName) => (
                                <option key={cName} value={cName}>
                                    Kelas {cName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Section Divider & Counter */}
                <div className="flex items-center justify-between pt-1 border-b border-border/50 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Daftar Materi ({filteredMaterials.length})
                    </span>
                    {(searchQuery || selectedSubject !== 'all' || selectedClass !== 'all') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedSubject('all');
                                setSelectedClass('all');
                            }}
                            className="text-[11px] font-bold text-primary hover:underline"
                        >
                            Reset Filter
                        </button>
                    )}
                </div>

                {/* Material Cards Grid */}
                {filteredMaterials.length === 0 ? (
                    <EmptyState
                        icon={Library}
                        title={searchQuery || selectedSubject !== 'all' || selectedClass !== 'all' ? 'Materi Tidak Ditemukan' : 'Belum Ada Materi'}
                        description={
                            searchQuery || selectedSubject !== 'all' || selectedClass !== 'all'
                                ? 'Tidak ada materi yang cocok dengan pencarian atau filter yang dipilih.'
                                : 'Materi pembelajaran yang Anda buat akan tampil di sini.'
                        }
                        actionLabel={isTeacher ? '+ Tambah Materi' : undefined}
                        onAction={isTeacher ? () => router.visit(route('materials.create')) : undefined}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredMaterials.map((m) => (
                            <MaterialCard
                                key={m.id}
                                material={m}
                                isTeacher={isTeacher}
                                onDelete={(id) => setDeleteId(id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => setDeleteId(open ? deleteId : null)}
                onConfirm={handleDeleteConfirm}
                title="Hapus Materi"
                message="Apakah Anda yakin ingin menghapus materi ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Hapus"
                cancelLabel="Batal"
                variant="destructive"
            />
        </AppLayout>
    );
}
