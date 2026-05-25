<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$service = app(App\Services\GeminiApiService::class);

echo "Menguji Koneksi API menggunakan model gemini-flash-latest..." . PHP_EOL;
try {
    // We temporary bypass config value in test script to force gemini-flash-latest
    $reflection = new \ReflectionClass($service);
    $prop = $reflection->getProperty('model');
    $prop->setAccessible(true);
    $prop->setValue($service, 'gemini-flash-latest');

    $result = $service->suggestLearningExperiences(
        "Siswa mampu memahami Array Satu Dimensi dan menggunakannya untuk memecahkan masalah.",
        "Array Satu Dimensi",
        "Informatika",
        "PBL"
    );

    if (!empty($result['understanding'])) {
        echo "   [✓] SUKSES BESAR! Terhubung ke Gemini API dengan model gemini-flash-latest!" . PHP_EOL;
        echo "   [✓] Hasil Saran AI untuk RPP (Memahami):" . PHP_EOL;
        echo "       " . trim(strip_tags($result['understanding'])) . PHP_EOL;
    } else {
        echo "   [✗] Respons kosong dari API. Pastikan kuota key aman." . PHP_EOL;
    }
} catch (\Exception $e) {
    echo "   [✗] Error: " . $e->getMessage() . PHP_EOL;
}
