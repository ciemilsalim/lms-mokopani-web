import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Heart, Calendar, Users, BookOpen, Pencil, Trash2, CheckCircle2, XCircle, Target } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Projek P5', href: '/p5' },
    { title: 'Detail Projek', href: '#' },
];

interface SubElement {
    id: number;
    nama: string;
    element_id: number;
}

interface Element {
    id: number;
    nama: string;
    sub_elements: SubElement[];
}

interface Dimensi {
    id: number;
    kode: string;
    nama: string;
    elements: Element[];
}

interface Student {
    id: number;
    name: string;
    nis: string;
}

interface Score {
    id?: number;
    project_id: number;
    student_id: number;
    sub_element_id: number;
    nilai: string;
    catatan: string | null;
}

interface Project {
    id: number;
    judul: string;
    tema: string | null;
    status: string;
    alokasi_waktu: number | null;
    school_class: { name: string };
    academic_year: { name: string };
    semester: { name: string };
    scores: Score[];
}

interface P5ShowProps {
    project: Project;
    dimensi: Dimensi[];
    students: Student[];
}

const nilaiOptions = ['BB', 'MB', 'BSH', 'SB'];

const nilaiStyles: Record<string, string> = {
    'SB':  'bg-emerald-50/80 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700/50 dark:text-emerald-400',
    'BSH': 'bg-blue-50/80 border-blue-300 text-blue-700 dark:bg-blue-950/30 dark:border-blue-700/50 dark:text-blue-400',
    'MB':  'bg-amber-50/80 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-400',
    'BB':  'bg-red-50/80 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-700/50 dark:text-red-400',
};

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        draft:  'bg-muted text-muted-foreground border-border',
        active: 'bg-success/10 text-success border-success/30',
        selesai: 'bg-primary/10 text-primary border-primary/30',
    };
    return map[status] || map.draft;
};

const statusLabel = (status: string) => {
    const map: Record<string, string> = { draft: 'Draft', active: 'Aktif', selesai: 'Selesai' };
    return map[status] || status;
};

export default function P5Show({ project, dimensi, students }: P5ShowProps) {
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const scoreKey = (studentId: number, subElementId: number) => `${studentId}_${subElementId}`;

    const [localScores, setLocalScores] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        project.scores.forEach(s => {
            initial[scoreKey(s.student_id, s.sub_element_id)] = s.nilai;
        });
        return initial;
    });

    const updateScore = (studentId: number, subElementId: number, nilai: string) => {
        const key = scoreKey(studentId, subElementId);
        setLocalScores(prev => ({ ...prev, [key]: nilai }));
        setSaving(true);
        setFeedback(null);

        router.post(route('p5.score.store'), {
            project_id: project.id,
            student_id: studentId,
            sub_element_id: subElementId,
            nilai: nilai,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSaving(false);
                setFeedback({ type: 'success', message: nilai ? 'Nilai tersimpan' : 'Nilai dihapus' });
                setTimeout(() => setFeedback(null), 2000);
            },
            onError: () => {
                setSaving(false);
                setFeedback({ type: 'error', message: 'Gagal menyimpan' });
                setTimeout(() => setFeedback(null), 3000);
            },
        });
    };

    const handleDeleteProject = () => {
        if (deleteId) {
            router.delete(route('p5.destroy', deleteId));
            setDeleteId(null);
        }
    };

    const totalSubElements = dimensi.reduce((s, d) => s + d.elements.reduce((s2, e) => s2 + e.sub_elements.length, 0), 0);
    const totalScores = project.scores.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${project.judul} – P5`} />

            <div className="flex h-full flex-1 flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 dark:from-rose-900/40 dark:to-pink-900/40 dark:text-rose-400 shadow-sm">
                            <Heart className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-foreground tracking-tight">{project.judul}</h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadge(project.status)}`}>
                                    {statusLabel(project.status)}
                                </span>
                                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {project.school_class.name}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {project.semester.name} {project.academic_year.name}</span>
                                {project.alokasi_waktu && <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {project.alokasi_waktu} JP</span>}
                                {project.tema && <span className="flex items-center gap-1"><span className="font-medium">Tema:</span> {project.tema}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => router.get(route('p5.edit', project.id))} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted transition shadow-sm">
                            <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button onClick={() => setDeleteId(project.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/20 text-destructive font-medium text-sm hover:bg-destructive/10 transition shadow-sm">
                            <Trash2 className="h-4 w-4" /> Hapus
                        </button>
                    </div>
                </div>

                <div className="rounded-xl border bg-card shadow-sm">
                    {project.deskripsi && (
                        <div className="px-6 pt-5 pb-2 border-b border-border/50">
                            <p className="text-sm text-muted-foreground leading-relaxed">{project.deskripsi}</p>
                        </div>
                    )}

                    <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Target className="h-4 w-4 text-rose-500" />
                                <span className="font-semibold text-foreground">Dimensi & Elemen yang Dinilai:</span>
                            </div>
                            {dimensi.map(d => (
                                <div key={d.id} className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">{d.kode}</span>
                                    <span className="text-[11px] text-muted-foreground/50">-</span>
                                    <span className="text-[11px] text-foreground">{d.nama}</span>
                                    <span className="text-[10px] text-muted-foreground/40 ml-0.5">
                                        ({d.elements.map(e => e.nama).join(', ')})
                                    </span>
                                    {d !== dimensi[dimensi.length - 1] && <span className="text-muted-foreground/20 mx-1">|</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 bg-card z-30 px-4 py-2.5 border-b border-r border-border text-left min-w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider">Siswa</span>
                                            <span className="text-[10px] text-muted-foreground/50 font-normal normal-case">({students.length})</span>
                                        </div>
                                    </th>
                                    {dimensi.map(d => (
                                        <th key={d.id} colSpan={d.elements.reduce((sum, el) => sum + el.sub_elements.length, 0)}
                                            className="px-3 py-2.5 border-b border-r border-border bg-gradient-to-r from-rose-50/80 to-pink-50/80 dark:from-rose-950/20 dark:to-pink-950/20 font-bold text-rose-700 dark:text-rose-300 text-center text-sm tracking-wide">
                                            <div>{d.nama}</div>
                                            <div className="text-[10px] font-semibold text-rose-500/70 dark:text-rose-400/60 uppercase tracking-wider mt-0.5">{d.kode}</div>
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    <th className="sticky left-0 bg-card z-30 px-4 py-2 border-b border-r border-border"></th>
                                    {dimensi.flatMap(d =>
                                        d.elements.map(el => (
                                            <th key={el.id} colSpan={el.sub_elements.length}
                                                className="px-2 py-2 border-b border-r border-border bg-muted/40 font-semibold text-muted-foreground text-center text-xs">
                                                {el.nama}
                                            </th>
                                        ))
                                    )}
                                </tr>
                                <tr>
                                    <th className="sticky left-0 bg-card z-20 px-4 py-2 border-b border-r border-border"></th>
                                    {dimensi.flatMap(d =>
                                        d.elements.flatMap(el =>
                                            el.sub_elements.map(se => (
                                                <th key={se.id}
                                                    className="px-2 py-2.5 border-b border-r border-border font-semibold text-muted-foreground text-center min-w-[100px]">
                                                    <span className="text-[11px] leading-tight block">{se.nama}</span>
                                                </th>
                                            ))
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, si) => (
                                    <tr key={student.id} className={`transition-colors ${si % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-muted/[0.04] dark:bg-muted/[0.02]'}`}>
                                        <td className="sticky left-0 z-10 px-4 py-2.5 border-b border-r border-border bg-inherit">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 text-[10px] font-bold text-muted-foreground shrink-0">
                                                    {student.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-foreground truncate">{student.name}</div>
                                                    <div className="text-[10px] text-muted-foreground/60">{student.nis}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {dimensi.flatMap(d =>
                                            d.elements.flatMap(el =>
                                                el.sub_elements.map(se => {
                                                    const key = scoreKey(student.id, se.id);
                                                    const current = localScores[key] || '';
                                                    return (
                                                        <td key={se.id} className="px-1.5 py-2 border-b border-r border-border text-center">
                                                            <select
                                                                value={current}
                                                                onChange={e => updateScore(student.id, se.id, e.target.value)}
                                                                className={`h-9 w-full min-w-[65px] rounded-lg border-2 px-2 text-xs font-bold outline-none transition-all text-center appearance-none cursor-pointer hover:shadow-sm focus:ring-2 focus:ring-primary/20
                                                                    ${current && nilaiStyles[current]
                                                                        ? nilaiStyles[current]
                                                                        : 'bg-muted/30 border-border text-muted-foreground/60 hover:bg-muted/50 hover:border-muted-foreground/30'}`}
                                                            >
                                                                <option value="">-</option>
                                                                {nilaiOptions.map(n => <option key={n} value={n}>{n}</option>)}
                                                            </select>
                                                        </td>
                                                    );
                                                })
                                            )
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3 border-t border-border bg-muted/15">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Legenda:</span>
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700/50" />
                                SB = Sangat Baik
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 dark:bg-blue-950/40 dark:border-blue-700/50" />
                                BSH = Berkembang Sesuai Harapan
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-700/50" />
                                MB = Mulai Berkembang
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300 dark:bg-red-950/40 dark:border-red-700/50" />
                                BB = Belum Berkembang
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {saving && (
                                <span className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                                    <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    Menyimpan...
                                </span>
                            )}
                            {feedback && (
                                <span className={`flex items-center gap-1 text-xs font-semibold ${
                                    feedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                    {feedback.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                    {feedback.message}
                                </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">
                                {totalScores}/{totalSubElements} sub-elemen dinilai
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={() => setDeleteId(null)}
                title="Hapus Projek P5?"
                message="Semua data nilai projek ini juga akan dihapus."
                confirmLabel="Hapus"
                onConfirm={handleDeleteProject}
            />
        </AppLayout>
    );
}
