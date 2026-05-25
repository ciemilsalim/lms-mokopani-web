import TPNode from './TPNode';

interface LearningItem {
    id: number;
    title: string;
    type: 'material' | 'assignment';
    file_type?: string | null;
    assessment_type?: string;
    is_submitted?: boolean;
    is_graded?: boolean;
    is_passed?: boolean;
    is_completed?: boolean;
    score?: number | null;
    attempts?: number;
}

interface LearningObjective {
    id: number;
    code: string;
    description: string;
    items: LearningItem[];
    is_completed: boolean;
}

interface DiagnosticSummary {
    has_diagnostic: boolean;
    mastered_tp_ids: number[];
    average_score: number | null;
    results: { id: number; assignment_id: number; learning_objective_id: number | null; total_score: number; is_passed: boolean }[];
}

interface LearningPathMapProps {
    learningPath: LearningObjective[];
    diagnosticSummary: DiagnosticSummary | null;
    isStudent: boolean;
}

export default function LearningPathMap({ learningPath, diagnosticSummary, isStudent }: LearningPathMapProps) {
    const masteredTpIds = diagnosticSummary?.mastered_tp_ids ?? [];

    const isTPAccessible = (index: number) => {
        if (index === 0) return true;
        return learningPath[index - 1].is_completed || masteredTpIds.includes(learningPath[index - 1].id);
    };

    return (
        <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent rounded-full" />

            <div className="space-y-8">
                {learningPath.map((tp, index) => {
                    const isAccessible = isTPAccessible(index);
                    const isMastered = masteredTpIds.includes(tp.id);

                    return (
                        <div key={tp.id} className={`transition-all duration-500 ${
                            isAccessible ? 'opacity-100 translate-x-0' : 'opacity-50 grayscale-[30%]'
                        }`}>
                            <TPNode
                                tp={tp}
                                index={index}
                                isAccessible={isAccessible}
                                isMastered={isMastered && !tp.is_completed}
                                total={learningPath.length}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
