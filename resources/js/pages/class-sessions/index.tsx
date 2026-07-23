import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ClassSessionItem {
    id: number;
    modul_ajar_id: number;
    teacher_id: number;
    school_class_id: number;
    start_time: string;
    end_time?: string | null;
    session_data?: any;
    modul_ajar?: any;
    school_class?: any;
    created_at: string;
}

interface ClassSessionsIndexProps {
    sessions: ClassSessionItem[];
}

export default function ClassSessionsIndexPage({ sessions }: ClassSessionsIndexProps) {
    const handleStartSession = () => {
        router.post('/class-sessions', {}, {
            onSuccess: () => {}
        });
    };

    return (
        <AppLayout title="Pelaksanaan Sesi Kelas (PPA 2025)">
            <Head title="Pelaksanaan Sesi Kelas (PPA 2025)" />

            <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
                {/* Top Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Pelaksanaan Kelas Aktif
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Skenario Pembelajaran Berkesadaran, Bermakna, & Menggembirakan + Integrasi Presensi Aplikasi Absensi
                        </p>
                    </div>

                    <Button
                        onClick={handleStartSession}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-lg text-sm"
                    >
                        ▶ Mulai Sesi Kelas Baru
                    </Button>
                </div>

                {/* Sessions List */}
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Riwayat & Sesi Kelas Berlangsung</CardTitle>
                        <CardDescription className="text-xs">
                            Total {sessions.length} sesi terdaftar
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sessions.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                Belum ada sesi kelas. Klik "Mulai Sesi Kelas Baru" untuk memulainya.
                            </div>
                        ) : (
                            sessions.map((sess) => (
                                <div
                                    key={sess.id}
                                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                                Sesi Kelas #{sess.id}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={sess.end_time ? 'bg-slate-100 text-slate-600 text-[10px]' : 'bg-emerald-100 text-emerald-800 font-bold text-[10px]'}
                                            >
                                                {sess.end_time ? 'Selesai' : 'Aktif'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Waktu Mulai: {new Date(sess.start_time).toLocaleString('id-ID')}
                                        </p>
                                    </div>

                                    <Link
                                        href={`/class-sessions/${sess.id}/live`}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                                    >
                                        Buka Sesi →
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
