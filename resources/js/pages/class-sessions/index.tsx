import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ClassSessionsIndexProps {
    modulAjars?: any[];
    assignments?: any[];
    isStudent?: boolean;
}

export default function ClassSessionsIndexPage({ modulAjars = [], assignments = [], isStudent = false }: ClassSessionsIndexProps) {
    return (
        <AppLayout title={isStudent ? "Kelas Saya" : "Pelaksanaan Pembelajaran"}>
            <Head title={isStudent ? "Kelas Saya" : "Pelaksanaan Pembelajaran"} />

            <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
                {/* Top Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {isStudent ? 'Alur Belajar & Kelas Saya' : 'Pelaksanaan Pembelajaran'}
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            {isStudent
                                ? 'Pilih Modul Ajar (Alur Belajar) atau tugas yang diberikan oleh guru Anda.'
                                : 'Pilih Modul Ajar untuk melaksanakan alur pembelajaran sesuai prinsip kurikulum yang dinamis.'
                            }
                        </p>
                    </div>
                </div>



                {/* Modul Ajar List */}
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Daftar Modul Ajar (Alur Belajar)</CardTitle>
                        <CardDescription className="text-xs">
                            Total {modulAjars.length} Modul Ajar tersedia
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {modulAjars.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                {isStudent
                                    ? 'Belum ada Modul Ajar / materi untuk kelas Anda saat ini.'
                                    : 'Belum ada Modul Ajar yang Anda buat.'
                                }
                            </div>
                        ) : (
                            modulAjars.map((modul) => (
                                <div
                                    key={modul.id}
                                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                                Topik: {modul.material?.title || 'Modul Ajar Pembelajaran'}
                                            </span>
                                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                                {modul.subject?.name || 'Mata Pelajaran'}
                                            </Badge>
                                        </div>
                                        {modul.learning_objective?.description && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {modul.learning_objective.code ? modul.learning_objective.code.replace('-', ' ') : 'TP'}:{' '}
                                                </span>
                                                {modul.learning_objective.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">
                                            Guru: <span className="font-semibold text-slate-700 dark:text-slate-300">{modul.teacher?.name || 'Guru Pengampu'}</span>
                                            {modul.school_class && ` • Kelas: ${modul.school_class.name}`}
                                        </p>
                                    </div>

                                    <Link
                                        href={isStudent ? `/class-sessions/${modul.id}/student` : `/class-sessions/${modul.id}/live`}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
                                    >
                                        {isStudent ? 'Buka Materi Belajar →' : 'Laksanakan Pembelajaran →'}
                                    </Link>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
