<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\InstructionalSmartService;

$service = app(InstructionalSmartService::class);
$tpId = 1; // Let's use the first TP id in database
$tp = \App\Models\LmsLearningObjective::first();
if ($tp) {
    echo "Using TP ID: {$tp->id} - {$tp->description}\n";
    $result = $service->suggestAssessment($tp->id, 'formative_quiz', true); // Force regenerate to bypass cache
    echo "Is last request online: " . ($service->isLastRequestOnline ? 'YES' : 'NO') . "\n";
    echo "Result Keys: " . implode(', ', array_keys($result)) . "\n";
    echo "Result questions: " . json_encode($result['questions'] ?? null, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "No TP found in DB.\n";
}
