<?php

$files = [
    'app/Http/Controllers/DashboardController.php',
    'app/Http/Controllers/ParentController.php',
    'app/Http/Controllers/RaporController.php',
    'app/Http/Controllers/SubjectController.php',
    'app/Http/Controllers/MaterialController.php',
    'app/Http/Controllers/GradebookController.php',
];

foreach ($files as $file) {
    $content = file_get_contents($file);
    
    // For DashboardController
    $content = str_replace(
        "LmsMaterial::where('school_class_id', \$student->school_class_id)",
        "LmsMaterial::whereHas('schoolClasses', function (\$q) use (\$student) { \$q->where('school_classes.id', \$student->school_class_id); })",
        $content
    );
    $content = str_replace(
        "LmsAssignment::where('school_class_id', \$student->school_class_id)",
        "LmsAssignment::whereHas('schoolClasses', function (\$q) use (\$student) { \$q->where('school_classes.id', \$student->school_class_id); })",
        $content
    );
    $content = preg_replace(
        "/LmsAssignment::where\('subject_id', \\\$subject->id\)\s*->where\('school_class_id', \\\$student->school_class_id\)/",
        "LmsAssignment::where('subject_id', \$subject->id)->whereHas('schoolClasses', function (\$q) use (\$student) { \$q->where('school_classes.id', \$student->school_class_id); })",
        $content
    );

    // For Gradebook, Rapor, Parent
    $content = str_replace(
        "LmsAssignment::where('school_class_id', \$classId)",
        "LmsAssignment::whereHas('schoolClasses', function (\$q) use (\$classId) { \$q->where('school_classes.id', \$classId); })",
        $content
    );
    $content = str_replace(
        "LmsAssignment::where('school_class_id', \$child->school_class_id)",
        "LmsAssignment::whereHas('schoolClasses', function (\$q) use (\$child) { \$q->where('school_classes.id', \$child->school_class_id); })",
        $content
    );
    
    // For SubjectController
    $content = str_replace(
        "->where('school_class_id', \$studentClassId)",
        "->whereHas('schoolClasses', function (\$q) use (\$studentClassId) { \$q->where('school_classes.id', \$studentClassId); })",
        $content
    );

    file_put_contents($file, $content);
}
echo "Done.\n";
