<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsMaterial extends Model
{
    use HasFactory;

    protected $table = 'lms_materials';

    protected $fillable = [
        'subject_id',
        'teacher_id',
        'academic_year_id',
        'semester_id',
        'learning_objective_id',
        'title',
        'content',
        'pedagogical_model',
        'learning_environment',
        'understanding_activity',
        'application_activity',
        'reflection_activity',
        'image_prompt',
        'lkpd',
        'file_path',
        'file_type',
        'external_link',
        'thumbnail',
        'order',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function schoolClasses()
    {
        return $this->belongsToMany(SchoolClass::class, 'lms_material_school_class', 'material_id', 'school_class_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class);
    }

    public function learningObjective()
    {
        return $this->belongsTo(LmsLearningObjective::class, 'learning_objective_id');
    }

    public function resources()
    {
        return $this->hasMany(LmsMaterialResource::class, 'material_id');
    }
}
