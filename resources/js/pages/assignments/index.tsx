import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, ClipboardList, Clock, Plus, Search, Info, Target, GraduationCap, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Asesmen', href: '/assignments' },
];

interface Assignment {
    id: number;
    title: string;
    description: string;
    subject_name: string;
    subject_id?: number;
    due_date: string | null;
    max_points: number;
    assessment_type: string | null;
    instrument_type: string | null;
    scoring_tool?: string | null;
    submissions_count: number;
}

interface SubjectGroup {
    subject_id: number;
    subject_name: string;
    assignments: Assignment[];
    total: number;
}

interface TeacherObjectiveGroup {
    objective_id: number | null;
    objective_code: string;
    objective_description: string;
    assignments: Assignment[];
}

interface TeacherClassGroup {
    class_id: number;
    class_name: string;
    objectives: TeacherObjectiveGroup[];
}

interface AssignmentsProps {
    assignments?: Assignment[];
    grouped_assignments?: SubjectGroup[];
    teacher_grouped?: TeacherClassGroup[];
    active_year?: string;
    active_semester?: string;
    user_role: 'teacher' | 'student' | 'admin';
}

const isOverdue = (due: string | null): boolean => {
    if (!due) return false;
    return new Date(due) < new Date();
};

const instrumentLabels: Record<string, string> = {
    quiz_survey: 'Kuis/Survei', observation_checklist: 'Observasi', anecdotal_notes: 'Anekdotal',
    reflective_journal: 'Jurnal Reflektif', self_assessment: 'Penilaian Diri', peer_assessment: 'Peer Assessment',
    rubric: 'Rubrik', exit_ticket: 'Exit Ticket', concept_map: 'Peta Konsep', performance_observation: 'Observasi Kinerja',
    written_test: 'Tes Tertulis', oral_test: 'Tes Lisan', performance: 'Unjuk Kerja',
    project: 'Proyek', portfolio: 'Portofolio',
    formative_quiz: 'Kuis Formatif', guided_discussion: 'Diskusi Terpandu', structured_assignment: 'Penugasan Terstruktur',
};

const scoringToolLabels: Record<string, string> = {
    rubric: 'Rubrik',
    rating_scale: 'Skala Penilaian',
    checklist: 'Checklist',
    anecdotal_notes: 'Catatan Anekdotal',
};

const typeStyles: Record<string, { bg: string; text: string; icon: any }> = {
    initial:   { bg: 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-hover border border-primary/20', text: 'text-primary dark:text-primary-hover', icon: Info },
    formative: { bg: 'bg-warning/10 text-warning dark:bg-warning/15 border border-warning/20',   text: 'text-warning',   icon: Target },
    summative: { bg: 'bg-success/10 text-success dark:bg-success/15 border border-success/20',       text: 'text-success',       icon: GraduationCap },
};

function AssignmentCard({ asgn, isTeacher = false }: { asgn: Assignment; isTeacher?: boolean }) {
    const overdue = isOverdue(asgn.due_date);
    const style = typeStyles[asgn.assessment_type || 'summative'];
    const TypeIcon = style?.icon || ClipboardList;

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.visit(`/assignments/${asgn.id}/edit`);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Yakin ingin menghapus asesmen ini? Semua data pengumpulan siswa juga akan dihapus.')) {
            router.delete(`/assignments/${asgn.id}`);
        }
    };

    return (
        <div
            className="group relative cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            onClick={() => router.visit(`/assignments/${asgn.id}`)}
        >
            <div className="flex items-start justify-between gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style?.bg || 'bg-muted'} ${style?.text || 'text-muted-foreground'} flex-shrink-0`}>
                    <TypeIcon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1">
                    {isTeacher && (
                        <>
                            <button
                                onClick={handleEdit}
                                className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer"
                                title="Edit asesmen"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                                title="Hapus asesmen"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </>
                    )}
                    {asgn.due_date && (
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${overdue ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-muted text-muted-foreground'}`}>
                            <Clock className="h-3 w-3" />
                            {asgn.due_date}
                        </span>
                    )}
                </div>
            </div>
            <h3 className="mt-4 text-sm font-black text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {asgn.title}
            </h3>
            <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{asgn.description}</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
                {asgn.assessment_type && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${style?.bg} ${style?.text}`}>
                        {asgn.assessment_type === 'initial' ? 'Awal' : asgn.assessment_type === 'formative' ? 'Formatif' : 'Sumatif'}
                    </span>
                )}
                {asgn.instrument_type && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                        {instrumentLabels[asgn.instrument_type] || asgn.instrument_type}
                    </span>
                )}
                {asgn.scoring_tool && (
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
                        {scoringToolLabels[asgn.scoring_tool] || asgn.scoring_tool}
                    </span>
                )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[40%]">{asgn.subject_name}</span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{asgn.submissions_count} dikumpulkan</span>
                    <span className="rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
                        {asgn.max_points} pts
                    </span>
                </div>
            </div>
        </div>
    );
}

function GroupedView({ groups, search, filterType }: { groups: SubjectGroup[]; search: string; filterType: string }) {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const visible = groups
        .map(g => ({
            ...g,
            assignments: g.assignments.filter(a => {
                const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
                const matchType = filterType === 'all' || a.assessment_type === filterType;
                return matchSearch && matchType;
            }),
        }))
        .filter(g => g.assignments.length > 0);

    if (visible.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ClipboardList className="h-14 w-14 mb-4 opacity-25" />
                <p className="text-sm font-medium">Belum ada asesmen</p>
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
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{group.subject_name}</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                        {group.assignments.length} asesmen
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                                    {group.total} total
                                </span>
                                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                            </div>
                        </button>
                        {isOpen && (
                            <div className="p-6">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {group.assignments.map(asgn => (
                                        <AssignmentCard key={asgn.id} asgn={asgn} />
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

function TeacherGroupedView({ groups, search, filterType }: { groups: TeacherClassGroup[]; search: string; filterType: string }) {
    const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>({});
    const [expandedTPs, setExpandedTPs] = useState<Record<string, boolean>>({});

    const visible = groups
        .map(cls => ({
            ...cls,
            objectives: cls.objectives
                .map(obj => ({
                    ...obj,
                    assignments: obj.assignments.filter(a => {
                        const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.subject_name.toLowerCase().includes(search.toLowerCase());
                        const matchType = filterType === 'all' || a.assessment_type === filterType;
                        return matchSearch && matchType;
                    }),
                }))
                .filter(obj => obj.assignments.length > 0),
        }))
        .filter(cls => cls.objectives.length > 0);

    if (visible.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ClipboardList className="h-14 w-14 mb-4 opacity-25" />
                <p className="text-sm font-medium">Belum ada asesmen</p>
            </div>
        );
    }

    return (
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
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{cls.class_name}</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                        {cls.objectives.length} TP • {cls.objectives.reduce((sum, o) => sum + o.assignments.length, 0)} asesmen
                                    </p>
                                </div>
                            </div>
                            {isClassOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        </button>
                        {isClassOpen && (
                            <div className="p-6 space-y-4">
                                {cls.objectives.map((obj) => {
                                    const tpKey = `${cls.class_id}-${obj.objective_id}`;
                                    const isTPOpen = expandedTPs[tpKey] !== false;
                                    return (
                                        <div key={tpKey} className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
                                            <button
                                                onClick={() => setExpandedTPs(prev => ({ ...prev, [tpKey]: !isTPOpen }))}
                                                className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-muted/30 transition cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary shrink-0">
                                                        {obj.objective_code}
                                                    </span>
                                                    <p className="text-xs font-bold text-foreground truncate">{obj.objective_description}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{obj.assignments.length} asesmen</span>
                                                    {isTPOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                </div>
                                            </button>
                                            {isTPOpen && (
                                                <div className="px-5 pb-5 pt-3">
                                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                        {obj.assignments.map(asgn => (
                                                            <AssignmentCard key={asgn.id} asgn={asgn} isTeacher={true} />
                                                        ))}
                                                    </div>
                                                    <div className="mt-4 flex justify-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); router.visit('/assignments/create'); }}
                                                            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-transparent px-6 py-3 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Tambah Asesmen Formatif
                                                        </button>
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
    );
}

function FlatView({ assignments, search, filterType }: { assignments: Assignment[]; search: string; filterType: string }) {
    const filtered = assignments.filter(a => {
        const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'all' || a.assessment_type === filterType;
        return matchSearch && matchType;
    });

    if (filtered.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ClipboardList className="h-14 w-14 mb-4 opacity-25" />
                <p className="text-sm font-medium">Belum ada asesmen</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(asgn => (
                <AssignmentCard key={asgn.id} asgn={asgn} />
            ))}
        </div>
    );
}

export default function Assignments({ assignments, grouped_assignments, teacher_grouped, active_year, active_semester, user_role }: AssignmentsProps) {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
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
            <Head title="Asesmen – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-foreground">Asesmen</h1>
                            {active_year && (
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                    {active_year} • {active_semester}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {user_role === 'teacher' ? 'Kelola asesmen awal, formatif, dan sumatif' : 'Daftar asesmen awal, formatif, dan sumatif'}
                        </p>
                    </div>
                    {user_role === 'teacher' && (
                        <button
                            id="btn-add-assignment"
                            onClick={() => router.visit('/instructional-design/create')}
                            className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/15 transition cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Rancang Pembelajaran
                        </button>
                    )}
                </div>

                {/* Filter & Search */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                    <div className="flex p-1 bg-muted rounded-xl w-fit">
                        {[
                            { id: 'all', label: 'Semua' },
                            { id: 'initial', label: 'Awal' },
                            { id: 'formative', label: 'Formatif' },
                            { id: 'summative', label: 'Sumatif' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterType(f.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${filterType === f.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            id="input-search-assignment"
                            type="text"
                            placeholder="Cari asesmen..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                        />
                    </div>
                </div>

                {/* Content */}
                {user_role === 'teacher' ? (
                    <TeacherGroupedView groups={teacher_grouped ?? []} search={search} filterType={filterType} />
                ) : user_role !== 'teacher' ? (
                    <GroupedView groups={grouped_assignments ?? []} search={search} filterType={filterType} />
                ) : (
                    <FlatView assignments={assignments ?? []} search={search} filterType={filterType} />
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
