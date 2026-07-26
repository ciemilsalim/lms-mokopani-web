import React from 'react';
import { 
    Target, 
    X, 
    CheckCircle2, 
    Award, 
    BarChart2, 
    ListChecks, 
    HelpCircle, 
    BookOpen, 
    Sparkles,
    Layers,
    CheckSquare,
    Percent,
    AlertCircle,
    Star
} from 'lucide-react';

interface KktpModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignment: any;
}

export const KktpModal: React.FC<KktpModalProps> = ({ isOpen, onClose, assignment }) => {
    if (!isOpen || !assignment) return null;

    const config = assignment.instrument_config || {};
    const kktp = config.kktp || {};
    const approach = kktp.approach || config.kktp_approach || (config.levels ? 'rubric' : config.indicators ? 'percentage' : 'criteria_description');

    // Resolve rubric levels
    const rawLevels = config.levels || kktp.levels || kktp.rubricLevels;
    let levelsList: Array<{ name: string; desc: string }> = [];
    if (Array.isArray(rawLevels) && rawLevels.length > 0) {
        levelsList = rawLevels.map((l: any) => ({
            name: l.name || l.title || 'Tahap',
            desc: l.desc || l.description || '-'
        }));
    } else if (rawLevels && typeof rawLevels === 'object') {
        if (rawLevels.baru_berkembang || rawLevels.layak || rawLevels.cakap || rawLevels.mahir) {
            levelsList = [
                { name: 'Baru Berkembang', desc: rawLevels.baru_berkembang || '-' },
                { name: 'Layak / Cukup', desc: rawLevels.layak || '-' },
                { name: 'Cakap / Baik', desc: rawLevels.cakap || '-' },
                { name: 'Mahir / Sangat Baik', desc: rawLevels.mahir || '-' },
            ];
        }
    }

    // Default levels fallback if approach is rubric but no custom levels
    if (approach === 'rubric' && levelsList.length === 0) {
        levelsList = [
            { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
            { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar namun belum konsisten.' },
            { name: 'Baik', desc: 'Siswa menguasai seluruh indikator ketuntasan dengan baik (Standar Tuntas).' },
            { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa dan pemahaman mendalam.' }
        ];
    }

    // Resolve criteria / indicators
    const criteriaList: Array<any> = config.criteria || config.indicators || kktp.checklistItems || kktp.criteria || [];
    const questionsList: Array<any> = config.questions || [];
    const intervalsList: Array<any> = kktp.intervals || [];

    // Passing thresholds
    const passingLevel = kktp.passing_level || 'Baik';
    const minCriteria = kktp.min_criteria ?? Math.max(1, Math.round((criteriaList.length || 4) / 2));
    const thresholdPct = kktp.threshold || assignment.passing_grade || 75;

    const getApproachBadge = () => {
        switch (approach) {
            case 'rubric':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest border border-indigo-200 dark:border-indigo-800/40">
                        <Layers className="h-3.5 w-3.5 text-indigo-500" />
                        Rubrik (4 Tahap Capaian)
                    </span>
                );
            case 'criteria_description':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 dark:bg-sky-950/50 px-3 py-1 text-xs font-black text-sky-700 dark:text-sky-300 uppercase tracking-widest border border-sky-200 dark:border-sky-800/40">
                        <CheckSquare className="h-3.5 w-3.5 text-sky-500" />
                        Deskripsi Kriteria / Indikator
                    </span>
                );
            case 'score_interval':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest border border-amber-200 dark:border-amber-800/40">
                        <BarChart2 className="h-3.5 w-3.5 text-amber-500" />
                        Interval Nilai
                    </span>
                );
            case 'percentage':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest border border-emerald-200 dark:border-emerald-800/40">
                        <Percent className="h-3.5 w-3.5 text-emerald-500" />
                        Persentase / KKM ({thresholdPct}%)
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 px-3 py-1 text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest border border-purple-200 dark:border-purple-800/40">
                        <Target className="h-3.5 w-3.5 text-purple-500" />
                        {approach || 'KKTP Standar'}
                    </span>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
                            <Target className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                Pendekatan & Kriteria Ketuntasan (KKTP)
                            </h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                Informasi standar penilaian dan rubrik yang ditetapkan untuk asesmen ini
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                        aria-label="Tutup"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
                    {/* Top Summary Card */}
                    <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-sky-500/10 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-sky-950/30 p-5 border border-indigo-200/60 dark:border-indigo-800/40 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {getApproachBadge()}
                                    {assignment.subject && (
                                        <span className="inline-flex rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest border border-slate-200 dark:border-slate-700 shadow-2xs">
                                            {typeof assignment.subject === 'object' ? assignment.subject.name : assignment.subject}
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                    {assignment.title}
                                </h4>
                            </div>

                            {/* Passing Threshold Highlight */}
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-3.5 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-3 shadow-2xs shrink-0">
                                <div className="h-10 w-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                                    <Award className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                                        Standar Ketuntasan
                                    </p>
                                    <p className="text-sm font-black text-slate-800 dark:text-emerald-400">
                                        {approach === 'rubric' ? (
                                            <span>Tahap Minimal: <strong className="text-indigo-600 dark:text-indigo-300 underline decoration-2 underline-offset-2">{passingLevel}</strong></span>
                                        ) : approach === 'percentage' ? (
                                            <span>KKM Minimal: <strong className="text-emerald-600 dark:text-emerald-400">{thresholdPct}%</strong></span>
                                        ) : approach === 'score_interval' ? (
                                            <span>Interval Tuntas: <strong className="text-amber-600 dark:text-amber-400">61 - 100</strong></span>
                                        ) : (
                                            <span>Minimal: <strong className="text-sky-600 dark:text-sky-400">{minCriteria} Kriteria</strong> Tuntas</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Extra stats bar */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-indigo-200/40 dark:border-indigo-800/30 text-xs">
                            <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-amber-500" />
                                <span className="text-slate-500 dark:text-slate-400">Poin Maksimal:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{assignment.max_points || 100} PTS</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-sky-500" />
                                <span className="text-slate-500 dark:text-slate-400">Aspek / Fondasi:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{config.foundation_aspect || 'Umum / Akademik'}</span>
                            </div>
                            <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-500 dark:text-slate-400">Instrumen:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px] bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded">{assignment.instrument_type || 'Tertulis'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rubric 4 Stages Grid */}
                    {levelsList.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-indigo-500" />
                                    Rubrik Penilaian Kualitatif (Tahap Capaian)
                                </h4>
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    4 Tingkatan Performa
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                {levelsList.map((lvl, idx) => {
                                    const isPassing = lvl.name.toLowerCase().includes(passingLevel.toLowerCase()) || 
                                                      (passingLevel === 'Baik' && (idx === 2 || lvl.name.toLowerCase().includes('cakap'))) ||
                                                      (passingLevel === 'Cakap' && idx === 2);
                                    
                                    const colors = [
                                        { bg: 'bg-rose-50/50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-900/40', text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200' },
                                        { bg: 'bg-amber-50/50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/40', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
                                        { bg: 'bg-indigo-50/50 dark:bg-indigo-950/20', border: 'border-indigo-300 dark:border-indigo-800/60 ring-2 ring-indigo-500/20', text: 'text-indigo-800 dark:text-indigo-200', badge: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/70 dark:text-indigo-100' },
                                        { bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' }
                                    ][idx % 4];

                                    return (
                                        <div 
                                            key={idx} 
                                            className={`rounded-xl p-4 border ${colors.border} ${colors.bg} flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${colors.badge}`}>
                                                        Tahap {idx + 1}
                                                    </span>
                                                    {isPassing && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                                                            <Sparkles className="h-2.5 w-2.5" /> Minimum Tuntas
                                                        </span>
                                                    )}
                                                </div>
                                                <h5 className={`font-bold text-sm mb-2 ${colors.text}`}>
                                                    {lvl.name}
                                                </h5>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                                    {lvl.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Criteria / Indicators List */}
                    {criteriaList.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-sky-500" />
                                    Daftar Kriteria & Indikator Ketercapaian ({criteriaList.length})
                                </h4>
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    Target Ketuntasan: Minimal {minCriteria} dari {criteriaList.length} Terpenuhi
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {criteriaList.map((item, idx) => {
                                    const title = typeof item === 'object' ? item.name || item.title || `Kriteria ${idx + 1}` : item;
                                    const desc = typeof item === 'object' ? item.desc || item.description : null;

                                    return (
                                        <div 
                                            key={idx} 
                                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-start gap-3 shadow-2xs hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
                                        >
                                            <div className="h-6 w-6 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                                    {title}
                                                </p>
                                                {desc && (
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                        {desc}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Score Intervals Table */}
                    {intervalsList.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                    <BarChart2 className="h-4 w-4 text-amber-500" />
                                    Interval Nilai Ketuntasan
                                </h4>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/60 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-4 py-3">Rentang Nilai</th>
                                            <th className="px-4 py-3">Predikat Capaian</th>
                                            <th className="px-4 py-3">Rekomendasi Tindak Lanjut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {intervalsList.map((intv, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {intv.min} - {intv.max}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        intv.max >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                        intv.max >= 60 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
                                                        'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                    }`}>
                                                        {intv.label || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {intv.desc || intv.description || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Questions summary for tests/quizzes if no explicit criteria */}
                    {criteriaList.length === 0 && levelsList.length === 0 && intervalsList.length === 0 && questionsList.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                    <HelpCircle className="h-4 w-4 text-purple-500" />
                                    Instrumen Soal & KKM
                                </h4>
                            </div>
                            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center space-y-2">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Asesmen ini menggunakan instrumen berupa <span className="text-primary font-black">{questionsList.length} butir soal</span>.
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                                    Ketuntasan diukur berdasarkan persentase skor akhir siswa terhadap Poin Maksimal ({assignment.max_points || 100} PTS). Siswa dinyatakan tuntas apabila memenuhi KKM minimal <strong>{thresholdPct}%</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Empty fallback */}
                    {criteriaList.length === 0 && levelsList.length === 0 && intervalsList.length === 0 && questionsList.length === 0 && (
                        <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Detail Rubrik Belum Dikonfigurasi
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                Asesmen ini menggunakan standar Kriteria Ketuntasan Tujuan Pembelajaran (KKTP) umum dengan batas lulus minimal <strong>{thresholdPct} PTS</strong>.
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <span>Sinkronisasi otomatis dengan standar asesmen kurikulum merdeka</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-black text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-500/20 uppercase tracking-widest"
                    >
                        Mengerti & Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};
export default KktpModal;
