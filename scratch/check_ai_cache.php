<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$caches = DB::table('lms_ai_caches')->get();
foreach ($caches as $cache) {
    echo "ID: " . $cache->id . "\n";
    echo "Hash: " . $cache->prompt_hash . "\n";
    echo "Type: " . $cache->prompt_type . "\n";
    echo "Payload: " . $cache->input_params . "\n";
    echo "Response Length: " . strlen($cache->generated_response) . "\n";
    $decoded = json_decode($cache->generated_response, true);
    if ($decoded) {
        echo "Keys: " . implode(', ', array_keys($decoded)) . "\n";
        if (isset($decoded['questions'])) {
            echo "Questions count: " . count($decoded['questions']) . "\n";
        }
    } else {
        echo "Response: " . substr($cache->generated_response, 0, 200) . "...\n";
    }
    echo "----------------------------------------\n";
}
