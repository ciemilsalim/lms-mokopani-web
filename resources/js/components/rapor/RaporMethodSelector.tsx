import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type RaporCalculationMethod = 'average' | 'weighted' | 'percentage';

interface RaporMethodSelectorProps {
    selectedMethod: RaporCalculationMethod;
    onSelectMethod: (method: RaporCalculationMethod) => void;
}

export const RaporMethodSelector: React.FC<RaporMethodSelectorProps> = ({
    selectedMethod,
    onSelectMethod,
}) => {
    const methods = [
        {
            id: 'average' as RaporCalculationMethod,
            title: '1. Opsi Rata-rata',
            subtitle: 'Materi Antar-TP Bersifat Lepas',
            badge: 'Standar PPA 2025',
            description:
                'Cocok jika karakteristik materi tiap TP mandiri dan bukan prasyarat materi berikutnya. Nilai Akhir dihitung dari rata-rata murni seluruh skor sumatif TP.',
            formula: 'Nilai = (TP1 + TP2 + ... + TPn) / n',
        },
        {
            id: 'weighted' as RaporCalculationMethod,
            title: '2. Opsi Pembobotan',
            subtitle: 'Materi Progresif & Kompleksitas Tinggi',
            badge: 'Progresif',
            description:
                'Cocok jika materi saling berkaitan/berjenjang. Memberikan bobot lebih besar (misal 40%) pada materi TP akhir yang tingkat kesulitannya lebih tinggi.',
            formula: 'Nilai = (TP1×20% + TP2×20% + TP3×20% + TP4×40%)',
        },
        {
            id: 'percentage' as RaporCalculationMethod,
            title: '3. Opsi Persentase Ketuntasan',
            subtitle: 'Tingkat Dikuasai vs Total TP',
            badge: 'Ambang Batas',
            description:
                'Dihitung dari persentase jumlah TP yang berhasil dikuasai murid melebihi threshold kriteria (misal minimal skor 75).',
            formula: 'Nilai = (Jumlah TP Tuntas / Total TP) × 100',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {methods.map((item) => {
                const isSelected = selectedMethod === item.id;
                return (
                    <Card
                        key={item.id}
                        onClick={() => onSelectMethod(item.id)}
                        className={`p-4 cursor-pointer transition-all border-2 relative ${
                            isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md scale-[1.01]'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <Badge
                                variant={isSelected ? 'default' : 'outline'}
                                className={isSelected ? 'bg-indigo-600 text-white' : 'text-slate-500'}
                            >
                                {item.badge}
                            </Badge>
                            {isSelected && (
                                <span className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                                    ✓
                                </span>
                            )}
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.title}</h3>
                        <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">{item.subtitle}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                            {item.description}
                        </p>

                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono text-[10px] text-slate-500 bg-slate-100/50 dark:bg-slate-800/40 p-2 rounded">
                            {item.formula}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};
