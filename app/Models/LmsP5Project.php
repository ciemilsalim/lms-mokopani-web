<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsP5Project extends Model
{
    protected $table = 'lms_p5_projects';

    protected $fillable = [
        'judul',
        'deskripsi',
        'tema',
        'school_class_id',
        'academic_year_id',
        'semester_id',
        'dimensi_ids',
        'sub_element_ids',
        'alokasi_waktu',
        'status',
    ];

    protected $casts = [
        'dimensi_ids' => 'array',
        'sub_element_ids' => 'array',
    ];

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

    public function scores()
    {
        return $this->hasMany(LmsP5ProjectScore::class, 'project_id');
    }
}
