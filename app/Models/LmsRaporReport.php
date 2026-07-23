<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsRaporReport extends Model
{
    use HasFactory;

    protected $table = 'lms_rapor_reports';

    protected $fillable = [
        'student_id',
        'modul_ajar_id',
        'school_class_id',
        'subject_id',
        'calculation_method',
        'final_score',
        'description',
        'tp_scores_breakdown',
        'created_by',
    ];

    protected $casts = [
        'final_score' => 'float',
        'tp_scores_breakdown' => 'array',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function modulAjar()
    {
        return $this->belongsTo(LmsModulAjar::class, 'modul_ajar_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
