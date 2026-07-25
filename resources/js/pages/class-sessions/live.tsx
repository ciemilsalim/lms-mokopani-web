import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/layouts/app-layout';
import { SessionTimer } from '@/components/session/SessionTimer';
import { AttendanceWidget, AttendanceStudent } from '@/components/session/AttendanceWidget';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ClipboardCheck, MessageCircle, X, Send } from 'lucide-react';

interface ClassSession {
    id: number;
    modul_ajar_id: number;
    teacher_id: number;
    school_class_id: number;
    start_time: string;
    end_time?: string | null;
    session_data: {
        observations?: string[];
        formative_assessments?: Array<{ student_name: string; note: string; score: number }>;
        summative_results?: Array<{ student_name: string; score: number }>;
        reflection?: string;
    };
    modul_ajar?: any;
    school_class?: any;
}

interface LiveSessionProps {
    session: ClassSession;
    attendances: AttendanceStudent[];
}

export default function LiveClassSessionPage({ session, attendances }: LiveSessionProps) {
    const [activeTab, setActiveTab] = useState<'observations' | 'formative' | 'summative' | 'reflection' | 'attendance'>('observations');
    const [sessionData, setSessionData] = useState(session.session_data || {
        observations: [],
        formative_assessments: [],
        summative_results: [],
        reflection: ''
    });

    const [newObservation, setNewObservation] = useState('');
    const [newFormativeName, setNewFormativeName] = useState('');
    const [newFormativeScore, setNewFormativeScore] = useState('');
    const [newFormativeNote, setNewFormativeNote] = useState('');
    const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

    // Quick Assessment Modal States
    const [isQuickAssessOpen, setIsQuickAssessOpen] = useState(false);
    const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<string | null>(null);
    const [quickFeedbackText, setQuickFeedbackText] = useState('');

    const handleSendQuickFeedback = (studentName: string) => {
        if (!quickFeedbackText.trim()) return;
        const updated = [
            ...(sessionData.formative_assessments || []),
            {
                student_name: studentName,
                note: `[Umpan Balik Cepat] ${quickFeedbackText.trim()}`,
                score: 0
            }
        ];
        setSessionData({ ...sessionData, formative_assessments: updated });
        setQuickFeedbackText('');
        setSelectedStudentForFeedback(null);
    };

    // Debounced Autosave
    useEffect(() => {
        const timer = setTimeout(async () => {
            setAutosaveStatus('saving');
            try {
                await axios.put(`/class-sessions/${session.id}`, {
                    session_data: sessionData
                });
                setAutosaveStatus('saved');
            } catch (err) {
                setAutosaveStatus('error');
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [sessionData]);

    const handleAddObservation = () => {
        if (!newObservation.trim()) return;
        const updated = [...(sessionData.observations || []), newObservation.trim()];
        setSessionData({ ...sessionData, observations: updated });
        setNewObservation('');
    };

    const handleAddFormative = () => {
        if (!newFormativeName.trim()) return;
        const updated = [
            ...(sessionData.formative_assessments || []),
            {
                student_name: newFormativeName.trim(),
                note: newFormativeNote.trim(),
                score: Number(newFormativeScore) || 0
            }
        ];
        setSessionData({ ...sessionData, formative_assessments: updated });
        setNewFormativeName('');
        setNewFormativeScore('');
        setNewFormativeNote('');
    };

    const handleEndSession = async () => {
        if (confirm('Apakah Anda yakin ingin mengakhiri sesi kelas ini?')) {
            try {
                await axios.put(`/class-sessions/${session.id}`, {
                    session_data: sessionData,
                    end_session: true
                });
                router.visit('/class-sessions');
            } catch (err) {
                alert('Gagal mengakhiri sesi.');
            }
        }
    };

    return (
        <AppLayout title="Pelaksanaan Kelas Aktif (PPA 2025)">
            <Head title="Pelaksanaan Kelas Aktif (PPA 2025)" />

            <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
                {/* Header Bar with Timer & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                Pelaksanaan Kelas Aktif
                            </h1>
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                PPA 2025
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Modul: {session.modul_ajar?.general_info ? 'Modul Ajar Pembelajaran' : 'Modul Ajar'} | Kelas: {session.school_class?.name || 'VII'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-medium">
                            {autosaveStatus === 'saving' && '⏳ Menyimpan...'}
                            {autosaveStatus === 'saved' && '✓ Tersimpan otomatis'}
                            {autosaveStatus === 'error' && '⚠️ Gagal menyimpan'}
                        </span>
                        <SessionTimer
                            startTime={session.start_time}
                            endTime={session.end_time}
                            onEndSession={handleEndSession}
                        />
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Skenario & Interactive Tabs */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tab Navigation Header */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-1 rounded-lg">
                            {[
                                { id: 'observations', label: '1. Observasi' },
                                { id: 'formative', label: '2. Formatif' },
                                { id: 'summative', label: '3. Sumatif' },
                                { id: 'reflection', label: '4. Refleksi Guru' },
                                { id: 'attendance', label: '5. Presensi (Absensi)' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 py-2 px-3 text-center text-xs font-bold rounded-md transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab 1: Observasi */}
                        {activeTab === 'observations' && (
                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base">Catatan Observasi Pembelajaran</CardTitle>
                                    <CardDescription className="text-xs">
                                        Catat perilaku, partisipasi, dan proses belajar siswa secara berkesadaran.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        {(sessionData.observations || []).map((obs, idx) => (
                                            <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border text-xs text-slate-800 dark:text-slate-200 flex justify-between items-center">
                                                <span>{idx + 1}. {obs}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSessionData({
                                                        ...sessionData,
                                                        observations: sessionData.observations?.filter((_, i) => i !== idx)
                                                    })}
                                                    className="text-rose-500 h-6 text-[10px]"
                                                >
                                                    Hapus
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Input
                                            placeholder="Tambah catatan observasi singkat..."
                                            value={newObservation}
                                            onChange={(e) => setNewObservation(e.target.value)}
                                            className="text-xs"
                                        />
                                        <Button onClick={handleAddObservation} className="bg-indigo-600 text-white text-xs">
                                            Tambah
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tab 2: Formatif */}
                        {activeTab === 'formative' && (
                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base">Asesmen Formatif Berkelanjutan</CardTitle>
                                    <CardDescription className="text-xs">
                                        Berikan umpan balik langsung selama proses belajar untuk penyesuaian strategi mengajar.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        {(sessionData.formative_assessments || []).map((item, idx) => (
                                            <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border text-xs flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.student_name}</span>
                                                    <span className="ml-2 font-mono text-indigo-600 font-bold">({item.score})</span>
                                                    {item.note && <p className="text-[11px] text-slate-500 mt-0.5">{item.note}</p>}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSessionData({
                                                        ...sessionData,
                                                        formative_assessments: sessionData.formative_assessments?.filter((_, i) => i !== idx)
                                                    })}
                                                    className="text-rose-500 h-6 text-[10px]"
                                                >
                                                    Hapus
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t">
                                        <Input
                                            placeholder="Nama Siswa"
                                            value={newFormativeName}
                                            onChange={(e) => setNewFormativeName(e.target.value)}
                                            className="text-xs"
                                        />
                                        <Input
                                            placeholder="Skor (0-100)"
                                            type="number"
                                            value={newFormativeScore}
                                            onChange={(e) => setNewFormativeScore(e.target.value)}
                                            className="text-xs"
                                        />
                                        <Input
                                            placeholder="Catatan / Umpan Balik"
                                            value={newFormativeNote}
                                            onChange={(e) => setNewFormativeNote(e.target.value)}
                                            className="text-xs"
                                        />
                                    </div>
                                    <Button onClick={handleAddFormative} className="w-full bg-indigo-600 text-white text-xs">
                                        + Simpan Catatan Formatif
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tab 3: Sumatif */}
                        {activeTab === 'summative' && (
                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base">Hasil Asesmen Sumatif (Akhir Pembelajaran)</CardTitle>
                                    <CardDescription className="text-xs">
                                        Catatan: Hanya nilai sumatif yang diolah untuk Rapor sesuai PPA 2025.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        Data sumatif diisi saat evaluasi akhir TP atau evaluasi proyek akhir modul.
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tab 4: Refleksi */}
                        {activeTab === 'reflection' && (
                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base">Refleksi & Tindak Lanjut Guru</CardTitle>
                                    <CardDescription className="text-xs">
                                        Evaluasi efektivitas pembelajaran untuk perbaikan pada materi selanjutnya.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <textarea
                                        rows={6}
                                        value={sessionData.reflection || ''}
                                        onChange={(e) => setSessionData({ ...sessionData, reflection: e.target.value })}
                                        placeholder="Tuliskan refleksi Anda: Apa yang berjalan baik? Apa tantangan yang dihadapi? Apa tindak lanjut untuk pertemuan berikutnya?"
                                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Tab 5: Presensi */}
                        {activeTab === 'attendance' && (
                            <AttendanceWidget attendances={attendances} />
                        )}
                    </div>

                    {/* Right Column: Widget Presensi Direct DB */}
                    <div className="space-y-6">
                        <AttendanceWidget attendances={attendances} />
                    </div>
                </div>
            </div>

            {/* Quick Assessment Floating Button */}
            <div className="fixed bottom-6 right-6 z-40">
                <Button 
                    onClick={() => setIsQuickAssessOpen(!isQuickAssessOpen)}
                    className="w-14 h-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white"
                >
                    {isQuickAssessOpen ? <X className="w-6 h-6" /> : <ClipboardCheck className="w-6 h-6" />}
                </Button>
            </div>

            {/* Quick Assessment Modal / Drawer */}
            {isQuickAssessOpen && (
                <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            <ClipboardCheck className="w-4 h-4 mr-2 text-indigo-600" />
                            Asesmen & Umpan Balik Cepat
                        </h3>
                    </div>
                    
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {attendances.map((student) => (
                            <div key={student.student_id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{student.student_name}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setSelectedStudentForFeedback(selectedStudentForFeedback === student.student_name ? null : student.student_name)}
                                        className="h-7 text-xs text-indigo-600 dark:text-indigo-400"
                                    >
                                        <MessageCircle className="w-3 h-3 mr-1" /> Umpan Balik
                                    </Button>
                                </div>
                                
                                {selectedStudentForFeedback === student.student_name && (
                                    <div className="mt-3 flex gap-2 animate-in fade-in">
                                        <Input 
                                            placeholder="Tulis pujian atau koreksi..."
                                            value={quickFeedbackText}
                                            onChange={(e) => setQuickFeedbackText(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                        <Button 
                                            size="sm" 
                                            className="h-8 bg-indigo-600 text-white px-2"
                                            onClick={() => handleSendQuickFeedback(student.student_name)}
                                        >
                                            <Send className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {attendances.length === 0 && (
                            <div className="text-center text-slate-500 text-xs py-4">Data siswa tidak tersedia untuk sesi ini.</div>
                        )}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
