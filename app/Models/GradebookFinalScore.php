<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GradebookFinalScore extends Model
{
    protected $fillable = [
        'student_id',
        'subject_id',
        'school_class_id',
        'academic_year_id',
        'semester_id',
        'score',
    ];

    protected $casts = [
        'score' => 'integer',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
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
