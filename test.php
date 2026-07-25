<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$modul = \App\Models\LmsModulAjar::with('learningObjective')->first();
echo "TP Code: " . ($modul->learningObjective->code ?? 'NULL') . "\n";
echo "TP Description: " . ($modul->learningObjective->description ?? 'NULL') . "\n";
