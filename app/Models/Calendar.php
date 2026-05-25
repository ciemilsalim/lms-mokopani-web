<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Calendar extends Model
{
    protected $table = 'calendars';

    protected $fillable = [
        'title',
        'start_date',
        'end_date',
        'description',
        'is_holiday',
        'is_self_study',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_holiday' => 'boolean',
        'is_self_study' => 'boolean',
    ];
}
