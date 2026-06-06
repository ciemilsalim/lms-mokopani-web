<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\InstructionalSmartService;
use App\Models\LmsAiCache;

$service = app(InstructionalSmartService::class);
$tp = \App\Models\LmsLearningObjective::where('description', 'LIKE', '%menganalisis gagasan dan pandangan pembicara%')->first();

if ($tp) {
    echo "Using TP ID: {$tp->id}\n";
    $materialTitle = "Menyingkap Tabir Opini: Analisis Kritis Gagasan dan Pandangan Pembicara dalam Podcast Isu Lingkungan";
    $materialContent = "Konsep Dasar Teks Nonsastra Aural...";
    
    // Check what is currently in cache for this hash before our call
    $hash = md5('assessment_' . $tp->description . ("Judul Materi: " . $materialTitle . "\nUraian Materi:\n" . strip_tags($materialContent)) . 'formative_quiz');
    $cachedBefore = LmsAiCache::getCache($hash);
    echo "Cached response exists before: " . ($cachedBefore ? 'YES' : 'NO') . "\n";
    if ($cachedBefore) {
        $decoded = json_decode($cachedBefore, true);
        echo "Cached keys before: " . implode(', ', array_keys($decoded)) . "\n";
    }
    
    // Call suggestAssessment with regenerate = false
    echo "Calling suggestAssessment (regenerate = false)...\n";
    $result = $service->suggestAssessment($tp->id, 'formative_quiz', false, $materialTitle, $materialContent);
    
    echo "Result keys after call: " . implode(', ', array_keys($result)) . "\n";
    if (isset($result['questions'])) {
        echo "Questions count: " . count($result['questions']) . "\n";
    } else {
        echo "Questions: NOT FOUND!\n";
    }
    
    // Check cache after call
    $cachedAfter = LmsAiCache::getCache($hash);
    if ($cachedAfter) {
        $decodedAfter = json_decode($cachedAfter, true);
        echo "Cached keys after: " . implode(', ', array_keys($decodedAfter)) . "\n";
    }
} else {
    echo "TP not found.\n";
}
