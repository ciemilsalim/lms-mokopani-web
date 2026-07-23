<?php

namespace App\Http\Controllers;

use App\Models\LmsRaporReport;
use App\Services\RaporCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RaporReportController extends Controller
{
    protected RaporCalculationService $calculationService;

    public function __construct(RaporCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
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

        $description = $this->calculationService->generateQualitativeDescription($tpDetails, $threshold, $studentName);

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

        return response()->json([
            'status' => 'success',
            'message' => 'Nilai rapor berhasil dihitung dan disimpan.',
            'data' => $report
        ]);
    }

    /**
     * Download or retrieve Rapor report.
     */
    public function show($id)
    {
        $report = LmsRaporReport::with(['student', 'modulAjar', 'subject', 'schoolClass'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $report
        ]);
    }
}
