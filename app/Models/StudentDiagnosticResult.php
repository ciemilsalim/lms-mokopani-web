<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentDiagnosticResult extends Model
{
    protected $table = 'student_diagnostic_results';

    protected $fillable = [
        'student_id',
        'assignment_id',
        'subject_id',
        'learning_objective_id',
        'total_score',
        'pass_threshold',
        'is_passed',
        'topic_breakdown',
        'recommendations',
    ];

    protected $casts = [
        'total_score'     => 'decimal:2',
        'pass_threshold'  => 'decimal:2',
        'is_passed'       => 'boolean',
        'topic_breakdown' => 'array',
        'recommendations' => 'array',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function assignment()
    {
        return $this->belongsTo(LmsAssignment::class, 'assignment_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function learningObjective()
    {
        return $this->belongsTo(LmsLearningObjective::class, 'learning_objective_id');
    }
}
