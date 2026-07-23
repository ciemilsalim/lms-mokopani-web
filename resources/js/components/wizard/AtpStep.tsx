import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TpItem } from './TpStep';

interface AtpStepProps {
    tpList: TpItem[];
    atpMethod: string;
    setAtpMethod: (method: string) => void;
    atpOrder: TpItem[];
    setAtpOrder: React.Dispatch<React.SetStateAction<TpItem[]>>;
    onBack: () => void;
    onNext: () => void;
}

const ATP_METHODS = [
    {
        id: 'Hierarki Konsep',
        name: 'Hierarki Konsep (Default)',
        desc: 'Memulai dari konsep dasar sebelum menuju ke konsep yang lebih kompleks.'
    },
    {
        id: 'Prosedural',
        name: 'Prosedural',
        desc: 'Mengajarkan tahap pertama dari sebuah prosedur, lalu lanjut ke tahap berikutnya.'
    },
    {
        id: 'Konkret ke Abstrak',
        name: 'Dari Konkret ke Abstrak',
        desc: 'Memulai dari konten yang berwujud nyata ke materi yang simbolis atau konseptual.'
    },
    {
        id: 'Scaffolding',
        name: 'Scaffolding',
        desc: 'Memberikan bantuan penuh di awal, lalu secara bertahap mengurangi bantuan hingga mandiri.'
    },
    {
        id: 'Mudah ke Sulit',
        name: 'Dari Mudah ke Sulit',
        desc: 'Dimulai dari materi yang paling mudah dipahami menuju materi bertingkat.'
    }
];

export const AtpStep: React.FC<AtpStepProps> = ({
    tpList,
    atpMethod,
    setAtpMethod,
    atpOrder,
    setAtpOrder,
    onBack,
    onNext
}) => {
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiSource, setAiSource] = useState<'ai' | 'cache' | 'fallback' | null>(null);

    // Initialize atpOrder from approved TPs if empty
    React.useEffect(() => {
        if (atpOrder.length === 0) {
            const approvedOnly = tpList.filter((tp) => tp.approved);
            setAtpOrder(approvedOnly);
        }
    }, [tpList]);

    const handleAutoSequence = async () => {
        const approvedOnly = tpList.filter((tp) => tp.approved);
        if (approvedOnly.length === 0) return;

        setLoadingAi(true);
        try {
            const res = await axios.post('/api/ai/suggest-atp', {
                tp_list: approvedOnly,
                method: atpMethod
            });

            if (res.data.status === 'success') {
                setAiSource(res.data.source || 'ai');
                const orderedResult = res.data.data?.ordered_tps;
                if (Array.isArray(orderedResult) && orderedResult.length > 0) {
                    const mapped: TpItem[] = orderedResult.map((item: any) => ({
                        code: item.code || '',
                        title: item.title || '',
                        description: item.focus || item.description || '',
                        approved: true
                    }));
                    setAtpOrder(mapped);
                }
            }
        } catch (err) {
            // Fallback: maintain current order
        } finally {
            setLoadingAi(false);
        }
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...atpOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newOrder.length) return;

        const temp = newOrder[index];
        newOrder[index] = newOrder[targetIndex];
        newOrder[targetIndex] = temp;

        setAtpOrder(newOrder);
    };

    return (
        <div className="space-y-6">
            {/* Method Selector Card */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>2. Penyusunan Alur Tujuan Pembelajaran (ATP)</span>
                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            PPA 2025
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Pilih metode pengurutan logis dari awal hingga akhir fase. ATP menentukan alur pelaksanaan di kelas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ATP_METHODS.map((method) => (
                            <div
                                key={method.id}
                                onClick={() => setAtpMethod(method.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    atpMethod === method.id
                                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{method.name}</p>
                                <p className="text-[11px] text-slate-500 mt-1">{method.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button
                            onClick={handleAutoSequence}
                            disabled={loadingAi}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-1.5 px-4 rounded-lg shadow"
                        >
                            {loadingAi ? 'Mengurutkan (AI OpenRouter)...' : `✨ Auto-Sequence (${atpMethod})`}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {aiSource && (
                <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300">
                    <AlertTitle className="font-bold text-xs">
                        {aiSource === 'cache' ? '⚡ Urutan ATP dari Cache' : '🤖 Urutan ATP Logis dari AI OpenRouter'}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        Anda dapat menyesuaikan kembali urutan dengan menggunakan tombol panah Naik / Turun di bawah.
                    </AlertDescription>
                </Alert>
            )}

            {/* Ordered ATP List Card */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Urutan Pelaksanaan ATP di Kelas</CardTitle>
                    <CardDescription className="text-xs">
                        Total {atpOrder.length} TP yang akan dilaksanakan secara berurutan
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {atpOrder.map((tp, idx) => (
                        <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                    {idx + 1}
                                </span>
                                <div>
                                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mr-2">
                                        [{tp.code}]
                                    </span>
                                    <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                                        {tp.title}
                                    </span>
                                </div>
                            </div>

                            {/* Up/Down buttons for mobile & touch friendly reordering */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={idx === 0}
                                    onClick={() => moveItem(idx, 'up')}
                                    className="h-7 w-7 p-0 text-xs"
                                >
                                    ▲
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={idx === atpOrder.length - 1}
                                    onClick={() => moveItem(idx, 'down')}
                                    className="h-7 w-7 p-0 text-xs"
                                >
                                    ▼
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={onBack} className="text-xs">
                    ← Kembali ke TP
                </Button>
                <Button
                    onClick={onNext}
                    disabled={atpOrder.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-lg shadow-md transition-all text-sm"
                >
                    Lanjut ke KKTP & Rubrik →
                </Button>
            </div>
        </div>
    );
};
