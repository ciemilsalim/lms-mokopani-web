import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, ClipboardList, Clock, Plus, Search, Info, Target, GraduationCap, ChevronDown, ChevronRight, Pencil, Trash2, CheckCircle2, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';

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
    is_accessible?: boolean;
    student_submission?: { id: number; is_graded: boolean } | null;
}

interface SubjectObjectiveGroup {
    objective_id: number | null;
    objective_code: string;
    objective_description: string;
    assignments: Assignment[];
}

interface SubjectGroup {
    subject_id: number;
    subject_name: string;
    objectives: SubjectObjectiveGroup[];
    total: number;
}

interface TeacherObjectiveGroup {
    objective_id: number | null;
    objective_code: string;
    objective_description: string;
    assignments: Assignment[];
}

interface TeacherSubjectGroup {
    subject_id: number;
    subject_name: string;
    objectives: TeacherObjectiveGroup[];
}

interface TeacherClassGroup {
    class_id: number;
    class_name: string;
    subjects: TeacherSubjectGroup[];
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
    rubric: 'Rubrik', exit_ticket: 'Exit Ticket', concept_map: 'Peta Konsep',     performance_observation: 'Observasi',
    written_test: 'Tes Tertulis', oral_test: 'Tes Lisan', performance: 'Kinerja',
    project: 'Proyek', portfolio: 'Portofolio', assignment: 'Penugasan',
    formative_quiz: 'Tes/Penugasan Singkat', guided_discussion: 'Diskusi Terpandu', structured_assignment: 'Penugasan Terstruktur',
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
    const isAccessible = asgn.is_accessible !== false; // default true if undefined

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.visit(`/assignments/${asgn.id}/edit`);
    };

    const handleDelete = () => {
        router.visit(`/assignments/${asgn.id}`, { method: 'delete' });
    };

    return (
        <div
            onClick={() => isAccessible && router.visit(`/assignments/${asgn.id}`)}
            className={`group flex cursor-pointer flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 card-hover shadow-sm ${
                !isAccessible ? 'opacity-60 grayscale-[30%] cursor-not-allowed pointer-events-none' : ''
            }`}
        >
            <div>
                {/* Card Header */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                            asgn.assessment_type === 'initial' ? 'bg-indigo-500' : 
                            asgn.assessment_type === 'formative' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            {asgn.assessment_type === 'initial' ? 'Awal' : 
                             asgn.assessment_type === 'formative' ? 'Formatif' : 'Sumatif'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 min-h-[28px]">
                        {asgn.due_date && (
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                                overdue 
                                    ? 'text-destructive' 
                                    : 'text-muted-foreground'
                            }`}>
                                <Clock className="h-3.5 w-3.5" />
                                {asgn.due_date}
                            </span>
                        )}

                        {isTeacher && (
                            <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    onClick={handleEdit}
                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition cursor-pointer"
                                    title="Edit asesmen"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                                    title="Hapus asesmen"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <ConfirmDialog
                    open={showDeleteConfirm}
                    onOpenChange={setShowDeleteConfirm}
                    title="Hapus Asesmen"
                    message="Peringatan! Menghapus data ini akan ikut MENGHAPUS SEMUA data terkait (misal: pengumpulan siswa, nilai, remedial, dll) secara permanen."
                    onConfirm={handleDelete}
                    requireInput="DELETE"
                    inputPlaceholder="Ketik DELETE untuk konfirmasi"
                />

                {/* Card Title & Description */}
                <h3 className="mt-3 text-[14px] font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {asgn.title}
                </h3>
                {asgn.description && (
                    <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed line-clamp-2 font-medium">
                        {asgn.description}
                    </p>
                )}

                {/* Instrument Metadata */}
                <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground flex-wrap">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${style?.bg || 'bg-muted'} ${style?.text || 'text-muted-foreground'}`}>
                        <TypeIcon className="h-3.5 w-3.5" />
                    </div>
                    <span>
                        {instrumentLabels[asgn.instrument_type || ''] || asgn.instrument_type}
                    </span>
                    {asgn.scoring_tool && (
                        <>
                            <span className="text-muted-foreground/30">•</span>
                            <span>
                                {scoringToolLabels[asgn.scoring_tool] || asgn.scoring_tool}
                            </span>
                        </>
                    )}
                    {!isTeacher && asgn.student_submission?.is_graded && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Dinilai
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-5">
                {/* Divider */}
                <div className="h-[1px] bg-border/40 dark:bg-border/20 w-full mb-4" />

                {/* Card Footer */}
                <div className="flex items-center justify-between">
                    {isTeacher ? (
                        asgn.submissions_count > 0 ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                                <Users className="h-3.5 w-3.5" />
                                <span>{asgn.submissions_count} Mengumpulkan</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                                <Users className="h-3.5 w-3.5 animate-pulse" />
                                <span>0 mengumpulkan</span>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                            {asgn.student_submission ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Sudah Dikumpulkan
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                                    Belum Dikumpulkan
                                </span>
                            )}
                        </div>
                    )}

                    <span className="rounded-lg bg-muted dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-foreground border border-border dark:border-border/30">
                        {['reflective_journal', 'self_assessment', 'peer_assessment'].includes(asgn.instrument_type || '') 
                            ? 'Deskriptif' 
                            : `${asgn.max_points} Poin`}
                    </span>
                </div>
            </div>
        </div>
    );
}

const sortAssignments = (assignments: Assignment[]) => {
    const order: Record<string, number> = { 'initial': 1, 'formative': 2, 'summative': 3 };
    return assignments.sort((a, b) => (order[a.assessment_type || ''] || 99) - (order[b.assessment_type || ''] || 99));
};

function GroupedView({ groups, search, filterType }: { groups: SubjectGroup[]; search: string; filterType: string }) {
    const [expandedSubjects, setExpandedSubjects] = useState<Record<number, boolean>>({});
    const [expandedTPs, setExpandedTPs] = useState<Record<string, boolean>>({});

    const visible = groups
        .map(subject => ({
            ...subject,
            objectives: subject.objectives
                .map(obj => ({
                    ...obj,
                    assignments: sortAssignments(obj.assignments.filter(a => {
                        const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
                        const matchType = filterType === 'all' || a.assessment_type === filterType;
                        return matchSearch && matchType;
                    })),
                }))
                .filter(obj => obj.assignments.length > 0),
        }))
        .filter(subject => subject.objectives.length > 0);

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
                const isOpen = expandedSubjects[group.subject_id] !== false;
                const totalVisibleAsgn = group.objectives.reduce((sum, o) => sum + o.assignments.length, 0);
                
                return (
                    <div key={group.subject_id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                        <button
                            onClick={() => setExpandedSubjects(prev => ({ ...prev, [group.subject_id]: !isOpen }))}
                            className="flex w-full items-center justify-between border-b border-border bg-muted/30 px-6 py-4 text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background dark:bg-popover shadow-sm border border-border/50">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{group.subject_name}</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                        {group.objectives.length} TP • {totalVisibleAsgn} asesmen
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
                            <div className="p-6 space-y-4">
                                {group.objectives.map((obj) => {
                                    const tpKey = `${group.subject_id}-${obj.objective_id}`;
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
                                                            <AssignmentCard key={asgn.id} asgn={asgn} isTeacher={false} />
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
    );
}

function TeacherGroupedView({ groups, search, filterType }: { groups: TeacherClassGroup[]; search: string; filterType: string }) {
    const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>({});
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const [expandedTPs, setExpandedTPs] = useState<Record<string, boolean>>({});

    const visible = groups
        .map(cls => ({
            ...cls,
            subjects: (cls.subjects || [])
                .map(sub => ({
                    ...sub,
                    objectives: (sub.objectives || [])
                        .map(obj => ({
                            ...obj,
                            assignments: sortAssignments(obj.assignments.filter(a => {
                                const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.subject_name.toLowerCase().includes(search.toLowerCase());
                                const matchType = filterType === 'all' || a.assessment_type === filterType;
                                return matchSearch && matchType;
                            })),
                        }))
                        .filter(obj => obj.assignments.length > 0),
                }))
                .filter(sub => sub.objectives.length > 0),
        }))
        .filter(cls => cls.subjects.length > 0);

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
                const totalAssignments = cls.subjects.reduce((sum, s) => sum + s.objectives.reduce((tpSum, o) => tpSum + o.assignments.length, 0), 0);
                
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
                                        {cls.subjects.length} Mapel • {totalAssignments} asesmen
                                    </p>
                                </div>
                            </div>
                            {isClassOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        </button>
                        
                        {isClassOpen && (
                            <div className="p-6 space-y-6">
                                {cls.subjects.map((sub) => {
                                    const subKey = `${cls.class_id}-${sub.subject_id}`;
                                    const isSubOpen = expandedSubjects[subKey] !== false;
                                    const totalSubAssignments = sub.objectives.reduce((sum, o) => sum + o.assignments.length, 0);
                                    
                                    return (
                                        <div key={subKey} className="overflow-hidden rounded-xl border border-border bg-card">
                                            <button
                                                onClick={() => setExpandedSubjects(prev => ({ ...prev, [subKey]: !isSubOpen }))}
                                                className="flex w-full items-center justify-between bg-muted/20 px-5 py-3 text-left cursor-pointer font-bold text-slate-800 dark:text-slate-100"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                    <h4 className="text-sm font-bold text-foreground">{sub.subject_name}</h4>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{totalSubAssignments} asesmen</span>
                                                    {isSubOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                </div>
                                            </button>
                                            
                                            {isSubOpen && (
                                                <div className="p-4 space-y-4">
                                                    {sub.objectives.map((obj) => {
                                                        const tpKey = `${cls.class_id}-${sub.subject_id}-${obj.objective_id}`;
                                                        const isTPOpen = expandedTPs[tpKey] !== false;
                                                        
                                                        return (
                                                            <div key={tpKey} className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden">
                                                                <button
                                                                    onClick={() => setExpandedTPs(prev => ({ ...prev, [tpKey]: !isTPOpen }))}
                                                                    className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-muted/20 transition cursor-pointer"
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
                                                                                Tambah Asesmen
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
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function FlatView({ assignments, search, filterType }: { assignments: Assignment[]; search: string; filterType: string }) {
    const filtered = sortAssignments(assignments.filter(a => {
        const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'all' || a.assessment_type === filterType;
        return matchSearch && matchType;
    }));

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
                <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-8 text-white shadow-xl shadow-primary/20 dark:shadow-none">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md flex-shrink-0">
                                <ClipboardList className="h-10 w-10" />
                            </div>
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <h1 className="text-2xl font-black">Asesmen</h1>
                                    {active_year && (
                                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest mt-1 sm:mt-0">
                                            {active_year} • {active_semester}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-white/70 mt-1">
                                    {user_role === 'teacher' ? 'Kelola asesmen awal, formatif, dan sumatif' : 'Daftar asesmen awal, formatif, dan sumatif'}
                                </p>
                            </div>
                        </div>
                        {user_role === 'teacher' && (
                            <button
                                id="btn-add-assignment"
                                onClick={() => router.visit('/assignments/create')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition hover:bg-white/90 cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah Asesmen
                            </button>
                        )}
                    </div>
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
                ) : user_role === 'student' ? (
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
