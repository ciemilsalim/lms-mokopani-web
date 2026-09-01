<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $table = 'subjects';

    protected $fillable = ['name', 'code', 'description', 'fase', 'kktp', 'category', 'religion_key'];

    public function isReligion(): bool
    {
        return $this->category === 'religion';
    }

    public function materials()
    {
        return $this->hasMany(LmsMaterial::class);
    }

    public function assignments()
    {
        return $this->hasMany(LmsAssignment::class);
    }

    public function teachingAssignments()
    {
        return $this->hasMany(TeachingAssignment::class);
    }

    public function teachers()
    {
        return $this->belongsToMany(Teacher::class, 'subject_teacher');
    }
}
