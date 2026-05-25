<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsStudentMaterial extends Model
{
    protected $fillable = [
        'student_id',
        'material_id',
        'completed_at',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function material()
    {
        return $this->belongsTo(LmsMaterial::class, 'material_id');
    }
}
