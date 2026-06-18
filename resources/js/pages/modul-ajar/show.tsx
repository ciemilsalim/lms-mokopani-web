import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, Printer, AlertCircle, Edit, Download, ExternalLink, Globe, FileText, Target, CheckCircle2 } from 'lucide-react';

const stripHtml = (html: string) => {
    if (typeof window !== 'undefined') {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html || '';
        return tmp.textContent || tmp.innerText || '';
    }
    return html?.replace(/<[^>]*>?/gm, '') || '';
};

const HtmlContent = ({ html }: { html: string }) => {
    if (!html || html === '-' || html.trim() === '') return <span>-</span>;
    const cleanHtml = html.replace(/&nbsp;/g, ' ');
    return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 overflow-x-auto" />;
};

const InstrumentRenderer = ({ config, type }: { config: any, type: string }) => {
    if (!config) return null;
    let parsedConfig = config;
    if (typeof config === 'string') {
        try { parsedConfig = JSON.parse(config); } catch (e) {}
    }
    
    return (
        <div className="mt-2 space-y-3">
            {/* Tampilkan Instruksi, Deskripsi, atau Stimulus jika ada */}
            {(parsedConfig.instructions || parsedConfig.description || parsedConfig.stimulus) && (
                <div className="text-xs bg-blue-50 border border-blue-200 p-2 rounded text-blue-900">
                    {parsedConfig.instructions && <div dangerouslySetInnerHTML={{__html: parsedConfig.instructions}} className="mb-1" />}
                    {parsedConfig.description && <div dangerouslySetInnerHTML={{__html: parsedConfig.description}} className="mb-1 italic" />}
                    {parsedConfig.stimulus && <div dangerouslySetInnerHTML={{__html: parsedConfig.stimulus}} className="font-semibold" />}
                </div>
            )}

            {/* Rubrik */}
            {(parsedConfig.aspects || parsedConfig.rubrics) && (
                <div className="text-xs overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-1 text-left w-1/4">Aspek / Kriteria</th>
                                {parsedConfig.levels?.map((lvl: any, i: number) => (
                                    <th key={i} className="border border-gray-300 p-1 text-center">{lvl.name} ({lvl.score || '-'})</th>
                                ))}
                                {(!parsedConfig.levels && (parsedConfig.aspects || parsedConfig.rubrics)[0]?.criteria) && 
                                    (parsedConfig.aspects || parsedConfig.rubrics)[0].criteria.map((_: any, i: number) => (
                                        <th key={i} className="border border-gray-300 p-1 text-center">Level {i+1}</th>
                                    ))
                                }
                            </tr>
                        </thead>
                        <tbody>
                            {(parsedConfig.aspects || parsedConfig.rubrics).map((asp: any, i: number) => (
                                <tr key={i}>
                                    <td className="border border-gray-300 p-1 font-semibold">{asp.name || asp.criteria_name || asp.title}</td>
                                    {asp.criteria?.map((crit: any, j: number) => (
                                        <td key={j} className="border border-gray-300 p-1 align-top">{crit.description || crit}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Indikator (seperti Checklist Observasi) */}
            {parsedConfig.indicators && parsedConfig.indicators.length > 0 && (
                <div className="text-xs">
                    <p className="font-semibold mb-1 border-b border-gray-300 inline-block">Indikator yang Dinilai:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        {parsedConfig.indicators.map((ind: any, i: number) => (
                            <li key={i}>{ind.name || ind.description || ind}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* Soal / Pertanyaan */}
            {parsedConfig.questions && parsedConfig.questions.length > 0 && (
                <div className="text-xs bg-white p-2 border border-gray-200">
                    <p className="font-semibold mb-2 border-b border-gray-200 pb-1">Daftar Pertanyaan / Soal:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                        {parsedConfig.questions.map((q: any, i: number) => (
                            <li key={i} className="mb-2">
                                <div dangerouslySetInnerHTML={{__html: q.text}} className="inline" />
                                {q.options && q.options.length > 0 && (
                                    <ul className="list-[lower-alpha] pl-4 mt-1 space-y-0.5">
                                        {q.options.map((opt: any, j: number) => (
                                            <li key={j} className={q.answer === opt.id ? "font-bold text-green-700" : ""}>{opt.text}</li>
                                        ))}
                                    </ul>
                                )}
                                {q.answer_guide && <p className="text-gray-600 italic mt-0.5 border-l-2 border-gray-300 pl-2">Panduan Jawaban: {q.answer_guide}</p>}
                                {q.correct_answer && <p className="text-green-700 italic mt-0.5 border-l-2 border-green-300 pl-2">Kunci Jawaban: {q.correct_answer}</p>}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
};

const getKktpDescription = (asm: any) => {
    let config = asm.instrument_config;
    if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch (e) {}
    }
    const kktp = config?.kktp;
    
    if (kktp) {
        if (kktp.approach === 'criteria_description') {
            const total = config.rubrics?.length || config.questions?.length || 0;
            const totalText = total > 0 ? ` dari ${total} indikator yang dinilai` : '';
            return `Pendekatan Deskripsi Kriteria: Ketuntasan didasarkan pada jumlah indikator yang tercapai. Minimal mencapai ${kktp.min_criteria || 3}${totalText}.`;
        }
        if (kktp.approach === 'rubric') {
            return `Pendekatan Rubrik: Peserta didik dianggap tuntas jika secara kualitatif minimal mencapai tingkat pencapaian "${kktp.passing_level || 'Baik'}" pada rubrik penilaian.`;
        }
        if (kktp.approach === 'score_interval') {
            const intervals = kktp.intervals || [];
            const passingInterval = intervals.find((i: any) => i.status && i.status.toLowerCase().includes('tuntas') && !i.status.toLowerCase().includes('belum'));
            const minScore = passingInterval ? passingInterval.min : 75;
            return `Pendekatan Interval Nilai: Peserta didik dinyatakan tuntas jika memperoleh skor masuk dalam interval ketuntasan (minimal skor ${minScore}).`;
        }
        if (kktp.approach === 'percentage') {
            return `Pendekatan Persentase: Peserta didik dinyatakan tuntas jika persentase ketercapaian mencapai minimal ${kktp.threshold || 75}%.`;
        }
        
        // Fallback for older data
        if (kktp.approach === 'checklist' || kktp.approach === 'observation' || asm.instrument_type === 'observation_checklist' || asm.instrument_type === 'checklist') {
            return `Peserta didik dianggap tuntas jika memenuhi minimal ${kktp.min_criteria || 3} kriteria/indikator dari total indikator yang dinilai.`;
        }
        if (kktp.approach === 'interval' || kktp.approach === 'score' || asm.instrument_type === 'multiple_choice' || asm.instrument_type === 'written_test') {
            return `Peserta didik dinyatakan tuntas jika memperoleh nilai/skor minimal ${kktp.threshold || 75}.`;
        }
    }
    
    // Fallback based on instrument_type if no kktp object found
    if (asm.instrument_type === 'observation_checklist' || asm.instrument_type === 'checklist' || asm.instrument_type === 'anecdotal_record') {
        return `Untuk asesmen observasi, peserta didik dianggap tuntas jika memenuhi sebagian besar kriteria/indikator yang dinilai.`;
    }
    if (asm.instrument_type === 'rubric' || asm.instrument_type === 'essay' || asm.instrument_type === 'project' || asm.instrument_type === 'portfolio' || asm.instrument_type === 'oral_test') {
        return `Peserta didik dianggap tuntas jika kriteria penilaian mencapai level yang diharapkan sesuai rubrik/panduan penilaian.`;
    }
    if (asm.instrument_type === 'multiple_choice' || asm.instrument_type === 'quiz_survey' || asm.instrument_type === 'written_test' || asm.instrument_type === 'formative_quiz') {
        return `Tuntas jika memperoleh persentase skor/nilai minimal mengacu pada standar ketuntasan (KKM/Interval).`;
    }
    
    return `Tuntas jika memenuhi kriteria minimal yang ditetapkan untuk instrumen ini.`;
}

const getFaseFromClass = (className: string) => {
    if (!className) return '-';
    const name = className.toUpperCase();
    if (name.match(/\b(?:XI|XII|11|12)\b/)) return 'F';
    if (name.match(/\b(?:X|10)\b/)) return 'E';
    if (name.match(/\b(?:VII|VIII|IX|7|8|9)\b/)) return 'D';
    if (name.match(/\b(?:V|VI|5|6)\b/)) return 'C';
    if (name.match(/\b(?:III|IV|3|4)\b/)) return 'B';
    if (name.match(/\b(?:I|II|1|2)\b/)) return 'A';
    return '-';
};

export default function Show({ modulAjar, assignments }: any) {
    const [isPrinting, setIsPrinting] = useState(false);
    const [printMode, setPrintMode] = useState<'all'|'lkpd'>('all');

    // Parse configuration from general_info JSON
    let parsedData: any = {};
    try {
        if (modulAjar.general_info && modulAjar.general_info.trim().startsWith('{')) {
            parsedData = JSON.parse(modulAjar.general_info);
        }
    } catch (e) {
        console.error("Failed to parse general_info JSON");
    }

    const alokasiWaktu = parsedData.alokasi_waktu || '-';
    const jumlahPertemuan = parsedData.jumlah_pertemuan || '-';
    const dimensiProfil = parsedData.dimensi_profil || '-';
    const lingkunganPembelajaran = parsedData.lingkungan_pembelajaran || '-';
    const kemitraanPembelajaran = parsedData.kemitraan_pembelajaran || '-';
    const pemanfaatanDigital = parsedData.pemanfaatan_digital || '-';
    const mediaIlustrasi = parsedData.media_ilustrasi || '-';
    const understandingActivity = parsedData.understanding || modulAjar.understanding_activity || '-';
    const applicationActivity = parsedData.application || modulAjar.application_activity || '-';
    const reflectionActivity = parsedData.reflection || modulAjar.reflection_activity || '-';
    const lkpdContent = parsedData.lkpd || modulAjar.lkpd || '-';

    const schoolName = modulAjar.school_name || 'SMA Negeri 1 Mokopani';
    const headmasterName = modulAjar.headmaster_name || 'Nama Kepala Sekolah';
    const headmasterNip = modulAjar.headmaster_nip || '-';

    const initialAssignments = assignments.filter((a: any) => a.assessment_type === 'initial');
    const processAssignments = assignments.filter((a: any) => a.assessment_type === 'formative' || a.assessment_type === 'summative');

    const handlePrint = (mode: 'all' | 'lkpd' = 'all') => {
        setPrintMode(mode);
        setIsPrinting(true);
        setTimeout(() => {
            const originalTitle = document.title;
            if (mode === 'lkpd') document.title = `LKPD - ${modulAjar.material_title}`;
            window.print();
            document.title = originalTitle;
            setIsPrinting(false);
            setPrintMode('all');
        }, 300);
    };

    const handleExportWord = () => {
        const contentElement = document.getElementById('print-area-content');
        if (!contentElement) return;
        
        const content = contentElement.innerHTML;
        const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Modul Ajar</title>
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 12pt; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                table, th, td { border: 1px solid black; }
                th, td { padding: 8px; text-align: left; vertical-align: top; }
                h1 { text-align: center; font-size: 16pt; font-weight: bold; }
                h2 { text-align: center; font-size: 14pt; font-weight: bold; }
                h3 { text-align: left; font-size: 12pt; font-weight: bold; border-bottom: 2px solid black; padding-bottom: 4px; margin-top: 15px; text-transform: uppercase; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .font-semibold { font-weight: 600; }
                .text-lg { font-size: 14pt; }
                .text-xl { font-size: 16pt; }
                .text-sm { font-size: 10pt; }
                .text-xs { font-size: 8pt; }
                .uppercase { text-transform: uppercase; }
                .italic { font-style: italic; }
                .underline { text-decoration: underline; }
                .bg-gray-50 { background-color: #f9fafb !important; }
                .bg-gray-200 { background-color: #e5e7eb !important; }
                .w-full { width: 100%; }
                .w-1\\/2 { width: 50%; }
                .w-1\\/3 { width: 33.33%; }
                .w-1\\/4 { width: 25%; }
                .p-2 { padding: 8px; }
                .p-4 { padding: 16px; }
                .p-8 { padding: 32px; }
                .pt-8 { padding-top: 32px; }
                .pb-1 { padding-bottom: 4px; }
                .pl-5 { padding-left: 20px; }
                .mb-1 { margin-bottom: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mb-3 { margin-bottom: 12px; }
                .mb-4 { margin-bottom: 16px; }
                .mt-2 { margin-top: 8px; }
                .mt-12 { margin-top: 48px; }
                .border-b { border-bottom: 1px solid black; }
                .border-b-2 { border-bottom: 2px solid black; }
                .align-top { vertical-align: top; }
                .hide-in-lkpd-print { display: block; }
                .hide-in-word { display: none !important; }
                .print-hidden { display: none !important; }
                ul, ol { margin-top: 4px; margin-bottom: 4px; }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
        `;
        
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Modul_Ajar_${modulAjar.subject_name.replace(/[^a-z0-9]/gi, '_')}_${modulAjar.class_name.replace(/[^a-z0-9]/gi, '_')}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Pembelajaran', href: '/lesson-plans' },
            { title: `Modul Ajar #${modulAjar.id}`, href: `/lesson-plans/${modulAjar.id}` }
        ]}>
            <Head title={`Modul Ajar ${modulAjar.subject_name} – LMS Mokopani`}>
                <style>{`
                    @media print {
                        body, html, #app {
                            height: auto !important;
                            overflow: visible !important;
                            background-color: white !important;
                        }
                        .layout-page, main, .flex-1, .h-full, .max-w-5xl, .flex-col {
                            height: auto !important;
                            overflow: visible !important;
                            display: block !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        header, aside, nav, footer, .print\\:hidden {
                            display: none !important;
                        }
                        #print-area-content {
                            box-shadow: none !important;
                            border: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                        }
                        .print-avoid-break {
                            page-break-inside: avoid;
                        }
                        .print-footer {
                            display: block !important;
                            position: fixed !important;
                            bottom: 0 !important;
                            width: 100% !important;
                            z-index: 9999 !important;
                        }
                        @page {
                            margin-bottom: 20mm;
                        }
                    }
                `}</style>
            </Head>

            <div className="flex flex-col gap-6 p-6 h-full flex-1 max-w-5xl mx-auto w-full">
                {/* Action Bar (Not printed) */}
                <div className="flex items-center justify-between print:hidden">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
                    >
                        <ChevronLeft className="h-4 w-4" /> Kembali
                    </button>
                    <div className="flex flex-wrap gap-3 justify-end">
                        <button
                            onClick={handleExportWord}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-blue-700 transition"
                        >
                            <Download className="h-4 w-4" /> Ekspor Docs (Word)
                        </button>
                        <button
                            onClick={() => router.get(route('lesson-plans.edit', modulAjar.id))}
                            className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold hover:bg-secondary/80 transition"
                        >
                            <Edit className="h-4 w-4" /> Edit Modul Ajar
                        </button>
                        <button
                            onClick={() => handlePrint('all')}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow hover:bg-primary/90 transition"
                        >
                            <Printer className="h-4 w-4" /> Cetak / PDF
                        </button>
                    </div>
                </div>

                {/* Print Area Container */}
                <div id="print-area-content" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} className={`bg-white rounded-xl shadow-sm border border-border overflow-hidden print:overflow-visible print:border-none print:shadow-none ${printMode === 'lkpd' ? 'print-lkpd-mode' : ''} relative`}>
                    
                    {/* Header Document */}
                    <div className="p-8 border-b border-border bg-muted/10 print:bg-white print:border-b-2 print:border-black text-center space-y-2 hide-in-lkpd-print">
                        <h1 className="text-xl font-bold uppercase tracking-wider text-black">MODUL AJAR / RPP DEEP LEARNING</h1>
                        <h2 className="text-lg font-bold text-black">{modulAjar.subject_name} - {modulAjar.class_name}</h2>
                        <p className="text-sm text-gray-600">{modulAjar.material_title}</p>
                    </div>

                    <div className="p-8 space-y-10 bg-white text-black print:p-0 print:py-6">
                        
                        {/* I. Identifikasi Umum */}
                        <section>
                            <h3 className="font-bold text-lg mb-3 uppercase border-b-2 border-black pb-1">I. IDENTIFIKASI & INFORMASI UMUM</h3>
                            <table className="w-full border-collapse border border-black text-sm">
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-2 font-bold w-1/3 bg-gray-50">Nama Sekolah</td>
                                        <td className="border border-black p-2">{schoolName}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Mata Pelajaran</td>
                                        <td className="border border-black p-2">{modulAjar.subject_name}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Kurikulum</td>
                                        <td className="border border-black p-2">Kurikulum Nasional</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Kelas / Fase</td>
                                        <td className="border border-black p-2">{modulAjar.class_name} / Fase {getFaseFromClass(modulAjar.class_name)}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Tahun Ajaran</td>
                                        <td className="border border-black p-2">{modulAjar.academic_year_name} ({modulAjar.semester_name})</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Alokasi Waktu</td>
                                        <td className="border border-black p-2">{alokasiWaktu}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Jumlah Pertemuan</td>
                                        <td className="border border-black p-2">{jumlahPertemuan}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Nama Guru</td>
                                        <td className="border border-black p-2">{modulAjar.teacher_name}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Dimensi Profil Lulusan</td>
                                        <td className="border border-black p-2">{dimensiProfil}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        {/* II. Desain Pembelajaran */}
                        <section>
                            <h3 className="font-bold text-lg mb-3 uppercase border-b-2 border-black pb-1">II. DESAIN PEMBELAJARAN</h3>
                            <table className="w-full border-collapse border border-black text-sm">
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-2 font-bold w-1/3 bg-gray-50">Tujuan Pembelajaran (TP)</td>
                                        <td className="border border-black p-2"><strong className="mr-2">{modulAjar.tp_code}</strong> {modulAjar.tp_desc}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Praktik Pedagogis (Model)</td>
                                        <td className="border border-black p-2">{modulAjar.pedagogical_model}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Lingkungan Pembelajaran</td>
                                        <td className="border border-black p-2">{lingkunganPembelajaran}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Kemitraan Pembelajaran</td>
                                        <td className="border border-black p-2">{kemitraanPembelajaran}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Pemanfaatan Digital</td>
                                        <td className="border border-black p-2">{pemanfaatanDigital}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold bg-gray-50">Media & Ilustrasi</td>
                                        <td className="border border-black p-2">{mediaIlustrasi}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        {/* III. Langkah-langkah Pembelajaran */}
                        <section className="print-avoid-break">
                            <h3 style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }} className="font-bold text-lg mb-3 uppercase border-b-2 border-black pb-1">III. LANGKAH-LANGKAH PEMBELAJARAN (DEEP LEARNING)</h3>
                            <table className="w-full border-collapse border border-black text-sm">
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-4 font-bold w-1/4 bg-gray-50 align-top">1. Memahami<br/>(Understanding)</td>
                                        <td className="border border-black p-4 align-top">
                                            <HtmlContent html={understandingActivity} />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-4 font-bold bg-gray-50 align-top">2. Mengaplikasikan<br/>(Application)</td>
                                        <td className="border border-black p-4 align-top">
                                            <HtmlContent html={applicationActivity} />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-4 font-bold bg-gray-50 align-top">3. Merefleksikan<br/>(Reflection)</td>
                                        <td className="border border-black p-4 align-top">
                                            <HtmlContent html={reflectionActivity} />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        {/* IV. Asesmen Awal */}
                        <section className="print-avoid-break">
                            <h3 className="font-bold text-lg mb-3 uppercase border-b-2 border-black pb-1">IV. PENILAIAN/ASESMEN AWAL (DIAGNOSTIK)</h3>
                            {initialAssignments.length > 0 ? (
                                <ul className="list-disc pl-5 text-sm space-y-2">
                                    {initialAssignments.map((asm: any) => (
                                        <li key={asm.id}>
                                            <strong>{asm.title}</strong> - {asm.description || 'Asesmen awal untuk mengukur kesiapan murid.'}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm italic text-gray-500">Tidak ada asesmen awal yang didefinisikan secara eksplisit.</p>
                            )}
                        </section>

                        {/* V. Asesmen Formatif / Sumatif */}
                        <section className="print-avoid-break">
                            <h3 className="font-bold text-lg mb-3 uppercase border-b-2 border-black pb-1">V. PENILAIAN/ASESMEN FORMATIF & SUMATIF</h3>
                            {processAssignments.length > 0 ? (
                                <ul className="list-disc pl-5 text-sm space-y-2">
                                    {processAssignments.map((asm: any) => (
                                        <li key={asm.id}>
                                            <strong>{asm.title}</strong> <span className="uppercase text-xs font-semibold px-1 py-0.5 bg-gray-200 ml-1 rounded">({asm.assessment_type})</span><br/>
                                            {asm.description || `Instrumen untuk mengukur ketercapaian secara ${asm.assessment_type === 'formative' ? 'proses' : 'akhir'}.`}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm italic text-gray-500">Tidak ada asesmen formatif/sumatif yang didefinisikan secara eksplisit.</p>
                            )}
                        </section>

                        {/* VI. KKTP */}
                        <section className="print-avoid-break">
                            <h3 className="font-bold text-lg mb-3 uppercase border-b-2 border-black pb-1">VI. KRITERIA KETUNTASAN TUJUAN PEMBELAJARAN (KKTP)</h3>
                            <div className="text-sm border border-black p-4 rounded bg-gray-50 hide-in-lkpd-print">
                                <div className="mb-4">
                                    <p className="mb-2">Pendekatan Kriteria Ketuntasan Tujuan Pembelajaran (KKTP) yang digunakan disesuaikan dengan jenis asesmen:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {processAssignments.length > 0 ? processAssignments.map((asm: any) => {
                                            const formattedType = asm.instrument_type?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Instrumen';
                                            const assessmentType = asm.assessment_type === 'formative' ? 'Formatif' : asm.assessment_type === 'summative' ? 'Sumatif' : asm.assessment_type;
                                            return (
                                                <li key={asm.id}>
                                                    <strong>{asm.title} - {assessmentType} ({formattedType}):</strong> {getKktpDescription(asm)}
                                                </li>
                                            );
                                        }) : (
                                            <li>Pendekatan KKTP mengacu pada standar sekolah dengan kriteria ketuntasan (KKM): <strong className="text-lg">{modulAjar.subject_kktp || 70}</strong>.</li>
                                        )}
                                    </ul>
                                </div>
                                
                                {processAssignments.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-black">
                                        <h4 className="font-bold mb-2">Instrumen Asesmen KKTP:</h4>
                                        {processAssignments.map((asm: any) => (
                                            <div key={asm.id} className="mb-4 bg-white p-3 border border-gray-300 rounded shadow-sm">
                                                <p className="font-semibold text-base mb-2 border-b pb-1 border-gray-100">{asm.title} <span className="uppercase text-xs px-1 py-0.5 bg-gray-200 rounded font-bold ml-1">({asm.instrument_type})</span></p>
                                                <InstrumentRenderer config={asm.instrument_config} type={asm.instrument_type} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-black">
                                    <div>
                                        <p className="font-bold border-b border-black pb-1 mb-1 text-red-700">Tindak Lanjut Remedial</p>
                                        <p className="text-sm">Bagi peserta didik yang belum mencapai KKTP, diberikan pendampingan personal dan tugas tambahan terkait pemahaman konsep dasar.</p>
                                    </div>
                                    <div>
                                        <p className="font-bold border-b border-black pb-1 mb-1 text-green-700">Tindak Lanjut Pengayaan</p>
                                        <p className="text-sm">Bagi peserta didik yang telah mencapai/melampaui KKTP, diberikan tantangan analisis studi kasus atau perannya sebagai tutor sebaya.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* VII. LKPD */}
                        <section className="print-avoid-break lkpd-section">
                            <h3 className="font-bold text-lg mb-3 uppercase border-b-2 border-black pb-1">VII. LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>
                            
                            <table className="w-full border-collapse mb-4 bg-gray-50 print:bg-white print:border-none print:mb-6" style={{ border: '1px solid black' }}>
                                <tbody>
                                    <tr>
                                        <td className="w-1/2 p-4 align-top" style={{ border: 'none' }}>
                                            <div className="border border-black p-4 rounded print:border-2">
                                                <p className="font-bold border-b border-black inline-block mb-2">Kelompok: ..............................................................</p>
                                                <p className="font-semibold text-sm mb-1">Nama Anggota:</p>
                                                <ol className="list-decimal pl-5 space-y-1 text-sm font-semibold">
                                                    <li>........................................................................</li>
                                                    <li>........................................................................</li>
                                                    <li>........................................................................</li>
                                                    <li>........................................................................</li>
                                                    <li>........................................................................</li>
                                                </ol>
                                            </div>
                                        </td>
                                        <td className="w-1/2 p-4 align-bottom text-right print:hidden hide-in-word" style={{ border: 'none' }}>
                                            <button 
                                                onClick={() => handlePrint('lkpd')}
                                                className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow hover:bg-indigo-700 transition font-bold"
                                            >
                                                <Printer className="h-5 w-5" />
                                                Cetak Khusus LKPD
                                            </button>
                                            <p className="text-xs text-gray-500 mt-2 text-right">Tombol ini hanya akan mencetak bagian LKPD saja untuk dibagikan ke siswa.</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <div className="border border-black p-6 bg-white min-h-[300px]">
                                <HtmlContent html={lkpdContent} />
                            </div>
                        </section>

                        {/* VIII. Sumber Belajar */}
                        <section className="print-avoid-break">
                            <h3 className="font-bold text-lg mb-3 uppercase border-b-2 border-black pb-1">VIII. SUMBER BELAJAR</h3>
                            {modulAjar.material_resources && modulAjar.material_resources.length > 0 ? (
                                <ul className="list-decimal pl-5 text-sm space-y-2">
                                    {modulAjar.material_resources.map((res: any) => (
                                        <li key={res.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{res.title || 'Sumber Belajar'}</span>
                                                {res.type === 'link' && <a href={res.path} target="_blank" className="text-blue-600 underline print:no-underline">[{res.path}]</a>}
                                                {res.type === 'youtube' && <span className="text-red-600 font-semibold">[YouTube]</span>}
                                                {res.type === 'file' && <span className="text-green-600 font-semibold">[Berkas Terlampir]</span>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm">1. Buku Siswa / Buku Teks Pelajaran yang relevan.<br/>2. Modul ajar yang disediakan oleh guru melalui LMS.</p>
                            )}
                        </section>

                        {/* Tanda Tangan */}
                        <section className="mt-12 pt-8 print-avoid-break hide-in-lkpd-print">
                            <table className="w-full border-0 text-sm" style={{ border: 'none' }}>
                                <tbody>
                                    <tr>
                                        <td className="w-1/2 text-center align-top" style={{ border: 'none' }}>
                                            <p>Mengetahui,</p>
                                            <p className="font-bold">Kepala {schoolName}</p>
                                            <br/><br/><br/><br/>
                                            <p className="font-bold underline">{headmasterName}</p>
                                            <p>NIP. {headmasterNip}</p>
                                        </td>
                                        <td className="w-1/2 text-center align-top" style={{ border: 'none' }}>
                                            <p>Buol, {new Date(modulAjar.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            <p className="font-bold">Guru Mata Pelajaran</p>
                                            <br/><br/><br/><br/>
                                            <p className="font-bold underline">{modulAjar.teacher_name}</p>
                                            <p>NIP. {modulAjar.teacher_nip || '-'}</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                    </div>
                    
                    {/* Print Footer */}
                    <div className="hidden print:block print-footer fixed bottom-0 left-0 w-full text-center text-[10px] text-black/50 pb-1 bg-white z-[9999]" style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 9999 }}>
                        <div className="border-t border-gray-300 pt-1">
                            Modul Ajar/RPP di cetak melalui LMS-Mokopani
                        </div>
                    </div>
                </div>
                
                <style dangerouslySetInnerHTML={{__html: `
                    table {
                        width: 100% !important;
                        table-layout: fixed !important;
                    }
                    td, th {
                        word-wrap: break-word;
                        overflow-wrap: anywhere;
                        word-break: normal;
                    }
                    .prose img {
                        max-width: 100% !important;
                        height: auto !important;
                    }
                    @media print {
                        body { background: white; }
                        .print-lkpd-mode section:not(.lkpd-section) { display: none !important; }
                        .print-lkpd-mode .hide-in-lkpd-print { display: none !important; }
                        .print\\:hidden { display: none !important; }
                        .print-avoid-break { page-break-inside: avoid; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        .prose { max-width: 100% !important; }
                    }
                `}} />
            </div>
        </AppLayout>
    );
}