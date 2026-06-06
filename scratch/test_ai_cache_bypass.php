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
    
    // We call with regenerate = false (checking cache)
    echo "Attempting to get assessment from cache (regenerate = false)...\n";
    $result = $service->suggestAssessment($tp->id, 'formative_quiz', false);
    
    echo "Is last request online: " . ($service->isLastRequestOnline ? 'YES' : 'NO') . "\n";
    echo "Result Keys: " . implode(', ', array_keys($result)) . "\n";
    if (isset($result['questions'])) {
        echo "Questions count: " . count($result['questions']) . "\n";
        echo "First question text: " . ($result['questions'][0]['text'] ?? 'N/A') . "\n";
    } else {
        echo "Questions: NOT FOUND!\n";
    }
} else {
    echo "No TP found in DB.\n";
}
