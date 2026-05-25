<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsReflection extends Model
{
    use HasFactory;

    protected $table = 'lms_reflections';

    protected $fillable = [
        'student_id',
        'assignment_id',
        'material_id',
        'understanding_level',
        'interesting_thing',
        'difficulty',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function assignment()
    {
        return $this->belongsTo(LmsAssignment::class);
    }

    public function material()
    {
        return $this->belongsTo(LmsMaterial::class);
    }
}
