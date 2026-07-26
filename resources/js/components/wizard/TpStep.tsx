import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, Sparkles, Plus, CheckCircle2, ChevronRight } from 'lucide-react';

export interface TpItem {
    id?: number;
    code: string;
    title: string;
    description?: string;
    approved: boolean;
}

interface TpStepProps {
    cpList: Array<{ id: number; nama: string; elemen: string; fase: string; capaian_pembelajaran: string }>;
    selectedCpId: number | null;
    setSelectedCpId: (id: number) => void;
    tpList: TpItem[];
    setTpList: React.Dispatch<React.SetStateAction<TpItem[]>>;
    onNext: () => void;
}

export const TpStep: React.FC<TpStepProps> = ({
    cpList,
    selectedCpId,
    setSelectedCpId,
    tpList,
    setTpList,
    onNext
}) => {
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiSource, setAiSource] = useState<'ai' | 'cache' | 'fallback' | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [manualTitle, setManualTitle] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const selectedCp = cpList.find((cp) => cp.id === selectedCpId);

    const handleSuggestTp = async () => {
        if (!selectedCp) return;
        setLoadingAi(true);
        setErrorMessage(null);

        try {
            const res = await axios.post('/api/ai/suggest-tp', {
                cp_id: selectedCp.id,
                cp_text: selectedCp.capaian_pembelajaran
            });

            if (res.data.status === 'success' || res.data.status === 'fallback') {
                setAiSource(res.data.source || 'ai');
                const suggested = res.data.data?.suggested_tps || [];

                if (suggested.length > 0) {
                    const formatted: TpItem[] = suggested.map((tp: any, index: number) => ({
                        code: tp.code || `TP ${index + 1}`,
                        title: tp.title || tp.description || '',
                        description: tp.description || '',
                        approved: true
                    }));
                    setTpList(formatted);
                } else if (res.data.status === 'fallback') {
                    setErrorMessage(res.data.message || 'Silakan buat TP secara manual.');
                }
            }
        } catch (err: any) {
            setErrorMessage('Gagal memanggil layanan AI. Mengaktifkan mode manual.');
        } finally {
            setLoadingAi(false);
        }
    };

    const handleAddManualTp = () => {
        if (!manualTitle.trim()) return;

        const newTp: TpItem = {
            code: manualCode.trim() || `TP ${tpList.length + 1}`,
            title: manualTitle.trim(),
            approved: true
        };

        setTpList([...tpList, newTp]);
        setManualCode('');
        setManualTitle('');
    };

    const toggleApproval = (index: number) => {
        const updated = [...tpList];
        updated[index].approved = !updated[index].approved;
        setTpList(updated);
    };

    const removeTp = (index: number) => {
        setTpList(tpList.filter((_, i) => i !== index));
    };

    const approvedCount = tpList.filter((tp) => tp.approved).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* CP Selection Card */}
            <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg shadow-slate-200/20 dark:shadow-none overflow-hidden transition-all duration-300">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                                1. Pilih Capaian Pembelajaran (CP)
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Pilih CP dari kurikulum untuk dianalisis kompetensi dan materi esensialnya.
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/70 w-fit">
                            PPA 2025
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                    <div className="relative">
                        <select
                            value={selectedCpId || ''}
                            onChange={(e) => setSelectedCpId(Number(e.target.value))}
                            className="w-full p-3 pl-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="">-- Pilih Capaian Pembelajaran --</option>
                            {cpList.map((cp) => (
                                <option key={cp.id} value={cp.id}>
                                    [{cp.elemen}] Fase {cp.fase} - {cp.nama}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight className="w-5 h-5 rotate-90" />
                        </div>
                    </div>

                    {selectedCp && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700/50 shadow-inner">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                            Elemen: {selectedCp.elemen} (Fase {selectedCp.fase})
                                        </p>
                                    </div>
                                    <p className="italic text-slate-600 dark:text-slate-400 text-sm leading-relaxed pl-4 border-l-2 border-indigo-200 dark:border-indigo-800/50">
                                        "{selectedCp.capaian_pembelajaran}"
                                    </p>
                                </div>
                                <Button
                                    onClick={handleSuggestTp}
                                    disabled={loadingAi}
                                    className="w-full md:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300 group"
                                >
                                    <Sparkles className={`w-4 h-4 mr-2 ${loadingAi ? 'animate-spin' : 'group-hover:animate-pulse'}`} />
                                    {loadingAi ? 'Menganalisis...' : 'Auto-Suggest TP (AI)'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Notifications / Alerts */}
            <div className="space-y-3">
                {aiSource && (
                    <Alert className="bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <AlertTitle className="font-bold text-sm ml-2">
                            {aiSource === 'cache' ? 'Hasil dari Cache (TTL 1 Jam)' : 'Hasil Analisis OpenRouter AI'}
                        </AlertTitle>
                        <AlertDescription className="text-xs ml-2 mt-1 opacity-90">
                            Guru wajib memeriksa dan menyetujui saran TP di bawah ini sebelum menyimpan.
                        </AlertDescription>
                    </Alert>
                )}

                {errorMessage && (
                    <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                        <AlertTitle className="font-bold text-sm">Mode Manual Aktif</AlertTitle>
                        <AlertDescription className="text-xs mt-1">{errorMessage}</AlertDescription>
                    </Alert>
                )}
            </div>

            {/* List of Formulated TPs */}
            <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg shadow-slate-200/20 dark:shadow-none overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Daftar Tujuan Pembelajaran (TP)</CardTitle>
                            <CardDescription className="mt-1">
                                Analisis Kompetensi + Materi 
                                <Badge variant="outline" className="ml-2 font-medium bg-white dark:bg-slate-800">
                                    <span className={approvedCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}>
                                        {approvedCount} disetujui
                                    </span>
                                </Badge>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                    {tpList.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 mb-3">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm px-4">
                                Belum ada TP. Klik "Auto-Suggest TP (AI)" di atas atau tambahkan secara manual.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tpList.map((tp, idx) => (
                                <div
                                    key={idx}
                                    className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                                        tp.approved
                                            ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700'
                                            : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100 grayscale hover:grayscale-0'
                                    }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-start gap-3">
                                        <div className="flex items-center justify-between md:justify-start w-full md:w-auto">
                                            {/* Mobile Checkbox (Top Left) */}
                                            <div className="flex items-center md:hidden">
                                                <input
                                                    type="checkbox"
                                                    checked={tp.approved}
                                                    onChange={() => toggleApproval(idx)}
                                                    className="h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-colors"
                                                />
                                            </div>
                                            {/* Mobile Delete (Top Right) */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeTp(idx)}
                                                className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 md:hidden"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Desktop Checkbox */}
                                        <div className="hidden md:flex items-start mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={tp.approved}
                                                onChange={() => toggleApproval(idx)}
                                                className="h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-colors"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <Badge variant="outline" className={`font-semibold text-xs ${tp.approved ? 'border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                    {tp.code}
                                                </Badge>
                                                <span className={`text-sm md:text-base font-medium ${tp.approved ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 line-through'}`}>
                                                    {tp.title}
                                                </span>
                                            </div>
                                            {tp.description && tp.description !== tp.title && (
                                                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-2 pl-1">
                                                    {tp.description}
                                                </p>
                                            )}
                                        </div>
                                        
                                        {/* Desktop Delete */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeTp(idx)}
                                            className="hidden md:flex text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Hapus
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Manual TP Addition Form */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                <Plus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Tambah TP Manual
                            </h3>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                            <Input
                                placeholder="Kode (mis: TP 7.1)"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                className="md:w-40 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors"
                            />
                            <Input
                                placeholder="Rumusan Tujuan Pembelajaran (Kompetensi + Konten)"
                                value={manualTitle}
                                onChange={(e) => setManualTitle(e.target.value)}
                                className="flex-1 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddManualTp();
                                }}
                            />
                            <Button
                                onClick={handleAddManualTp}
                                className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-slate-100 dark:text-slate-900 shadow-sm"
                            >
                                Tambah TP
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-4 pb-8">
                <Button
                    onClick={onNext}
                    disabled={approvedCount === 0}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-6 sm:py-5 rounded-xl shadow-lg shadow-indigo-200/50 dark:shadow-none hover:shadow-xl transition-all duration-300 text-base disabled:opacity-50 disabled:hover:shadow-none"
                >
                    Lanjut ke Urutan ATP 
                    <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
            </div>
        </div>
    );
};

