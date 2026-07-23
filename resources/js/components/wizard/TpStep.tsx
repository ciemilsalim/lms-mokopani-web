import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
        <div className="space-y-6">
            {/* CP Selection Card */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>1. Pilih Capaian Pembelajaran (CP)</span>
                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            PPA 2025
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Pilih CP dari kurikulum untuk dianalisis kompetensi dan materi esensialnya.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <select
                        value={selectedCpId || ''}
                        onChange={(e) => setSelectedCpId(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">-- Pilih Capaian Pembelajaran --</option>
                        {cpList.map((cp) => (
                            <option key={cp.id} value={cp.id}>
                                [{cp.elemen}] Fase {cp.fase} - {cp.nama}
                            </option>
                        ))}
                    </select>

                    {selectedCp && (
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                                Elemen: {selectedCp.elemen} (Fase {selectedCp.fase})
                            </p>
                            <p className="italic">"{selectedCp.capaian_pembelajaran}"</p>
                            <div className="pt-2 flex gap-2">
                                <Button
                                    onClick={handleSuggestTp}
                                    disabled={loadingAi}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-1.5 px-3 rounded-lg shadow transition-all"
                                >
                                    {loadingAi ? 'Menganalisis CP (AI OpenRouter)...' : '✨ Auto-Suggest TP (AI)'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Notifications / Alerts */}
            {aiSource && (
                <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300">
                    <AlertTitle className="font-bold text-xs">
                        {aiSource === 'cache' ? '⚡ Hasil dari Cache (TTL 1 Jam)' : '🤖 Hasil Analisis OpenRouter AI'}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        Guru wajib memeriksa dan menyetujui saran TP di bawah ini sebelum menyimpan.
                    </AlertDescription>
                </Alert>
            )}

            {errorMessage && (
                <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-300">
                    <AlertTitle className="font-bold text-xs">Mode Manual Aktif</AlertTitle>
                    <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                </Alert>
            )}

            {/* List of Formulated TPs */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Daftar Tujuan Pembelajaran (TP)</CardTitle>
                        <CardDescription className="text-xs">
                            Analisis Kompetensi + Materi ({approvedCount} disetujui)
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {tpList.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                            Belum ada TP. Klik "Auto-Suggest TP (AI)" di atas atau tambahkan TP manual di bawah.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tpList.map((tp, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                                        tp.approved
                                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-start gap-3 flex-1">
                                        <input
                                            type="checkbox"
                                            checked={tp.approved}
                                            onChange={() => toggleApproval(idx)}
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <div>
                                            <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mr-2">
                                                [{tp.code}]
                                            </span>
                                            <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                                                {tp.title}
                                            </span>
                                            {tp.description && tp.description !== tp.title && (
                                                <p className="text-[11px] text-slate-500 mt-0.5">{tp.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeTp(idx)}
                                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 h-7 text-xs px-2"
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Manual TP Addition Form */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            + Tambah TP Manual
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="Kode (mis: TP 7.1)"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                className="sm:w-32 text-xs"
                            />
                            <Input
                                placeholder="Rumusan Tujuan Pembelajaran (Kompetensi + Konten)"
                                value={manualTitle}
                                onChange={(e) => setManualTitle(e.target.value)}
                                className="flex-1 text-xs"
                            />
                            <Button
                                onClick={handleAddManualTp}
                                className="bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs py-1.5 px-4 rounded-lg font-medium hover:bg-slate-900"
                            >
                                Tambah
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-2">
                <Button
                    onClick={onNext}
                    disabled={approvedCount === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-lg shadow-md transition-all text-sm disabled:opacity-50"
                >
                    Lanjut ke Urutan ATP →
                </Button>
            </div>
        </div>
    );
};
