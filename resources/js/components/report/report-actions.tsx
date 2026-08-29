import React from 'react';
import { Download, Printer, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportActionsProps {
    subjectId?: number;
    classId?: number;
    downloading?: boolean;
    onDownloadPdf?: () => void;
    onPrint?: () => void;
    onBack?: () => void;
    className?: string;
}

export function ReportActions({
    subjectId,
    classId,
    downloading = false,
    onDownloadPdf,
    onPrint = () => window.print(),
    onBack = () => window.history.back(),
    className = '',
}: ReportActionsProps) {
    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden', className)}>
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition active:scale-95 min-h-[44px]"
            >
                <ChevronLeft className="h-4 w-4" />
                <span>Kembali</span>
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {subjectId && classId && onDownloadPdf && (
                    <button
                        onClick={onDownloadPdf}
                        disabled={downloading}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                    >
                        <Download className="h-4 w-4" />
                        <span>{downloading ? 'Mengunduh...' : 'Unduh PDF Rapor'}</span>
                    </button>
                )}
                <button
                    onClick={onPrint}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition active:scale-95 min-h-[44px]"
                >
                    <Printer className="h-4 w-4" />
                    <span>Cetak Laporan</span>
                </button>
            </div>
        </div>
    );
}
