import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface AttendanceStudent {
    student_id: number;
    student_name: string;
    nis: string;
    status: 'hadir' | 'sakit' | 'izin' | 'alpha' | 'bolos' | string;
    notes?: string;
}

interface AttendanceWidgetProps {
    attendances: AttendanceStudent[];
}

export const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({ attendances }) => {
    const total = attendances.length;
    const hadir = attendances.filter((a) => a.status === 'hadir').length;
    const sakit = attendances.filter((a) => a.status === 'sakit').length;
    const izin = attendances.filter((a) => a.status === 'izin').length;
    const alpha = attendances.filter((a) => a.status === 'alpha' || a.status === 'bolos').length;

    const hadirPercentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span>📋 Presensi Kelas (Aplikasi Absensi)</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                        Terintegrasi Direct DB
                    </Badge>
                </CardTitle>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kehadiran: <span className="text-emerald-600 dark:text-emerald-400">{hadirPercentage}%</span> ({hadir}/{total})
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Status Summary Pills */}
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Hadir</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{hadir}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Sakit</p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{sakit}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">Izin</p>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{izin}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase">Alpha</p>
                        <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{alpha}</p>
                    </div>
                </div>

                {/* Compact Student List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {attendances.map((student) => (
                        <div
                            key={student.student_id}
                            className="flex items-center justify-between p-2 rounded bg-slate-50/70 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800"
                        >
                            <div>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{student.student_name}</span>
                                <span className="text-[10px] text-slate-400 ml-2">({student.nis})</span>
                            </div>
                            <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    student.status === 'hadir'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                        : student.status === 'sakit'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                        : student.status === 'izin'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                }`}
                            >
                                {student.status}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
