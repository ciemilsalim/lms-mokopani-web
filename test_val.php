<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$req = new \Illuminate\Http\Request([
    'subject_id' => '19', 
    'school_classes' => ['22', '20', '23', '27'], 
    'learning_objective_id' => '3', 
    'title' => 'Test', 
    'content' => 'Test Content', 
    'resources' => [['type' => 'link', 'value' => 'http://example.com']]
]);

$validator = \Illuminate\Support\Facades\Validator::make($req->all(), [
    'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
    'school_classes'        => 'required|array|min:1',
    'school_classes.*'      => 'exists:mysql_absensi.school_classes,id',
    'learning_objective_id' => 'nullable|exists:lms_learning_objectives,id',
    'title'                 => 'required|string|max:255',
    'content'               => 'nullable|string',
    'external_link'         => 'nullable|url|max:255',
    'resources'             => 'nullable|array',
]);

if ($validator->fails()) { 
    echo json_encode($validator->errors()->all()); 
} else { 
    echo "Passed\n"; 
}
