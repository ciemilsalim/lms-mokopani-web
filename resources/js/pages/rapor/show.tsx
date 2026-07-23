import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RaporShowProps {
    report: {
        id: number;
        calculation_method: string;
        final_score: number;
        description: string;
        tp_scores_breakdown: {
            scores: Record<string, number>;
            details: Array<{ code: string; title: string; score: number }>;
            weights?: number[];
            threshold?: number;
        };
        student?: { name: string; nis?: string; nisn?: string };
        school_class?: { name: string };
        subject?: { name: string };
        creator?: { name: string; nip?: string };
        created_at: string;
    };
}

export default function RaporShowPage({ report }: RaporShowProps) {
    const details = report.tp_scores_breakdown?.details || [];

    return (
        <AppLayout title={`Laporan Hasil Belajar - ${report.student?.name}`}>
            <Head title={`Laporan Hasil Belajar - ${report.student?.name}`} />

            <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/rapor/wizard"
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                            ← Kembali ke Wizard
                        </Link>
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                            Tersimpan
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={`/rapor/${report.id}/export/pdf`}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow flex items-center gap-1.5"
                        >
                            📄 Download PDF
                        </a>
                        <a
                            href={`/rapor/${report.id}/export/csv`}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow flex items-center gap-1.5"
                        >
                            📊 Download CSV
                        </a>
                        <Button
                            onClick={() => window.print()}
                            variant="outline"
                            className="text-xs px-4 py-2 font-bold"
                        >
                            🖨️ Cetak HTML
                        </Button>
                    </div>
                </div>

                {/* Report Card Document Paper View */}
                <Card className="bg-white text-slate-900 shadow-xl border border-slate-200 p-8 rounded-xl font-sans">
                    {/* Header Kop */}
                    <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                        <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
                            PEMERINTAH KABUPATEN BUOL
                        </h2>
                        <h3 className="text-base font-bold uppercase tracking-wider text-slate-800">
                            DINAS PENDIDIKAN DAN KEBUDAYAAN
                        </h3>
                        <p className="text-xs font-semibold text-slate-600 mt-1">SMP NEGERI 1 BIAU</p>
                        <p className="text-xs font-bold text-indigo-900 mt-2 uppercase tracking-wide">
                            LAPORAN HASIL BELAJAR (RAPOR KURIKULUM MERDEKA - PPA 2025)
                        </p>
                    </div>

                    {/* Student Metadata Table */}
                    <div className="grid grid-cols-2 gap-4 text-xs mb-6 border-b pb-4">
                        <div className="space-y-1">
                            <p>
                                <span className="font-semibold text-slate-500">Nama Siswa:</span>{' '}
                                <strong className="text-slate-900">{report.student?.name}</strong>
                            </p>
                            <p>
                                <span className="font-semibold text-slate-500">NIS / NISN:</span>{' '}
                                <span>{report.student?.nis || report.student?.nisn || '-'}</span>
                            </p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p>
                                <span className="font-semibold text-slate-500">Mata Pelajaran:</span>{' '}
                                <strong>{report.subject?.name || 'Informatika'}</strong>
                            </p>
                            <p>
                                <span className="font-semibold text-slate-500">Kelas:</span>{' '}
                                <span>{report.school_class?.name || 'VII'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Final Score Banner */}
                    <div className="bg-slate-50 border-2 border-indigo-600 rounded-xl p-4 mb-6 flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold uppercase text-indigo-900 block">
                                NILAI AKHIR RAPOR (MURNI SUMATIF)
                            </span>
                            <span className="text-[10px] text-slate-500">
                                Metode: Opsi {report.calculation_method.toUpperCase()}
                            </span>
                        </div>
                        <div className="text-3xl font-extrabold font-mono text-indigo-700">
                            {Number(report.final_score).toFixed(1)}
                        </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="space-y-3 mb-6">
                        <h4 className="text-xs font-bold uppercase text-slate-900 border-l-4 border-indigo-600 pl-2">
                            A. Pencapaian Asesmen Sumatif Per Tujuan Pembelajaran (TP)
                        </h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                            <table className="w-full text-left">
                                <thead className="bg-indigo-900 text-white font-bold uppercase text-[10px]">
                                    <tr>
                                        <th className="p-3 w-16">Kode</th>
                                        <th className="p-3">Tujuan Pembelajaran</th>
                                        <th className="p-3 w-28 text-center">Nilai Sumatif</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {details.map((tp, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 font-bold text-indigo-600">{tp.code}</td>
                                            <td className="p-3 font-medium text-slate-800">{tp.title}</td>
                                            <td className="p-3 text-center font-bold font-mono">{tp.score}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Qualitative Description */}
                    <div className="space-y-3 mb-8">
                        <h4 className="text-xs font-bold uppercase text-slate-900 border-l-4 border-indigo-600 pl-2">
                            B. Deskripsi Capaian Kompetensi
                        </h4>
                        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 leading-relaxed font-sans">
                            {report.description}
                        </div>
                    </div>

                    {/* Signature Space */}
                    <div className="grid grid-cols-2 text-center text-xs pt-8 border-t">
                        <div>
                            <p>Mengetahui,</p>
                            <p className="font-semibold">Orang Tua / Wali Murid</p>
                            <div className="h-16"></div>
                            <p>( ..................................................... )</p>
                        </div>
                        <div>
                            <p>Buol, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="font-semibold">Guru Mata Pelajaran</p>
                            <div className="h-16"></div>
                            <p className="font-bold">{report.creator?.name || 'Guru Pengampu'}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
