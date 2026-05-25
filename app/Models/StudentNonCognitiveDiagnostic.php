<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentNonCognitiveDiagnostic extends Model
{
    protected $table = 'student_non_cognitive_diagnostics';

    protected $fillable = [
        'student_id',
        'subject_id',
        'learning_style',
        'learning_style_detail',
        'motivation_level',
        'interests',
        'family_background',
        'notes',
    ];

    protected $casts = [
        'learning_style_detail' => 'array',
        'motivation_level'      => 'array',
        'interests'             => 'array',
        'family_background'     => 'array',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
