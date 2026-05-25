<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsP5SubElement extends Model
{
    protected $table = 'lms_p5_sub_elements';

    protected $fillable = ['element_id', 'nama', 'deskripsi', 'jenjang'];

    public function element()
    {
        return $this->belongsTo(LmsP5Element::class, 'element_id');
    }
}
