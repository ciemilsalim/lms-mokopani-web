import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle, Lightbulb, PlayCircle, ClipboardList, FileText, Youtube, Link as LinkIcon, Download } from 'lucide-react';

interface LiveSessionProps {
    modulAjar: any;
    attendances?: any[];
}

export default function LiveClassSessionPage({ modulAjar }: LiveSessionProps) {
    const learningSteps = typeof modulAjar?.learning_steps === 'string'
        ? JSON.parse(modulAjar.learning_steps)
        : modulAjar?.learning_steps || {};

    const renderStep = (title: string, icon: React.ReactNode, data: any, colorClass: string) => {
        if (!data || !data.scenario) return null;
        return (
            <Card className={`mb-6 border-l-4 ${colorClass} shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md`}>
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-lg flex items-center gap-2">
                        {icon}
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Skenario Pembelajaran:</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {data.scenario}
                        </p>
                    </div>
                    
                    {data.activities && data.activities.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Aktivitas Siswa:</h4>
                            <ul className="list-disc pl-5 space-y-1.5">
                                {data.activities.map((act: string, idx: number) => (
                                    <li key={idx} className="text-sm text-slate-600 dark:text-slate-400">{act}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Sesi Kelas', href: '/class-sessions' },
        { title: 'Live Class', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pelaksanaan Pembelajaran" />

            <div className="max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-6 sm:space-y-8 pb-16 md:pb-0">
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 sm:p-6 rounded-2xl border border-border/80 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <h1 className="text-xl sm:text-2xl font-black text-foreground">
                                Pelaksanaan Pembelajaran
                            </h1>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                                Live Class
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                            Topik: <span className="font-bold text-foreground">{modulAjar?.material?.title || 'Modul Ajar'}</span> &bull; {modulAjar?.subject?.name || 'Mata Pelajaran'}
                        </p>
                    </div>
                    <div>
                        <Link href="/assignments" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition active:scale-95 h-11 px-5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Lakukan Asesmen
                        </Link>
                    </div>
                </div>

                {/* Materi Reference */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl">
                            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                            <CardHeader className="pb-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-lg flex items-center gap-2 text-indigo-950 dark:text-indigo-50">
                                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    Materi Pembelajaran
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {modulAjar?.material?.content ? (
                                    <div className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base prose-headings:text-indigo-950 dark:prose-headings:text-indigo-50 prose-a:text-indigo-600">
                                        <div dangerouslySetInnerHTML={{ __html: modulAjar.material.content }} />
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-slate-500 dark:text-slate-400">Ringkasan materi belum tersedia.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* Tujuan Pembelajaran Card */}
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

                        {/* Sumber Tambahan Card */}
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

                {/* Alur Pembelajaran (Memahami, Mengaplikasi, Merefleksi) */}
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 px-1 flex items-center gap-2">
                        <PlayCircle className="w-6 h-6 text-indigo-600" />
                        Alur Kegiatan Pembelajaran (PPA 2025)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {renderStep('Zona 1: Memahami', <Lightbulb className="w-5 h-5 text-amber-500" />, learningSteps.memahami, 'border-l-amber-500')}
                        {renderStep('Zona 2: Mengaplikasi', <PlayCircle className="w-5 h-5 text-emerald-500" />, learningSteps.mengaplikasi, 'border-l-emerald-500')}
                        {renderStep('Zona 3: Merefleksi', <CheckCircle className="w-5 h-5 text-indigo-500" />, learningSteps.merefleksi, 'border-l-indigo-500')}
                    </div>
                    
                    {!learningSteps.memahami && !learningSteps.mengaplikasi && !learningSteps.merefleksi && (
                        <Card className="p-12 text-center bg-slate-50 dark:bg-slate-800/50 border-dashed border-2 rounded-2xl">
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Alur pembelajaran belum di-generate untuk Modul Ajar ini. Silakan edit modul ajar untuk menyusun alur belajarnya.
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
