<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsRemedialRecord extends Model
{
    protected $table = 'lms_remedial_records';

    protected $fillable = [
        'student_id',
        'assignment_id',
        'subject_id',
        'teacher_id',
        'type',
        'initial_score',
        'remedial_score',
        'remedial_strategy',
        'remedial_focus',
        'description',
        'due_date',
        'status',
    ];

    protected $casts = [
        'due_date' => 'date',
        'initial_score' => 'integer',
        'remedial_score' => 'integer',
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

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }
}
