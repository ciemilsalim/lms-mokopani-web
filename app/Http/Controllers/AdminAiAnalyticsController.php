<?php

namespace App\Http\Controllers;

use App\Models\LmsAiCache;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminAiAnalyticsController extends Controller
{
    /**
     * Display Admin AI Usage Analytics Dashboard.
     */
    public function index()
    {
        $totalCalls = LmsAiCache::count();
        $cacheHits = LmsAiCache::whereNotNull('generated_response')->count();
        $hitRate = $totalCalls > 0 ? round(($cacheHits / $totalCalls) * 100, 1) : 100.0;

        // Breakdown by prompt_type
        $promptTypes = LmsAiCache::select('prompt_type', DB::raw('count(*) as count'))
            ->groupBy('prompt_type')
            ->pluck('count', 'prompt_type')
            ->toArray();

        // School default settings
        $rawWeights = school_setting('rapor_default_weights', [0.2, 0.2, 0.2, 0.4]);
        if (is_string($rawWeights)) {
            $rawWeights = json_decode($rawWeights, true) ?? [0.2, 0.2, 0.2, 0.4];
        }

        $defaultThreshold = school_setting('kktp_default_threshold', 75.0);

        return Inertia::render('admin/ai-analytics/index', [
            'analytics' => [
                'total_calls' => $totalCalls,
                'cache_hits' => $cacheHits,
                'hit_rate_percentage' => $hitRate,
                'estimated_tokens_saved' => $cacheHits * 1250,
                'prompt_types_breakdown' => [
                    'tp_formulation' => $promptTypes['tp_formulation'] ?? 0,
                    'atp_ordering' => $promptTypes['atp_ordering'] ?? 0,
                    'kktp_rubric' => $promptTypes['kktp_rubric'] ?? 0,
                    'learning_steps' => $promptTypes['learning_steps'] ?? 0,
                    'rapor_description' => $promptTypes['rapor_description'] ?? 0,
                ],
            ],
            'settings' => [
                'rapor_default_weights' => $rawWeights,
                'kktp_default_threshold' => (float)$defaultThreshold,
            ]
        ]);
    }

    /**
     * Update default school weighting and KKTP threshold settings.
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'rapor_default_weights' => 'required|array',
            'kktp_default_threshold' => 'required|numeric|min:0|max:100',
        ]);

        Setting::updateOrCreate(
            ['key' => 'rapor_default_weights'],
            ['value' => json_encode($validated['rapor_default_weights'])]
        );

        Setting::updateOrCreate(
            ['key' => 'kktp_default_threshold'],
            ['value' => (string)$validated['kktp_default_threshold']]
        );

        return redirect()->back()->with('success', 'Pengaturan bobot & threshold default sekolah berhasil diperbarui.');
    }
}
