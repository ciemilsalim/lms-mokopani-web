<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\InstructionalSmartService;

$service = app(InstructionalSmartService::class);
$tp = \App\Models\LmsLearningObjective::first();

if ($tp) {
    echo "Using TP ID: {$tp->id} - {$tp->description}\n";
    
    // Test 1: Essay mode
    echo "\n=== TESTING ESSAY MODE ===\n";
    $resultEssay = $service->suggestAssessment($tp->id, 'formative_quiz', true, null, null, null, 'essay');
    echo "Is last request online: " . ($service->isLastRequestOnline ? 'YES' : 'NO') . "\n";
    echo "Quiz Mode returned: " . ($resultEssay['quiz_mode'] ?? 'N/A') . "\n";
    echo "Questions count: " . count($resultEssay['questions'] ?? []) . "\n";
    if (isset($resultEssay['questions'][0])) {
        echo "First question type: " . ($resultEssay['questions'][0]['type'] ?? 'N/A') . "\n";
        echo "First question text: " . ($resultEssay['questions'][0]['text'] ?? 'N/A') . "\n";
    }

    // Test 2: MCQ mode
    echo "\n=== TESTING MCQ MODE ===\n";
    $resultMcq = $service->suggestAssessment($tp->id, 'formative_quiz', true, null, null, null, 'mcq');
    echo "Is last request online: " . ($service->isLastRequestOnline ? 'YES' : 'NO') . "\n";
    echo "Quiz Mode returned: " . ($resultMcq['quiz_mode'] ?? 'N/A') . "\n";
    echo "Questions count: " . count($resultMcq['questions'] ?? []) . "\n";
    if (isset($resultMcq['questions'][0])) {
        echo "First question type: " . ($resultMcq['questions'][0]['type'] ?? 'N/A') . "\n";
        echo "First question text: " . ($resultMcq['questions'][0]['text'] ?? 'N/A') . "\n";
    }
} else {
    echo "No TP found in DB.\n";
}
