<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$moduls = \App\Models\LmsModulAjar::with('learningObjective')->get();
foreach($moduls as $m) {
    echo "ID:{$m->id} Code:" . ($m->learningObjective->code ?? 'NULL') . " Desc:" . ($m->learningObjective->description ?? 'NULL') . "\n";
}
