import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, Printer, Settings, Eye, CheckCircle2, AlertCircle, ArrowRight, Save, Loader2, Download, ExternalLink, Globe, FileText, Star, Target, Calendar, User } from 'lucide-react';
\n
interface Assignment {
    id: number;
    title: string;
    description: string;
    assessment_type: 'initial' | 'formative' | 'summative';
    instrument_type: string;
    rubric_content: any;
    score_intervals: any;
    questions: any;
}

interface ModulAjarProps {
    modulAjar: {
        id: number;
        subject_id: number;
        school_class_id: number;
        learning_objective_id: number;
        material_id: number;
        subject_name: string;
        class_name: string;
        tp_code: string;
        tp_desc: string;
        material_title: string;
        pedagogical_model: string;
        general_info: string; // JSON
        learning_resources: string;
        material_resources: any[];
        material_external_link: string;
        material_file_path: string;
        understanding_activity: string;
        application_activity: string;
        reflection_activity: string;
        image_prompt: string;
        teacher_name: string;
        teacher_nip: string;
        school_name: string;
        headmaster_name: string;
        headmaster_nip: string;
        created_at: string;
        subject_kktp: number;
    };
    assignments: Assignment[];
}

export default function Show({ modulAjar, assignments }: ModulAjarProps) {
    const material = {
        title: modulAjar.material_title,
        content: '',
        tp_desc: modulAjar.tp_desc,
        tp_code: modulAjar.tp_code,
        teacher_name: modulAjar.teacher_name,
        teacher_nip: modulAjar.teacher_nip,
        understanding_activity: modulAjar.understanding_activity,
        application_activity: modulAjar.application_activity,
        reflection_activity: modulAjar.reflection_activity,
        image_prompt: modulAjar.image_prompt,
        resources: modulAjar.material_resources,
        external_link: modulAjar.material_external_link,
        file_path: modulAjar.material_file_path,
        subject_kktp: modulAjar.subject_kktp,
    };
    
    // Parse saved customization
    let savedConfig: any = {};
    try {
        savedConfig = JSON.parse(modulAjar.general_info || '{}');
    } catch(e) {}
 
    material, 
    comments, 
    my_reflection, 
    all_reflections, 
    is_completed, 
    user_role, 
    auth_id,
    assignments = [],
    school_name,
    headmaster_name = 'Marlinda, S.Pd',
    headmaster_nip = '19791116 200604 2 016',
    readiness_status = null
}: ShowMaterialProps) {
    const { delete: destroy } = useForm();
    
    
    
    // Auto-detect if this is the Informatika structured data example to load the exact content from the user request
    const isStructuredDataMaterial = 
        material.title.toLowerCase().includes('data') || 
        material.title.toLowerCase().includes('himpunan') || 
        material.subject_name.toLowerCase().includes('informatika');

    const hasSummativeAssignments = assignments && assignments.some(a => a.assessment_type === 'summative');

    // RPP Customization States
    const [rppSchoolName, setRppSchoolName] = useState(school_name || 'SMA Negeri 1 Mokopani');
    const [rppAlokasiWaktu, setRppAlokasiWaktu] = useState(
        isStructuredDataMaterial 
            ? '6 JP x 40 menit (2 pertemuan)' 
            : '2 JP x 40 menit'
    );
    
    const [rppProfilLulusan, setRppProfilLulusan] = useState({
        penalaranKritis: true,
        kreativitas: isStructuredDataMaterial,
        kolaborasi: true,
        kemandirian: true,
        komunikasi: isStructuredDataMaterial,
        kebinekaanGlobal: false,
        berimanTakwa: false
    });
    
    const [rppKemitraan, setRppKemitraan] = useState(
        isStructuredDataMaterial
            ? 'Kolaborasi antar guru mata pelajaran untuk integrasi konsep, serta melibatkan orang tua dalam mengawasi progres tugas mandiri siswa.'
            : 'Kolaborasi antarguru sejenis dan pendampingan pengerjaan tugas mandiri/kelompok oleh orang tua di rumah.'
    );
    
    const [rppDigital, setRppDigital] = useState(
        isStructuredDataMaterial
            ? 'Aplikasi pengolah data (Spreadsheet) dan aplikasi desain infografis digital (Canva / Piktochart).'
            : 'Aplikasi pengolah kata, presentasi digital, dan peramban web untuk riset informasi.'
    );
    
    const [understandingActivity, setUnderstandingActivity] = useState(
        stripHtml(material.understanding_activity) || 'Murid disajikan gambar berupa data acak, lalu pendidik memantik diskusi dengan pertanyaan guna memicu rasa ingin tahu.'
    );
    const [applicationActivity, setApplicationActivity] = useState(
        stripHtml(material.application_activity) || 'Murid berkolaborasi untuk menyusun data acak tersebut menjadi tabel terstruktur, lalu menyajikannya ke dalam bentuk infografis digital.'
    );
    const [reflectionActivity, setReflectionActivity] = useState(
        stripHtml(material.reflection_activity) || 'Murid mempresentasikan hasilnya melalui kegiatan gallery walk dan saling memberikan umpan balik (evaluasi teman sejawat).'
    );
    
    // LKPD Customization States
    const [lkpdTitle, setLkpdTitle] = useState(
        isStructuredDataMaterial
            ? 'Menyusun Data Acak Menjadi Informasi Bermakna'
            : `Lembar Kerja Peserta Didik (LKPD) - Eksplorasi ${material.title}`
    );
    
    const [lkpdStimulus, setLkpdStimulus] = useState(
        isStructuredDataMaterial
            ? 'Merah, Samsung, Poco, Biru, Oppo, Putih, Vivo, Android, Silver, iOS, Hitam, iPhone'
            : `Konteks/Masalah: Berbagai data dan informasi kontekstual yang relevan dengan pokok bahasan ${material.title}`
    );
    
    const [lkpdPemantik, setLkpdPemantik] = useState(
        isStructuredDataMaterial
            ? '1. Apakah sekumpulan kata di atas sudah memiliki arti yang jelas?\n2. Bagaimana caranya agar kumpulan kata tersebut menjadi informasi yang mudah dipahami?'
            : `1. Mengapa konsep ${material.title} ini penting dalam kehidupan nyata?\n2. Hambatan apa yang paling sering muncul saat mempelajari tema ini?`
    );
    
    const [lkpdLangkah, setLkpdLangkah] = useState(
        isStructuredDataMaterial
            ? '1. Amati sekumpulan kata acak di atas secara berkelompok.\n2. Diskusikan cara menyusun data tersebut agar memiliki makna.\n3. Buatlah tabel terstruktur menggunakan aplikasi spreadsheet (Excel/Google Sheets).\n4. Pindahkan tabel tersebut ke dalam infografis Canva agar menarik.\n5. Cetak/tampilkan hasil karya kelompok untuk dipresentasikan dalam gallery walk.'
            : getDynamicLkpdLangkah(material)
    );
    
    // Penandatangan
    const [kepalaSekolahName, setKepalaSekolahName] = useState(headmaster_name);
    const [kepalaSekolahNip, setKepalaSekolahNip] = useState(headmaster_nip);

    // RTL Remedial & Pengayaan (KKTP Synchronized)
    const kktpValue = material.subject_kktp ?? 70;
    const [rppRemedial, setRppRemedial] = useState(
        `Pembimbingan ulang konsep terstruktur secara personal/kelompok bagi murid yang belum mencapai Kriteria Ketercapaian Tujuan Pembelajaran (KKTP < ${kktpValue}).`
    );
    const [rppPengayaan, setRppPengayaan] = useState(
        `Pemberian tantangan analisis tingkat tinggi (studi kasus mendalam/tugas mandiri kreatif) bagi murid yang telah melampaui Kriteria Ketercapaian Tujuan Pembelajaran (KKTP >= ${kktpValue}).`
    );

    // Auto Phase & Curriculum detector
    const getDetectedFase = (className: string | null): string => {
        if (!className) return 'D';
        const cleanName = className.trim().toLowerCase();
        if (cleanName.includes('vii') || cleanName.includes('viii') || cleanName.includes('ix') || 
            /\b(7|8|9)\b/.test(cleanName)) {
            return 'D';
        }
        if ((cleanName.includes('x') && !cleanName.includes('xi') && !cleanName.includes('xii')) || 
            /\b10\b/.test(cleanName)) {
            return 'E';
        }
        if (cleanName.includes('xi') || cleanName.includes('xii') || 
            /\b(11|12)\b/.test(cleanName)) {
            return 'F';
        }
        if (cleanName.includes('iii') || cleanName.includes('iv') || /\b(3|4)\b/.test(cleanName)) {
            return 'B';
        }
        if (cleanName.includes('v') || cleanName.includes('vi') || /\b(5|6)\b/.test(cleanName)) {
            return 'C';
        }
        if (cleanName.includes('i') || cleanName.includes('ii') || /\b(1|2)\b/.test(cleanName)) {
            return 'A';
        }
        return 'D'; // SMP standard fallback
    };
    
    const handleDelete = () => {
        destroy(route('materials.destroy', material.id));
    };

    const getLinkIcon = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return <Youtube className="h-5 w-5" />;
        if (url.includes('drive.google.com')) return <FolderOpen className="h-5 w-5" />;
        return <Globe className="h-5 w-5" />;
    };

    const getLinkColor = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'text-[#EB5757] bg-[#EB5757]/10 dark:bg-[#EB5757]/10';
        if (url.includes('drive.google.com')) return 'text-[#5E6AD2] bg-[#5E6AD2]/10 dark:bg-[#5E6AD2]/10';
        return 'text-[#3DD68C] bg-[#3DD68C]/10 dark:bg-[#3DD68C]/10';
    };

    
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSaveConfig = () => {
        setIsSaving(true);
        const config = {
            rppSchoolName, rppAlokasiWaktu, rppProfilLulusan,
            rppKemitraan, rppDigital, rppRemedial, rppPengayaan,
            kepalaSekolahName, kepalaSekolahNip,
            understandingActivity, applicationActivity, reflectionActivity,
            lkpdTitle, lkpdStimulus, lkpdPemantik, lkpdLangkah
        };
        
        router.put(route('lesson-plans.update', modulAjar.id), {
            subject_id: modulAjar.subject_id,
            school_class_id: modulAjar.school_class_id,
            learning_objective_id: modulAjar.learning_objective_id,
            material_id: modulAjar.material_id,
            pedagogical_model: modulAjar.pedagogical_model,
            general_info: JSON.stringify(config),
            learning_design: null,
            learning_steps: null,
            assessment_plan: null,
            kktp_details: null,
            lkpd: null,
            learning_resources: null
        }, {
            onFinish: () => setIsSaving(false)
        });
    };
\nreturn (
            <AppLayout breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Materi', href: '/materials' },
                { title: material.title, href: route('materials.show', material.id) },
                { title: 'Cetak RPP', href: '#' },
            ]}>
                <Head title={`Cetak RPP: ${material.title} – LMS Mokopani`} />
                <style>{`
                    /* Format tabel formal dinas (Berlaku untuk Layar & Cetak) */
                    #rpp-print-area * {
                        box-sizing: border-box !important;
                    }
                    .print-table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                        table-layout: fixed !important;
                        margin-bottom: 1.5rem !important;
                        color: #000000 !important;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid #000000 !important;
                        padding: 8px 12px !important;
                        text-align: left !important;
                        color: #000000 !important;
                        font-size: 10.5pt !important;
                        line-height: 1.5 !important;
                        word-break: normal !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                    }
                    .print-table td * {
                        word-break: normal !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                    }
                    .print-table th {
                        background-color: #f2f2f2 !important;
                        font-weight: bold !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print-title {
                        font-size: 14pt !important;
                        font-weight: bold !important;
                        text-align: center !important;
                        margin-bottom: 2px !important;
                        text-transform: uppercase !important;
                        color: #000000 !important;
                    }
                    .print-subtitle {
                        font-size: 11pt !important;
                        text-align: center !important;
                        margin-bottom: 15px !important;
                        font-weight: bold !important;
                        color: #555555 !important;
                    }
                    .print-hr {
                        border: 0 !important;
                        border-top: 3px double #000000 !important;
                        margin-top: 10px !important;
                        margin-bottom: 20px !important;
                        opacity: 1 !important;
                    }

                    @media print {
                        /* Sembunyikan seluruh layout bawaan web */
                        body * {
                            visibility: hidden !important;
                        }
                        /* Tampilkan area RPP secara penuh */
                        #rpp-print-area, #rpp-print-area * {
                            visibility: visible !important;
                        }
                        #rpp-print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            background: white !important;
                            color: black !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .print-avoid-break {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                        .print-page-break {
                            page-break-before: always !important;
                            break-before: page !important;
                        }
                    }
                `}</style>
                
                <div className="flex h-full flex-1 flex-col gap-6 p-6">
                    {/* Header Controls (no-print) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-[#2C2C3A]/10 dark:border-[#2C2C3A] pb-6">
                        <div>
                            <button 
                                onClick={() => router.get('/lesson-plans')}
                                className="flex items-center gap-2 text-sm font-medium text-[#8A8F98] hover:text-[#5E6AD2] transition"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Kembali ke Daftar Modul Ajar
                            </button>
                            <h1 className="text-2xl font-black text-[#1B1B25] dark:text-[#F1F1F4] mt-2">Pratinjau RPP Pembelajaran Mendalam</h1>
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3DD68C] to-[#2cb374] px-6 py-3.5 text-sm font-black text-white transition hover:shadow-lg active:scale-95 shadow-md shadow-[#3DD68C]/20 shrink-0 self-start sm:self-center"
                        >
                            <Printer className="h-4.5 w-4.5" /> Cetak RPP / Simpan PDF
                        </button>
                    </div>

                    {/* Split Screen Layout on Web, Full screen on Print */}
                    <div className="grid gap-6 lg:grid-cols-12 items-start">
                        {/* Left Side: Customization panel (no-print) */}
                        <div className="lg:col-span-4 space-y-6 no-print">
                            <div className="rounded-3xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] p-6 shadow-sm space-y-5">
                                <div>
                                    <h3 className="text-sm font-black text-[#1B1B25] dark:text-[#F1F1F4] uppercase tracking-wider">Identifikasi Dokumen</h3>
                                    <p className="text-[10px] text-[#8A8F98] font-bold uppercase tracking-widest mt-1">Sesuaikan informasi instansi & guru</p>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Nama Sekolah</label>
                                        <input 
                                            type="text" 
                                            value={rppSchoolName} 
                                            onChange={(e) => setRppSchoolName(e.target.value)}
                                            className="w-full h-10 rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-sm font-medium px-4 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Alokasi Waktu</label>
                                        <input 
                                            type="text" 
                                            value={rppAlokasiWaktu} 
                                            onChange={(e) => setRppAlokasiWaktu(e.target.value)}
                                            className="w-full h-10 rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-sm font-medium px-4 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Dimensi Profil Lulusan</label>
                                        <div className="grid grid-cols-1 gap-2 bg-[#F1F1F4]/5 dark:bg-[#2C2C3A]/10 p-3 rounded-2xl border border-[#2C2C3A]/10 dark:border-[#2C2C3A]">
                                            {Object.keys(rppProfilLulusan).map((key) => {
                                                const labelMap: any = {
                                                    penalaranKritis: 'Penalaran Kritis',
                                                    kreativitas: 'Kreativitas',
                                                    kolaborasi: 'Kolaborasi',
                                                    kemandirian: 'Kemandirian',
                                                    komunikasi: 'Komunikasi',
                                                    kebinekaanGlobal: 'Kebinekaan Global',
                                                    berimanTakwa: 'Beriman & Bertakwa'
                                                };
                                                return (
                                                    <label key={key} className="flex items-center gap-2 text-xs font-semibold text-[#8A8F98] cursor-pointer hover:text-[#1B1B25] dark:hover:text-[#F1F1F4]">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={(rppProfilLulusan as any)[key]} 
                                                            onChange={(e) => setRppProfilLulusan({
                                                                ...rppProfilLulusan,
                                                                [key]: e.target.checked
                                                            })}
                                                            className="rounded border-[#2C2C3A]/30 text-[#5E6AD2] focus:ring-[#5E6AD2]"
                                                        />
                                                        {labelMap[key]}
                                                    </label>
                                                );\n}