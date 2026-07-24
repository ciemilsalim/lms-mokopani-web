<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsLearningObjective extends Model
{
    use HasFactory;

    protected $table = 'lms_learning_objectives';

    protected $fillable = [
        'subject_id',
        'school_class_id',
        'teacher_id',
        'academic_year_id',
        'semester_id',
        'code',
        'description',
        'order',
        'cp_id',
        'parent_id',
        'competence',
        'content',
        'formulation_method',
        'sequencing_method',
        'sequencing_notes',
        'time_allocation',
        'notes',
    ];

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function assignments()
    {
        return $this->hasMany(LmsAssignment::class, 'learning_objective_id');
    }

    public function capaianPembelajaran()
    {
        return $this->belongsTo(LmsCapaianPembelajaran::class, 'cp_id');
    }

    public function capaianPembelajarans()
    {
        return $this->belongsToMany(LmsCapaianPembelajaran::class, 'lms_tp_cp', 'tp_id', 'cp_id')->withTimestamps();
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function subObjectives()
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('order');
    }
}
