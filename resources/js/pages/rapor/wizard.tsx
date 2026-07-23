import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { RaporMethodSelector, RaporCalculationMethod } from '@/components/rapor/RaporMethodSelector';
import { RaporScoreInput, TpScoreEntry } from '@/components/rapor/RaporScoreInput';
import { RaporDescriptionEditor } from '@/components/rapor/RaporDescriptionEditor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StudentItem {
    id: number;
    name: string;
    nis: string;
    class_name: string;
    school_class_id?: number;
}

interface SubjectItem {
    id: number;
    name: string;
    code: string;
}

interface RaporWizardProps {
    students: StudentItem[];
    subjects: SubjectItem[];
}

export default function RaporWizardPage({ students, subjects }: RaporWizardProps) {
    const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.id || 1);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number>(subjects[0]?.id || 1);
    const [method, setMethod] = useState<RaporCalculationMethod>('average');
    const [threshold, setThreshold] = useState<number>(75);

    const [tpEntries, setTpEntries] = useState<TpScoreEntry[]>([
        { code: 'TP 7.1', title: 'Menerapkan 4 fondasi berpikir komputasional dalam masalah sehari-hari', score: 85, weight: 0.2 },
        { code: 'TP 7.2', title: 'Memanfaatkan media digital dan perkakas kolaborasi secara etis', score: 83, weight: 0.2 },
        { code: 'TP 7.3', title: 'Memahami konsep jaringan komputer dan keamanan data sederhana', score: 60, weight: 0.2 },
        { code: 'TP 7.4', title: 'Merancang algoritma pemrograman visual sederhana (Block-based)', score: 84, weight: 0.4 },
    ]);

    const [description, setDescription] = useState<string>('');

    // Calculate score dynamically
    const calculateScore = () => {
        if (tpEntries.length === 0) return 0;
        const scores = tpEntries.map((e) => e.score);

        if (method === 'average') {
            return scores.reduce((a, b) => a + b, 0) / scores.length;
        } else if (method === 'weighted') {
            return tpEntries.reduce((acc, curr) => acc + curr.score * (curr.weight || 0.25), 0);
        } else if (method === 'percentage') {
            const passed = scores.filter((s) => s >= threshold).length;
            return (passed / scores.length) * 100;
        }
        return 0;
    };

    const calculatedScore = calculateScore();
    const selectedStudent = students.find((s) => s.id === selectedStudentId);

    const handleSaveRapor = () => {
        const scoresObj: Record<string, number> = {};
        tpEntries.forEach((e) => {
            scoresObj[e.code] = e.score;
        });

        router.post('/rapor/generate', {
            student_id: selectedStudentId,
            subject_id: selectedSubjectId,
            school_class_id: selectedStudent?.school_class_id,
            calculation_method: method,
            tp_scores: scoresObj,
            tp_details: tpEntries,
            weights: tpEntries.map((e) => e.weight || 0.25),
            threshold: threshold,
            student_name: selectedStudent?.name || 'Ananda',
            custom_description: description,
        });
    };

    return (
        <AppLayout title="Wizard Pengolahan Nilai Rapor (PPA 2025)">
            <Head title="Wizard Pengolahan Nilai Rapor (PPA 2025)" />

            <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                Pengolahan Nilai Rapor Murni Sumatif
                            </h1>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs">
                                PPA 2025
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Format penilaian kuantitatif (Rata-rata, Pembobotan, Persentase) & deskripsi kualitatif positif.
                        </p>
                    </div>

                    <Button
                        onClick={handleSaveRapor}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-lg text-sm"
                    >
                        💾 Simpan & Cetak Rapor
                    </Button>
                </div>

                {/* Student & Subject Selector */}
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="py-4">
                        <CardTitle className="text-base">Pilih Siswa & Mata Pelajaran</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Siswa:
                            </label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                            >
                                {students.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.class_name} - NIS: {s.nis})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Mata Pelajaran:
                            </label>
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                            >
                                {subjects.map((sb) => (
                                    <option key={sb.id} value={sb.id}>
                                        {sb.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 1: Method Selector */}
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        Langkah 1: Pilih Metode Perhitungan PPA 2025
                    </h2>
                    <RaporMethodSelector selectedMethod={method} onSelectMethod={setMethod} />
                </div>

                {/* Step 2: Score Inputs */}
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        Langkah 2: Entri Nilai Sumatif Per TP
                    </h2>
                    <RaporScoreInput
                        method={method}
                        entries={tpEntries}
                        threshold={threshold}
                        calculatedScore={calculatedScore}
                        onChangeEntryScore={(idx, val) => {
                            const updated = [...tpEntries];
                            updated[idx].score = val;
                            setTpEntries(updated);
                        }}
                        onChangeEntryWeight={(idx, w) => {
                            const updated = [...tpEntries];
                            updated[idx].weight = w;
                            setTpEntries(updated);
                        }}
                        onChangeThreshold={(t) => setThreshold(t)}
                    />
                </div>

                {/* Step 3: Qualitative Description Editor */}
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        Langkah 3: Deskripsi Capaian Kualitatif
                    </h2>
                    <RaporDescriptionEditor
                        description={description}
                        onChangeDescription={setDescription}
                        tpDetails={tpEntries}
                        studentName={selectedStudent?.name || 'Ananda'}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
