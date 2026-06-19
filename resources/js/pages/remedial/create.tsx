import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronLeft, Users, BookOpen, Target, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Remedial & Pengayaan', href: '/remedial' },
    { title: 'Buat Baru', href: '#' },
];

interface Teaching {
    subject_id: number;
    subject_name: string;
    class_id: number;
    class_name: string;
}

interface CreateRemedialProps {
    teachings: Teaching[];
}

interface Flash {
    success?: string;
    error?: string;
}

interface StudentData {
    id: number;
    name: string;
    nis: string;
    eligible: boolean;
    assignments: {
        assignment_id: number;
        assignment_title: string;
        score: number | null;
        passed: boolean;
        max_points: number;
        has_active_record: boolean;
    }[];
}

interface EligibleResponse {
    students: StudentData[];
    assignments: { id: number; title: string; learning_objective_id: number; max_points: number }[];
    kktp: number;
}

export default function CreateRemedial({ teachings }: CreateRemedialProps) {
    const { flash } = usePage<{ flash: Flash }>().props;

    const [step, setStep] = useState(1);
    const [subjectId, setSubjectId] = useState('');
    const [classId, setClassId] = useState('');
    const [type, setType] = useState<'remedial' | 'pengayaan'>('remedial');
    const [loading, setLoading] = useState(false);
    const [eligibleData, setEligibleData] = useState<EligibleResponse | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<Record<number, number[]>>({});
    const [descriptions, setDescriptions] = useState<Record<string, string>>({});
    const [dueDate, setDueDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const filteredClasses = teachings.filter((t) => !subjectId || t.subject_id === Number(subjectId));

    const loadEligible = async () => {
        if (!subjectId || !classId) return;
        setLoading(true);
        try {
            const res = await fetch(route('remedial.eligible') + `?subject_id=${subjectId}&class_id=${classId}&type=${type}`);
            const data: EligibleResponse = await res.json();
            setEligibleData(data);
            setStep(2);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleStudent = (studentId: number, assignmentId: number) => {
        setSelectedStudents((prev) => {
            const current = prev[studentId] || [];
            const exists = current.includes(assignmentId);
            return {
                ...prev,
                [studentId]: exists ? current.filter((id) => id !== assignmentId) : [...current, assignmentId],
            };
        });
    };

    const handleSubmit = () => {
        const records: any[] = [];
        for (const [studentIdStr, assignmentIds] of Object.entries(selectedStudents)) {
            const studentId = Number(studentIdStr);
            const student = eligibleData?.students.find((s) => s.id === studentId);
            if (!student) continue;

            for (const assignmentId of assignmentIds) {
                const assignmentData = student.assignments.find((a) => a.assignment_id === assignmentId);
                records.push({
                    student_id: studentId,
                    assignment_id: assignmentId,
                    subject_id: Number(subjectId),
                    type,
                    initial_score: assignmentData?.score ?? null,
                    description: descriptions[`${studentId}-${assignmentId}`] || null,
                    due_date: dueDate || null,
                });
            }
        }

        if (records.length === 0) return;

        setSubmitting(true);
        router.post(route('remedial.store'), { records }, {
            onFinish: () => setSubmitting(false),
        });
    };

    const eligibleStudents = eligibleData?.students.filter((s) => s.eligible) || [];
    const selectedCount = Object.values(selectedStudents).reduce((sum, ids) => sum + ids.length, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Remedial/Pengayaan – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0">
                <button
                    onClick={() => step === 1 ? window.history.back() : setStep(1)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition w-fit"
                >
                    <ChevronLeft className="h-4 w-4" />
                    {step === 1 ? 'Kembali' : 'Ubah Pilihan'}
                </button>

                <div className="grid gap-6">
                    {step === 1 && (
                        <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-border/30">
                            <h2 className="text-xl font-bold text-foreground mb-6">Pilih Kelas & Tipe</h2>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">Mata Pelajaran</label>
                                    <select
                                        value={subjectId}
                                        onChange={(e) => { setSubjectId(e.target.value); setClassId(''); }}
                                        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                                    >
                                        <option value="">Pilih Mapel</option>
                                        {teachings.map((t) => (
                                            <option key={t.subject_id} value={t.subject_id}>{t.subject_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">Kelas</label>
                                    <select
                                        value={classId}
                                        onChange={(e) => setClassId(e.target.value)}
                                        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                                        disabled={!subjectId}
                                    >
                                        <option value="">Pilih Kelas</option>
                                        {filteredClasses.map((t) => (
                                            <option key={t.class_id} value={t.class_id}>{t.class_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">Tipe</label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setType('remedial')}
                                            className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                                                type === 'remedial'
                                                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                    : 'border-border text-muted-foreground hover:border-red-300'
                                            }`}
                                        >
                                            Remedial
                                        </button>
                                        <button
                                            onClick={() => setType('pengayaan')}
                                            className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                                                type === 'pengayaan'
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                    : 'border-border text-muted-foreground hover:border-emerald-300'
                                            }`}
                                        >
                                            Pengayaan
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={loadEligible}
                                disabled={!subjectId || !classId || loading}
                                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                                {loading ? 'Memuat...' : 'Lihat Siswa Eligible'}
                            </button>
                        </div>
                    )}

                    {step === 2 && eligibleData && (
                        <>
                            <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-border/30">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground">
                                            {type === 'remedial' ? 'Siswa Perlu Remedial' : 'Siswa Eligible Pengayaan'}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            KKTP: {eligibleData.kktp} &middot; {eligibleData.assignments.length} tugas sumatif
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-primary">{eligibleStudents.length}</p>
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Siswa Eligible</p>
                                    </div>
                                </div>

                                {eligibleStudents.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Tidak ada siswa yang eligible untuk {type === 'remedial' ? 'remedial' : 'pengayaan'}.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pilih</th>
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Siswa</th>
                                                    {eligibleData.assignments.map((a) => (
                                                        <th key={a.id} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                            {a.title}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {eligibleStudents.map((s) => (
                                                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={(selectedStudents[s.id]?.length || 0) > 0}
                                                                onChange={() => {
                                                                    const allIds = s.assignments
                                                                        .filter((a) => a.score !== null)
                                                                        .map((a) => a.assignment_id);
                                                                    if ((selectedStudents[s.id]?.length || 0) > 0) {
                                                                        setSelectedStudents((prev) => ({ ...prev, [s.id]: [] }));
                                                                    } else {
                                                                        setSelectedStudents((prev) => ({ ...prev, [s.id]: allIds }));
                                                                    }
                                                                }}
                                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-bold text-foreground">{s.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{s.nis}</p>
                                                        </td>
                                                        {s.assignments.map((a) => {
                                                            const checked = selectedStudents[s.id]?.includes(a.assignment_id);
                                                            return (
                                                                <td key={a.assignment_id} className="px-3 py-3 text-center">
                                                                    {a.score !== null ? (
                                                                        <label className="flex flex-col items-center gap-1 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={!!checked}
                                                                                onChange={() => toggleStudent(s.id, a.assignment_id)}
                                                                                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                                                                            />
                                                                            <span className={`text-xs font-bold ${a.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                                {a.score}
                                                                            </span>
                                                                            {a.has_active_record && (
                                                                                <span className="text-[8px] text-muted-foreground">(sudah)</span>
                                                                            )}
                                                                        </label>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground/30">-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {selectedCount > 0 && (
                                <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-border/30">
                                    <h3 className="text-lg font-bold text-foreground mb-4">
                                        Konfigurasi ({selectedCount} records)
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-foreground">Deskripsi (opsional, untuk semua)</label>
                                            <textarea
                                                value={descriptions['_all'] || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDescriptions({ '_all': val });
                                                    for (const [key] of Object.entries(descriptions)) {
                                                        if (key !== '_all') {
                                                            setDescriptions((prev) => ({ ...prev, [key]: val }));
                                                        }
                                                    }
                                                }}
                                                rows={3}
                                                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                                                placeholder="Catatan untuk semua records..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-foreground">Tenggat Waktu (opsional)</label>
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                                        {submitting ? 'Menyimpan...' : `Simpan ${selectedCount} Records`}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
