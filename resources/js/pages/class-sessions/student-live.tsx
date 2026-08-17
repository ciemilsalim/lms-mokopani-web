import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Edit3, HeartHandshake, CheckCircle2, FileText, ClipboardList, Youtube, Link as LinkIcon, Download, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModulAjar {
    id: number;
    general_info: string;
    learning_steps: string; // JSON string
    material?: any;
    subject?: any;
    teacher?: any;
    learning_objective?: any;
}

interface StudentLiveProps {
    modulAjar: ModulAjar;
}

export default function StudentLiveSessionPage({ modulAjar }: StudentLiveProps) {
    const [activeZone, setActiveZone] = useState<'memahami' | 'mengaplikasi' | 'merefleksi'>('memahami');
    
    // Parse learning steps
    let steps: any = { memahami: [], mengaplikasi: [], merefleksi: [] };
    
    if (modulAjar?.learning_steps) {
        try {
            const parsed = typeof modulAjar.learning_steps === 'string' 
                ? JSON.parse(modulAjar.learning_steps) 
                : modulAjar.learning_steps;
            steps = parsed;
        } catch (e) {
            console.error('Failed to parse learning steps:', e);
        }
    }

    const zones = [
        { id: 'memahami', label: 'Zona Memahami & Materi', icon: <BookOpen className="w-4 h-4 mr-2" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
        { id: 'mengaplikasi', label: 'Zona Praktik & Tugas', icon: <Edit3 className="w-4 h-4 mr-2" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
        { id: 'merefleksi', label: 'Zona Refleksi', icon: <HeartHandshake className="w-4 h-4 mr-2" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    ];

    const renderActivities = (stepData: any) => {
        if (!stepData) return <p className="text-slate-500 text-sm">Belum ada aktivitas di zona ini.</p>;
        const activities = stepData.activities || stepData;
        if (!Array.isArray(activities) || activities.length === 0) {
            return <p className="text-slate-500 text-sm">Belum ada aktivitas di zona ini.</p>;
        }
        return (
            <ul className="space-y-3 mt-4">
                {activities.map((act: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{act}</span>
                    </li>
                ))}
            </ul>
        );
    };

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Sesi Kelas', href: '/class-sessions' },
        { title: 'Alur Belajar', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Materi & Alur Belajar" />

            <div className="max-w-5xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 sm:space-y-8 pb-16 md:pb-0">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 sm:p-6 rounded-2xl border border-border/80 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <h1 className="text-xl sm:text-2xl font-black text-foreground">
                                Alur Belajar Siswa
                            </h1>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                                {modulAjar?.subject?.name || 'Mata Pelajaran'}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                            Topik: <span className="font-bold text-foreground">{modulAjar?.material?.title || 'Modul Pembelajaran'}</span> &bull; Guru: {modulAjar?.teacher?.name || 'Guru'}
                        </p>
                    </div>
                    <div>
                        <Link href="/assignments" className="w-full md:w-auto inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition active:scale-95 h-11 px-5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Buka Tugas & Asesmen
                        </Link>
                    </div>
                </div>

                {/* Zone Navigation */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {zones.map((zone) => (
                        <button
                            key={zone.id}
                            onClick={() => setActiveZone(zone.id as any)}
                            className={`flex items-center px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 ${
                                activeZone === zone.id
                                    ? `${zone.color} border-transparent ring-2 ring-primary`
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            {zone.icon}
                            {zone.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <div className="p-6 sm:p-8">
                        {/* Zone: Memahami */}
                        {activeZone === 'memahami' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
                                        <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
                                        Materi & Memahami Konsep
                                    </h2>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base prose-headings:text-indigo-950 dark:prose-headings:text-indigo-50 prose-a:text-indigo-600">
                                                {modulAjar?.material?.content ? (
                                                    <div dangerouslySetInnerHTML={{ __html: modulAjar.material.content }} />
                                                ) : (
                                                    <div className="text-slate-500 text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                        Materi belum diunggah secara terperinci. Silakan ikuti instruksi guru Anda.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Tujuan Pembelajaran */}
                                            <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900 shadow-sm rounded-2xl">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-base text-indigo-900 dark:text-indigo-300">
                                                        Tujuan Pembelajaran
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-1">
                                                        <span className="inline-block px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs font-bold mb-2">
                                                            {modulAjar?.learning_objective?.code ? modulAjar.learning_objective.code.replace('-', ' ') : 'Sub TP'}
                                                        </span>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                                            {modulAjar?.learning_objective?.description || 'Belum ada Sub TP terpilih.'}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Sumber Tambahan */}
                                            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
                                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <LinkIcon className="w-4 h-4 text-slate-500" />
                                                        Sumber Tambahan
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-4 space-y-3">
                                                    {(!modulAjar?.material?.file_path && !modulAjar?.material?.youtube_url && !modulAjar?.material?.link_url) && (
                                                        <p className="text-sm text-slate-500 text-center py-4">Tidak ada lampiran.</p>
                                                    )}

                                                    {modulAjar?.material?.file_path && (
                                                        <a
                                                            href={`/storage/${modulAjar.material.file_path}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                                                                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">Dokumen Materi</p>
                                                                    <p className="text-xs text-slate-500 truncate">Unduh file</p>
                                                                </div>
                                                            </div>
                                                            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                                        </a>
                                                    )}

                                                    {modulAjar?.material?.youtube_url && (
                                                        <a
                                                            href={modulAjar.material.youtube_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="w-10 h-10 rounded bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                                                                    <Youtube className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">Video YouTube</p>
                                                                    <p className="text-xs text-slate-500 truncate">Tonton video</p>
                                                                </div>
                                                            </div>
                                                            <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                                                        </a>
                                                    )}

                                                    {modulAjar?.material?.link_url && (
                                                        <a
                                                            href={modulAjar.material.link_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="w-10 h-10 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                                                                    <LinkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">Tautan Luar</p>
                                                                    <p className="text-xs text-slate-500 truncate">Kunjungi situs</p>
                                                                </div>
                                                            </div>
                                                            <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                                        </a>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
                                        <Lightbulb className="w-5 h-5 mr-2 text-amber-500" />
                                        Instruksi Pembelajaran
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-4">Pahami dengan saksama langkah-langkah di bawah ini.</p>
                                    
                                    {steps?.memahami?.scenario && (
                                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900 mb-6 text-sm text-blue-900 dark:text-blue-100">
                                            <span className="font-bold block mb-1">Skenario:</span>
                                            {steps.memahami.scenario}
                                        </div>
                                    )}

                                    {renderActivities(steps?.memahami)}
                                </div>
                            </div>
                        )}

                        {/* Zone: Mengaplikasi */}
                        {activeZone === 'mengaplikasi' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center">
                                    <Edit3 className="w-5 h-5 mr-2 text-amber-600" />
                                    Zona Praktik & Tugas (Mengaplikasi)
                                </h2>
                                <p className="text-sm text-slate-500 mb-4">Lakukan praktik atau kerjakan tugas sesuai instruksi guru.</p>
                                
                                {steps?.mengaplikasi?.scenario && (
                                    <div className="p-4 bg-amber-50/50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900 mb-6 text-sm text-amber-900 dark:text-amber-100">
                                        <span className="font-bold block mb-1">Skenario:</span>
                                        {steps.mengaplikasi.scenario}
                                    </div>
                                )}

                                {renderActivities(steps?.mengaplikasi)}

                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Lembar Kerja Peserta Didik (LKPD) / Tugas</h4>
                                            <p className="text-xs text-slate-500 mt-1">Periksa tugas yang ditugaskan oleh guru pada modul ini.</p>
                                        </div>
                                        <Link href="/assignments">
                                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white">Lihat Tugas</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Zone: Merefleksi */}
                        {activeZone === 'merefleksi' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center">
                                    <HeartHandshake className="w-5 h-5 mr-2 text-emerald-600" />
                                    Zona Refleksi Pembelajaran
                                </h2>
                                <p className="text-sm text-slate-500 mb-4">Refleksikan apa yang telah Anda pelajari pada modul ini.</p>

                                {steps?.merefleksi?.scenario && (
                                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900 mb-6 text-sm text-emerald-900 dark:text-emerald-100">
                                        <span className="font-bold block mb-1">Skenario:</span>
                                        {steps.merefleksi.scenario}
                                    </div>
                                )}

                                {renderActivities(steps?.merefleksi)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
