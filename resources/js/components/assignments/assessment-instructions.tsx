import React from 'react';
import { FileText, Info, HelpCircle } from 'lucide-react';

interface AssessmentInstructionsProps {
    description?: string;
    instrumentType?: string | null;
    scoringTool?: string | null;
    onOpenKktpModal?: () => void;
    className?: string;
}

const instrumentTypeNames: Record<string, string> = {
    quiz_survey: 'Kuis Singkat / Survei',
    observation_checklist: 'Lembar Observasi & Ceklis',
    anecdotal_notes: 'Catatan Anekdotal',
    reflective_journal: 'Jurnal Reflektif',
    self_assessment: 'Penilaian Diri',
    peer_assessment: 'Penilaian Antarteman',
    formative_quiz: 'Tes / Penugasan Singkat',
    guided_discussion: 'Diskusi Terpandu',
    structured_assignment: 'Penugasan Terstruktur (LKPD)',
    exit_ticket: 'Exit Ticket / CATs',
    concept_map: 'Peta Konsep',
    performance_observation: 'Observasi Kinerja',
    performance: 'Penilaian Kinerja / Unjuk Kerja',
    written_test: 'Tes Tertulis',
    oral_test: 'Tes Lisan',
    project: 'Penilaian Proyek & Produk',
    portfolio: 'Portofolio',
    assignment: 'Penugasan (Laporan / Studi Kasus)',
};

const scoringToolNames: Record<string, string> = {
    rubric: 'Rubrik Penilaian',
    rating_scale: 'Skala Penilaian (Rating Scale)',
    checklist: 'Daftar Periksa (Checklist)',
    anecdotal_notes: 'Catatan Anekdotal',
};

export function AssessmentInstructions({
    description,
    instrumentType,
    scoringTool,
    onOpenKktpModal,
    className = '',
}: AssessmentInstructionsProps) {
    return (
        <div className={`rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4 shadow-xs ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                    </div>
                    <h2 className="text-sm font-bold text-foreground">Petunjuk & Panduan Pengerjaan</h2>
                </div>

                {onOpenKktpModal && (
                    <button
                        type="button"
                        onClick={onOpenKktpModal}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline min-h-[36px]"
                    >
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Kriteria KKTP</span>
                    </button>
                )}
            </div>

            {/* Description Text */}
            <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/20 p-4 rounded-xl border border-border/50">
                {description || 'Tidak ada petunjuk khusus untuk asesmen ini.'}
            </div>

            {/* Instrument & Scoring Metadata */}
            {(instrumentType || scoringTool) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {instrumentType && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 text-muted-foreground text-xs font-medium">
                            <Info className="h-3.5 w-3.5 text-primary" />
                            <span>Instrumen: <strong className="text-foreground">{instrumentTypeNames[instrumentType] || instrumentType}</strong></span>
                        </div>
                    )}
                    {scoringTool && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 text-muted-foreground text-xs font-medium">
                            <Info className="h-3.5 w-3.5 text-primary" />
                            <span>Alat Ukur: <strong className="text-foreground">{scoringToolNames[scoringTool] || scoringTool}</strong></span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
