import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { PredicateBadge } from '@/components/gradebook';
import { ReportHeader, ReportActions } from '@/components/report';

interface ReportRow {
    nis: string;
    name: string;
    final_score: number;
    description: string;
}

interface FinalReportProps {
    reportData: ReportRow[];
    subject_name: string;
    class_name: string;
    teacher_name: string;
    period: string;
    subject_id?: number;
    class_id?: number;
    kktp?: number;
    school_name?: string;
    school_address?: string;
    headmaster_name?: string;
    headmaster_nip?: string;
}

export default function FinalReport({ 
    reportData = [], 
    subject_name, 
    class_name, 
    teacher_name, 
    period, 
    subject_id, 
    class_id, 
    kktp = 75, 
    school_name, 
    school_address, 
    headmaster_name, 
    headmaster_nip 
}: FinalReportProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPdf = () => {
        setDownloading(true);
        const url = route('rapor.download', { subject_id, class_id });
        window.open(url, '_blank');
        setTimeout(() => setDownloading(false), 2000);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Penilaian', href: '/gradebook' },
        { title: 'Laporan Akhir Mapel', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Laporan Akhir ${subject_name} – LMS Mokopani`} />

            <div className="space-y-5 sm:space-y-6 fade-in pb-16 md:pb-6 max-w-5xl mx-auto px-4 sm:px-6 print:p-0 print:m-0">
                {/* Actions (Hidden on Print) */}
                <ReportActions
                    subjectId={subject_id}
                    classId={class_id}
                    downloading={downloading}
                    onDownloadPdf={handleDownloadPdf}
                    onPrint={() => window.print()}
                    onBack={() => window.history.back()}
                />

                {/* Report Header Identity */}
                <div className="print:hidden">
                    <ReportHeader
                        subjectName={subject_name}
                        classNameStr={class_name}
                        teacherName={teacher_name}
                        periodStr={period}
                        schoolName={school_name}
                        schoolAddress={school_address}
                    />
                </div>

                {/* ── Mobile Student Card Feed (md:hidden when not printing) ── */}
                <div className="md:hidden space-y-3 print:hidden">
                    {reportData.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-xs italic bg-card rounded-2xl border border-border/60 p-6">
                            Belum ada data nilai siswa untuk ditampilkan.
                        </div>
                    ) : (
                        reportData.map((row, idx) => (
                            <div key={idx} className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs shrink-0">
                                            {row.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">{row.name}</h3>
                                            <p className="text-[10px] font-mono text-muted-foreground">NIS: {row.nis || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="text-sm font-black text-foreground block">{row.final_score}</span>
                                        <PredicateBadge score={row.final_score} kktpThreshold={kktp} />
                                    </div>
                                </div>

                                {row.description && (
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Deskripsi Capaian Rapor:</p>
                                        <p className="text-foreground italic leading-relaxed">{row.description}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* ── Main Document Table View (Desktop & Print) ── */}
                <div className="hidden md:block print:block rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-2xl print:shadow-none print:border-none print:p-0">
                    {/* Document Print Header */}
                    <div className="hidden print:block mb-8 border-b-4 border-double border-border pb-6 text-center">
                        {school_name && (
                            <>
                                <h1 className="text-2xl font-black uppercase tracking-widest text-foreground">{school_name}</h1>
                                {school_address && <p className="text-sm text-muted-foreground mt-1">{school_address}</p>}
                                <div className="mx-auto my-3 w-24 border-t-2 border-border"></div>
                            </>
                        )}
                        <h2 className="text-xl font-black uppercase tracking-widest text-foreground">Laporan Hasil Asesmen Akhir</h2>
                        <p className="mt-1 text-lg font-bold text-primary uppercase">{subject_name}</p>
                        <div className="mt-6 grid grid-cols-2 gap-4 text-left text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Kelas:</p>
                                <p className="font-bold text-foreground">{class_name}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-muted-foreground">Periode:</p>
                                <p className="font-bold text-foreground">{period}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Guru Pengampu:</p>
                                <p className="font-bold text-foreground">{teacher_name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="overflow-hidden rounded-2xl border border-border">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-muted/50 text-foreground font-bold uppercase tracking-wider border-b border-border">
                                <tr>
                                    <th className="px-4 py-3.5 w-12 text-center">No</th>
                                    <th className="px-4 py-3.5 w-28">NIS</th>
                                    <th className="px-4 py-3.5 w-56">Nama Siswa</th>
                                    <th className="px-4 py-3.5 w-24 text-center">Nilai Akhir</th>
                                    <th className="px-4 py-3.5">Deskripsi Capaian Kompetensi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {reportData.map((row, index) => (
                                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 text-center text-muted-foreground font-medium">{index + 1}</td>
                                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{row.nis}</td>
                                        <td className="px-4 py-3.5 font-bold text-foreground">{row.name}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${row.final_score >= kktp ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' : 'text-rose-600 bg-rose-500/10 dark:text-rose-400'}`}>
                                                {row.final_score}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <p className="text-xs leading-relaxed text-foreground font-medium italic">
                                                "{row.description}"
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Signatures Footer (Only for Print) */}
                    <div className="mt-16 hidden print:grid grid-cols-2 gap-20">
                        <div className="text-center">
                            <p className="text-sm font-medium text-muted-foreground">Mengetahui,</p>
                            <p className="text-sm font-bold text-foreground">Kepala Sekolah</p>
                            <div className="h-20"></div>
                            <p className="text-sm font-bold text-foreground underline">{headmaster_name || '........................................'}</p>
                            {headmaster_nip && <p className="text-xs text-muted-foreground">NIP. {headmaster_nip}</p>}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-muted-foreground">Guru Mata Pelajaran,</p>
                            <div className="h-24"></div>
                            <p className="text-sm font-bold text-foreground underline">{teacher_name}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
