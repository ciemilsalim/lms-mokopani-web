<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsComment extends Model
{
    use HasFactory;

    protected $table = 'lms_comments';

    protected $fillable = [
        'user_id',
        'assignment_id',
        'material_id',
        'body',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
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
