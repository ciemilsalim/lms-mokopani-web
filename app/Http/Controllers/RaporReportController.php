<?php

namespace App\Http\Controllers;

use App\Models\LmsRaporReport;
use App\Models\Student;
use App\Models\Subject;
use App\Models\LmsModulAjar;
use App\Services\RaporCalculationService;
use App\Services\AiManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class RaporReportController extends Controller
{
    protected RaporCalculationService $calculationService;

    public function __construct(RaporCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /**
     * Display Rapor Calculation Wizard page.
     */
    public function wizard()
    {
        $students = Student::with('schoolClass')->take(50)->get()->map(fn($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'nis' => $s->nis ?? $s->nisn ?? '-',
            'class_name' => $s->schoolClass?->name ?? 'VII-A',
            'school_class_id' => $s->school_class_id,
        ]);

        $subjects = Subject::all()->map(fn($sb) => [
            'id' => $sb->id,
            'name' => $sb->name,
            'code' => $sb->code ?? $sb->name,
        ]);

        return Inertia::render('rapor/wizard', [
            'students' => $students,
            'subjects' => $subjects,
        ]);
    }

    /**
     * Generate or calculate Rapor score (Summative only) according to PPA 2025.
     */
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|integer',
            'modul_ajar_id' => 'nullable|integer',
            'school_class_id' => 'nullable|integer',
            'subject_id' => 'nullable|integer',
            'calculation_method' => 'required|in:average,weighted,percentage',
            'tp_scores' => 'required|array', // ['TP 7.1' => 85, 'TP 7.2' => 83, ...]
            'tp_details' => 'nullable|array', // [['code' => 'TP 7.1', 'title' => '...', 'score' => 85]]
            'weights' => 'nullable|array', // [0.2, 0.2, 0.2, 0.4]
            'threshold' => 'nullable|numeric',
            'student_name' => 'nullable|string',
            'custom_description' => 'nullable|string',
        ]);

        $method = $validated['calculation_method'];
        $scores = $validated['tp_scores'];
        $weights = $validated['weights'] ?? [];
        $threshold = (float)($validated['threshold'] ?? 75.0);
        $studentName = $validated['student_name'] ?? 'Ananda';

        // Calculate final score
        $finalScore = 0.0;
        if ($method === 'average') {
            $finalScore = $this->calculationService->calculateAverage($scores);
        } elseif ($method === 'weighted') {
            $finalScore = $this->calculationService->calculateWeighted($scores, $weights);
        } elseif ($method === 'percentage') {
            $finalScore = $this->calculationService->calculatePercentage($scores, $threshold);
        }

        // Prepare details for qualitative description
        $tpDetails = $validated['tp_details'] ?? [];
        if (empty($tpDetails)) {
            foreach ($scores as $code => $score) {
                $tpDetails[] = [
                    'code' => $code,
                    'title' => $code,
                    'score' => $score,
                ];
            }
        }

        $description = $validated['custom_description'] ?? null;
        if (!$description) {
            $description = $this->calculationService->generateQualitativeDescription($tpDetails, $threshold, $studentName);
        }

        // Store or update report record
        $report = LmsRaporReport::updateOrCreate(
            [
                'student_id' => $validated['student_id'],
                'modul_ajar_id' => $validated['modul_ajar_id'] ?? null,
            ],
            [
                'school_class_id' => $validated['school_class_id'] ?? null,
                'subject_id' => $validated['subject_id'] ?? null,
                'calculation_method' => $method,
                'final_score' => $finalScore,
                'description' => $description,
                'tp_scores_breakdown' => [
                    'scores' => $scores,
                    'details' => $tpDetails,
                    'weights' => $weights,
                    'threshold' => $threshold,
                ],
                'created_by' => Auth::id() ?? 1,
            ]
        );

        return redirect()->route('rapor.show', $report->id)
            ->with('success', 'Nilai Rapor berhasil dihitung dan disimpan.');
    }

    /**
     * Show Rapor Report page (Pratinjau HTML & Cetak).
     */
    public function show($id)
    {
        $report = LmsRaporReport::with(['student', 'modulAjar', 'subject', 'schoolClass'])->findOrFail($id);

        return Inertia::render('rapor/show', [
            'report' => $report
        ]);
    }

    /**
     * Generate AI Qualitative Description for Rapor via OpenRouter.
     */
    public function generateAiDescription(Request $request, AiManager $aiManager)
    {
        $validated = $request->validate([
            'tp_details' => 'required|array',
            'student_name' => 'nullable|string',
        ]);

        $tpDetails = $validated['tp_details'];
        $studentName = $validated['student_name'] ?? 'Ananda';

        try {
            $aiDesc = $aiManager->generateRaporDescription($tpDetails, $studentName);
            return response()->json([
                'status' => 'success',
                'description' => $aiDesc
            ]);
        } catch (\Throwable $e) {
            Log::error('AI generateRaporDescription error: ' . $e->getMessage());
            $fallback = $this->calculationService->generateQualitativeDescription($tpDetails, 75.0, $studentName);
            return response()->json([
                'status' => 'fallback',
                'description' => $fallback
            ]);
        }
    }

    /**
     * Export Rapor Report to PDF (Laravel DomPDF).
     */
    public function exportPdf($id)
    {
        $report = LmsRaporReport::with(['student', 'subject', 'schoolClass', 'creator'])->findOrFail($id);

        $pdf = Pdf::loadView('reports.rapor_pdf', [
            'report' => $report,
            'school_name' => school_setting('school_name', 'SMP Negeri 1 Biau'),
            'headmaster_name' => school_setting('school_headmaster_name', 'Hj. Sitti Rahma, S.Pd., M.Pd.'),
            'headmaster_nip' => school_setting('school_headmaster_nip', '19750812 200003 2 001'),
        ]);

        return $pdf->download("Rapor_{$report->student?->name}_{$report->id}.pdf");
    }

    /**
     * Export Rapor Report to CSV.
     */
    public function exportCsv($id)
    {
        $report = LmsRaporReport::with(['student', 'subject', 'schoolClass'])->findOrFail($id);

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=Rapor_{$report->student?->name}_{$report->id}.csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use ($report) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Nama Siswa', 'NIS', 'Kelas', 'Mata Pelajaran', 'Metode Perhitungan', 'Nilai Akhir Rapor', 'Deskripsi Capaian Kompetensi']);
            fputcsv($file, [
                $report->student?->name ?? 'Siswa',
                $report->student?->nis ?? '-',
                $report->schoolClass?->name ?? '-',
                $report->subject?->name ?? '-',
                strtoupper($report->calculation_method),
                $report->final_score,
                $report->description
            ]);
            fputcsv($file, []);
            fputcsv($file, ['Kode TP', 'Deskripsi TP', 'Nilai Sumatif']);

            $details = $report->tp_scores_breakdown['details'] ?? [];
            foreach ($details as $tp) {
                fputcsv($file, [
                    $tp['code'] ?? '-',
                    $tp['title'] ?? '-',
                    $tp['score'] ?? 0
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
