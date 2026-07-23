<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsKktpCriteria extends Model
{
    use HasFactory;

    protected $table = 'lms_kktp_criteria';

    protected $fillable = [
        'modul_ajar_id',
        'learning_objective_id',
        'approach',
        'mastery_threshold',
        'criteria_details',
    ];

    protected $casts = [
        'criteria_details' => 'array',
    ];

    public function modulAjar()
    {
        return $this->belongsTo(LmsModulAjar::class, 'modul_ajar_id');
    }

    public function learningObjective()
    {
        return $this->belongsTo(LmsLearningObjective::class, 'learning_objective_id');
    }
}
