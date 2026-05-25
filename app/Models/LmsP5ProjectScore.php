<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsP5ProjectScore extends Model
{
    protected $table = 'lms_p5_project_scores';

    protected $fillable = [
        'project_id',
        'student_id',
        'sub_element_id',
        'nilai',
        'catatan',
    ];

    public function project()
    {
        return $this->belongsTo(LmsP5Project::class, 'project_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function subElement()
    {
        return $this->belongsTo(LmsP5SubElement::class, 'sub_element_id');
    }
}
