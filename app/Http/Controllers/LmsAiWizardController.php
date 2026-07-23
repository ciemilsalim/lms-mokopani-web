<?php

namespace App\Http\Controllers;

use App\Models\LmsAiCache;
use App\Models\LmsCapaianPembelajaran;
use App\Services\AiManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LmsAiWizardController extends Controller
{
    /**
     * Helper to clean JSON response string from AI markdown formatting (e.g. ```json ... ```)
     */
    private function cleanJsonResponse(string $rawResponse): array
    {
        $clean = preg_replace('/^```(?:json)?\s*/i', '', trim($rawResponse));
        $clean = preg_replace('/\s*```$/', '', $clean);
        
        $decoded = json_decode($clean, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        return ['raw' => $rawResponse];
    }

    /**
     * Suggest TP from CP based on PPA 2025 (competence + content analysis).
     */
    public function suggestTp(Request $request, AiManager $aiManager)
    {
        $validated = $request->validate([
            'cp_id' => 'nullable|integer',
            'cp_text' => 'nullable|string',
        ]);

        $cpText = $validated['cp_text'] ?? null;

        if (!$cpText && !empty($validated['cp_id'])) {
            $cpModel = LmsCapaianPembelajaran::find($validated['cp_id']);
            $cpText = $cpModel?->capaian_pembelajaran ?? $cpModel?->nama;
        }

        if (!$cpText) {
            return response()->json([
                'status' => 'error',
                'message' => 'Capaian Pembelajaran (CP) tidak ditemukan.',
                'data' => null
            ], 400);
        }

        $hash = md5('suggest_tp_' . $cpText);
        $cached = LmsAiCache::getCache($hash);

        if ($cached) {
            return response()->json([
                'status' => 'success',
                'source' => 'cache',
                'data' => $this->cleanJsonResponse($cached)
            ]);
        }

        try {
            $aiResult = $aiManager->suggestTpFromCp($cpText);
            LmsAiCache::setCache($hash, 'tp', ['cp_text' => $cpText], $aiResult);

            return response()->json([
                'status' => 'success',
                'source' => 'ai',
                'data' => $this->cleanJsonResponse($aiResult)
            ]);
        } catch (\Throwable $e) {
            Log::error('AI suggestTp error: ' . $e->getMessage());

            return response()->json([
                'status' => 'fallback',
                'message' => 'Layanan AI sedang tidak dapat dijangkau. Silakan buat TP secara manual.',
                'data' => [
                    'competencies' => [],
                    'contents' => [],
                    'suggested_tps' => []
                ]
            ]);
        }
    }

    /**
     * Suggest ATP Order using chosen PPA 2025 method.
     */
    public function suggestAtp(Request $request, AiManager $aiManager)
    {
        $validated = $request->validate([
            'tp_list' => 'required|array',
            'method' => 'nullable|string',
        ]);

        $tpList = $validated['tp_list'];
        $method = $validated['method'] ?? 'Hierarki Konsep';

        $hash = md5('suggest_atp_' . $method . '_' . json_encode($tpList));
        $cached = LmsAiCache::getCache($hash);

        if ($cached) {
            return response()->json([
                'status' => 'success',
                'source' => 'cache',
                'data' => $this->cleanJsonResponse($cached)
            ]);
        }

        try {
            $aiResult = $aiManager->suggestAtpOrder($tpList, $method);
            LmsAiCache::setCache($hash, 'atp', ['tp_list' => $tpList, 'method' => $method], $aiResult);

            return response()->json([
                'status' => 'success',
                'source' => 'ai',
                'data' => $this->cleanJsonResponse($aiResult)
            ]);
        } catch (\Throwable $e) {
            Log::error('AI suggestAtp error: ' . $e->getMessage());

            return response()->json([
                'status' => 'fallback',
                'message' => 'Layanan AI sedang tidak dapat dijangkau. Silakan urutkan ATP secara manual.',
                'data' => [
                    'method' => $method,
                    'ordered_tps' => $tpList
                ]
            ]);
        }
    }

    /**
     * Generate KKTP Rubric (4 levels) for a given TP.
     */
    public function generateKktp(Request $request, AiManager $aiManager)
    {
        $validated = $request->validate([
            'tp_text' => 'required|string',
        ]);

        $tpText = $validated['tp_text'];
        $hash = md5('generate_kktp_' . $tpText);
        $cached = LmsAiCache::getCache($hash);

        if ($cached) {
            return response()->json([
                'status' => 'success',
                'source' => 'cache',
                'data' => $this->cleanJsonResponse($cached)
            ]);
        }

        try {
            $aiResult = $aiManager->generateKktpRubric($tpText);
            LmsAiCache::setCache($hash, 'kktp', ['tp_text' => $tpText], $aiResult);

            return response()->json([
                'status' => 'success',
                'source' => 'ai',
                'data' => $this->cleanJsonResponse($aiResult)
            ]);
        } catch (\Throwable $e) {
            Log::error('AI generateKktp error: ' . $e->getMessage());

            return response()->json([
                'status' => 'fallback',
                'message' => 'Layanan AI sedang tidak dapat dijangkau. Silakan susun KKTP secara manual.',
                'data' => [
                    'approach' => 'rubric',
                    'mastery_threshold' => 'Cakap',
                    'rubric_levels' => [
                        'baru_berkembang' => '',
                        'layak' => '',
                        'cakap' => '',
                        'mahir' => ''
                    ]
                ]
            ]);
        }
    }
}
