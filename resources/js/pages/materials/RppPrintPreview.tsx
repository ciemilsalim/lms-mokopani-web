import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { ChevronLeft, Printer } from 'lucide-react';

interface Material {
    id: number;
    title: string;
    content: string | null;
    thumbnail: string | null;
    file_path: string | null;
    file_type: string | null;
    external_link: string | null;
    subject_name: string;
    teacher_name: string;
    teacher_id: number;
    teacher_nip: string | null;
    school_class_name: string | null;
    fase: string | null;
    semester_name: string | null;
    academic_year_name: string | null;
    pedagogical_model: string | null;
    learning_environment: string | null;
    understanding_activity: string | null;
    application_activity: string | null;
    reflection_activity: string | null;
    image_prompt: string | null;
    lkpd: string | null;
    tp_code: string | null;
    tp_desc: string | null;
    resources: Array<{
        id: number;
        type: 'file' | 'link';
        title: string | null;
        path: string;
        file_type: string | null;
    }>;
    created_at: string;
}

interface Assignment {
    id: number;
    assessment_type: 'initial' | 'formative' | 'summative';
    instrument_type: string;
    instrument_config: any;
    title: string;
    description: string | null;
    due_date: string | null;
    max_points: number;
    passing_grade: number | null;
}

interface RppPrintPreviewProps {
    material: Material;
    assignments: Assignment[];
    school_name: string;
    onClose: () => void;
}

const stripHtml = (html: string | null): string => {
    if (!html) return '';
    
    // Convert paragraph and break tags into newlines to preserve formatting
    let text = html
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n');
        
    // Strip remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Decode common HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&lsquo;/g, "'")
        .replace(/&rsquo;/g, "'");
        
    // Clean up excessive newlines
    return text.replace(/\n{3,}/g, '\n\n').trim();
};
const parseLkpdLangkah = (text: string) => {
    if (!text) return [];
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            // Check if it's a blockquote / sub-description
            if (line.startsWith('>')) {
                return {
                    type: 'sub',
                    content: line.replace(/^>\s*/, '')
                };
            }
            // Check if line starts with a number followed by dot
            const match = line.match(/^(\d+)\.\s*(.*)/);
            if (match) {
                return {
                    type: 'step',
                    num: match[1],
                    content: match[2]
                };
            }
            return {
                type: 'bullet',
                content: line
            };
        });
};

const getDynamicLkpdLangkah = (material: Material): string => {
    const appText = stripHtml(material.application_activity);
    const refText = stripHtml(material.reflection_activity);
    
    return `1. Diskusikan konsep utama bersama anggota kelompok Anda untuk menyamakan percepsi.\n` +
           `2. **Langkah Aplikasi (Mengaplikasi):** Sesuai skenario rencana pelaksanaan pembelajaran (Mengaplikasi), lakukan aktivitas berikut secara kolaboratif:\n   > ${appText || 'Terapkan konsep pembelajaran untuk memecahkan studi kasus/pertanyaan pemantik di atas.'}\n` +
           `3. Susunlah hasil pengerjaan/laporan kelompok secara rapi, sistematis, dan diskusikan solusi bersama.\n` +
           `4. **Langkah Refleksi (Merefleksi):** Lakukan aktivitas refleksi, presentasi hasil, dan umpan balik kelompok berikut:\n   > ${refText || 'Siapkan materi untuk presentasi di kelas dan berikan tanggapan konstruktif pada kelompok lain.'}\n` +
           `5. Tarik kesimpulan bersama mengenai pembelajaran hari ini, lakukan evaluasi diri/peer-assessment, dan kumpulkan hasil karya kelompok kepada guru.`;
};

const ASSESSMENT_TYPE_MAP: Record<string, string> = {
    initial: 'Awal (Diagnostik)',
    formative: 'Formatif (Proses)',
    summative: 'Sumatif (Akhir)'
};

const INSTRUMENT_MAP: Record<string, string> = {
    written_test: 'Tes Tertulis',
    quiz_survey: 'Kuis Singkat / Survei',
    formative_quiz: 'Tes/Penugasan Singkat',
    observation_checklist: 'Lembar Observasi & Ceklis (Ceklis)',
    performance: 'Kinerja (Praktik/Projek/Produk)',
    project: 'Penilaian Proyek',
    exit_ticket: 'Exit Ticket',
    reflective_journal: 'Jurnal Reflektif',
    anecdotal_notes: 'Catatan Anekdotal',
    rubric: 'Rubrik Penilaian',
    oral_qa: 'Tanya Jawab Lisan',
    self_assessment: 'Penilaian Diri',
    peer_assessment: 'Penilaian Antarteman',
    guided_discussion: 'Diskusi Terpandu',
    structured_assignment: 'Penugasan Terstruktur (LKPD)',
    concept_map: 'Peta Konsep',
    performance_observation: 'Lembar Observasi',
    oral_test: 'Tes Lisan',
    portfolio: 'Penilaian Portofolio',
    assignment: 'Penugasan (Laporan/Studi Kasus)'
};

const renderAssessmentDetails = (assignments: Assignment[]) => {
    if (!assignments || assignments.length === 0) {
        return (
            <p className="text-xs italic text-gray-500">Tidak ada detail instrumen asesmen yang dikonfigurasi secara kustom.</p>
        );
    }

    return (
        <div className="space-y-6">
            {assignments.map((asm, asmIdx) => {
                const config = asm.instrument_config || {};
                const kktp = config.kktp || {};
                const questions = config.questions || [];
                const indicators = config.indicators || [];
                const levels = config.levels || [];

                return (
                    <div key={asm.id} className="border border-black p-4 rounded-md space-y-4 print-avoid-break bg-gray-50/10" style={{ color: '#000000', borderColor: '#000000' }}>
                        {/* Title & Type block */}
                        <div className="flex justify-between items-start border-b border-black pb-2" style={{ borderColor: '#000000' }}>
                            <div>
                                <h5 className="text-[10pt] font-bold text-black uppercase tracking-wide">
                                    {asmIdx + 1}. {asm.title || 'Asesmen Tanpa Judul'}
                                </h5>
                                <p className="text-[8.5pt] font-bold text-gray-700 uppercase mt-0.5">
                                    Jenis: Asesmen {ASSESSMENT_TYPE_MAP[asm.assessment_type] || asm.assessment_type} | Instrumen: {INSTRUMENT_MAP[asm.instrument_type] || asm.instrument_type}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-[8.5pt] font-bold border border-black px-2 py-0.5 rounded bg-white">
                                    Maks: {asm.max_points || 100} Poin
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        {asm.description && (
                            <p className="text-[9.5pt] text-gray-800 italic leading-relaxed">
                                <strong>Petunjuk Guru/Tugas:</strong> {asm.description}
                            </p>
                        )}

                        {/* 1. Stimulus / Focus / Context if present */}
                        {config.stimulus && (
                            <div className="text-[9.5pt] text-gray-800 space-y-1">
                                <strong className="font-bold text-black">Bahan Stimulus / Konteks Kasus:</strong>
                                <p className="p-2.5 bg-white border border-gray-300 rounded whitespace-pre-wrap leading-relaxed">{config.stimulus}</p>
                            </div>
                        )}

                        {/* 2. Instrument Questions / Indicators / Focus */}
                        {/* Quiz & Written Test Questions */}
                        {(asm.instrument_type === 'quiz_survey' || asm.instrument_type === 'written_test' || asm.instrument_type === 'formative_quiz') && questions.length > 0 && (
                            <div className="space-y-3">
                                <strong className="text-[9.5pt] font-bold text-black block">Daftar Pertanyaan & Kunci Jawaban:</strong>
                                <div className="space-y-3 pl-2">
                                    {questions.map((q: any, qIdx: number) => (
                                        <div key={qIdx} className="text-[9.5pt] space-y-1">
                                            <p className="font-bold text-black">{qIdx + 1}. {q.text}</p>
                                            
                                            {/* Render options for multiple choice */}
                                            {(q.type === 'multiple_choice' || !q.type) && q.options && q.options.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2 pl-4 mt-1">
                                                    {q.options.map((opt: any) => {
                                                        const isCorrect = q.answer === opt.id;
                                                        return (
                                                            <div key={opt.id} className={`flex items-center gap-1.5 p-1 rounded border ${isCorrect ? 'border-emerald-500 bg-emerald-50/30' : 'border-transparent'}`}>
                                                                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold uppercase shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                                    {opt.id}
                                                                </span>
                                                                <span className={`text-[9pt] ${isCorrect ? 'font-bold text-emerald-800' : 'text-gray-700'}`}>
                                                                    {opt.text || `(Opsi ${opt.id.toUpperCase()})`}
                                                                </span>
                                                                {isCorrect && <span className="text-[8px] font-black text-emerald-600 uppercase ml-1">(Kunci)</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Render short answer key */}
                                            {q.type === 'short_answer' && (
                                                <p className="pl-4 text-[9pt] text-gray-700 italic">
                                                    Kunci Jawaban Singkat: <strong className="font-bold text-emerald-700">{q.answer || q.correct_answer || '-'}</strong>
                                                </p>
                                            )}

                                            {/* Render essay info */}
                                            {q.type === 'essay' && (
                                                <div className="pl-4 text-[9pt] text-gray-700 space-y-1">
                                                    <p className="italic">Jenis Soal: <strong className="font-bold text-gray-800">Uraian / Esai</strong> | Bobot Nilai: <strong className="font-bold text-gray-800">{q.points || 0} Poin</strong></p>
                                                    {(q.answer || q.correct_answer) && (
                                                        <p className="italic">Pedoman Penskoran / Kunci Jawaban: <span className="font-semibold text-emerald-700">{q.answer || q.correct_answer}</span></p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Observation Checklist & Performance Indicators */}
                        {(asm.instrument_type === 'observation_checklist' || asm.instrument_type === 'performance_observation' || asm.instrument_type === 'performance' || asm.instrument_type === 'self_assessment' || asm.instrument_type === 'peer_assessment' || asm.instrument_type === 'guided_discussion' || asm.instrument_type === 'structured_assignment' || asm.instrument_type === 'assignment' || asm.instrument_type === 'concept_map') && indicators.length > 0 && (
                            <div className="space-y-2">
                                <strong className="text-[9.5pt] font-bold text-black block font-sans">Indikator Yang Diamati:</strong>
                                <table className="w-full border-collapse" style={{ borderCollapse: 'collapse', width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th className="w-12 text-center" style={{ border: '1px solid black', padding: '6px', backgroundColor: '#f2f2f2', fontSize: '9pt', fontWeight: 'bold' }}>No</th>
                                            <th className="" style={{ border: '1px solid black', padding: '6px', backgroundColor: '#f2f2f2', fontSize: '9pt', fontWeight: 'bold' }}>Indikator Perilaku / Kemampuan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {indicators.map((ind: any, indIdx: number) => (
                                            <tr key={indIdx}>
                                                <td className="text-center font-mono text-[9pt]" style={{ border: '1px solid black', padding: '6px' }}>{indIdx + 1}</td>
                                                <td className="text-[9pt] text-gray-800" style={{ border: '1px solid black', padding: '6px' }}>{ind.name || ind.text || 'Indikator Baru'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Exit Ticket / Reflective Journal / Oral QA questions */}
                        {(asm.instrument_type === 'exit_ticket' || asm.instrument_type === 'reflective_journal' || asm.instrument_type === 'oral_test' || asm.instrument_type === 'oral_qa') && questions.length > 0 && (
                            <div className="space-y-2">
                                <strong className="text-[9.5pt] font-bold text-black block">Pertanyaan Refleksi / Tanya Jawab Siswa:</strong>
                                <ul className="list-decimal pl-5 text-[9pt] text-gray-800 space-y-1">
                                    {questions.map((q: any, qIdx: number) => (
                                        <li key={qIdx} className="leading-relaxed">
                                            <strong>{q.text}</strong>
                                            {q.answer_guide && (
                                                <span className="block text-[8.5pt] text-gray-600 italic mt-0.5">Panduan Jawaban: {q.answer_guide}</span>
                                            )}
                                            {q.correct_answer && (
                                                <span className="block text-[8.5pt] text-gray-600 italic mt-0.5">Panduan Jawaban: {q.correct_answer}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Anecdotal notes */}
                        {asm.instrument_type === 'anecdotal_notes' && (
                            <div className="grid grid-cols-2 gap-4 text-[9pt]">
                                <div className="p-2.5 border border-gray-300 rounded bg-white">
                                    <strong className="text-black text-[9.5pt] block">Fokus Pengamatan:</strong>
                                    <p className="mt-1 text-gray-700 italic">{config.focus || 'Interaksi sosial & kemampuan motorik'}</p>
                                </div>
                                <div className="p-2.5 border border-gray-300 rounded bg-white">
                                    <strong className="text-black text-[9.5pt] block">Konteks Kegiatan:</strong>
                                    <p className="mt-1 text-gray-700 italic">{config.context || 'Bermain peran & diskusi kelompok'}</p>
                                </div>
                            </div>
                        )}

                        {/* 3. KKTP Criteria Block */}
                        <div className="pt-3 border-t border-dashed border-gray-300" style={{ borderTop: '1px dashed #cccccc' }}>
                            <strong className="text-[9.5pt] font-bold text-black block mb-2">Kriteria Ketercapaian Tujuan Pembelajaran (KKTP):</strong>
                            
                            {/* Criteria Description */}
                            {kktp.approach === 'criteria_description' && (
                                <div className="text-[9pt] text-gray-800 bg-emerald-50/20 p-2.5 rounded border border-emerald-500/30">
                                    <p className="font-bold text-emerald-950">Pendekatan: Deskripsi Kriteria</p>
                                    <p className="mt-1 text-gray-700 leading-relaxed">
                                        Murid dianggap mencapai tujuan pembelajaran apabila memenuhi kriteria minimal sebanyak <strong className="font-bold text-emerald-700">{kktp.min_criteria || 2} kriteria</strong> dari total kriteria penilaian yang ditetapkan.
                                    </p>
                                </div>
                            )}

                            {/* Rubric */}
                            {kktp.approach === 'rubric' && (
                                <div className="text-[9pt] text-gray-800 bg-amber-50/20 p-2.5 rounded border border-amber-500/30 space-y-2">
                                    <p className="font-bold text-amber-950">Pendekatan: Rubrik Kriteria</p>
                                    <p className="text-gray-700 leading-relaxed">
                                        Ketuntasan diukur berdasarkan level capaian kriteria. Batas Tuntas Minimum ditetapkan pada kriteria level: <strong className="font-bold border border-amber-500 px-2 py-0.5 rounded bg-white text-amber-800 uppercase text-[8pt]">{kktp.passing_level || 'Baik'}</strong>.
                                    </p>
                                    {levels && levels.length > 0 && (
                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                            {levels.map((lvl: any) => {
                                                const isActive = kktp.passing_level === lvl.name;
                                                return (
                                                    <div key={lvl.name} className={`p-2 rounded border text-center ${isActive ? 'bg-amber-50/50 border-amber-500 shadow-sm' : 'bg-white border-gray-200'}`} style={{ border: '1px solid', borderColor: isActive ? '#f59e0b' : '#e5e7eb' }}>
                                                        <span className="font-bold block text-[7.5pt] text-gray-900">{lvl.name}</span>
                                                        <span className="text-[7pt] text-gray-500 block leading-tight mt-1 line-clamp-2" title={lvl.desc}>{lvl.desc || `Deskripsi level ${lvl.name.toLowerCase()}`}</span>
                                                        {isActive && <span className="text-[6.5pt] font-black text-amber-700 uppercase mt-1 block">✓ Batas Tuntas</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Score Interval */}
                            {kktp.approach === 'score_interval' && (
                                <div className="text-[9pt] text-gray-800 bg-sky-50/20 p-2.5 rounded border border-sky-500/30 space-y-2">
                                    <p className="font-bold text-sky-950">Pendekatan: Interval Nilai</p>
                                    <p className="text-gray-700">Tingkat ketuntasan murid dikategorikan ke dalam rentang nilai persentase berikut:</p>
                                    <div className="grid grid-cols-4 gap-2 text-center mt-1">
                                        {(kktp.intervals || [
                                            { min: 0, max: 40, label: 'Belum Mencapai', desc: 'Perlu remedial seluruhnya' },
                                            { min: 41, max: 60, label: 'Hampir Mencapai', desc: 'Perlu remedial di bagian tertentu' },
                                            { min: 61, max: 80, label: 'Sudah Mencapai', desc: 'Tuntas' },
                                            { min: 81, max: 100, label: 'Sudah Mencapai', desc: 'Perlu pengayaan' }
                                        ]).map((iv: any, ivIdx: number) => {
                                            const isPassing = iv.min >= 61;
                                            return (
                                                <div key={ivIdx} className={`p-2 rounded border ${isPassing ? 'border-sky-300 bg-sky-50/20' : 'border-gray-200 bg-white'}`} style={{ border: '1px solid', borderColor: isPassing ? '#7dd3fc' : '#e5e7eb' }}>
                                                    <span className="font-bold text-sky-900 block text-[8pt]">{iv.min}% - {iv.max}%</span>
                                                    <span className="text-[7.5pt] text-gray-800 font-bold block mt-0.5">{iv.label}</span>
                                                    <span className="text-[7pt] text-gray-500 block leading-tight mt-0.5">{iv.desc}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Percentage */}
                            {kktp.approach === 'percentage' && (
                                <div className="text-[9pt] text-gray-800 bg-purple-50/20 p-2.5 rounded border border-purple-500/30">
                                    <p className="font-bold text-purple-950">Pendekatan: Persentase Ketuntasan</p>
                                    <p className="mt-1 text-gray-700 leading-relaxed">
                                        Ketuntasan dihitung langsung menggunakan persentase nilai tes/tugas. Batas Kriteria Ketuntasan Minimum (KKM) ditetapkan sebesar <strong className="font-bold text-purple-700">{kktp.threshold || 75}%</strong>.
                                    </p>
                                </div>
                            )}

                            {/* Default fallback if approach is not specified */}
                            {!kktp.approach && (
                                <p className="text-[9pt] text-gray-600 italic">Menggunakan Kriteria Ketuntasan Tujuan Pembelajaran (KKTP) umum sekolah (KKM: {asm.passing_grade || 70}).</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default function RppPrintPreview({ material, assignments = [], school_name, onClose }: RppPrintPreviewProps) {
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
    const [kepalaSekolahName, setKepalaSekolahName] = useState('Dr. H. Ahmad Yani, M.Pd.');
    const [kepalaSekolahNip, setKepalaSekolahNip] = useState('19720815 199803 1 002');

    const exportToWord = () => {
        const printArea = document.getElementById('rpp-print-area');
        if (!printArea) return;

        const clone = printArea.cloneNode(true) as HTMLElement;
        
        const style = `
            <style>
                table { border-collapse: collapse; width: 100%; margin-bottom: 15px; font-family: sans-serif; }
                th, td { border: 1px solid black; padding: 8px 12px; text-align: left; vertical-align: top; }
                th { background-color: #f2f2f2; font-weight: bold; }
                h2 { text-align: center; font-size: 16pt; margin-bottom: 5px; font-family: sans-serif; }
                h3 { text-align: center; font-size: 12pt; margin-bottom: 15px; font-family: sans-serif; color: #555555; }
                h4 { font-size: 12pt; font-weight: bold; border-bottom: 1px solid black; margin-top: 15px; margin-bottom: 10px; font-family: sans-serif; }
                .font-bold { font-weight: bold; }
                .italic { font-style: italic; }
                .text-center { text-align: center; }
                body { font-family: sans-serif; }
            </style>
        `;

        const content = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>RPP Modul Ajar</title>
                ${style}
            </head>
            <body>
                ${clone.outerHTML}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RPP_${material?.title || 'Modul_Ajar'}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-6">
            <Head title={`Cetak RPP: ${material.title} – LMS Mokopani`} />
            <style>{`
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
                    /* Format tabel formal dinas */
                    .print-table {
                        border-collapse: collapse !important;
                        width: 100% !important;
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
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
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
            
            {/* Header Controls (no-print) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-[#2C2C3A]/10 dark:border-[#2C2C3A] pb-6">
                <div>
                    <button 
                        onClick={onClose}
                        className="flex items-center gap-2 text-sm font-medium text-[#8A8F98] hover:text-[#5E6AD2] transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali ke Detail Materi
                    </button>
                    <h1 className="text-2xl font-black text-[#1B1B25] dark:text-[#F1F1F4] mt-2">Pratinjau RPP Pembelajaran Mendalam</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 shadow-sm shrink-0"
                    >
                        <Printer className="h-4.5 w-4.5" /> Ekspor PDF
                    </button>
                    <button
                        onClick={exportToWord}
                        className="flex items-center gap-2 rounded-xl bg-[#3DD68C] px-5 py-2.5 text-sm font-bold text-white transition hover:shadow-lg active:scale-95 shadow-md shadow-[#3DD68C]/20 shrink-0"
                    >
                        <FileText className="h-4.5 w-4.5" /> Ekspor Docs
                    </button>
                </div>
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
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Kemitraan Pembelajaran</label>
                                <textarea 
                                    value={rppKemitraan} 
                                    onChange={(e) => setRppKemitraan(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-sm font-medium p-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none resize-none leading-relaxed"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Pemanfaatan Digital</label>
                                <textarea 
                                    value={rppDigital} 
                                    onChange={(e) => setRppDigital(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-sm font-medium p-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none resize-none leading-relaxed"
                                />
                            </div>

                            <div className="space-y-1.5 pt-3 border-t border-[#2C2C3A]/10 dark:border-[#2C2C3A]">
                                <h4 className="text-xs font-black text-[#1B1B25] dark:text-[#F1F1F4] uppercase mb-2">Penandatangan Dokumen</h4>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-[#8A8F98] uppercase tracking-wider">Nama Kepala Sekolah</label>
                                        <input 
                                            type="text" 
                                            value={kepalaSekolahName} 
                                            onChange={(e) => setKepalaSekolahName(e.target.value)}
                                            className="w-full h-8 rounded-lg border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-xs px-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-[#8A8F98] uppercase tracking-wider">NIP Kepala Sekolah</label>
                                        <input 
                                            type="text" 
                                            value={kepalaSekolahNip} 
                                            onChange={(e) => setKepalaSekolahNip(e.target.value)}
                                            className="w-full h-8 rounded-lg border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-xs px-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kustomisasi Skenario Langkah RPP */}
                    <div className="rounded-3xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-[#1B1B25] dark:text-[#F1F1F4] uppercase tracking-wider">Kustomisasi Skenario RPP</h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Aktivitas Memahami (Understanding)</label>
                                <textarea 
                                    value={understandingActivity} 
                                    onChange={(e) => setUnderstandingActivity(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-xs p-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none resize-none leading-relaxed font-medium"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Aktivitas Mengaplikasi (Applying)</label>
                                <textarea 
                                    value={applicationActivity} 
                                    onChange={(e) => setApplicationActivity(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-xs p-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none resize-none leading-relaxed font-medium"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Aktivitas Merefleksi (Reflecting)</label>
                                <textarea 
                                    value={reflectionActivity} 
                                    onChange={(e) => setReflectionActivity(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-xs p-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none resize-none leading-relaxed font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* LKPD Kustomisasi */}
                    <div className="rounded-3xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-[#1B1B25] dark:text-[#F1F1F4] uppercase tracking-wider">Kustomisasi LKPD</h3>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Judul LKPD</label>
                                <input 
                                    type="text" 
                                    value={lkpdTitle} 
                                    onChange={(e) => setLkpdTitle(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-sm font-medium px-4 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Bahan / Data Stimulus</label>
                                <textarea 
                                    value={lkpdStimulus} 
                                    onChange={(e) => setLkpdStimulus(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-sm font-medium p-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none resize-none leading-relaxed"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Pertanyaan Pemantik</label>
                                <textarea 
                                    value={lkpdPemantik} 
                                    onChange={(e) => setLkpdPemantik(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-xs p-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none resize-none leading-relaxed"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-wider">Langkah Kerja LKPD</label>
                                <textarea 
                                    value={lkpdLangkah} 
                                    onChange={(e) => setLkpdLangkah(e.target.value)}
                                    rows={5}
                                    className="w-full rounded-xl border border-[#2C2C3A]/20 dark:border-[#2C2C3A] bg-[#F1F1F4]/10 dark:bg-[#2C2C3A]/30 text-xs p-3 text-[#1B1B25] dark:text-[#F1F1F4] focus:border-[#5E6AD2] outline-none resize-none leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: RPP Whitepaper Document */}
                <div className="lg:col-span-8 flex flex-col items-center">
                    <div 
                        id="rpp-print-area"
                        className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-200 rounded-[2rem] print:rounded-none print:shadow-none print:border-none leading-relaxed font-sans"
                        style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                    >
                        {/* Kop / Title */}
                        <div className="text-center">
                            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black print-title">
                                RENCANA PELAKSANAAN PEMBELAJARAN (RPP)
                            </h2>
                            <h3 className="text-sm sm:text-md font-bold text-gray-700 tracking-wide mt-1 uppercase print-subtitle">
                                PENDEKATAN PEMBELAJARAN MENDALAM (DEEP LEARNING)
                            </h3>
                            <hr className="print-hr border-t-2 border-black double mt-4 mb-6" />
                        </div>

                        {/* 1. Identifikasi / Informasi Umum */}
                        <div className="space-y-4 print-avoid-break mb-8">
                            <h4 className="text-md font-bold uppercase border-b border-black pb-1 mb-3 text-black">
                                I. IDENTIFIKASI & INFORMASI UMUM
                            </h4>
                            
                            <table className="print-table w-full border-collapse">
                                <tbody>
                                    <tr>
                                        <td className="w-1/3 font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Nama Sekolah</td>
                                        <td className="w-2/3" style={{ border: '1px solid black', padding: '8px 12px' }}>{rppSchoolName}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Mata Pelajaran</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>{material.subject_name}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Kelas / Fase</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>Kelas {material.school_class_name || '-'} / Fase {material.fase || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Semester / Tahun Ajaran</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>Semester {material.semester_name || '-'} / {material.academic_year_name || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Alokasi Waktu</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>{rppAlokasiWaktu}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Guru Mata Pelajaran</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>{material.teacher_name} {material.teacher_nip ? `(NIP: ${material.teacher_nip})` : ''}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Dimensi Profil Lulusan</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                {Object.entries(rppProfilLulusan)
                                                    .filter(([_, checked]) => checked)
                                                    .map(([key, _]) => {
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
                                                            <span key={key} className="inline-flex items-center gap-1 before:content-['✓'] before:text-black before:font-bold">
                                                                {labelMap[key]}
                                                            </span>
                                                        );
                                                    })}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 2. Desain Pembelajaran */}
                        <div className="space-y-4 print-avoid-break mb-8">
                            <h4 className="text-md font-bold uppercase border-b border-black pb-1 mb-3 text-black">
                                II. DESAIN PEMBELAJARAN
                            </h4>
                            
                            <table className="print-table w-full border-collapse">
                                <tbody>
                                    <tr>
                                        <td className="w-1/3 font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Tujuan Pembelajaran (TP)</td>
                                        <td className="w-2/3" style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            {material.tp_code ? <strong className="font-bold">[{material.tp_code}] </strong> : ''}
                                            {material.tp_desc || 'Siswa memahami konsep ajar.'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Praktik Pedagogis (Model)</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            {material.pedagogical_model === 'PBL' ? 'Problem-Based Learning (PBL)' : 
                                             material.pedagogical_model === 'PjBL' ? 'Project-Based Learning (PjBL)' : 
                                             material.pedagogical_model === 'Inquiry' ? 'Inquiry Learning' : 
                                             material.pedagogical_model === 'Discovery' ? 'Discovery Learning' : 
                                             material.pedagogical_model || 'Direct Instruction (Tatap Muka)'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Lingkungan Pembelajaran</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>{material.learning_environment || 'Ruang kelas yang diatur fleksibel untuk mendukung kolaborasi dan diskusi kelompok.'}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Kemitraan Pembelajaran</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>{rppKemitraan}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Pemanfaatan Digital</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>{rppDigital}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Media & Ilustrasi Ajar (AI)</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            {material.thumbnail ? (
                                                <div className="my-2 max-w-sm rounded border border-black p-1 bg-white">
                                                    <img src={material.thumbnail} alt={material.title} className="w-full h-auto object-cover max-h-48" />
                                                </div>
                                            ) : material.image_prompt ? (
                                                <div className="my-2 max-w-md rounded border border-gray-400 p-3 bg-gray-50 text-[9.5pt]">
                                                    <div className="flex items-center gap-1 text-violet-700 font-bold mb-1">
                                                        <span className="text-[8pt] uppercase tracking-wider font-mono">✦ PROMPT VISUAL AI:</span>
                                                    </div>
                                                    <p className="italic text-gray-800 leading-relaxed font-serif">"{material.image_prompt}"</p>
                                                    <div className="mt-2.5 h-32 w-full rounded border border-dashed border-gray-400 bg-white flex flex-col items-center justify-center text-center p-2">
                                                        <span className="text-[7.5pt] font-mono tracking-wider text-gray-500 uppercase">✦ REPRESENTASI VISUAL / BAHAN AJAR ✦</span>
                                                        <span className="text-[6.5pt] text-gray-400 mt-1 max-w-xs leading-normal">Gambar grafis konsep ajar dicetak terlampir atau dirender dinamis pada media digital</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 italic">Tidak dikonfigurasi</span>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 3. Langkah-Langkah Pembelajaran */}
                        <div className="space-y-4 mb-8 print-avoid-break">
                            <h4 className="text-md font-bold uppercase border-b border-black pb-1 mb-3 text-black">
                                III. LANGKAH-LANGKAH PEMBELAJARAN (PENGALAMAN BELAJAR)
                            </h4>
                            <p className="text-xs italic text-gray-700 mb-2">
                                *Dilaksanakan dengan menerapkan prinsip Berkesadaran (Mindful), Bermakna (Meaningful), dan Menggembirakan (Joyful)
                            </p>
                            
                            <table className="print-table w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="w-1/4" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Tahapan Aktivitas</th>
                                        <th className="w-3/4" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Langkah Skenario Pengalaman Belajar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            MEMAHAMI <br/>
                                            <span className="text-[9pt] font-normal italic text-gray-600">(Understanding)</span>
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            <div 
                                                className="leading-relaxed text-black font-normal text-left"
                                                style={{ whiteSpace: 'pre-wrap' }}
                                            >
                                                {understandingActivity}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            MENGAPLIKASI <br/>
                                            <span className="text-[9pt] font-normal italic text-gray-600">(Applying)</span>
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            <div 
                                                className="leading-relaxed text-black font-normal text-left"
                                                style={{ whiteSpace: 'pre-wrap' }}
                                            >
                                                {applicationActivity}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            MEREFLEKSI <br/>
                                            <span className="text-[9pt] font-normal italic text-gray-600">(Reflecting)</span>
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            <div 
                                                className="leading-relaxed text-black font-normal text-left"
                                                style={{ whiteSpace: 'pre-wrap' }}
                                            >
                                                {reflectionActivity}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 4. Asesmen dan Tindak Lanjut */}
                        <div className="space-y-4 print-avoid-break mb-8">
                            <h4 className="text-md font-bold uppercase border-b border-black pb-1 mb-3 text-black">
                                IV. ASESMEN DAN RENCANA TINDAK LANJUT
                            </h4>
                            
                            <table className="print-table w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="w-1/4" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Jenis Asesmen</th>
                                        <th className="w-2/4" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Metode & Instrumen</th>
                                        <th className="w-1/4" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Waktu Pelaksanaan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Initial */}
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Asesmen Awal (Diagnostik)</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            {assignments.filter(a => a.assessment_type === 'initial').map(a => `${a.title} (${INSTRUMENT_MAP[a.instrument_type] || a.instrument_type})`).join(', ') || 'Tanya Jawab Lisan / Kuis Diagnostik Singkat'}
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>Awal Pertemuan Pertama</td>
                                    </tr>
                                    {/* Formative */}
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Asesmen Formatif (Proses)</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            {assignments.filter(a => a.assessment_type === 'formative').map(a => `${a.title} (${INSTRUMENT_MAP[a.instrument_type] || a.instrument_type})`).join(', ') || 'Observasi Keterlibatan Diskusi & Umpan Balik Langsung Saat Penyusunan Draf Tabel'}
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>Selama Proses Pembelajaran</td>
                                    </tr>
                                    {/* Summative */}
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Asesmen Sumatif (Akhir)</td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            {assignments.filter(a => a.assessment_type === 'summative').map(a => `${a.title} (${INSTRUMENT_MAP[a.instrument_type] || a.instrument_type})`).join(', ') || 'Penilaian Kinerja Presentasi Infografis Digital & Gallery Walk'}
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '8px 12px' }}>Akhir Pertemuan Kedua / Projek</td>
                                    </tr>
                                    {/* RTL */}
                                    <tr>
                                        <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Rencana Tindak Lanjut (RTL)</td>
                                        <td colSpan={2} style={{ border: '1px solid black', padding: '8px 12px' }}>
                                            <strong>Remedial:</strong> Pembimbingan ulang konsep terstruktur bagi murid yang belum mencapai KKTB (KKM).<br/>
                                            <strong>Pengayaan:</strong> Pemberian tantangan tingkat tinggi (seperti penambahan kategori turunan data secara mandiri) bagi murid yang telah melampaui KKTB.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 5. Detail Instrumen Asesmen & KKTP */}
                        <div className="space-y-4 mb-8 print-page-break">
                            <h4 className="text-md font-bold uppercase border-b border-black pb-1 mb-3 text-black">
                                V. DETAIL INSTRUMEN ASESMEN & KRITERIA KETUNTASAN (KKTP)
                            </h4>
                            {renderAssessmentDetails(assignments)}
                        </div>

                        {/* 6. Rubrik Penilaian Kinerja */}
                        {!hasSummativeAssignments && (
                            <div className="space-y-4 mb-8 print-page-break">
                                <h4 className="text-md font-bold uppercase border-b border-black pb-1 mb-3 text-black">
                                    VI. RUBRIK PENILAIAN ASESMEN KINERJA (SUMATIF)
                                </h4>
                                
                                <table className="print-table w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="w-1/4" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Kriteria Penilaian</th>
                                            <th className="w-3/16" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Perlu Perbaikan (&lt; 60)</th>
                                            <th className="w-3/16" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Cukup (60 - 74)</th>
                                            <th className="w-3/16" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Baik (75 - 89)</th>
                                            <th className="w-3/16" style={{ border: '1px solid black', padding: '8px 12px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>Sangat Baik (90 - 100)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isStructuredDataMaterial ? (
                                            <>
                                                <tr>
                                                    <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Pemahaman Konsep Data & Informasi</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Belum mampu membedakan dan mendefinisikan apa itu data and informasi.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Mampu menyebutkan definisi data dan informasi, namun belum bisa membedakannya dengan jelas.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Mampu mendefinisikan dan membedakan data dan informasi secara tepat.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Mampu mendefinisikan, membedakan, serta memberikan contoh lain dari data dan informasi di kehidupan sehari-hari dengan sangat tepat.</td>
                                                </tr>
                                                <tr>
                                                    <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Pengelompokan Data (LKPD)</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Data acak belum berhasil dikelompokkan menjadi kategori yang tepat.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Sebagian data acak berhasil dikelompokkan ke dalam kategori, namun masih banyak yang tidak tepat sasaran.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Seluruh data acak berhasil dikelompokkan ke dalam kategori yang tepat dan bermakna.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Seluruh data berhasil dikelompokkan dengan sangat terstruktur dan ditambahkan kategori turunan yang lebih spesifik secara mandiri.</td>
                                                </tr>
                                                <tr>
                                                    <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Penyajian Visual (Infografis)</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Infografis belum selesai atau tidak relevan dengan data yang dikelompokkan.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Infografis menyajikan data, tetapi visualisasinya kurang jelas or sulit dibaca.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Infografis disajikan dengan rapi, jelas, dan memuat seluruh data yang telah terstruktur.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Infografis sangat menarik, informatif, desain visualnya sangat mendukung kemudahan membaca data, dan sangat komunikatif.</td>
                                                </tr>
                                            </>
                                        ) : (
                                            <>
                                                <tr>
                                                    <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Pemahaman Konsep Utama</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Menunjukkan sedikit atau tidak ada pemahaman terhadap konsep dasar.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Memahami konsep dasar secara garis besar namun mengalami kesulitan dalam merinci.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Memahami konsep utama dengan baik dan dapat menjelaskannya dengan logis.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Memahami konsep secara mendalam dan mampu menghubungkannya dengan konsep lain secara luas.</td>
                                                </tr>
                                                <tr>
                                                    <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Kemampuan Analisis & Aplikasi</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Belum mampu menerapkan konsep pada masalah sederhana.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Mampu menerapkan konsep pada beberapa bagian masalah tetapi kurang sistematis.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Mampu menerapkan konsep dengan tepat untuk memecahkan studi kasus.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Mampu memecahkan masalah kompleks dengan solusi kreatif dan analisis yang matang.</td>
                                                </tr>
                                                <tr>
                                                    <td className="font-semibold" style={{ border: '1px solid black', padding: '8px 12px' }}>Kualitas Presentasi & Laporan</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Penyajian tidak rapi, kurang jelas, atau tidak lengkap.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Penyajian cukup terstruktur namun kurang komunikatif.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Penyajian rapi, sistematis, jelas, dan memuat semua aspek materi.</td>
                                                    <td style={{ border: '1px solid black', padding: '8px 12px', fontSize: '9pt', color: '#333333' }}>Penyajian sangat informatif, estetik, menarik, dan sangat komunikatif.</td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 7. Lembar Kerja Peserta Didik (LKPD) */}
                        <div className="space-y-4 mb-12 print-page-break">
                            <h4 className="text-md font-bold uppercase border-b border-black pb-1 mb-3 text-black">
                                {hasSummativeAssignments ? "VI. LEMBAR KERJA PESERTA DIDIK (LKPD)" : "VII. LEMBAR KERJA PESERTA DIDIK (LKPD)"}
                            </h4>
                            
                            <div className="border border-black p-6 rounded-lg bg-gray-50/50">
                                <div className="text-center mb-6">
                                    <h5 className="text-sm font-bold uppercase tracking-wide text-black">{lkpdTitle}</h5>
                                    <p className="text-[10pt] italic text-gray-700 mt-1">Aktivitas Kerja Kelompok Kolaboratif</p>
                                </div>

                                <div className="space-y-4 text-[11pt]">
                                    <div>
                                        <strong className="block font-bold mb-1 text-black">A. Bahan Pengamatan / Stimulus Data:</strong>
                                        <div className="p-3 bg-white border border-gray-300 rounded font-mono text-[10pt] tracking-tight leading-relaxed whitespace-pre-wrap break-words">
                                            {lkpdStimulus?.replace(/\u00A0/g, ' ')}
                                        </div>
                                    </div>

                                    <div>
                                        <strong className="block font-bold mb-1 text-black">B. Pertanyaan Pemantik Diskusi:</strong>
                                        <div className="pl-4 italic text-gray-800 whitespace-pre-line leading-relaxed break-words">
                                            {lkpdPemantik?.replace(/\u00A0/g, ' ')}
                                        </div>
                                    </div>

                                    <div>
                                        <strong className="block font-bold mb-1 text-black">C. Langkah-Langkah Kerja Kelompok:</strong>
                                        <div className="space-y-3.5 mt-2.5">
                                            {parseLkpdLangkah(lkpdLangkah).map((item, idx) => {
                                                if (item.type === 'sub') {
                                                    return (
                                                        <div key={idx} className="pl-8 pr-4 py-2.5 my-1.5 border-l-2 border-black bg-gray-50/70 text-[9.5pt] text-gray-800 italic leading-relaxed whitespace-pre-wrap rounded-r-md break-words">
                                                            {item.content?.replace(/\u00A0/g, ' ')}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div key={idx} className="flex items-start gap-3.5 text-[10pt] leading-relaxed text-black">
                                                        {item.type === 'step' ? (
                                                            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full border border-black text-[9pt] font-black shrink-0 mt-0.5 bg-black text-white">
                                                                {item.num}
                                                            </span>
                                                        ) : (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-black shrink-0 mt-2.5 ml-2" />
                                                        )}
                                                        <span className="flex-1 font-medium whitespace-pre-wrap break-words">{item.content?.replace(/\u00A0/g, ' ')}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 8. Sumber Belajar */}
                        <div className="space-y-4 mb-12 print-page-break">
                            <h4 className="text-md font-bold uppercase border-b border-black pb-1 mb-3 text-black">
                                {hasSummativeAssignments ? "VII. SUMBER BELAJAR" : "VIII. SUMBER BELAJAR"}
                            </h4>
                            
                            <div className="border border-black p-6 rounded-lg bg-gray-50/50">
                                <div className="space-y-3.5 text-[11pt]">
                                    {((material.resources && material.resources.length > 0) || material.external_link || material.file_path) ? (
                                        <div className="space-y-4">
                                            {material.resources && material.resources.map((res: any, idx: number) => (
                                                <div key={idx} className="flex items-start gap-3.5 text-[10pt] leading-relaxed text-black">
                                                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full border border-black text-[9pt] font-black shrink-0 bg-black text-white">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <strong className="font-bold">{res.title || 'Sumber Belajar'}</strong>
                                                        <span className="text-gray-500 mx-2">|</span>
                                                        <a href={res.type === 'link' ? res.path : `/storage/${res.path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-mono break-all text-[9.5pt]">
                                                            {res.path}
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Legacy External Link fallback */}
                                            {!material.resources?.length && material.external_link && (
                                                <div className="flex items-start gap-3.5 text-[10pt] leading-relaxed text-black">
                                                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full border border-black text-[9pt] font-black shrink-0 bg-black text-white">
                                                        1
                                                    </span>
                                                    <div className="flex-1">
                                                        <strong className="font-bold">Referensi / Link Eksternal</strong>
                                                        <span className="text-gray-500 mx-2">|</span>
                                                        <a href={material.external_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-mono break-all text-[9.5pt]">
                                                            {material.external_link}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Legacy File Path fallback */}
                                            {!material.resources?.length && material.file_path && (
                                                <div className="flex items-start gap-3.5 text-[10pt] leading-relaxed text-black">
                                                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full border border-black text-[9pt] font-black shrink-0 bg-black text-white">
                                                        {material.external_link ? '2' : '1'}
                                                    </span>
                                                    <div className="flex-1">
                                                        <strong className="font-bold">Dokumen Lampiran</strong>
                                                        <span className="text-gray-500 mx-2">|</span>
                                                        <a href={`/storage/${material.file_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-mono break-all text-[9.5pt]">
                                                            /storage/{material.file_path}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">Tidak ada sumber belajar tambahan yang disematkan.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 7. Tanda Tangan (Signature block) */}
                        <div className="print-avoid-break mt-12 grid grid-cols-2 gap-12 text-center text-[11pt] text-black">
                            <div className="space-y-20">
                                <div className="space-y-1">
                                    <p>Mengetahui,</p>
                                    <p className="font-semibold">Kepala Sekolah {rppSchoolName}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-bold underline">{kepalaSekolahName}</p>
                                    <p className="text-[9.5pt]">NIP. {kepalaSekolahNip}</p>
                                </div>
                            </div>
                            <div className="space-y-20">
                                <div className="space-y-1">
                                    <p>Buol, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    <p className="font-semibold">Guru Mata Pelajaran</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-bold underline">{material.teacher_name}</p>
                                    <p className="text-[9.5pt]">{material.teacher_nip ? `NIP. ${material.teacher_nip}` : 'NIP. -'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
