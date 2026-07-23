import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TpScoreEntry } from './RaporScoreInput';

interface RaporDescriptionEditorProps {
    description: string;
    onChangeDescription: (desc: string) => void;
    tpDetails: TpScoreEntry[];
    studentName: string;
}

export const RaporDescriptionEditor: React.FC<RaporDescriptionEditorProps> = ({
    description,
    onChangeDescription,
    tpDetails,
    studentName,
}) => {
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    const handleGenerateAi = async () => {
        setIsLoadingAi(true);
        try {
            const res = await axios.post('/api/rapor/generate-description', {
                tp_details: tpDetails,
                student_name: studentName,
            });
            if (res.data?.description) {
                onChangeDescription(res.data.description);
            }
        } catch (err) {
            alert('Gagal menyusun deskripsi AI. Menggunakan deskripsi otomatis bawaan.');
        } finally {
            setIsLoadingAi(false);
        }
    };

    return (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base">Deskripsi Capaian Kompetensi (Kualitatif PPA 2025)</CardTitle>
                        <CardDescription className="text-xs">
                            Deskripsi bernada positif yang menyoroti penguasaan kompetensi serta area yang masih memerlukan bimbingan.
                        </CardDescription>
                    </div>

                    <Button
                        type="button"
                        onClick={handleGenerateAi}
                        disabled={isLoadingAi}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow"
                    >
                        {isLoadingAi ? '⏳ Menyusun Narasi AI...' : '✨ Generasi Deskripsi (AI OpenRouter)'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => onChangeDescription(e.target.value)}
                    placeholder="Contoh: Ananda menunjukkan penguasaan yang baik dalam menerapkan 4 fondasi berpikir komputasional... Namun, Ananda masih perlu bimbingan dalam merancang algoritma kompleks."
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                />
            </CardContent>
        </Card>
    );
};
