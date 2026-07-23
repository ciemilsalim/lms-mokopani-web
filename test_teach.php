<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$teachings = \Illuminate\Support\Facades\DB::connection('mysql_absensi')
    ->table('teaching_assignments')
    ->limit(10)
    ->get();
echo json_encode($teachings);
