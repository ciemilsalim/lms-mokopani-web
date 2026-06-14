<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsModulAjar extends Model
{
    use HasFactory;

    protected $table = 'lms_modul_ajars';

    protected $fillable = [
        'teacher_id',
        'subject_id',
        'school_class_id',
        'learning_objective_id',
        'material_id',
        'academic_year_id',
        'semester_id',
        'pedagogical_model',
        'general_info',
        'learning_design',
        'learning_steps',
        'assessment_plan',
        'kktp_details',
        'lkpd',
        'learning_resources',
        'ai_prompt_used',
    ];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function learningObjective()
    {
        return $this->belongsTo(LmsLearningObjective::class, 'learning_objective_id');
    }

    public function material()
    {
        return $this->belongsTo(LmsMaterial::class, 'material_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class);
    }
}
