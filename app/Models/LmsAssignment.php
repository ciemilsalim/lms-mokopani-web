<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsAssignment extends Model
{
    use HasFactory;

    protected $table = 'lms_assignments';

    protected $fillable = [
        'assessment_type',
        'instrument_type',
        'instrument_config',
        'scoring_tool',
        'scoring_tool_config',
        'subject_id',
        'teacher_id',
        'learning_objective_id',
        'school_class_id',
        'academic_year_id',
        'semester_id',
        'title',
        'description',
        'due_date',
        'max_points',
        'passing_grade',
        'order',
    ];

    protected $casts = [
        'due_date'             => 'datetime',
        'instrument_config'    => 'array',
        'scoring_tool_config'  => 'array',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class);
    }

    public function submissions()
    {
        return $this->hasMany(LmsSubmission::class, 'assignment_id');
    }

    public function learningObjective()
    {
        return $this->belongsTo(LmsLearningObjective::class, 'learning_objective_id');
    }
}
