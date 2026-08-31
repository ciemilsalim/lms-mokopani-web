<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\TeachingAssignment;
use App\Models\SchoolClass;
use App\Models\Teacher;
use App\Models\User;
use App\Models\AcademicYear;
use App\Models\Semester;

$activeYear = AcademicYear::getActive();
$activeSem = Semester::getActive();

echo "Active Year: " . ($activeYear?->name ?? 'None') . " (ID: " . ($activeYear?->id ?? '-') . ")\n";
echo "Active Semester: " . ($activeSem?->name ?? 'None') . " (ID: " . ($activeSem?->id ?? '-') . ")\n\n";

$users = User::with('teacher')->get();
foreach ($users as $u) {
    if ($u->teacher) {
        $query = TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $u->teacher->id);

        if ($activeYear && $activeSem) {
            $query->where(function ($q) use ($activeYear, $activeSem) {
                $q->where(function ($sub) use ($activeYear, $activeSem) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSem->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        }

        $teachings = $query->get()
            ->unique(fn ($t) => $t->subject_id . '-' . $t->school_class_id)
            ->sortBy(function ($t) {
                $className = $t->schoolClass?->name ?? '';
                $subjectName = $t->subject?->name ?? '';
                return sprintf('%-50s %-50s', $className, $subjectName);
            }, SORT_NATURAL)
            ->values();

        echo "User: {$u->name} | Resulting Gradebook Cards: " . $teachings->count() . "\n";
        foreach ($teachings as $t) {
            echo "   -> Card: [{$t->schoolClass?->name}] - {$t->subject?->name} (TA ID: {$t->id})\n";
        }
    }
}




