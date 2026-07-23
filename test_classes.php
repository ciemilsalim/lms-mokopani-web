<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$classes = \Illuminate\Support\Facades\DB::connection('mysql_absensi')
    ->table('school_classes')
    ->select('id', 'name', 'academic_year_id', 'semester_id')
    ->limit(10)
    ->get();
echo json_encode($classes);
