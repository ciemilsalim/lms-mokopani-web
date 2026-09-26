<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SchoolClass extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'school_classes';

    protected $fillable = ['name', 'teacher_id', 'level_id', 'academic_year_id', 'semester_id'];

    public function students()
    {
        return $this->hasMany(Student::class, 'school_class_id');
    }
}
