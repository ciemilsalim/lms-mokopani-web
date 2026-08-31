<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\TeachingAssignment;
use App\Models\LmsAssignment;
use App\Models\LmsLearningObjective;
use App\Models\LmsSubmission;
use App\Models\Student;

$teachings = TeachingAssignment::with(['teacher', 'subject', 'schoolClass'])->get();
foreach ($teachings as $t) {
    echo "Teacher: " . ($t->teacher ? $t->teacher->name : 'None') . " (ID: {$t->teacher_id}) | Subject: " . ($t->subject ? $t->subject->name : 'None') . " ({$t->subject_id}) | Class: " . ($t->schoolClass ? $t->schoolClass->name : 'None') . " ({$t->school_class_id})\n";
    $tps = LmsLearningObjective::where('subject_id', $t->subject_id)->get();
    echo "  Total TPs for subject {$t->subject_id}: " . $tps->count() . "\n";
    foreach ($tps as $tp) {
        echo "    TP: {$tp->code} (ID: {$tp->id}, teacher_id: " . var_export($tp->teacher_id, true) . ", parent_id: " . var_export($tp->parent_id, true) . ")\n";
    }
    $assignments = LmsAssignment::where('subject_id', $t->subject_id)
        ->whereHas('schoolClasses', fn($q) => $q->where('school_classes.id', $t->school_class_id))
        ->get();
    echo "  Assignments for class {$t->school_class_id}: " . $assignments->count() . "\n";
    foreach ($assignments as $a) {
        $subs = LmsSubmission::where('assignment_id', $a->id)->get();
        echo "    Assignment [{$a->id}]: {$a->title} | Type: {$a->assessment_type} | TP ID: {$a->learning_objective_id} | Submissions: {$subs->count()}\n";
    }
}
