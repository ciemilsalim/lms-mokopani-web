<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsFeedbackRevision extends Model
{
    protected $table = 'lms_feedback_revisions';

    protected $fillable = [
        'submission_id',
        'teacher_id',
        'feedback',
        'status',
        'revision_count',
    ];

    protected $casts = [
        'revision_count' => 'integer',
    ];

    public function submission()
    {
        return $this->belongsTo(LmsSubmission::class, 'submission_id');
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }
}
