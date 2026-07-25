import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Edit3, HeartHandshake, CheckCircle2, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ModulAjar {
    id: number;
    general_info: string;
    learning_steps: string; // JSON string containing memahami, mengaplikasi, merefleksi
}

interface ClassSession {
    id: number;
    modul_ajar_id: number;
    teacher_id: number;
    school_class_id: number;
    start_time: string;
    end_time?: string | null;
    modul_ajar?: ModulAjar;
    teacher?: any;
}

interface StudentLiveProps {
    session: ClassSession;
}

export default function StudentLiveSessionPage({ session }: StudentLiveProps) {
    const [activeZone, setActiveZone] = useState<'memahami' | 'mengaplikasi' | 'merefleksi'>('memahami');
    const [reflectionText, setReflectionText] = useState('');
    const [workspaceText, setWorkspaceText] = useState('');
    
    // Parse learning steps
    let steps = { memahami: [], mengaplikasi: [], merefleksi: [] };
    if (session.modul_ajar?.learning_steps) {
        try {
            const parsed = typeof session.modul_ajar.learning_steps === 'string' 
                ? JSON.parse(session.modul_ajar.learning_steps) 
                : session.modul_ajar.learning_steps;
            
            // Map common AI output structures
            steps = {
                memahami: parsed.memahami?.activities || parsed.memahami || [],
                mengaplikasi: parsed.mengaplikasi?.activities || parsed.mengaplikasi || [],
                merefleksi: parsed.merefleksi?.activities || parsed.merefleksi || [],
            };
        } catch (e) {
            console.error('Failed to parse learning steps:', e);
        }
    }

    const zones = [
        { id: 'memahami', label: '1. Zona Memahami', icon: <BookOpen className="w-4 h-4 mr-2" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
        { id: 'mengaplikasi', label: '2. Zona Mengaplikasi', icon: <Edit3 className="w-4 h-4 mr-2" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
        { id: 'merefleksi', label: '3. Zona Merefleksi', icon: <HeartHandshake className="w-4 h-4 mr-2" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    ];

    return (
        <AppLayout title="Alur Belajar Aktif">
            <Head title="Alur Belajar Aktif" />

            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
                {/* Header Section */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300">
                                Sesi Aktif
                            </Badge>
                            <span className="text-xs text-slate-500 font-medium">Guru: {session.teacher?.user?.name || 'Guru'}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Dasbor Alur Belajar
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Ikuti alur pembelajaran berikut sesuai instruksi dari guru.
                        </p>
                    </div>
                </div>

                {/* Zone Navigation */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {zones.map(zone => (
                        <button
                            key={zone.id}
                            onClick={() => setActiveZone(zone.id as any)}
                            className={`flex items-center px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                                activeZone === zone.id
                                    ? `ring-2 ring-offset-2 ring-indigo-500 shadow-md ${zone.color}`
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            {zone.icon}
                            {zone.label}
                        </button>
                    ))}
                </div>

                {/* Zone Content */}
                <div className="min-h-[500px]">
                    {/* ZONA MEMAHAMI */}
                    {activeZone === 'memahami' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-blue-200 dark:border-blue-900 shadow-md">
                                <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 rounded-t-xl border-b border-blue-100 dark:border-blue-900">
                                    <CardTitle className="text-blue-800 dark:text-blue-300 flex items-center">
                                        <BookOpen className="w-5 h-5 mr-2" />
                                        Materi & Eksplorasi
                                    </CardTitle>
                                    <CardDescription>
                                        Pahami konsep dasar melalui instruksi dan pertanyaan pemantik berikut.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {steps.memahami && Array.isArray(steps.memahami) && steps.memahami.length > 0 ? (
                                        <div className="space-y-4">
                                            {steps.memahami.map((act: any, idx: number) => (
                                                <div key={idx} className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{act.activity || act.description || act}</h4>
                                                        {act.duration && <span className="text-xs text-slate-500 flex items-center mt-1">⏱️ Estimasi: {act.duration} menit</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-slate-500">
                                            Kegiatan spesifik belum dijabarkan oleh AI/Guru. Silakan perhatikan instruksi langsung dari guru.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <div className="flex justify-end">
                                <Button onClick={() => setActiveZone('mengaplikasi')} className="bg-blue-600 hover:bg-blue-700">
                                    Lanjut ke Zona Mengaplikasi <CheckCircle2 className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ZONA MENGAPLIKASI */}
                    {activeZone === 'mengaplikasi' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-amber-200 dark:border-amber-900 shadow-md">
                                <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10 rounded-t-xl border-b border-amber-100 dark:border-amber-900">
                                    <CardTitle className="text-amber-800 dark:text-amber-300 flex items-center">
                                        <Edit3 className="w-5 h-5 mr-2" />
                                        Ruang Kerja (Aplikasi Konsep)
                                    </CardTitle>
                                    <CardDescription>
                                        Terapkan apa yang sudah dipahami. Kerjakan instruksi di bawah ini.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    {steps.mengaplikasi && Array.isArray(steps.mengaplikasi) && steps.mengaplikasi.length > 0 ? (
                                        <div className="space-y-3 mb-6">
                                            {steps.mengaplikasi.map((act: any, idx: number) => (
                                                <div key={idx} className="text-sm p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/50">
                                                    <span className="font-semibold text-amber-800 dark:text-amber-300 mr-2">Tugas {idx + 1}:</span>
                                                    {act.activity || act.description || act}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Lembar Kerja Digital
                                        </label>
                                        <Textarea 
                                            placeholder="Ketik hasil kerjamu, jawaban LKPD, atau letakkan link tugasmu di sini..."
                                            className="min-h-[200px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                            value={workspaceText}
                                            onChange={(e) => setWorkspaceText(e.target.value)}
                                        />
                                        <div className="flex justify-between items-center mt-3">
                                            <span className="text-xs text-slate-500">Otomatis tersimpan sebagai draft lokal.</span>
                                            <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                                                Simpan ke Portfolio
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="flex justify-end">
                                <Button onClick={() => setActiveZone('merefleksi')} className="bg-amber-600 hover:bg-amber-700">
                                    Selesai? Lanjut ke Refleksi <HeartHandshake className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ZONA MEREFLEKSI */}
                    {activeZone === 'merefleksi' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-emerald-200 dark:border-emerald-900 shadow-md">
                                <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-t-xl border-b border-emerald-100 dark:border-emerald-900">
                                    <CardTitle className="text-emerald-800 dark:text-emerald-300 flex items-center">
                                        <HeartHandshake className="w-5 h-5 mr-2" />
                                        Evaluasi Diri
                                    </CardTitle>
                                    <CardDescription>
                                        Bagaimana perasaanmu tentang materi hari ini? Apa yang paling menarik?
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {steps.merefleksi && Array.isArray(steps.merefleksi) && steps.merefleksi.length > 0 ? (
                                         <div className="space-y-3 mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Pertanyaan Refleksi dari Modul:</h4>
                                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                                {steps.merefleksi.map((act: any, idx: number) => (
                                                    <li key={idx}>{act.activity || act.description || act}</li>
                                                ))}
                                            </ul>
                                         </div>
                                    ) : null}

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                                Pilih Emoji yang mewakili perasaan belajarmu hari ini:
                                            </label>
                                            <div className="flex gap-4">
                                                {['🤩 Senang', '🤔 Bingung', '🤯 Sulit'].map((emoji) => (
                                                    <button key={emoji} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105 transition-transform bg-white dark:bg-slate-900 shadow-sm text-sm font-medium">
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Jurnal Singkat (Exit Ticket)
                                            </label>
                                            <Textarea 
                                                placeholder="Tuliskan 1 hal baru yang kamu pelajari dan 1 hal yang masih membingungkan..."
                                                className="min-h-[100px]"
                                                value={reflectionText}
                                                onChange={(e) => setReflectionText(e.target.value)}
                                            />
                                        </div>

                                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                                            Kirim Refleksi ke Guru
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Feedback Toast System (Placeholder for real-time) */}
            <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
                 {/* Imagine a toast popping up here when teacher sends feedback */}
            </div>
        </AppLayout>
    );
}
