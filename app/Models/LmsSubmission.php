<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsSubmission extends Model
{
    use HasFactory;

    protected $table = 'lms_submissions';

    protected $fillable = [
        'assignment_id',
        'student_id',
        'content',
        'file_path',
        'score',
        'qualitative_score',
        'kktp_details',
        'attempts',
        'is_remedial_open',
        'remedial_history',
        'feedback',
        'submitted_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'is_remedial_open' => 'boolean',
        'remedial_history' => 'array',
        'kktp_details' => 'array',
    ];

    public function assignment()
    {
        return $this->belongsTo(LmsAssignment::class, 'assignment_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
