import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { 
    Printer, 
    ChevronLeft, 
    Download,
    FileText,
    User,
    CheckCircle2
} from 'lucide-react';
import { useState } from 'react';

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

export default function FinalReport({ reportData, subject_name, class_name, teacher_name, period, subject_id, class_id, kktp = 75, school_name, school_address, headmaster_name, headmaster_nip }: FinalReportProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPdf = () => {
        setDownloading(true);
        const url = route('rapor.download', { subject_id, class_id });
        window.open(url, '_blank');
        setTimeout(() => setDownloading(false), 2000);
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Penilaian', href: '/gradebook' },
            { title: 'Laporan Akhir Mapel', href: '#' },
        ]}>
            <Head title={`Laporan Akhir ${subject_name} – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 print:p-0">
                {/* Actions (Hidden on Print) */}
                <div className="flex items-center justify-between print:hidden">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <div className="flex items-center gap-3">
                        {subject_id && class_id && (
                            <button 
                                onClick={handleDownloadPdf}
                                disabled={downloading}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition disabled:opacity-50 cursor-pointer"
                            >
                                <Download className="h-4 w-4" />
                                {downloading ? 'Mengunduh...' : 'Unduh PDF Rapor'}
                            </button>
                        )}
                        <button 
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/10 transition dark:border-primary/30 dark:bg-primary/5 dark:text-primary cursor-pointer"
                        >
                            <Printer className="h-4 w-4" />
                            Cetak Laporan
                        </button>
                    </div>
                </div>

                {/* Report Document Style */}
                <div className="mx-auto w-full max-w-5xl rounded-3xl border border-border bg-card p-12 shadow-2xl print:shadow-none print:border-none print:p-0">
                    
                    {/* Document Header */}
                    <div className="mb-12 border-b-4 border-double border-border pb-8 text-center">
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
                    <div className="overflow-hidden rounded-xl border border-border">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/60 dark:bg-muted/20 text-foreground font-bold uppercase tracking-wider border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">No</th>
                                    <th className="px-6 py-4 w-32">NIS</th>
                                    <th className="px-6 py-4 w-64">Nama Siswa</th>
                                    <th className="px-6 py-4 w-24 text-center">Nilai Akhir</th>
                                    <th className="px-6 py-4">Deskripsi Capaian Kompetensi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {reportData.map((row, index) => (
                                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 text-center text-foreground/70 dark:text-slate-400 font-medium">{index + 1}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-foreground/85 dark:text-slate-300">{row.nis}</td>
                                        <td className="px-6 py-4 font-bold text-foreground">{row.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block w-10 py-1 rounded-lg font-black ${row.final_score >= kktp ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
                                                {row.final_score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs leading-relaxed text-foreground/90 font-medium italic dark:text-slate-200">
                                                "{row.description}"
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Document Footer / Signatures (Only for print) */}
                    <div className="mt-16 hidden print:grid grid-cols-2 gap-20">
                        <div className="text-center">
                            <p className="text-sm font-medium">Mengetahui,</p>
                            <p className="text-sm font-bold mt-1">Kepala Sekolah</p>
                            <div className="mt-20 h-px w-48 mx-auto bg-muted-foreground"></div>
                            <p className="text-xs font-bold mt-1">{headmaster_name || '(...................................................)'}</p>
                            {headmaster_nip && <p className="text-[10px] text-muted-foreground mt-1">NIP. {headmaster_nip}</p>}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">{school_name ? `${school_name}, ` : ''}{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="text-sm font-bold mt-1">Guru Mata Pelajaran</p>
                            <div className="mt-20 h-px w-48 mx-auto bg-muted-foreground"></div>
                            <p className="text-xs font-bold mt-1">{teacher_name}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
