import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronLeft, Users, BookOpen, Target, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

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

export default function CreateRemedial({ teachings = [] }: { teachings?: Teaching[] }) {
    const { flash } = usePage<{ flash: Flash }>().props;

    const [step, setStep] = useState(1);
    const [subjectId, setSubjectId] = useState('');
    const [classId, setClassId] = useState('');
    const [type, setType] = useState<'remedial' | 'pengayaan'>('remedial');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [eligibleData, setEligibleData] = useState<EligibleResponse | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<Record<number, number[]>>({});
    const [descriptions, setDescriptions] = useState<Record<string, string>>({});
    const [strategies, setStrategies] = useState<Record<string, string>>({});
    const [focuses, setFocuses] = useState<Record<string, string>>({});
    const [dueDate, setDueDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // 1. Ekstrak Mapel unik (tanpa duplikasi option)
    const uniqueSubjects = useMemo(() => {
        const map = new Map<number, string>();
        teachings.forEach((t) => {
            if (t.subject_id && t.subject_name) {
                map.set(t.subject_id, t.subject_name);
            }
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [teachings]);

    // 2. Filter kelas berdasarkan mapel terpilih (terurut & tanpa duplikasi)
    const filteredClasses = useMemo(() => {
        if (!subjectId) return [];
        const classList = teachings
            .filter((t) => t.subject_id === Number(subjectId) && t.class_id && t.class_name)
            .filter((val, idx, self) => self.findIndex((t) => t.class_id === val.class_id) === idx);

        return classList.sort((a, b) => 
            a.class_name.localeCompare(b.class_name, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [teachings, subjectId]);

    // Auto-select subject jika hanya ada 1
    useEffect(() => {
        if (uniqueSubjects.length === 1 && !subjectId) {
            setSubjectId(String(uniqueSubjects[0].id));
        }
    }, [uniqueSubjects, subjectId]);

    // Auto-select class jika hanya ada 1 untuk mapel ini
    useEffect(() => {
        if (filteredClasses.length === 1 && !classId) {
            setClassId(String(filteredClasses[0].class_id));
        } else if (filteredClasses.length > 0 && classId) {
            const exists = filteredClasses.some((c) => String(c.class_id) === classId);
            if (!exists) {
                setClassId('');
            }
        }
    }, [filteredClasses, classId]);

    const loadEligible = async () => {
        if (!subjectId || !classId) return;
        setLoading(true);
        setErrorMessage('');
        try {
            const res = await fetch(route('remedial.eligible') + `?subject_id=${subjectId}&class_id=${classId}&type=${type}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal memuat data siswa eligible.');
            }
            const data: EligibleResponse = await res.json();
            setEligibleData(data);
            setSelectedStudents({});
            setStep(2);
        } catch (e: any) {
            console.error('Error loading eligible students:', e);
            setErrorMessage(e.message || 'Terjadi kesalahan saat memuat data siswa eligible.');
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
                
                // Auto-determine focus if not overridden by bulk input
                let defaultFocus = '';
                if (assignmentData?.score !== null && assignmentData?.score !== undefined) {
                    if (type === 'remedial') {
                        if (assignmentData.score <= 40) {
                            defaultFocus = 'Mempelajari kembali seluruh kriteria';
                        } else {
                            defaultFocus = 'Mempelajari kembali sebagian kriteria';
                        }
                    } else {
                        defaultFocus = 'Memperluas pengetahuan melalui referensi tingkat lanjut';
                    }
                }

                records.push({
                    student_id: studentId,
                    assignment_id: assignmentId,
                    subject_id: Number(subjectId),
                    type,
                    initial_score: assignmentData?.score ?? null,
                    remedial_strategy: strategies['_all'] || null,
                    remedial_focus: focuses['_all'] || defaultFocus,
                    description: descriptions['_all'] || null,
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

            <div className="space-y-4 sm:space-y-6 min-w-0 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full px-1 sm:px-0">
                <button
                    onClick={() => {
                        if (step === 1) {
                            window.history.back();
                        } else {
                            setStep(1);
                            setErrorMessage('');
                        }
                    }}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition w-fit min-h-[44px]"
                >
                    <ChevronLeft className="h-4 w-4" />
                    {step === 1 ? 'Kembali' : 'Ubah Pilihan (Step 1)'}
                </button>

                <div className="grid gap-6">
                    {/* STEP 1: Pilih Mapel, Kelas & Tipe */}
                    {step === 1 && (
                        <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Pilih Kelas & Tipe Program</h2>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    Pilih mata pelajaran, kelas, dan jenis program untuk melihat daftar siswa eligible.
                                </p>
                            </div>

                            {/* Error Alert Message */}
                            {errorMessage && (
                                <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Flash error if any */}
                            {flash?.error && (
                                <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                                    <span>{flash.error}</span>
                                </div>
                            )}

                            {uniqueSubjects.length === 0 ? (
                                <div className="p-6 rounded-2xl border border-dashed border-border text-center space-y-2">
                                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                                    <p className="text-sm font-bold text-foreground">Belum Ada Penugasan Mengajar Aktif</p>
                                    <p className="text-xs text-muted-foreground">
                                        Anda belum memiliki jadwal/penugasan mengajar di semester aktif ini.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-5 md:grid-cols-2">
                                    {/* 1. Pilih Mapel */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs sm:text-sm font-bold text-foreground">
                                            Mata Pelajaran <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={subjectId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSubjectId(val);
                                                setClassId('');
                                                setErrorMessage('');
                                            }}
                                            className="h-12 w-full rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="">-- Pilih Mata Pelajaran --</option>
                                            {uniqueSubjects.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 2. Pilih Kelas */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs sm:text-sm font-bold text-foreground">
                                            Kelas <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={classId}
                                            onChange={(e) => {
                                                setClassId(e.target.value);
                                                setErrorMessage('');
                                            }}
                                            className="h-12 w-full rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                                            disabled={!subjectId}
                                        >
                                            <option value="">
                                                {!subjectId ? '-- Pilih Mapel Terlebih Dahulu --' : '-- Pilih Kelas --'}
                                            </option>
                                            {filteredClasses.map((t) => {
                                                const label = t.class_name.toLowerCase().startsWith('kelas') 
                                                    ? t.class_name 
                                                    : `Kelas ${t.class_name}`;
                                                return (
                                                    <option key={t.class_id} value={t.class_id}>{label}</option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* 3. Tipe Program */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs sm:text-sm font-bold text-foreground">
                                            Jenis Program <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setType('remedial');
                                                    setErrorMessage('');
                                                }}
                                                className={`min-h-[48px] rounded-xl border-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                                                    type === 'remedial'
                                                        ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                                        : 'border-border/80 text-muted-foreground hover:border-rose-300'
                                                }`}
                                            >
                                                <span>🔁 Remedial</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setType('pengayaan');
                                                    setErrorMessage('');
                                                }}
                                                className={`min-h-[48px] rounded-xl border-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                                                    type === 'pengayaan'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                        : 'border-border/80 text-muted-foreground hover:border-emerald-300'
                                                }`}
                                            >
                                                <span>🚀 Pengayaan</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={loadEligible}
                                disabled={!subjectId || !classId || loading}
                                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                                <span>{loading ? 'Memuat Data Siswa...' : 'Lihat Siswa Eligible'}</span>
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Siswa Eligible & Konfigurasi */}
                    {step === 2 && eligibleData && (
                        <>
                            <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-foreground">
                                            {type === 'remedial' ? 'Siswa Perlu Remedial' : 'Siswa Eligible Pengayaan'}
                                        </h2>
                                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                            KKTP Mapel: <strong>{eligibleData.kktp}</strong> &middot; Ditemukan {eligibleData.assignments.length} tugas asesmen
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-xl">
                                        <Users className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="text-xl font-black text-primary leading-tight">{eligibleStudents.length}</p>
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Siswa Eligible</p>
                                        </div>
                                    </div>
                                </div>

                                {eligibleStudents.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground space-y-2">
                                        <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 opacity-60" />
                                        <p className="text-sm font-bold text-foreground">
                                            {type === 'remedial' 
                                                ? 'Semua siswa telah mencapai KKTP atau tidak ada yang perlu remedial.' 
                                                : 'Belum ada siswa yang memenuhi syarat untuk pengayaan.'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Silakan klik tombol "Ubah Pilihan" di atas jika ingin memilih kelas atau mata pelajaran lain.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/40">
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pilih</th>
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nama Siswa</th>
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
                                                            <p className="text-[10px] font-mono text-muted-foreground">{s.nis}</p>
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
                                                                            <span className={`text-xs font-bold ${a.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                                {a.score}
                                                                            </span>
                                                                            {a.has_active_record && (
                                                                                <span className="text-[8px] text-muted-foreground font-semibold">(sudah ada)</span>
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
                                <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm space-y-6">
                                    <div className="border-b border-border pb-3">
                                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                                            Konfigurasi Program ({selectedCount} record dipilih)
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Tentukan strategi dan fokus pembelajaran yang akan diterapkan.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label className="text-xs sm:text-sm font-bold text-foreground">
                                                {type === 'remedial' ? 'Bentuk Pendampingan' : 'Bentuk Tantangan Pengayaan'}
                                            </label>
                                            <select
                                                value={strategies['_all'] || ''}
                                                onChange={(e) => setStrategies({ '_all': e.target.value })}
                                                className="h-12 w-full rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                            >
                                                <option value="">
                                                    {type === 'remedial' ? '-- Pilih Bentuk Pendampingan --' : '-- Pilih Bentuk Tantangan --'}
                                                </option>
                                                {type === 'remedial' ? (
                                                    <>
                                                        <option value="Bimbingan Individu">Bimbingan Individu</option>
                                                        <option value="Tutor Sebaya">Tutor Sebaya</option>
                                                        <option value="Penugasan Terpandu">Penugasan Terpandu</option>
                                                        <option value="Belajar Kelompok">Belajar Kelompok</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="Proyek Mandiri">Proyek Mandiri (Kompleksitas Tinggi)</option>
                                                        <option value="Eksplorasi Referensi">Eksplorasi Referensi Baru</option>
                                                        <option value="Problem Solving">Pemecahan Masalah Lanjutan</option>
                                                        <option value="Tutor Sebaya">Menjadi Tutor Sebaya</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs sm:text-sm font-bold text-foreground">
                                                {type === 'remedial' ? 'Fokus Kriteria (Otomatis dari skor jika kosong)' : 'Fokus Eksplorasi (Otomatis jika kosong)'}
                                            </label>
                                            <input
                                                type="text"
                                                value={focuses['_all'] || ''}
                                                onChange={(e) => setFocuses({ '_all': e.target.value })}
                                                className="h-12 w-full rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder={type === 'remedial' ? "Contoh: Seluruh kriteria, atau spesifik indikator 1" : "Contoh: Studi kasus nyata..."}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs sm:text-sm font-bold text-foreground">Catatan Tambahan (Opsional)</label>
                                            <textarea
                                                value={descriptions['_all'] || ''}
                                                onChange={(e) => setDescriptions({ '_all': e.target.value })}
                                                rows={2}
                                                className="w-full rounded-xl border border-border/80 bg-card p-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                                placeholder="Catatan untuk semua records..."
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs sm:text-sm font-bold text-foreground">Tenggat Waktu (Opsional)</label>
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="h-12 w-full rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]"
                                    >
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                                        <span>{submitting ? 'Menyimpan...' : `Simpan ${selectedCount} Record Program`}</span>
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
