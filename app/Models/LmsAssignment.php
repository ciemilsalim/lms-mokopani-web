<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsAssignment extends Model
{
    use HasFactory;

    protected $table = 'lms_assignments';

    protected $fillable = [
        'assessment_type',
        'instrument_type',
        'instrument_config',
        'scoring_tool',
        'scoring_tool_config',
        'subject_id',
        'teacher_id',
        'learning_objective_id',
        'academic_year_id',
        'semester_id',
        'title',
        'description',
        'due_date',
        'max_points',
        'passing_grade',
        'order',
    ];

    protected $casts = [
        'due_date'             => 'datetime',
        'instrument_config'    => 'array',
        'scoring_tool_config'  => 'array',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function schoolClasses()
    {
        return $this->belongsToMany(SchoolClass::class, 'lms_assignment_school_class', 'assignment_id', 'school_class_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class);
    }

    public function submissions()
    {
        return $this->hasMany(LmsSubmission::class, 'assignment_id');
    }

    public function learningObjective()
    {
        return $this->belongsTo(LmsLearningObjective::class, 'learning_objective_id');
    }

    public function evaluateKetuntasan($submission = null, $scoreVal = null): bool
    {
        if (!$submission && $scoreVal === null) {
            return false;
        }

        $score = $scoreVal ?? ($submission && $submission->score !== null ? (float) $submission->score : null);
        $config = $this->instrument_config ?? [];
        if (is_string($config)) {
            $config = json_decode($config, true) ?? [];
        }
        $kktp = $config['kktp'] ?? null;
        $parsed = [];
        if ($submission && !empty($submission->content)) {
            if (is_string($submission->content)) {
                $parsed = json_decode($submission->content, true) ?? [];
            } elseif (is_array($submission->content)) {
                $parsed = $submission->content;
            }
        }

        if ($kktp && is_array($kktp)) {
            $approach = $kktp['approach'] ?? '';

            // 1. Approach: score_interval / interval / score
            if (in_array($approach, ['score_interval', 'interval', 'score'])) {
                $intervals = $kktp['intervals'] ?? [];
                if (!empty($intervals) && $score !== null) {
                    $s = (float) $score;
                    foreach ($intervals as $iv) {
                        $min = (float) ($iv['min'] ?? 0);
                        $max = (float) ($iv['max'] ?? 100);
                        if ($s >= $min && $s <= $max) {
                            $str = strtolower(($iv['status'] ?? '') . ' ' . ($iv['label'] ?? '') . ' ' . ($iv['desc'] ?? ''));
                            if ((str_contains($str, 'tuntas') || str_contains($str, 'sudah') || str_contains($str, 'mencapai') || str_contains($str, 'pengayaan')) && !str_contains($str, 'belum') && !str_contains($str, 'hampir') && !str_contains($str, 'remedial')) {
                                return true;
                            }
                            if (str_contains($str, 'belum') || str_contains($str, 'hampir') || str_contains($str, 'remedial')) {
                                return false;
                            }
                        }
                    }
                    // Fallback: check if score is >= lowest min among Tuntas intervals
                    $tuntasMins = [];
                    foreach ($intervals as $iv) {
                        $str = strtolower(($iv['status'] ?? '') . ' ' . ($iv['label'] ?? '') . ' ' . ($iv['desc'] ?? ''));
                        if ((str_contains($str, 'tuntas') || str_contains($str, 'sudah') || str_contains($str, 'mencapai') || str_contains($str, 'pengayaan')) && !str_contains($str, 'belum') && !str_contains($str, 'hampir') && !str_contains($str, 'remedial')) {
                            $tuntasMins[] = (float) ($iv['min'] ?? 100);
                        }
                    }
                    if (!empty($tuntasMins)) {
                        return $s >= min($tuntasMins);
                    }
                }
            }

            // 2. Approach: percentage / checklist / observation
            if (in_array($approach, ['percentage', 'checklist', 'observation'])) {
                $threshold = (float) ($kktp['threshold'] ?? $kktp['min_score'] ?? $this->passing_grade ?? 75);
                if ($score !== null) {
                    return (float) $score >= $threshold;
                }
            }

            // 3. Approach: criteria_description
            if ($approach === 'criteria_description') {
                $total = count($config['rubrics'] ?? $config['questions'] ?? $config['indicators'] ?? []);
                $minCrit = (int) ($kktp['min_criteria'] ?? max(1, round($total / 2)));
                if (isset($parsed['grading']['checked_indicators']) && is_array($parsed['grading']['checked_indicators'])) {
                    return count($parsed['grading']['checked_indicators']) >= $minCrit;
                }
                if (isset($parsed['indicators']) && is_array($parsed['indicators'])) {
                    $checked = 0;
                    foreach ($parsed['indicators'] as $ind) {
                        if (!empty($ind['checked']) || !empty($ind['selected_level'])) {
                            $checked++;
                        }
                    }
                    return $checked >= $minCrit;
                }
                if (isset($parsed['grading']['is_passed'])) {
                    return (bool) $parsed['grading']['is_passed'];
                }
            }

            // 4. Approach: rubric
            if ($approach === 'rubric') {
                $levels = $config['levels'] ?? [];
                $passingLvlName = $kktp['passing_level'] ?? null;
                $passingIdx = false;
                foreach ($levels as $idx => $lvl) {
                    if (($lvl['name'] ?? '') === $passingLvlName) {
                        $passingIdx = $idx;
                        break;
                    }
                }
                if (isset($parsed['grading']['selected_level']) && $passingIdx !== false) {
                    $selIdx = false;
                    foreach ($levels as $idx => $lvl) {
                        if (($lvl['name'] ?? '') === $parsed['grading']['selected_level']) {
                            $selIdx = $idx;
                            break;
                        }
                    }
                    if ($selIdx !== false) {
                        return $selIdx >= $passingIdx;
                    }
                }
                if (isset($parsed['grading']['is_passed'])) {
                    return (bool) $parsed['grading']['is_passed'];
                }
            }
        }

        // Qualitative / subjective fallback from parsed grading
        if (isset($parsed['grading']['is_passed'])) {
            return (bool) $parsed['grading']['is_passed'];
        }

        // Qualitative self/peer/reflective assessment mode check
        $type = $parsed['type'] ?? $this->instrument_type;
        if (in_array($type, ['self_assessment', 'peer_assessment', 'reflective_journal', 'exit_ticket'])) {
            $mode = $parsed['assessment_mode'] ?? null;
            if (!$mode) {
                if ($this->scoring_tool === 'checklist') $mode = 'checklist';
                elseif (in_array($this->scoring_tool, ['rubric', 'rating_scale'])) $mode = 'simple_rubric';
            }
            if ($mode === 'checklist' && isset($parsed['indicators']) && is_array($parsed['indicators'])) {
                $total = count($parsed['indicators']);
                $checkedCount = 0;
                foreach ($parsed['indicators'] as $ind) {
                    if (!empty($ind['checked'])) $checkedCount++;
                }
                $minCriteria = $kktp['min_criteria'] ?? max(1, round($total / 2));
                return $checkedCount >= $minCriteria;
            } elseif ($mode === 'simple_rubric' && isset($parsed['indicators']) && is_array($parsed['indicators'])) {
                $levels = ['Perlu Bimbingan', 'Cukup', 'Baik', 'Sangat Baik'];
                $passingLvl = $kktp['passing_level'] ?? 'Baik';
                $passingIdx = array_search($passingLvl, $levels);
                if ($passingIdx === false) $passingIdx = 2;
                $total = count($parsed['indicators']);
                $passedCount = 0;
                foreach ($parsed['indicators'] as $ind) {
                    $lvl = $ind['selected_level'] ?? '';
                    $lvlIdx = array_search($lvl, $levels);
                    if ($lvlIdx !== false && $lvlIdx >= $passingIdx) $passedCount++;
                }
                $minCriteria = $kktp['min_criteria'] ?? max(1, round($total / 2));
                return $passedCount >= $minCriteria;
            }
        }

        // Final fallback: numeric score check
        if ($score !== null) {
            $threshold = (float) ($kktp['threshold'] ?? $this->passing_grade ?? $config['pass_threshold'] ?? 70);
            return (float) $score >= $threshold;
        }

        return $submission && isset($submission->is_passed) ? (bool) $submission->is_passed : false;
    }
}

