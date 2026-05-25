<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubjectAttendance extends Model
{
    use HasFactory;

    protected $table = 'subject_attendances';

    protected $fillable = [
        'schedule_id',
        'student_id',
        'teacher_id',
        'status',
        'notes',
        'academic_year_id',
        'semester_id',
    ];

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }
}
