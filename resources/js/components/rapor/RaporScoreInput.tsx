import React from 'react';
import { RaporCalculationMethod } from './RaporMethodSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface TpScoreEntry {
    code: string;
    title: string;
    score: number;
    weight?: number;
}

interface RaporScoreInputProps {
    method: RaporCalculationMethod;
    entries: TpScoreEntry[];
    threshold: number;
    onChangeEntryScore: (index: number, score: number) => void;
    onChangeEntryWeight?: (index: number, weight: number) => void;
    onChangeThreshold?: (threshold: number) => void;
    calculatedScore: number;
}

export const RaporScoreInput: React.FC<RaporScoreInputProps> = ({
    method,
    entries,
    threshold,
    onChangeEntryScore,
    onChangeEntryWeight,
    onChangeThreshold,
    calculatedScore,
}) => {
    return (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base">Input Nilai Sumatif Per Tujuan Pembelajaran (TP)</CardTitle>
                        <CardDescription className="text-xs">
                            Masukkan nilai sumatif murni murid (skor 0 - 100) untuk tiap TP yang diujikan.
                        </CardDescription>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-950/50 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 text-right">
                        <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">
                            Hasil Nilai Rapor
                        </span>
                        <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300">
                            {calculatedScore.toFixed(1)}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Method Specific Controls */}
                {method === 'percentage' && (
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs">
                        <span className="font-semibold text-amber-800 dark:text-amber-200">
                            Ambang Batas Ketuntasan (KKTP Threshold):
                        </span>
                        <Input
                            type="number"
                            value={threshold}
                            onChange={(e) => onChangeThreshold && onChangeThreshold(Number(e.target.value))}
                            className="w-20 h-8 text-xs font-bold text-center bg-white dark:bg-slate-800"
                        />
                        <span className="text-amber-700 dark:text-amber-300 text-[11px]">
                            (TP dianggap tuntas jika skor ≥ {threshold})
                        </span>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-semibold text-[10px]">
                            <tr>
                                <th className="p-3 w-16">Kode</th>
                                <th className="p-3">Tujuan Pembelajaran</th>
                                <th className="p-3 w-28 text-center">Nilai Sumatif</th>
                                {method === 'weighted' && <th className="p-3 w-24 text-center">Bobot (%)</th>}
                                {method === 'percentage' && <th className="p-3 w-24 text-center">Status</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {entries.map((entry, idx) => {
                                const isPassed = entry.score >= threshold;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                        <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{entry.code}</td>
                                        <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{entry.title}</td>
                                        <td className="p-3 text-center">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={entry.score}
                                                onChange={(e) => onChangeEntryScore(idx, Number(e.target.value))}
                                                className="w-20 h-8 text-xs text-center mx-auto font-mono font-bold"
                                            />
                                        </td>
                                        {method === 'weighted' && (
                                            <td className="p-3 text-center">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={Math.round((entry.weight || 0.25) * 100)}
                                                    onChange={(e) =>
                                                        onChangeEntryWeight &&
                                                        onChangeEntryWeight(idx, Number(e.target.value) / 100)
                                                    }
                                                    className="w-16 h-8 text-xs text-center mx-auto font-mono"
                                                />
                                            </td>
                                        )}
                                        {method === 'percentage' && (
                                            <td className="p-3 text-center">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        isPassed
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                                    }`}
                                                >
                                                    {isPassed ? 'TUNTAS' : 'BELUM'}
                                                </span>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
