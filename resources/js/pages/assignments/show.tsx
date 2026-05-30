import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { 
    Calendar, 
    ChevronLeft, 
    Download, 
    ExternalLink, 
    FileText, 
    MessageSquare, 
    MoreHorizontal, 
    Plus, 
    Star, 
    Trash2, 
    User,
    CheckCircle2,
    Clock,
    Activity,
    Info,
    AlertCircle,
    X,
    Eye,
    Save,
    Upload,
    Zap,
    ListChecks,
    Heart,
    UserCheck,
    BookOpen,
    Users,
    MessageCircle,
    PenTool,
    Layers,
    Mic,
    FolderKanban,
    Briefcase,
    Camera,
    GitBranch,
    ChevronUp,
    ChevronDown,
    FolderOpen,
    ImageIcon,
    Ticket
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Submission {
    id: number;
    student_id: number;
    student_name: string;
    content: string | null;
    file_path: string | null;
    score: number | null;
    feedback: string | null;
    is_passed?: boolean;
    attempts?: number;
    content_type?: string | null;
    original_filename?: string | null;
    submitted_at: string;
}

interface Student {
    id: number;
    name: string;
    nis: string;
}

import CommentSection from '@/components/CommentSection';
import ReflectionForm from '@/components/ReflectionForm';
import { PlusCircle, Link2, Move, Type, Trash } from 'lucide-react';

const ConceptMapCanvas = ({ data, setData, readOnly = false }: { data: any, setData?: any, readOnly?: boolean }) => {
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
        if (readOnly) return;
        setDraggingNode(nodeId);
        const node = data.nodes.find((n: any) => n.id === nodeId);
        setOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingNode && !readOnly) {
            const newNodes = data.nodes.map((n: any) => 
                n.id === draggingNode ? { ...n, x: e.clientX - offset.x, y: e.clientY - offset.y } : n
            );
            setData({ ...data, nodes: newNodes });
        }
    };

    const handleMouseUp = () => {
        setDraggingNode(null);
    };

    const addNode = () => {
        if (readOnly) return;
        const newNode = {
            id: `node_${Date.now()}`,
            text: 'Konsep Baru',
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            color: 'indigo'
        };
        setData({ ...data, nodes: [...data.nodes, newNode] });
    };

    const updateNodeText = (id: string, text: string) => {
        if (readOnly) return;
        setData({ ...data, nodes: data.nodes.map((n: any) => n.id === id ? { ...n, text } : n) });
    };

    const deleteNode = (id: string) => {
        if (readOnly) return;
        setData({
            nodes: data.nodes.filter((n: any) => n.id !== id),
            edges: data.edges.filter((e: any) => e.from !== id && e.to !== id)
        });
    };

    const startConnection = (id: string) => {
        if (readOnly) return;
        setConnectingFrom(id);
    };

    const endConnection = (id: string) => {
        if (readOnly || !connectingFrom || connectingFrom === id) {
            setConnectingFrom(null);
            return;
        }
        
        // Avoid duplicate edges
        if (data.edges.some((e: any) => e.from === connectingFrom && e.to === id)) {
            setConnectingFrom(null);
            return;
        }

        const newEdge = {
            id: `edge_${Date.now()}`,
            from: connectingFrom,
            to: id,
            label: 'berhubungan dengan'
        };
        setData({ ...data, edges: [...data.edges, newEdge] });
        setConnectingFrom(null);
    };

    const updateEdgeLabel = (id: string, label: string) => {
        if (readOnly) return;
        setData({ ...data, edges: data.edges.map((e: any) => e.id === id ? { ...e, label } : e) });
    };

    const deleteEdge = (id: string) => {
        if (readOnly) return;
        setData({ ...data, edges: data.edges.filter((e: any) => e.id !== id) });
    };

    return (
        <div className="relative w-full h-[600px] bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden select-none group/canvas">
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            
            {!readOnly && (
                <div className="absolute top-6 left-6 z-10 flex gap-2">
                    <button 
                        type="button"
                        onClick={addNode}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 transition-all active:scale-95"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Tambah Konsep
                    </button>
                    {connectingFrom && (
                        <div className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Pilih konsep tujuan...
                        </div>
                    )}
                </div>
            )}

            <svg 
                className="w-full h-full cursor-crosshair" 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Edges */}
                {data.edges.map((edge: any) => {
                    const fromNode = data.nodes.find((n: any) => n.id === edge.from);
                    const toNode = data.nodes.find((n: any) => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const midX = (fromNode.x + toNode.x) / 2;
                    const midY = (fromNode.y + toNode.y) / 2;

                    return (
                        <g key={edge.id} className="group/edge">
                            <line 
                                x1={fromNode.x} y1={fromNode.y} 
                                x2={toNode.x} y2={toNode.y} 
                                className="stroke-slate-300 dark:stroke-slate-700 stroke-[2] transition-colors group-hover/edge:stroke-indigo-400"
                                markerEnd="url(#arrowhead)"
                            />
                            <foreignObject x={midX - 60} y={midY - 15} width={120} height={30}>
                                <div className="flex items-center justify-center h-full">
                                    <input 
                                        value={edge.label}
                                        readOnly={readOnly}
                                        onChange={(e) => updateEdgeLabel(edge.id, e.target.value)}
                                        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-border rounded-lg px-2 py-0.5 text-[8px] font-bold text-muted-foreground dark:text-muted-foreground text-center focus:ring-1 focus:ring-indigo-400 outline-none w-auto min-w-[60px]"
                                    />
                                    {!readOnly && (
                                        <button 
                                            onClick={() => deleteEdge(edge.id)}
                                            className="ml-1 opacity-0 group-hover/edge:opacity-100 text-rose-400 hover:text-rose-500 transition-opacity"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    )}
                                </div>
                            </foreignObject>
                        </g>
                    );
                })}

                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" className="dark:fill-slate-700" />
                    </marker>
                </defs>

                {/* Nodes */}
                {data.nodes.map((node: any) => (
                    <g 
                        key={node.id} 
                        transform={`translate(${node.x},${node.y})`}
                        className={`cursor-move transition-transform ${draggingNode === node.id ? 'scale-105' : ''}`}
                        onMouseDown={(e) => handleMouseDown(node.id, e)}
                    >
                        {/* Node Bubble */}
                        <rect 
                            x="-70" y="-25" width="140" height="50" rx="25"
                            className={`${connectingFrom === node.id ? 'fill-amber-500' : 'fill-white dark:fill-slate-900'} stroke-2 ${connectingFrom === node.id ? 'stroke-amber-600' : 'stroke-indigo-500'} shadow-xl`}
                            onClick={() => connectingFrom && endConnection(node.id)}
                        />
                        
                        <foreignObject x="-60" y="-20" width="120" height="40">
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <input 
                                    value={node.text}
                                    readOnly={readOnly}
                                    onChange={(e) => updateNodeText(node.id, e.target.value)}
                                    className="bg-transparent border-none p-0 text-[10px] font-black text-foreground text-center focus:ring-0 outline-none w-full"
                                />
                            </div>
                        </foreignObject>

                        {!readOnly && (
                            <g className="opacity-0 group-hover/canvas:opacity-100 transition-opacity">
                                {/* Actions handle */}
                                <circle 
                                    cx="70" cy="-25" r="12" 
                                    className="fill-rose-500 cursor-pointer hover:scale-110 transition-transform"
                                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                                />
                                <Trash className="h-3 w-3 text-white pointer-events-none" x="64" y="-31" />
                                
                                <circle 
                                    cx="70" cy="25" r="12" 
                                    className="fill-amber-500 cursor-pointer hover:scale-110 transition-transform"
                                    onClick={(e) => { e.stopPropagation(); startConnection(node.id); }}
                                />
                                <Link2 className="h-3 w-3 text-white pointer-events-none" x="64" y="19" />
                            </g>
                        )}
                    </g>
                ))}
            </svg>
            
            {data.nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-300 mb-4">
                        <GitBranch className="h-8 w-8" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Kanvas Peta Konsep Kosong</p>
                    <p className="text-[9px] text-slate-300 font-bold mt-1">Klik tombol 'Tambah Konsep' untuk memulai</p>
                </div>
            )}
        </div>
    );
};

const scoringToolLabels: Record<string, string> = {
    rubric: 'Rubrik',
    rating_scale: 'Skala Penilaian',
    checklist: 'Checklist',
    anecdotal_notes: 'Catatan Anekdotal',
};

interface ShowAssignmentProps {
    assignment: any;
    students: Student[];
    my_submission: any;
    my_reflection: any;
    comments: any[];
    user_role: string;
    auth_id: number;
    available_peers?: Student[];
}

export default function ShowAssignment({ assignment, students, my_submission, my_reflection, comments, user_role, auth_id, available_peers = [] }: ShowAssignmentProps) {
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    
    // Form for Teacher (Grading & Recording)
    const teacherForm = useForm({
        assignment_id: assignment.id,
        student_id: '',
        score: 0,
        feedback: '',
        content: '',
    });

    const calculateSystemScore = (content: string) => {
        try {
            const parsed = JSON.parse(content || '');
            if (parsed.type === 'written_test' || parsed.type === 'formative_quiz' || parsed.type === 'quiz_response') {
                const questions = assignment.instrument_config?.questions || [];
                const answers = parsed.answers || {};
                let total = 0;
                questions.forEach((q: any) => {
                    const studentAns = answers[q.id];
                    const points = Number(q.points || 0);
                    const isMcq = q.type === 'multiple_choice';
                    const correctOpt = isMcq ? (q.options?.find((o: any) => o.is_correct) || q.options?.find((o: any) => o.id === q.answer)) : null;
                    const isCorrect = isMcq 
                        ? (correctOpt?.id == studentAns) 
                        : (q.type === 'short_answer' && (q.correct_answer || q.answer) && studentAns?.trim().toLowerCase() == (q.correct_answer || q.answer)?.trim().toLowerCase());
                    
                    if (isCorrect) total += points;
                });
                return total;
            }
            return parsed.auto_score ?? 0;
        } catch (e) {
            return 0;
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form for Student (Submitting)
    const studentForm = useForm({
        content: my_submission?.content ?? '',
        answers: {} as Record<string, string>,
        file: null as File | null,
    });

    const [exitTicketData, setExitTicketData] = useState<any>({});

    // Observation State
    const [obsData, setObsData] = useState({
        checklist: {} as Record<string, boolean>,
        note: '',
        action_plan: ''
    });

    // Anecdotal State
    const [anecdotalData, setAnecdotalData] = useState({
        date: new Date().toISOString().split('T')[0],
        time: '',
        location: '',
        context: '',
        event_description: '',
        analysis_followup: ''
    });

    // Self-Assessment State (Student)
    const [selfAssessmentData, setSelfAssessmentData] = useState({
        feeling: '',
        feeling_reason: '',
        effort_scale: 0,
        reflection_notes: ''
    });

    // Peer-Assessment State (Student)
    const [peerAssessmentData, setPeerAssessmentData] = useState({
        peer_student_id: '',
        peer_name: '',
        rating: 0,
        best_performer: '',
        worst_performer: '',
        obstacles: '',
        future_expectations: ''
    });

    // Concept Map State (Student)
    const [conceptMapData, setConceptMapData] = useState({
        nodes: [] as any[],
        edges: [] as any[]
    });

    // Rubric State (Teacher)
    const [rubricData, setRubricData] = useState<Record<string, string>>({});

    // Performance Observation State (Teacher)
    const [performanceObsData, setPerformanceObsData] = useState({
        observations: {} as Record<string, string>,
        notes: ''
    });

    // Oral Test State (Teacher - Live)
    const [oralTestData, setOralTestData] = useState({
        score: 0,
        notes: '',
        question_responses: {} as Record<string, string>
    });

    // Performance Assessment State (Teacher - Summative)
    const [performanceData, setPerformanceData] = useState({
        scores: {} as Record<string, string>,
        evidence: null as File | null,
        evidence_preview: '',
        notes: ''
    });

    // Project Assessment State (Teacher - Summative)
    const [projectData, setProjectData] = useState({
        scores: {} as Record<string, string>,
        notes: ''
    });

    // Portfolio Assessment State (Teacher - Summative)
    const [portfolioData, setPortfolioData] = useState({
        artifacts: [] as any[],
        reflections: {} as Record<string, string>,
        notes: ''
    });


    const submissionContent = useMemo(() => {
        if (!my_submission?.content) return null;
        try { return JSON.parse(my_submission.content); } catch (e) { return null; }
    }, [my_submission?.content]);

    const displayScore = useMemo(() => {
        if (my_submission?.score !== null && my_submission?.score !== undefined) {
            return my_submission.score;
        }
        const systemScore = calculateSystemScore(my_submission?.content || '');
        if (my_submission) return systemScore;
        return null;
    }, [my_submission, calculateSystemScore]);

    // Initialize Self-Assessment Data from existing submission
    useEffect(() => {
        if (my_submission?.content) {
            try {
                const parsed = JSON.parse(my_submission.content);
                if (parsed.type === 'self_assessment') {
                    setSelfAssessmentData({
                        feeling: parsed.feeling || '',
                        feeling_reason: parsed.feeling_reason || '',
                        effort_scale: parsed.effort_scale || 0,
                        reflection_notes: parsed.reflection_notes || ''
                    });
                } else if (parsed.type === 'peer_assessment') {
                    setPeerAssessmentData({
                        peer_student_id: parsed.peer_student_id || '',
                        peer_name: parsed.peer_name || '',
                        rating: parsed.rating || 0,
                        best_performer: parsed.best_performer || '',
                        worst_performer: parsed.worst_performer || '',
                        obstacles: parsed.obstacles || '',
                        future_expectations: parsed.future_expectations || ''
                    });
                } else if (parsed.type === 'exit_ticket') {
                    studentForm.setData('answers', parsed.answers || {});
                } else if (parsed.type === 'concept_map') {
                    setConceptMapData({
                        nodes: parsed.nodes || [],
                        edges: parsed.edges || []
                    });
                } else if (parsed.type === 'written_test' || parsed.type === 'formative_quiz') {
                    studentForm.setData('answers', parsed.answers || {});
                } else if (parsed.type === 'quiz_response') {
                    studentForm.setData('answers', parsed.answers || {});
                    studentForm.setData('content', parsed.note || '');
                }
            } catch (e) {}
        }
    }, [my_submission, assignment.instrument_type]);

    const openGradeModal = (s: Submission) => {
        setSelectedSubmission(s);
        
        const calculatedSystemScore = calculateSystemScore(s.content || '');
        const finalScoreToSet = (s.score !== null && s.score !== undefined) ? s.score : calculatedSystemScore;

        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: s.student_id.toString(),
            score: finalScoreToSet ?? 0,
            feedback: s.feedback ?? '',
            content: s.content ?? '',
        });
    };

    const openOralGrading = (student: any) => {
        const sub = submissionMap[student.id];
        setSelectedStudent(student);
        
        let initialData = {
            score: 0,
            notes: '',
            question_responses: {} as Record<string, string>
        };

        if (sub?.content) {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.type === 'oral_test') {
                    initialData = {
                        score: sub.score || 0,
                        notes: sub.feedback || '',
                        question_responses: parsed.question_responses || {}
                    };
                }
            } catch(e) {}
        }

        setOralTestData(initialData);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: initialData.score,
            feedback: initialData.notes,
            content: ''
        });
    };

    const handleSaveOralTest = () => {
        const content = JSON.stringify({
            type: 'oral_test',
            question_responses: oralTestData.question_responses,
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: oralTestData.score,
            feedback: oralTestData.notes,
            content: content
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Keep selected for live flow
            }
        });
    };

    // Auto-save for Oral Test every 5 seconds if data changed
    useEffect(() => {
        if (assignment.instrument_type === 'oral_test' && selectedStudent) {
            const timer = setTimeout(() => {
                handleSaveOralTest();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [oralTestData, selectedStudent]);

    const openPerformanceGrading = (student: any) => {
        const sub = submissionMap[student.id];
        setSelectedStudent(student);
        
        let initialData = {
            scores: {} as Record<string, string>,
            evidence: null,
            evidence_preview: '',
            notes: ''
        };

        if (sub?.content) {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.type === 'performance') {
                    initialData = {
                        scores: parsed.scores || {},
                        evidence: null,
                        evidence_preview: parsed.evidence_url || '',
                        notes: sub.feedback || ''
                    };
                }
            } catch(e) {}
        }

        setPerformanceData(initialData);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: sub?.score ?? 0,
            feedback: initialData.notes,
            content: sub?.content ?? ''
        });
    };

    const handleSavePerformance = () => {
        const content = JSON.stringify({
            type: 'performance',
            scores: performanceData.scores,
            evidence_url: performanceData.evidence_preview // If not updated
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: teacherForm.data.score,
            feedback: performanceData.notes,
            content: content,
            evidence: performanceData.evidence
        }, {
            preserveScroll: true,
            onSuccess: () => setSelectedStudent(null)
        });
    };

    const calculatePerformanceScore = (scores: Record<string, string>) => {
        const config = assignment.instrument_config;
        if (!config?.criteria) return 0;

        let totalScore = 0;
        let totalWeight = 0;

        config.criteria.forEach((c: any) => {
            const levelId = scores[c.id];
            const level = config.levels.find((l: any) => l.id === levelId);
            if (level) {
                const maxLevelScore = Math.max(...config.levels.map((l: any) => l.score));
                totalScore += (level.score / maxLevelScore) * c.weight;
            }
            totalWeight += c.weight;
        });

        const final = totalWeight > 0 ? (totalScore / totalWeight) * assignment.max_points : 0;
        return Math.round(final);
    };

    const openProjectGrading = (student: any) => {
        const sub = submissionMap[student.id];
        setSelectedStudent(student);
        
        let initialData = {
            scores: {} as Record<string, string>,
            notes: ''
        };

        if (sub?.content) {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.type === 'project') {
                    initialData = {
                        scores: parsed.scores || {},
                        notes: sub.feedback || ''
                    };
                }
            } catch(e) {}
        }

        setProjectData(initialData);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: sub?.score ?? 0,
            feedback: initialData.notes,
            content: sub?.content ?? ''
        });
    };

    const handleSaveProject = () => {
        const content = JSON.stringify({
            type: 'project',
            scores: projectData.scores
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: teacherForm.data.score,
            feedback: projectData.notes,
            content: content
        }, {
            preserveScroll: true,
            onSuccess: () => setSelectedStudent(null)
        });
    };

    const openPortfolioGrading = (student: any) => {
        const sub = submissionMap[student.id];
        setSelectedStudent(student);
        
        let initialData = {
            artifacts: [] as any[],
            reflections: {} as Record<string, string>,
            notes: ''
        };

        if (sub?.content) {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.type === 'portfolio') {
                    initialData = {
                        artifacts: parsed.artifacts || [],
                        reflections: parsed.reflections || {},
                        notes: sub.feedback || ''
                    };
                }
            } catch(e) {}
        }

        setPortfolioData(initialData);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: sub?.score ?? 0,
            feedback: initialData.notes,
            content: sub?.content ?? ''
        });
    };

    const handleSavePortfolio = () => {
        const content = JSON.stringify({
            type: 'portfolio',
            artifacts: portfolioData.artifacts,
            reflections: portfolioData.reflections
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: teacherForm.data.score,
            feedback: portfolioData.notes,
            content: content
        }, {
            preserveScroll: true,
            onSuccess: () => setSelectedStudent(null)
        });
    };

    const openObservationModal = (student: Student, existingSubmission?: Submission) => {
        setSelectedStudent(student);
        let checklist = {};
        let note = '';
        let action_plan = '';
        const score = 0;
        const feedback = '';

        if (existingSubmission?.content) {
            try {
                const parsed = JSON.parse(existingSubmission.content);
                if (parsed.type === 'observation') {
                    checklist = parsed.checklist || {};
                    note = parsed.note || '';
                    action_plan = parsed.action_plan || '';
                } else if (parsed.type === 'performance_observation') {
                    setPerformanceObsData({
                        observations: parsed.observations || {},
                        notes: parsed.notes || ''
                    });
                }
            } catch (e) {}
        }

        if (assignment.instrument_type === 'performance_observation' && !existingSubmission) {
            setPerformanceObsData({ observations: {}, notes: '' });
        }

        setObsData({ checklist, note, action_plan });
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: existingSubmission?.score ?? 0,
            feedback: existingSubmission?.feedback ?? '',
            content: existingSubmission?.content ?? '',
        });
    };

    const openAnecdotalModal = (student: Student, existingSubmission?: Submission) => {
        setSelectedStudent(student);
        let date = new Date().toISOString().split('T')[0];
        let time = '';
        let location = '';
        let context = '';
        let event_description = '';
        let analysis_followup = '';

        if (existingSubmission?.content) {
            try {
                const parsed = JSON.parse(existingSubmission.content);
                if (parsed.type === 'anecdotal') {
                    date = parsed.date || date;
                    time = parsed.time || '';
                    location = parsed.location || '';
                    context = parsed.context || '';
                    event_description = parsed.event_description || '';
                    analysis_followup = parsed.analysis_followup || '';
                }
            } catch (e) {}
        }

        setAnecdotalData({ date, time, location, context, event_description, analysis_followup });
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: 0,
            feedback: '',
            content: existingSubmission?.content ?? '',
        });
    };

    const openRubricModal = (student: Student, existingSubmission?: Submission) => {
        setSelectedStudent(student);
        let scores = {};
        if (existingSubmission?.content) {
            try {
                const parsed = JSON.parse(existingSubmission.content);
                if (parsed.type === 'rubric') {
                    scores = parsed.scores || {};
                }
            } catch (e) {}
        }
        setRubricData(scores);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: existingSubmission?.score ?? 0,
            feedback: existingSubmission?.feedback ?? '',
            content: existingSubmission?.content ?? '',
        });
    };

    const handleGrade = (e: React.FormEvent) => {
        e.preventDefault();
        teacherForm.post(route('assignments.grade'), {
            onSuccess: () => {
                setSelectedSubmission(null);
                setSelectedStudent(null);
                teacherForm.reset();
            },
        });
    };
    const handleSaveObservation = () => {
        const content = JSON.stringify({
            type: 'observation',
            checklist: obsData.checklist,
            note: obsData.note,
            action_plan: obsData.action_plan
        });

        const total = (assignment.instrument_config?.indicators || []).length;
        const munculCount = Object.values(obsData.checklist).filter(v => v === true).length;
        const score = total > 0 ? Math.round((munculCount / total) * 100) : 0;

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: score,
            feedback: teacherForm.data.feedback,
            content: content
        }, {
            onSuccess: () => {
                setSelectedStudent(null);
                teacherForm.reset();
            }
        });
    };

    const handleSaveAnecdotal = () => {
        const content = JSON.stringify({
            type: 'anecdotal',
            ...anecdotalData
        });
        
        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: 0,
            feedback: anecdotalData.analysis_followup,
            content: content
        }, {
            onSuccess: () => {
                setSelectedStudent(null);
                teacherForm.reset();
            }
        });
    };

    const handleSaveRubric = () => {
        const content = JSON.stringify({
            type: 'rubric',
            scores: rubricData
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: 0,
            feedback: teacherForm.data.feedback,
            content: content
        }, {
            onSuccess: () => {
                setSelectedStudent(null);
                teacherForm.reset();
            }
        });
    };

    const handleSavePerformanceObservation = () => {
        const content = JSON.stringify({
            type: 'performance_observation',
            observations: performanceObsData.observations,
            notes: performanceObsData.notes
        });

        const total = (assignment.instrument_config?.indicators || []).length;
        const scoreValues: Record<string, number> = { 'belum': 0, 'mulai': 50, 'konsisten': 100 };
        const totalScore = Object.values(performanceObsData.observations).reduce((acc, val) => acc + (scoreValues[val] || 0), 0);
        const averageScore = total > 0 ? Math.round(totalScore / total) : 0;

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: averageScore,
            feedback: performanceObsData.notes,
            content: content
        }, {
            onSuccess: () => {
                setSelectedStudent(null);
                teacherForm.reset();
            }
        });
    };

    const handleSubmitAssignment = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        let finalContent = studentForm.data.content;
        let finalScore = null;

        if (assignment.instrument_type === 'quiz_survey' && Object.keys(studentForm.data.answers).length > 0) {
            const questions = assignment.instrument_config?.questions || [];
            let totalScore = 0;
            let canAutoGrade = true;

            questions.forEach((q: any) => {
                const studentAns = studentForm.data.answers[q.id];
                const points = Number(q.points || 0);
                if (q.type === 'multiple_choice') {
                    const correctOptId = q.answer || q.options?.find((o: any) => o.is_correct)?.id;
                    if (correctOptId && studentAns == correctOptId) totalScore += points;
                    if (!correctOptId) canAutoGrade = false;
                } else if (q.type === 'short_answer') {
                    const correctAns = q.correct_answer || q.answer;
                    if (correctAns && studentAns?.trim().toLowerCase() == correctAns?.trim().toLowerCase()) {
                        totalScore += points;
                    }
                    if (!correctAns) canAutoGrade = false;
                } else {
                    canAutoGrade = false;
                }
            });

            finalContent = JSON.stringify({
                type: 'quiz_response',
                answers: studentForm.data.answers,
                note: studentForm.data.content,
                auto_score: canAutoGrade ? totalScore : null
            });

            if (canAutoGrade) finalScore = totalScore;
        } else if (assignment.instrument_type === 'written_test' || assignment.instrument_type === 'formative_quiz') {
            const questions = assignment.instrument_config?.questions || [];
            let totalScore = 0;
            let hasEssay = false;

            questions.forEach((q: any) => {
                const studentAns = studentForm.data.answers[q.id];
                const points = Number(q.points || 0);
                if (q.type === 'multiple_choice') {
                    const correctOptId = q.answer || q.options?.find((o: any) => o.is_correct)?.id;
                    if (correctOptId && studentAns == correctOptId) totalScore += points;
                } else if (q.type === 'short_answer') {
                    const correctAns = q.correct_answer || q.answer;
                    if (correctAns && studentAns?.trim().toLowerCase() == correctAns?.trim().toLowerCase()) {
                        totalScore += points;
                    }
                } else if (q.type === 'essay') {
                    hasEssay = true;
                }
            });

            finalContent = JSON.stringify({
                type: assignment.instrument_type === 'formative_quiz' ? 'formative_quiz' : 'written_test',
                answers: studentForm.data.answers,
                auto_score: totalScore,
                has_essay: hasEssay
            });

            if (!hasEssay) finalScore = totalScore;
        } else if (assignment.instrument_type === 'self_assessment') {
            finalContent = JSON.stringify({ type: 'self_assessment', ...selfAssessmentData });
        } else if (assignment.instrument_type === 'peer_assessment') {
            finalContent = JSON.stringify({ type: 'peer_assessment', ...peerAssessmentData });
        } else if (assignment.instrument_type === 'exit_ticket') {
            finalContent = JSON.stringify({ type: 'exit_ticket', answers: studentForm.data.answers });
        } else if (assignment.instrument_type === 'concept_map') {
            finalContent = JSON.stringify({ type: 'concept_map', nodes: conceptMapData.nodes, edges: conceptMapData.edges });
        }

        router.post(route('assignments.submit', assignment.id), {
            ...studentForm.data,
            content: finalContent,
            score: finalScore
        }, {
            forceFormData: true,
            onSuccess: () => {
                setSubmitSuccess(true);
                setIsSubmitting(false);
            },
            onError: (errors) => {
                console.error(errors);
                setSubmitError('Gagal mengirim jawaban. Silakan periksa kembali isian Anda.');
                setIsSubmitting(false);
            },
            onFinish: () => setIsSubmitting(false)
        });
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleDelete = () => {
        router.delete(route('assignments.destroy', assignment.id));
    };

    const submissionMap = useMemo(() => {
        const map: Record<number, Submission> = {};
        assignment.submissions.forEach((s: Submission) => {
            map[s.student_id] = s;
        });
        return map;
    }, [assignment.submissions]);

    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Asesmen', href: '/assignments' },
            { title: assignment.title, href: '#' },
        ]}>
            <Head title={`${assignment.title} – LMS Mokopani`} />

            <>
                <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Back Button & Actions */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition uppercase tracking-widest"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    {user_role === 'teacher' && (
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition uppercase tracking-widest"
                        >
                            <Trash2 className="h-4 w-4" />
                            Hapus Asesmen
                        </button>
                    )}
                </div>

                {/* Assignment Info Card */}
                <div className="rounded-[2.5rem] border border-border bg-white dark:bg-slate-900 p-8 shadow-2xl shadow-slate-100/50 dark:shadow-none">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex rounded-full bg-sky-50 dark:bg-sky-950/40 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-widest border border-sky-100 dark:border-sky-900/30">
                                    {assignment.subject}
                                </span>
                                {assignment.assessment_type === 'initial' && (
                                    <span className="inline-flex rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-[10px] font-black text-warning uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                        Asesmen Diagnostik
                                    </span>
                                )}
                                {assignment.scoring_tool && (
                                    <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/30">
                                        Skoring: {scoringToolLabels[assignment.scoring_tool] || assignment.scoring_tool}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl font-black text-foreground tracking-tight">{assignment.title}</h1>
                            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-amber-500" />
                                    Tenggat: <span className="text-slate-600 dark:text-slate-300">{assignment.due_date}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-emerald-500" />
                                    Poin Maks: <span className="text-slate-600 dark:text-slate-300">{assignment.max_points} pts</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-slate-50 dark:border-slate-800 pt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-4 w-4 text-primary" />
                            <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Instruksi & Deskripsi</h3>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-muted-foreground leading-relaxed font-medium">
                            {assignment.description}
                        </p>
                    </div>
                </div>

                {/* Content based on Role */}
                {user_role === 'teacher' ? (
                    <div className="space-y-6">
                        {['observation_checklist', 'anecdotal_notes', 'rubric', 'oral_test'].includes(assignment.instrument_type) ? (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between px-4">
                                    <div>
                                        <h2 className="text-xl font-black text-foreground tracking-tight">
                                            {assignment.instrument_type === 'observation_checklist' ? 'Lembar Observasi & Ceklis' : 
                                             assignment.instrument_type === 'anecdotal_notes' ? 'Daftar Catatan Anekdotal' :
                                             'Rubrik Capaian Kinerja'}
                                        </h2>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            Aspek: {assignment.instrument_config?.foundation_aspect || 'Umum'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-border px-5 py-3 rounded-2xl shadow-sm">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Siswa</p>
                                            <p className="text-lg font-black text-foreground">{students.length}</p>
                                        </div>
                                        <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                {assignment.instrument_type === 'observation_checklist' ? 'Telah Diobservasi' : 
                                                 assignment.instrument_type === 'rubric' ? 'Telah Dinilai' :
                                                 assignment.instrument_type === 'oral_test' ? 'Selesai Diuji' :
                                                 'Ada Catatan'}
                                            </p>
                                            <p className="text-lg font-black text-emerald-600">{assignment.submissions.length}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-[2.5rem] border border-border bg-white dark:bg-slate-900 shadow-2xl shadow-slate-100/50 dark:shadow-none">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                                            <tr>
                                                <th className="px-8 py-5">Siswa</th>
                                                <th className="px-8 py-5">
                                                    {assignment.instrument_type === 'observation_checklist' ? 'Indikator Terpenuhi' : 
                                                     assignment.instrument_type === 'rubric' ? 'Progres Penilaian' :
                                                     assignment.instrument_type === 'oral_test' ? 'Hasil Tes' :
                                                     'Waktu Catatan'}
                                                </th>
                                                <th className="px-8 py-5">Status</th>
                                                <th className="px-8 py-5 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {students.map((student) => {
                                                const sub = submissionMap[student.id];
                                                const indicatorCount = (assignment.instrument_config?.indicators || []).length;
                                                let munculCount = 0;
                                                if (sub?.content) {
                                                    try {
                                                        const p = JSON.parse(sub.content);
                                                        if (assignment.instrument_type === 'rubric') {
                                                            munculCount = Object.keys(p.scores || {}).length;
                                                        } else if (assignment.instrument_type === 'oral_test') {
                                                            munculCount = sub.score || 0;
                                                        } else {
                                                            munculCount = Object.values(p.checklist || {}).filter(v => v === true).length;
                                                        }
                                                    } catch(e) {}
                                                }

                                                return (
                                                    <tr key={student.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-10 w-10 rounded-2xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-primary font-black text-xs shadow-sm border border-sky-100 dark:border-sky-900/30 group-hover:scale-110 transition-transform">
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-700 dark:text-slate-200">{student.name}</p>
                                                                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest">{student.nis}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1 h-1.5 max-w-[100px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full transition-all duration-500 ${assignment.instrument_type === 'rubric' ? 'bg-amber-500' : assignment.instrument_type === 'oral_test' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                                                                        style={{ width: `${assignment.instrument_type === 'oral_test' ? (munculCount / assignment.max_points) * 100 : (indicatorCount > 0 ? (munculCount / indicatorCount) * 100 : 0)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-black text-muted-foreground">{munculCount}{assignment.instrument_type === 'oral_test' ? '' : `/${indicatorCount}`}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            {sub ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-black text-success uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/30">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Selesai
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-[10px] font-black text-warning uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                                                    <Clock className="h-3 w-3" />
                                                                    Belum Ada
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <button 
                                                                onClick={() => {
                                                                    if (assignment.instrument_type === 'anecdotal_notes') {
                                                                        openAnecdotalModal(student, sub);
                                                                    } else if (assignment.instrument_type === 'rubric') {
                                                                        openRubricModal(student, sub);
                                                                    } else if (assignment.instrument_type === 'performance') {
                                                                        openPerformanceGrading(student);
                                                                    } else if (assignment.instrument_type === 'project') {
                                                                        openProjectGrading(student);
                                                                    } else if (assignment.instrument_type === 'portfolio') {
                                                                        openPortfolioGrading(student);
                                                                    } else if (assignment.instrument_type === 'oral_test') {
                                                                        openOralGrading(student);
                                                                    } else {
                                                                        openObservationModal(student, sub);
                                                                    }
                                                                }}
                                                                className={`inline-flex items-center gap-2 rounded-xl text-white px-5 py-2.5 text-xs font-black shadow-lg transition-all hover:scale-105 active:scale-95 uppercase tracking-widest ${assignment.instrument_type === 'rubric' ? 'bg-amber-500 shadow-amber-100' : assignment.instrument_type === 'oral_test' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-sky-500 shadow-sky-100'}`}
                                                            >
                                                                {assignment.instrument_type === 'rubric' ? <ListChecks className="h-3.5 w-3.5" /> : assignment.instrument_type === 'oral_test' ? <Mic className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                                                                {sub ? (
                                                                    assignment.instrument_type === 'anecdotal_notes' ? 'Edit Catatan' : 
                                                                    assignment.instrument_type === 'rubric' ? 'Edit Rubrik' :
                                                                    assignment.instrument_type === 'oral_test' ? 'Edit Tes' :
                                                                    'Edit Observasi'
                                                                ) : (
                                                                    assignment.instrument_type === 'anecdotal_notes' ? 'Catatan' : 
                                                                    assignment.instrument_type === 'rubric' ? 'Isi Rubrik' :
                                                                    assignment.instrument_type === 'oral_test' ? 'Mulai Tes' :
                                                                    'Observasi'
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-500">
                                {assignment.instrument_type === 'exit_ticket' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
                                        {(assignment.instrument_config?.questions || []).map((q: any, qIdx: number) => {
                                            const qKey = q.id ?? `et_${qIdx}`;
                                            const answers = (assignment.submissions || []).map((s: Submission) => {
                                                try {
                                                    const p = JSON.parse(s.content || '');
                                                    return p.answers?.[qKey];
                                                } catch(e) { return null; }
                                            }).filter(Boolean);

                                            return (
                                                <div key={qKey} className="rounded-[8px] border border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] p-6 shadow-none flex flex-col h-full">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="h-8 w-8 rounded-[6px] bg-[#5E6AD2]/10 dark:bg-[#5E6AD2] text-[#5E6AD2] dark:text-white flex items-center justify-center border border-[#5E6AD2]/20 dark:border-transparent">
                                                            <MessageSquare className="h-4 w-4" />
                                                        </div>
                                                        <h4 className="text-[10px] font-semibold text-slate-500 dark:text-[#8A8F98] uppercase tracking-wider leading-tight">{q.text}</h4>
                                                    </div>
                                                    
                                                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                                                        {answers.length > 0 ? (
                                                            answers.map((ans: string, idx: number) => (
                                                                <div key={idx} className="p-4 rounded-[6px] bg-slate-50 dark:bg-[#101014] border border-slate-200 dark:border-[#2C2C3A] hover:border-[#5E6AD2]/30 transition-all">
                                                                    <p className="text-[11px] font-medium text-slate-600 dark:text-[#8A8F98] leading-relaxed italic">"{ans}"</p>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center py-8">
                                                                <p className="text-[10px] font-semibold text-slate-300 dark:text-[#8A8F98] uppercase tracking-widest italic">Belum ada respon</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#2C2C3A] flex items-center justify-between">
                                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-[#8A8F98] uppercase tracking-wider">{answers.length} Respon</span>
                                                        <div className="flex -space-x-2">
                                                            {(assignment.submissions || []).slice(0, 3).map((s: Submission) => (
                                                                <div key={s.id} className="h-6 w-6 rounded-[4px] bg-slate-50 dark:bg-[#101014] border-2 border-white dark:border-[#1B1B25] flex items-center justify-center text-[8px] font-semibold text-slate-500 dark:text-[#8A8F98] uppercase">
                                                                    {s.student_name.charAt(0)}
                                                                </div>
                                                            ))}
                                                            {assignment.submissions?.length > 3 && (
                                                                <div className="h-6 w-6 rounded-[4px] bg-[#5E6AD2] border-2 border-white dark:border-[#1B1B25] flex items-center justify-center text-[8px] font-semibold text-white">
                                                                    +{assignment.submissions.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="flex items-center justify-between px-4">
                                    <h2 className="text-xl font-black text-foreground tracking-tight uppercase tracking-widest">Pengumpulan Siswa</h2>
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{assignment.submissions.length} Siswa Telah Mengumpulkan</span>
                                </div>

                                <div className="overflow-hidden rounded-[2.5rem] border border-border bg-white dark:bg-slate-900 shadow-2xl shadow-slate-100/50 dark:shadow-none">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                                            <tr>
                                                <th className="px-8 py-5">Siswa</th>
                                                <th className="px-8 py-5">Waktu Kumpul</th>
                                                <th className="px-8 py-5">Status</th>
                                                <th className="px-8 py-5 text-right">Nilai</th>
                                                <th className="px-8 py-5 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {assignment.submissions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-16 text-center text-muted-foreground italic font-medium">
                                                        Belum ada siswa yang mengumpulkan tugas.
                                                    </td>
                                                </tr>
                                            ) : (
                                                assignment.submissions.map((s: Submission) => {
                                                    const displayScore = s.score ?? calculateSystemScore(s.content ?? '');
                                                    const effectivePassed = s.score !== null ? s.is_passed : (displayScore >= (assignment.passing_grade || 0));

                                                    return (
                                                        <tr key={s.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted-foreground group-hover:bg-sky-50 dark:group-hover:bg-sky-950/30 group-hover:text-primary transition-colors">
                                                                        <User className="h-5 w-5" />
                                                                    </div>
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{s.student_name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-xs font-bold text-muted-foreground uppercase tracking-tighter">{s.submitted_at}</td>
                                                            <td className="px-8 py-6">
                                                                {(s.score !== null) ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                                            Dinilai
                                                                        </span>
                                                                        {effectivePassed ? (
                                                                            <span className="text-[8px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md w-fit uppercase tracking-tighter">Tuntas</span>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md w-fit uppercase tracking-tighter">Remedial</span>
                                                                                {(s.attempts ?? 0) > 1 && (
                                                                                    <span className="text-[8px] font-bold text-muted-foreground italic">({s.attempts ?? 0}x remedial)</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 text-amber-500 font-black text-[10px] uppercase tracking-widest italic">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        Menunggu
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <span className={`text-sm font-black ${(s.score !== null) ? (effectivePassed ? 'text-foreground' : 'text-destructive') : 'text-muted-foreground'}`}>
                                                                    {displayScore}
                                                                </span>
                                                                <span className="text-[10px] font-black text-muted-foreground"> / {assignment.max_points}</span>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <button 
                                                                    onClick={() => openGradeModal(s)}
                                                                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 text-white px-5 py-2.5 text-xs font-black shadow-lg shadow-sky-100 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest"
                                                                >
                                                                    <Activity className="h-3.5 w-3.5" />
                                                                    {s.score !== null ? 'Edit Nilai' : 'Beri Nilai'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        <div className="rounded-[2.5rem] border border-border bg-white dark:bg-slate-900 p-8 shadow-sm">
                            <CommentSection 
                                assignmentId={assignment.id} 
                                comments={comments} 
                                authId={auth_id} 
                                userRole={user_role} 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12 animate-in fade-in duration-700">
                        <div className="grid gap-8 lg:grid-cols-3">
                        {/* Submission Form */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className={(assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                ? "rounded-[8px] border border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] p-6 md:p-8 shadow-none"
                                : "rounded-[2.5rem] border border-border bg-white dark:bg-slate-900 p-10 shadow-2xl shadow-slate-100/50 dark:shadow-none"
                            }>
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black text-foreground tracking-tight uppercase tracking-widest">Kumpulkan Jawaban</h2>
                                    {assignment.assessment_type === 'initial' && (
                                        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-warning rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                            <Zap className="h-3 w-3" /> Formatif
                                        </div>
                                    )}
                                </div>

                                {assignment.instrument_config?.stimulus && (
                                    <div className="mb-10 p-8 rounded-[2.5rem] bg-indigo-50/30 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-800 space-y-6">
                                        <div className="flex items-center gap-3 text-[10px] font-black text-primary uppercase tracking-widest">
                                            <MessageSquare className="h-4 w-4" />
                                            Stimulus / Studi Kasus
                                        </div>
                                        {assignment.instrument_config.stimulus_image && (
                                            <div className="rounded-3xl overflow-hidden border border-border shadow-lg">
                                                <img 
                                                    src={`/storage/${assignment.instrument_config.stimulus_image}`} 
                                                    className="w-full max-h-96 object-cover" 
                                                    alt="Stimulus"
                                                />
                                            </div>
                                        )}
                                        <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">
                                            "{assignment.instrument_config.stimulus}"
                                        </p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmitAssignment} className="space-y-10">
                                    {assignment.instrument_type === 'peer_assessment' ? (
                                        <div className="space-y-10 animate-in fade-in duration-500">
                                            {/* Identity Section */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 text-xs font-black flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Siapa teman yang Anda nilai?</p>
                                                </div>
                                                <select
                                                    value={peerAssessmentData.peer_student_id}
                                                    onChange={(e) => {
                                                        const selectedId = e.target.value;
                                                        const selectedStudent = available_peers.find(p => p.id === parseInt(selectedId));
                                                        setPeerAssessmentData({
                                                            ...peerAssessmentData,
                                                            peer_student_id: selectedId,
                                                            peer_name: selectedStudent?.name || ''
                                                        });
                                                    }}
                                                    className="w-full rounded-3xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                >
                                                    <option value="">Pilih teman yang akan dinilai...</option>
                                                    {available_peers.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.nis})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Rating Section */}
                                            <div className="space-y-6 pt-10 border-t border-slate-50 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 text-xs font-black flex items-center justify-center shadow-sm border border-amber-100 dark:border-amber-900/30">
                                                        <Star className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Rating Performa Teman (1-5)</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setPeerAssessmentData({ ...peerAssessmentData, rating: star })}
                                                            className={`flex-1 h-14 rounded-2xl border-2 flex items-center justify-center text-lg font-black transition-all ${peerAssessmentData.rating >= star ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100/50' : 'bg-slate-50/50 border-slate-50 text-slate-300 dark:bg-slate-800 dark:border-slate-800 hover:border-amber-200'}`}
                                                        >
                                                            {star}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Questions Section */}
                                            <div className="space-y-8 pt-10 border-t border-slate-50 dark:border-slate-800">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Siapa teman dengan performa terbaik di kelompokmu?</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="Sebutkan nama teman terbaik..."
                                                        value={peerAssessmentData.best_performer}
                                                        onChange={(e) => setPeerAssessmentData({ ...peerAssessmentData, best_performer: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Siapa yang kinerjanya paling perlu ditingkatkan?</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="Sebutkan nama teman tersebut..."
                                                        value={peerAssessmentData.worst_performer}
                                                        onChange={(e) => setPeerAssessmentData({ ...peerAssessmentData, worst_performer: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <AlertCircle className="h-4 w-4 text-rose-500" />
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Apa kendala yang dihadapi kelompok?</label>
                                                    </div>
                                                    <textarea 
                                                        rows={3}
                                                        placeholder="Cth: Pembagian tugas kurang merata atau komunikasi sulit..."
                                                        value={peerAssessmentData.obstacles}
                                                        onChange={(e) => setPeerAssessmentData({ ...peerAssessmentData, obstacles: e.target.value })}
                                                        className="w-full rounded-3xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                    ></textarea>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <MessageCircle className="h-4 w-4 text-primary" />
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Apa yang kamu harapkan di pertemuan berikutnya?</label>
                                                    </div>
                                                    <textarea 
                                                        rows={3}
                                                        placeholder="Cth: Lebih banyak diskusi tatap muka atau pembagian peran yang lebih jelas..."
                                                        value={peerAssessmentData.future_expectations}
                                                        onChange={(e) => setPeerAssessmentData({ ...peerAssessmentData, future_expectations: e.target.value })}
                                                        className="w-full rounded-3xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'self_assessment' ? (
                                        <div className="space-y-10 animate-in fade-in duration-500">
                                            {/* Feelings Section */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 text-xs font-black flex items-center justify-center shadow-sm border border-amber-100 dark:border-amber-900/30">
                                                        <Heart className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Bagaimana Perasaan Belajarmu?</p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {[
                                                        { id: 'very_happy', label: 'Sangat Senang', icon: '🤩' },
                                                        { id: 'happy', label: 'Senang', icon: '😊' },
                                                        { id: 'neutral', label: 'Kurang Senang', icon: '😐' },
                                                    ].map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => setSelfAssessmentData({ ...selfAssessmentData, feeling: item.id })}
                                                            className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${selfAssessmentData.feeling === item.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xl shadow-amber-100/50' : 'border-slate-50 bg-slate-50/30 dark:border-slate-800'}`}
                                                        >
                                                            <span className="text-4xl">{item.icon}</span>
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${selfAssessmentData.feeling === item.id ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>{item.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Berikan alasan singkat tentang perasaanmu:</label>
                                                    <textarea 
                                                        rows={3}
                                                        placeholder="Cth: Saya senang karena materi hari ini sangat seru dan mudah dipahami..."
                                                        value={selfAssessmentData.feeling_reason}
                                                        onChange={(e) => setSelfAssessmentData({ ...selfAssessmentData, feeling_reason: e.target.value })}
                                                        className="w-full rounded-3xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                    ></textarea>
                                                </div>
                                            </div>

                                            {/* Effort Scale Section */}
                                            <div className="space-y-6 pt-10 border-t border-slate-50 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary text-xs font-black flex items-center justify-center shadow-sm border border-sky-100 dark:border-sky-900/30">
                                                        <Zap className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Seberapa Baik Usaha & Pemahamanmu?</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    {[1, 2, 3, 4].map((scale) => (
                                                        <button
                                                            key={scale}
                                                            type="button"
                                                            onClick={() => setSelfAssessmentData({ ...selfAssessmentData, effort_scale: scale })}
                                                            className={`flex-1 h-16 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${selfAssessmentData.effort_scale === scale ? 'bg-sky-500 border-sky-500 text-white shadow-xl shadow-sky-200/50' : 'bg-slate-50/50 border-slate-50 text-slate-300 dark:bg-slate-800 dark:border-slate-800 hover:border-sky-200'}`}
                                                        >
                                                            {scale}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
                                                    <span>Perlu Bimbingan</span>
                                                    <span>Sangat Baik</span>
                                                </div>
                                            </div>

                                            {/* Reflection Section */}
                                            <div className="space-y-6 pt-10 border-t border-slate-50 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 text-xs font-black flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                                                        <BookOpen className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Catatan Refleksi</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Tantangan yang dihadapi & strategi perbaikan:</label>
                                                    <textarea 
                                                        rows={6}
                                                        placeholder="Cth: Saya masih kesulitan di bagian perkalian, strateginya saya akan berlatih lebih banyak di rumah..."
                                                        value={selfAssessmentData.reflection_notes}
                                                        onChange={(e) => setSelfAssessmentData({ ...selfAssessmentData, reflection_notes: e.target.value })}
                                                        className="w-full rounded-[2.5rem] border border-slate-100 bg-slate-50/30 px-8 py-6 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (assignment.instrument_type === 'written_test' || assignment.instrument_type === 'formative_quiz') ? (
                                        <div className="space-y-12 animate-in fade-in duration-700">
                                            {/* Test Header & Progress */}
                                            <div className="relative overflow-hidden rounded-[8px] bg-slate-50 border border-slate-200 dark:bg-[#1B1B25] dark:border-[#2C2C3A] p-6 shadow-none text-slate-800 dark:text-[#F1F1F4]">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-[#5E6AD2]/5 blur-3xl" />
                                                <div className="relative flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-11 w-11 rounded-[6px] bg-[#5E6AD2]/10 dark:bg-[#5E6AD2] text-[#5E6AD2] dark:text-white shadow-none flex items-center justify-center shadow-xl">
                                                            <ListChecks className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 dark:text-[#F1F1F4]">
                                                                {assignment.instrument_type === 'formative_quiz' ? 'Lembar Kuis Formatif' : 'Lembar Tes Tertulis'}
                                                            </h3>
                                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Fokus & Teliti • {assignment.instrument_config?.questions?.length || 0} Pertanyaan</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-[#8A8F98] uppercase tracking-wider mb-1">Total Poin</p>
                                                        <p className="text-2xl font-semibold tracking-tight">{assignment.max_points}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="mt-8">
                                                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-2 text-slate-500 dark:text-[#8A8F98]">
                                                        <span>Progres Pengerjaan</span>
                                                        <span>{Math.round((Object.keys(studentForm.data.answers).length / (assignment.instrument_config?.questions?.length || 1)) * 100)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-[#101014] overflow-hidden">
                                                        <div 
                                                            className="h-full bg-[#5E6AD2] transition-all duration-500"
                                                            style={{ width: `${(Object.keys(studentForm.data.answers).length / (assignment.instrument_config?.questions?.length || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => {
                                                    const isAnswered = studentForm.data.answers[q.id];
                                                    return (
                                                        <div 
                                                            key={q.id} 
                                                            className={`group relative transition-all duration-150 rounded-[8px] border border-slate-200 bg-white dark:border-[#2C2C3A] dark:bg-[#1B1B25] p-6 shadow-none ${isAnswered ? 'border-[#5E6AD2]/50 bg-[#5E6AD2]/5 dark:bg-[#1E1E2A]' : 'hover:border-[#6E79D6]/50 hover:bg-slate-50/50 dark:hover:bg-[#1E1E2A]/20'}`}
                                                        >
                                                            <div className="flex items-center gap-3 mb-6">
                                                                <span className="font-mono text-xs font-semibold text-slate-500 dark:text-[#8A8F98] bg-slate-50 dark:bg-[#101014] px-2.5 py-1 rounded-[4px] border border-slate-200 dark:border-[#2C2C3A]">Q{idx + 1}</span>
                                                                <div className="h-px flex-1 bg-slate-200 dark:bg-[#2C2C3A]"></div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <div className="space-y-4">
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <h4 className="leading-relaxed text-sm font-semibold tracking-[-0.01em] text-slate-850 dark:text-[#F1F1F4]">{q.text}</h4>
                                                                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap border bg-[#5E6AD2]/10 text-[#5E6AD2] dark:text-[#6E79D6] border-[#5E6AD2]/20">{q.points} Pts</span>
                                                                    </div>
                                                                    {q.image_url && (
                                                                        <div className="rounded-xl overflow-hidden border border-border shadow-md max-w-xl">
                                                                            <img src={q.image_url} alt="Stimulus" className="w-full object-cover" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-3">
                                                                    {q.type === 'multiple_choice' && (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                            {q.options?.map((opt: any, optIdx: number) => (
                                                                                <button 
                                                                                    key={opt.id}
                                                                                    type="button"
                                                                                    onClick={() => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: opt.id })}
                                                                                    className={`flex items-center gap-3 p-3.5 rounded-[8px] border transition-all text-left group/opt ${studentForm.data.answers[q.id] === opt.id ? 'border-[#5E6AD2] bg-[#5E6AD2]/10 dark:bg-[#1E1E2A]' : 'border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#101014] hover:bg-slate-50 dark:hover:bg-[#1F1F2E] hover:border-[#6E79D6]/50'}`}
                                                                                >
                                                                                    <div className={`h-6 w-6 rounded-full border flex items-center justify-center flex-shrink-0 font-semibold text-[11px] font-mono transition-all ${studentForm.data.answers[q.id] === opt.id ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white' : 'border-slate-200 dark:border-[#2C2C3A] bg-slate-50 dark:bg-[#1B1B25] text-slate-500 dark:text-[#8A8F98] group-hover/opt:border-[#6E79D6] group-hover/opt:text-[#6E79D6]'}`}>
                                                                                        {String.fromCharCode(65 + optIdx)}
                                                                                    </div>
                                                                                    <span className={`text-xs font-semibold ${studentForm.data.answers[q.id] === opt.id ? 'text-[#5E6AD2] dark:text-[#F1F1F4]' : 'text-slate-700 dark:text-[#8A8F98]'}`}>{opt.text}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'short_answer' && (
                                                                        <div className="relative">
                                                                            <input 
                                                                                type="text"
                                                                                value={studentForm.data.answers[q.id] || ''}
                                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: e.target.value })}
                                                                                placeholder="Ketik jawaban singkat Anda..."
                                                                                className="w-full rounded-[6px] border border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#101014] px-4 py-3 text-xs font-medium focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/15 transition-all text-slate-800 dark:text-[#F1F1F4] placeholder-slate-450 dark:placeholder-[#8A8F98]"
                                                                            />
                                                                            <PenTool className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'essay' && (
                                                                        <div className="relative">
                                                                            <textarea 
                                                                                rows={4}
                                                                                value={studentForm.data.answers[q.id] || ''}
                                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: e.target.value })}
                                                                                placeholder="Tuliskan uraian atau penjelasan lengkap Anda..."
                                                                                className="w-full rounded-[6px] border border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#101014] px-4 py-3 text-xs font-medium focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/15 transition-all text-slate-800 dark:text-[#F1F1F4] placeholder-slate-450 dark:placeholder-[#8A8F98] resize-none leading-relaxed"
                                                                            />
                                                                            <FileText className="absolute right-4 top-4 h-4 w-4 text-slate-400" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'quiz_survey' ? (
                                        <div className="space-y-10 animate-in fade-in duration-500">
                                            {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => (
                                                <div key={q.id || idx} className="space-y-4 animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                                    <div className="flex items-start gap-4">
                                                        <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm border border-sky-100 dark:border-sky-900/30">
                                                            {idx + 1}
                                                        </div>
                                                        <p className="text-sm font-black text-slate-700 dark:text-slate-200 leading-relaxed pt-1">{q.text}</p>
                                                    </div>
                                                    <div className="pl-12">
                                                        {q.type === 'essay' ? (
                                                            <textarea 
                                                                rows={4}
                                                                placeholder="Tuliskan jawaban esai Anda..."
                                                                value={studentForm.data.answers[q.id] || ''}
                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: e.target.value })}
                                                                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 transition-all shadow-sm"
                                                            ></textarea>
                                                        ) : q.type === 'multiple_choice' ? (
                                                            <div className="grid gap-3">
                                                                {(q.options || []).map((opt: any, optIdx: number) => (
                                                                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group shadow-sm ${studentForm.data.answers[q.id] === opt.id.toString() ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20' : 'border-slate-50 bg-white dark:bg-slate-900 dark:border-slate-800 hover:border-sky-200'}`}>
                                                                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${studentForm.data.answers[q.id] === opt.id.toString() ? 'border-sky-500 bg-sky-500' : 'border-slate-200 group-hover:border-sky-300'}`}>
                                                                            {studentForm.data.answers[q.id] === opt.id.toString() && <div className="h-2 w-2 rounded-full bg-white" />}
                                                                        </div>
                                                                        <input 
                                                                            type="radio" 
                                                                            name={`q-${q.id}`} 
                                                                            checked={studentForm.data.answers[q.id] === opt.id.toString()}
                                                                            onChange={() => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: opt.id.toString() })}
                                                                            className="sr-only"
                                                                        />
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${studentForm.data.answers[q.id] === opt.id.toString() ? 'text-primary' : 'text-muted-foreground'}`}>
                                                                                {String.fromCharCode(65 + optIdx)}.
                                                                            </span>
                                                                            <span className={`text-sm font-bold ${studentForm.data.answers[q.id] === opt.id.toString() ? 'text-foreground' : 'text-slate-600 dark:text-muted-foreground'}`}>
                                                                                {opt.text}
                                                                            </span>
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                placeholder="Ketik jawaban singkat..."
                                                                value={studentForm.data.answers[q.id] || ''}
                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: e.target.value })}
                                                                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 transition-all shadow-sm"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="pt-8 border-t border-slate-50 dark:border-slate-800 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Catatan Tambahan untuk Pengajar</p>
                                                </div>
                                                <textarea 
                                                    rows={4}
                                                    placeholder="Rangkuman jawaban atau hal yang ingin Anda sampaikan terkait kuis ini..."
                                                    value={studentForm.data.content}
                                                    onChange={(e) => studentForm.setData('content', e.target.value)}
                                                    className="w-full rounded-[2rem] border border-slate-100 bg-slate-50/30 px-6 py-5 text-sm font-medium outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 transition-all shadow-sm"
                                                ></textarea>
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'exit_ticket' ? (
                                        <div className="space-y-12 animate-in fade-in duration-700">
                                            {/* Exit Ticket Header & Progress */}
                                            <div className="relative overflow-hidden rounded-[8px] bg-slate-50 border border-slate-200 dark:bg-[#1B1B25] dark:border-[#2C2C3A] p-6 shadow-none text-slate-800 dark:text-[#F1F1F4]">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-[#5E6AD2]/5 blur-3xl" />
                                                <div className="relative flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-11 w-11 rounded-[6px] bg-[#5E6AD2]/10 dark:bg-[#5E6AD2] text-[#5E6AD2] dark:text-white shadow-none flex items-center justify-center">
                                                            <Ticket className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 dark:text-[#F1F1F4]">
                                                                Exit Ticket / CATs
                                                            </h3>
                                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Refleksi Cepat • {assignment.instrument_config?.questions?.length || 0} Pertanyaan</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="mt-8">
                                                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-2 text-slate-500 dark:text-[#8A8F98]">
                                                        <span>Progres Pengerjaan</span>
                                                        <span>{Math.round((Object.values(studentForm.data.answers).filter((v: any) => v && String(v).trim()).length / (assignment.instrument_config?.questions?.length || 1)) * 100)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-[#101014] overflow-hidden">
                                                        <div 
                                                            className="h-full bg-[#5E6AD2] transition-all duration-500"
                                                            style={{ width: `${(Object.values(studentForm.data.answers).filter((v: any) => v && String(v).trim()).length / (assignment.instrument_config?.questions?.length || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => {
                                                    const qKey = q.id ?? `et_${idx}`;
                                                    const isAnswered = studentForm.data.answers[qKey] && String(studentForm.data.answers[qKey]).trim();
                                                    return (
                                                        <div 
                                                            key={qKey} 
                                                            className={`group relative transition-all duration-150 rounded-[8px] border border-slate-200 bg-white dark:border-[#2C2C3A] dark:bg-[#1B1B25] p-6 shadow-none ${isAnswered ? 'border-[#5E6AD2]/50 bg-[#5E6AD2]/5 dark:bg-[#1E1E2A]' : 'hover:border-[#6E79D6]/50 hover:bg-slate-50/50 dark:hover:bg-[#1E1E2A]/20'}`}
                                                        >
                                                            <div className="flex items-center gap-3 mb-6">
                                                                <span className="font-mono text-xs font-semibold text-slate-500 dark:text-[#8A8F98] bg-slate-50 dark:bg-[#101014] px-2.5 py-1 rounded-[4px] border border-slate-200 dark:border-[#2C2C3A]">Q{idx + 1}</span>
                                                                <div className="h-px flex-1 bg-slate-200 dark:bg-[#2C2C3A]"></div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <div className="space-y-4">
                                                                    <h4 className="text-sm font-semibold tracking-[-0.01em] text-slate-850 dark:text-[#F1F1F4] leading-relaxed">{q.text}</h4>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    {q.type === 'multiple_choice' ? (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                            {(q.options || []).map((opt: any, optIdx: number) => (
                                                                                <button 
                                                                                    key={opt.id}
                                                                                    type="button"
                                                                                    onClick={() => studentForm.setData('answers', { ...studentForm.data.answers, [qKey]: opt.id.toString() })}
                                                                                    className={`flex items-center gap-3 p-3.5 rounded-[8px] border transition-all text-left group/opt ${studentForm.data.answers[qKey] === opt.id.toString() ? 'border-[#5E6AD2] bg-[#5E6AD2]/10 dark:bg-[#1E1E2A]' : 'border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#101014] hover:bg-slate-50 dark:hover:bg-[#1F1F2E] hover:border-[#6E79D6]/50'}`}
                                                                                >
                                                                                    <div className={`h-6 w-6 rounded-full border flex items-center justify-center flex-shrink-0 font-semibold text-[11px] font-mono transition-all ${studentForm.data.answers[qKey] === opt.id.toString() ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white' : 'border-slate-200 dark:border-[#2C2C3A] bg-slate-50 dark:bg-[#1B1B25] text-slate-500 dark:text-[#8A8F98] group-hover/opt:border-[#6E79D6] group-hover/opt:text-[#6E79D6]'}`}>
                                                                                        {String.fromCharCode(65 + optIdx)}
                                                                                    </div>
                                                                                    <span className={`text-xs font-semibold ${studentForm.data.answers[qKey] === opt.id.toString() ? 'text-[#5E6AD2] dark:text-[#F1F1F4]' : 'text-slate-700 dark:text-[#8A8F98]'}`}>{opt.text}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    ) : q.type === 'short_answer' ? (
                                                                        <div className="relative">
                                                                            <input 
                                                                                type="text"
                                                                                value={studentForm.data.answers[qKey] || ''}
                                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [qKey]: e.target.value })}
                                                                                placeholder="Ketik jawaban singkat Anda..."
                                                                                className="w-full rounded-[6px] border border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#101014] px-4 py-3 text-xs font-medium focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/15 transition-all text-slate-800 dark:text-[#F1F1F4] placeholder-slate-450 dark:placeholder-[#8A8F98]"
                                                                            />
                                                                            <PenTool className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="relative">
                                                                            <textarea 
                                                                                rows={4}
                                                                                value={studentForm.data.answers[qKey] || ''}
                                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [qKey]: e.target.value })}
                                                                                placeholder="Tuliskan jawaban atau refleksi Anda..."
                                                                                className="w-full rounded-[6px] border border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#101014] px-4 py-3 text-xs font-medium focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/15 transition-all text-slate-800 dark:text-[#F1F1F4] placeholder-slate-450 dark:placeholder-[#8A8F98] resize-none leading-relaxed"
                                                                            />
                                                                            <FileText className="absolute right-4 top-4 h-4 w-4 text-slate-400" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'concept_map' ? (
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            <div className="p-6 rounded-[2.5rem] bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="h-10 w-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                                                        <GitBranch className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none mb-1">Peta Konsep (Concept Map)</h4>
                                                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Topik: {assignment.instrument_config?.central_topic}</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground dark:text-muted-foreground font-medium italic leading-relaxed ml-14">
                                                    "{assignment.instrument_config?.instructions}"
                                                </p>
                                            </div>

                                            <ConceptMapCanvas 
                                                data={conceptMapData} 
                                                setData={setConceptMapData} 
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-500">
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Teks Jawaban / Laporan</label>
                                                <textarea 
                                                    rows={8}
                                                    placeholder="Tuliskan jawaban, penjelasan, atau laporan Anda di sini secara lengkap..."
                                                    value={studentForm.data.content}
                                                    onChange={(e) => studentForm.setData('content', e.target.value)}
                                                    className="w-full rounded-[2.5rem] border border-slate-100 bg-slate-50/30 px-8 py-6 text-sm font-medium outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 transition-all shadow-sm"
                                                ></textarea>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Upload className="h-4 w-4" /> Lampiran File (Opsional)
                                        </label>
                                        <div className="relative group">
                                            {my_submission?.file_path && (
                                                <div className="mb-4 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30 flex items-center justify-between group/file">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm border border-sky-100 dark:border-sky-800">
                                                            <FileText className="h-6 w-6" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">File Terkirim</p>
                                                            <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">{my_submission.file_path.split('/').pop()}</p>
                                                        </div>
                                                    </div>
                                                    <a 
                                                        href={`/storage/${my_submission.file_path}`} 
                                                        target="_blank"
                                                        className="h-8 px-4 rounded-lg bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 dark:shadow-none"
                                                    >
                                                        Lihat File
                                                    </a>
                                                </div>
                                            )}
                                            <div className="w-full rounded-[2.5rem] border-2 border-dashed border-border bg-slate-50/20 px-8 py-12 text-center transition-all group-hover:border-sky-400 group-hover:bg-sky-50/10 cursor-pointer">
                                                <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors shadow-sm">
                                                    <Upload className="h-6 w-6" />
                                                </div>
                                                <p className="text-sm font-bold text-slate-600 dark:text-muted-foreground">
                                                    {studentForm.data.file ? studentForm.data.file.name : 'Klik atau seret file ke sini untuk mengganti/unggah file baru'}
                                                </p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Maks. 10MB (PDF, DOC, Gambar)</p>
                                                <input 
                                                    type="file"
                                                    onChange={(e) => studentForm.setData('file', e.target.files ? e.target.files[0] : null)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full ${
                                            (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                ? 'rounded-[6px] bg-[#5E6AD2] hover:bg-[#4E5BBF] shadow-none py-4 text-xs font-semibold'
                                                : 'rounded-[2rem] bg-gradient-to-r from-sky-500 to-indigo-600 shadow-sky-200 py-5 text-sm font-black'
                                        } text-white shadow-2xl dark:shadow-none hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest`}
                                    >
                                        {my_submission ? 'Perbarui Jawaban' : 'Kirim Jawaban Sekarang'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className={(assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                ? "rounded-[8px] border border-slate-200 dark:border-[#2C2C3A] bg-white dark:bg-[#1B1B25] p-6 shadow-none"
                                : "rounded-[2.5rem] border border-border bg-white dark:bg-slate-900 p-8 shadow-sm"
                            }>
                                <h2 className={`text-xs font-black text-foreground uppercase tracking-widest mb-6 border-b pb-4 ${
                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                        ? 'border-slate-100 dark:border-[#2C2C3A]'
                                        : 'border-slate-50 dark:border-slate-800'
                                }`}>Status Pengumpulan</h2>
                                {my_submission ? (
                                    <>
                                        <div className="space-y-6">
                                            <div className={`flex items-center gap-4 p-5 border ${
                                                (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                    ? 'rounded-[8px] bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                                                    : 'rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30'
                                            }`}>
                                                <div className={`h-10 w-10 flex items-center justify-center text-white ${
                                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                        ? 'rounded-[6px] bg-emerald-500 shadow-none'
                                                        : 'rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-200'
                                                }`}>
                                                    <CheckCircle2 className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Selesai Dikirim</p>
                                                        {my_submission.attempts > 1 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-[8px] font-bold text-warning italic">({my_submission.attempts}x remedial)</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-emerald-600/70">{my_submission.submitted_at}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pencapaian:</p>
                                                <div className="flex items-end gap-2">
                                                    <span className={`text-5xl font-black tracking-tighter ${displayScore !== null ? 'text-foreground' : 'text-slate-300'}`}>
                                                        {displayScore ?? '-'}
                                                    </span>
                                                    <span className="text-sm font-black text-muted-foreground mb-2 uppercase">/ {assignment.max_points} pts</span>
                                                </div>
                                                {displayScore !== null && (
                                                    <div className="pt-2">
                                                        {(() => {
                                                            const systemScore = calculateSystemScore(my_submission?.content || '');
                                                            const isObjectiveOnly = assignment.instrument_config?.questions?.every((q: any) => q.type === 'multiple_choice' || q.type === 'short_answer');
                                                            const effectivePassed = (systemScore === 0 || isObjectiveOnly)
                                                                ? (Number(displayScore) >= (assignment.passing_grade || assignment.instrument_config?.pass_threshold || 70))
                                                                : (my_submission.score !== null ? my_submission.is_passed : (Number(displayScore) >= (assignment.passing_grade || assignment.instrument_config?.pass_threshold || 70)));
                                                            
                                                            return effectivePassed ? (
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-white text-[9px] font-black uppercase tracking-widest ${
                                                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                        ? 'rounded-[4px] bg-emerald-500 shadow-none'
                                                                        : 'rounded-lg bg-emerald-500 shadow-sm'
                                                                }`}>
                                                                    <CheckCircle2 className="h-3 w-3" /> Tuntas
                                                                </span>
                                                            ) : (
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-white text-[9px] font-black uppercase tracking-widest ${
                                                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                        ? 'rounded-[4px] bg-rose-500 shadow-none'
                                                                        : 'rounded-lg bg-rose-500 shadow-sm'
                                                                }`}>
                                                                    <AlertCircle className="h-3 w-3" /> Remedial
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                                {displayScore === null && (
                                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Menunggu Penilaian Guru</p>
                                                )}
                                            </div>

                                            {displayScore !== null && assignment.assessment_type === 'initial' && (
                                                <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4 duration-500">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Rekomendasi Tindak Lanjut:</p>
                                                    {Number(displayScore) >= Number(assignment.instrument_config?.pass_threshold || 60) ? (
                                                        <div className={`p-6 border space-y-4 ${
                                                            (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                ? 'rounded-[8px] bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                                                                : 'rounded-[2.5rem] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30'
                                                        }`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`h-6 w-6 flex items-center justify-center text-white ${
                                                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                        ? 'rounded-[4px] bg-emerald-500 shadow-none'
                                                                        : 'rounded-lg bg-emerald-500 shadow-sm'
                                                                }`}>
                                                                    <Star className="h-3.5 w-3.5" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Kategori: Siap / Cakap</span>
                                                            </div>
                                                            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-bold italic">
                                                                "{assignment.instrument_config?.follow_up_high || 'Murid dapat langsung mengikuti materi baru atau diberikan tantangan pengayaan.'}"
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className={`p-6 border space-y-4 ${
                                                            (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                ? 'rounded-[8px] bg-rose-500/10 border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-900/30'
                                                                : 'rounded-[2.5rem] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30'
                                                        }`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`h-6 w-6 flex items-center justify-center text-white ${
                                                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                        ? 'rounded-[4px] bg-rose-500 shadow-none'
                                                                        : 'rounded-lg bg-rose-500 shadow-sm'
                                                                }`}>
                                                                    <Info className="h-3.5 w-3.5" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Kategori: Perlu Bimbingan</span>
                                                            </div>
                                                            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-bold italic">
                                                                "{assignment.instrument_config?.follow_up_low || 'Pendidik memberikan pendampingan khusus atau mengulang sekilas materi prasyarat.'}"
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {my_submission.feedback && (
                                                <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Umpan Balik Guru:</p>
                                                    <div className={`p-5 border ${
                                                        (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                            ? 'rounded-[8px] bg-slate-50 dark:bg-[#101014] border-slate-200 dark:border-[#2C2C3A]'
                                                            : 'rounded-3xl bg-muted/50 border border-border'
                                                    }`}>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">
                                                            "{my_submission.feedback}"
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {assignment.instrument_type === 'observation_checklist' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <Activity className="h-4 w-4 text-primary" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Observasi Anda</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'observation') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="grid gap-3">
                                                                        {(assignment.instrument_config?.indicators || []).map((ind: any) => (
                                                                            <div key={ind.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{ind.text}</span>
                                                                                {p.checklist[ind.id] === true ? (
                                                                                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest shadow-sm">Muncul</span>
                                                                                ) : (
                                                                                    <span className="px-3 py-1 rounded-full bg-slate-200 text-muted-foreground text-[8px] font-black uppercase tracking-widest">Belum</span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {p.note && (
                                                                        <div className="p-5 rounded-3xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Catatan Guru:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">"{p.note}"</p>
                                                                        </div>
                                                                    )}
                                                                    {p.action_plan && (
                                                                        <div className="p-5 rounded-3xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                                                                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Strategi Pengembangan:</p>
                                                                            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold leading-relaxed italic">"{p.action_plan}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'rubric' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <ListChecks className="h-4 w-4 text-amber-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Capaian Kinerja Anda</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'rubric') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    {(assignment.instrument_config?.criteria || []).map((criterion: any) => {
                                                                        const achievedLevelId = p.scores[criterion.id];
                                                                        const level = (assignment.instrument_config?.levels || []).find((l: any) => l.id === achievedLevelId);
                                                                        return (
                                                                            <div key={criterion.id} className="space-y-3">
                                                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-4">{criterion.text}</p>
                                                                                {level ? (
                                                                                    <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 shadow-sm transition-all hover:scale-[1.01]">
                                                                                        <div className="flex items-center justify-between mb-2">
                                                                                            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest shadow-sm">{level.name}</span>
                                                                                            <CheckCircle2 className="h-4 w-4 text-amber-500" />
                                                                                        </div>
                                                                                        <p className="text-xs text-slate-700 dark:text-slate-200 font-bold leading-relaxed italic">
                                                                                            "{criterion.descriptions[level.id] || 'Luar biasa, Anda telah mencapai level ini.'}"
                                                                                        </p>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="p-4 rounded-2xl bg-muted/50 border border-border italic text-[10px] text-muted-foreground font-bold text-center">
                                                                                        Belum dinilai oleh pengajar.
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'anecdotal_notes' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <FileText className="h-4 w-4 text-indigo-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Detail Catatan Anekdotal</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'anecdotal') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="flex flex-wrap gap-3">
                                                                        <div className="px-4 py-2 rounded-xl bg-muted border border-slate-100 dark:border-slate-700">
                                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Tanggal</p>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.date}</p>
                                                                        </div>
                                                                        {p.time && (
                                                                            <div className="px-4 py-2 rounded-xl bg-muted border border-slate-100 dark:border-slate-700">
                                                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Waktu</p>
                                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.time}</p>
                                                                            </div>
                                                                        )}
                                                                        {p.location && (
                                                                            <div className="px-4 py-2 rounded-xl bg-muted border border-slate-100 dark:border-slate-700">
                                                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Lokasi</p>
                                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.location}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {p.context && (
                                                                        <div className="p-5 rounded-3xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Konteks Kejadian:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{p.context}</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Deskripsi Peristiwa:</p>
                                                                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic">"{p.event_description}"</p>
                                                                    </div>
                                                                    <div className="p-5 rounded-3xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Analisis & Tindak Lanjut:</p>
                                                                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold leading-relaxed italic">"{p.analysis_followup}"</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'self_assessment' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <UserCheck className="h-4 w-4 text-amber-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Refleksi Anda</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'self_assessment') {
                                                            const feelingMap: any = {
                                                                very_happy: { label: 'Sangat Senang', icon: '🤩' },
                                                                happy: { label: 'Senang', icon: '😊' },
                                                                neutral: { label: 'Kurang Senang', icon: '😐' },
                                                            };
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="flex flex-wrap gap-3">
                                                                        <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
                                                                            <span className="text-xl">{feelingMap[p.feeling]?.icon}</span>
                                                                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{feelingMap[p.feeling]?.label || 'Biasa Saja'}</p>
                                                                        </div>
                                                                        <div className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
                                                                            <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Skala Usaha</p>
                                                                            <p className="text-xs font-bold text-sky-700 dark:text-sky-400">{p.effort_scale} / 4</p>
                                                                        </div>
                                                                    </div>
                                                                    {p.feeling_reason && (
                                                                        <div className="p-5 rounded-3xl bg-muted/50 border border-border">
                                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Alasan Perasaan:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{p.feeling_reason}"</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Catatan Refleksi:</p>
                                                                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-bold">"{p.reflection_notes}"</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'peer_assessment' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <Users className="h-4 w-4 text-indigo-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Penilaian Teman Anda</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'peer_assessment') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="p-4 rounded-2xl bg-muted border border-slate-100 dark:border-slate-700">
                                                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Teman yang Dinilai:</p>
                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.peer_name}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                                            <Star key={s} className={`h-4 w-4 ${p.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                                                                        ))}
                                                                        <span className="text-xs font-black text-muted-foreground ml-2">{p.rating} / 5</span>
                                                                    </div>
                                                                    <div className="grid gap-3">
                                                                        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Terbaik di Kelompok:</p>
                                                                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{p.best_performer}</p>
                                                                        </div>
                                                                        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                                                                            <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Perlu Peningkatan:</p>
                                                                            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{p.worst_performer}</p>
                                                                        </div>
                                                                    </div>
                                                                    {p.obstacles && (
                                                                        <div className="p-5 rounded-3xl bg-muted/50 border border-border">
                                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Kendala Kelompok:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic">"{p.obstacles}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'concept_map' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <GitBranch className="h-4 w-4 text-indigo-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Peta Konsep Anda</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'concept_map') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="p-5 rounded-[2.5rem] bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 leading-none">Topik Utama:</p>
                                                                        <p className="text-sm font-black text-foreground">{assignment.instrument_config?.central_topic}</p>
                                                                    </div>
                                                                    <ConceptMapCanvas 
                                                                        data={{ nodes: p.nodes || [], edges: p.edges || [] }} 
                                                                        readOnly={true} 
                                                                    />
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {(assignment.instrument_type === 'written_test' || assignment.instrument_type === 'formative_quiz') && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    {assignment.instrument_type === 'formative_quiz' ? (
                                                        <ListChecks className="h-4 w-4 text-[#5E6AD2]" />
                                                    ) : (
                                                        <Layers className="h-4 w-4 text-rose-500" />
                                                    )}
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                                                        {assignment.instrument_type === 'formative_quiz' ? 'Hasil Kuis Formatif' : 'Hasil Tes Tertulis'}
                                                    </h3>
                                                </div>
                                                <div className={
                                                    assignment.instrument_type === 'formative_quiz'
                                                        ? "p-5 rounded-[8px] bg-slate-50 dark:bg-[#101014] border border-slate-200 dark:border-[#2C2C3A]"
                                                        : "p-5 rounded-3xl bg-muted/50 border border-border"
                                                }>
                                                    <p className={`text-xs font-bold leading-relaxed ${
                                                        assignment.instrument_type === 'formative_quiz'
                                                            ? 'text-slate-700 dark:text-slate-300'
                                                            : 'text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                        Anda telah menyelesaikan {assignment.instrument_type === 'formative_quiz' ? 'kuis' : 'tes'} ini. {displayScore !== null ? `Skor Anda adalah ${displayScore} dari ${assignment.max_points} poin.` : 'Menunggu hasil penilaian otomatis/guru.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {assignment.instrument_type === 'performance_observation' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <Activity className="h-4 w-4 text-emerald-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Observasi Kinerja</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'performance_observation') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="grid gap-3">
                                                                        {(assignment.instrument_config?.indicators || []).map((indicator: any) => {
                                                                            const val = p.observations?.[indicator.id];
                                                                            const lvl = [
                                                                                { id: 'belum', label: 'Belum Terlihat', color: 'rose' },
                                                                                { id: 'mulai', label: 'Mulai Terlihat', color: 'amber' },
                                                                                { id: 'konsisten', label: 'Konsisten', color: 'emerald' }
                                                                            ].find(l => l.id === val);
                                                                            return (
                                                                                <div key={indicator.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-sm">
                                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{indicator.text}</span>
                                                                                    {lvl ? (
                                                                                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-${lvl.color}-50 dark:bg-${lvl.color}-950/20 text-${lvl.color}-600 border border-${lvl.color}-100 dark:border-${lvl.color}-900/30`}>
                                                                                            {lvl.label}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Belum Dinilai</span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {p.notes && (
                                                                        <div className="p-5 rounded-[2rem] bg-muted/50 border border-border">
                                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Umpan Balik Guru:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{p.notes}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center py-10 text-center space-y-4">
                                        {['observation_checklist', 'anecdotal_notes', 'performance_observation'].includes(assignment.instrument_type) ? (
                                            <>
                                                <div className={`h-16 w-16 rounded-[2rem] ${assignment.instrument_type === 'anecdotal_notes' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500' : 'bg-sky-50 dark:bg-sky-950/20 text-primary'} flex items-center justify-center`}>
                                                    {assignment.instrument_type === 'anecdotal_notes' ? <FileText className="h-8 w-8 opacity-50" /> : <Activity className="h-8 w-8 opacity-50" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-foreground uppercase tracking-widest">
                                                        {assignment.instrument_type === 'anecdotal_notes' ? 'Menunggu Catatan Anekdotal' : 'Menunggu Observasi'}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Guru akan mencatat perkembangan Anda di kelas.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-16 w-16 rounded-[2rem] bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500">
                                                    <Clock className="h-8 w-8 opacity-50" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-foreground uppercase tracking-widest">Belum Dikerjakan</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Selesaikan sebelum tenggat waktu.</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] border border-border bg-white dark:bg-slate-900 p-8 shadow-sm">
                            <CommentSection 
                                assignmentId={assignment.id} 
                                comments={comments} 
                                authId={auth_id} 
                                userRole={user_role} 
                            />
                    </div>
                </div>
            )}
        </div>

            {/* Observation Modal (TEACHER) */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl rounded-[3rem] bg-white dark:bg-slate-900 p-10 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-2xl ${assignment.instrument_type === 'anecdotal_notes' ? 'bg-indigo-500 shadow-indigo-200' : 'bg-sky-500 shadow-sky-200'} flex items-center justify-center text-white shadow-lg`}>
                                    {assignment.instrument_type === 'anecdotal_notes' ? <FileText className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-foreground tracking-tight">
                                        {assignment.instrument_type === 'anecdotal_notes' ? 'Catatan Anekdotal' : 'Observasi Siswa'}
                                    </h3>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{selectedStudent.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
                                <X className="h-6 w-6 text-muted-foreground" />
                            </button>
                        </div>

                        {assignment.instrument_type === 'anecdotal_notes' ? (
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tanggal Kejadian</label>
                                        <input 
                                            type="date"
                                            value={anecdotalData.date}
                                            onChange={(e) => setAnecdotalData({ ...anecdotalData, date: e.target.value })}
                                            className="w-full rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-5 py-3 text-xs font-bold focus:border-indigo-400 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Waktu & Tempat</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                placeholder="Waktu"
                                                value={anecdotalData.time}
                                                onChange={(e) => setAnecdotalData({ ...anecdotalData, time: e.target.value })}
                                                className="w-24 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-xs font-bold focus:border-indigo-400 outline-none transition-all"
                                            />
                                            <input 
                                                type="text"
                                                placeholder="Lokasi..."
                                                value={anecdotalData.location}
                                                onChange={(e) => setAnecdotalData({ ...anecdotalData, location: e.target.value })}
                                                className="flex-1 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-xs font-bold focus:border-indigo-400 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Konteks Kejadian</label>
                                    <input 
                                        type="text"
                                        placeholder="Misal: Saat mengerjakan proyek kelompok membuat miniatur tata surya"
                                        value={anecdotalData.context}
                                        onChange={(e) => setAnecdotalData({ ...anecdotalData, context: e.target.value })}
                                        className="w-full rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-5 py-4 text-xs font-medium focus:border-indigo-400 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Deskripsi Peristiwa (Objektif & Faktual)</label>
                                    <textarea 
                                        rows={4}
                                        placeholder="Apa yang diucapkan atau dilakukan murid secara objektif..."
                                        value={anecdotalData.event_description}
                                        onChange={(e) => setAnecdotalData({ ...anecdotalData, event_description: e.target.value })}
                                        className="w-full rounded-[2rem] border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 text-xs font-medium focus:border-indigo-400 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Analisis & Tindak Lanjut</label>
                                    <textarea 
                                        rows={4}
                                        placeholder="Interpretasi guru dan rencana strategi ke depannya..."
                                        value={anecdotalData.analysis_followup}
                                        onChange={(e) => setAnecdotalData({ ...anecdotalData, analysis_followup: e.target.value })}
                                        className="w-full rounded-[2rem] border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 text-xs font-medium focus:border-emerald-400 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSaveAnecdotal}
                                        className="flex-[2] rounded-[1.5rem] bg-gradient-to-r from-indigo-500 to-purple-600 py-4 text-xs font-black text-white shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Catatan
                                    </button>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'oral_test' ? (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Skor Akhir (0 - {assignment.max_points})</label>
                                            <div className="relative group">
                                                <input 
                                                    type="number"
                                                    value={oralTestData.score}
                                                    onChange={(e) => {
                                                        const val = Math.min(assignment.max_points, Math.max(0, parseInt(e.target.value) || 0));
                                                        setOralTestData({ ...oralTestData, score: val });
                                                    }}
                                                    className="w-full rounded-[2rem] border border-border bg-slate-50/50 dark:bg-slate-800/50 px-8 py-5 text-3xl font-black text-primary focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 outline-none transition-all text-center"
                                                />
                                                <div className="absolute top-1/2 -translate-y-1/2 right-6 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setOralTestData(prev => ({ ...prev, score: Math.min(assignment.max_points, prev.score + 5) }))} className="p-1 hover:bg-indigo-50 rounded-md text-indigo-500"><ChevronUp className="h-4 w-4" /></button>
                                                    <button onClick={() => setOralTestData(prev => ({ ...prev, score: Math.max(0, prev.score - 5) }))} className="p-1 hover:bg-rose-50 rounded-md text-rose-500"><ChevronDown className="h-4 w-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Catatan & Umpan Balik Langsung</label>
                                            <textarea 
                                                rows={3}
                                                value={oralTestData.notes}
                                                onChange={(e) => setOralTestData({ ...oralTestData, notes: e.target.value })}
                                                placeholder="Ketik catatan di sini saat siswa berbicara..."
                                                className="w-full h-full rounded-[2rem] border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-border">
                                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Mic className="h-4 w-4" /> Panduan Pertanyaan & Respon Siswa
                                        </h4>
                                        <div className="grid gap-6">
                                            {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => (
                                                <div key={q.id} className="p-6 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-800/20 border border-border space-y-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 space-y-1">
                                                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Pertanyaan 0{idx + 1}</span>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{q.text}</p>
                                                        </div>
                                                        <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 max-w-[240px]">
                                                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Panduan Kunci</span>
                                                            <p className="text-[10px] text-slate-600 dark:text-muted-foreground italic leading-snug">{q.answer_guide || 'Tidak ada panduan khusus.'}</p>
                                                        </div>
                                                    </div>
                                                    <textarea 
                                                        rows={2}
                                                        value={oralTestData.question_responses[q.id] || ''}
                                                        onChange={(e) => setOralTestData({ 
                                                            ...oralTestData, 
                                                            question_responses: { ...oralTestData.question_responses, [q.id]: e.target.value } 
                                                        })}
                                                        placeholder="Ringkasan jawaban siswa untuk soal ini..."
                                                        className="w-full rounded-2xl border border-border bg-white dark:bg-slate-900 px-5 py-3 text-[11px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Auto-saving session enabled</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedStudent(null)}
                                            className="px-8 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                            Selesai
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleSaveOralTest}
                                            className="px-10 py-4 rounded-2xl bg-indigo-600 text-xs font-black text-white shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                                        >
                                            Simpan Sekarang
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'performance' ? (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-10">
                                    {/* Score Header */}
                                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none">
                                                <Zap className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest leading-none">Skor Akhir Otomatis</h4>
                                                <p className="text-[9px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest mt-1">Berdasarkan Bobot Kriteria</p>
                                            </div>
                                        </div>
                                        <div className="text-4xl font-black text-emerald-600 tracking-tighter">
                                            {teacherForm.data.score}
                                        </div>
                                    </div>

                                    {/* Criteria List */}
                                    <div className="space-y-12">
                                        {(assignment.instrument_config?.criteria || []).map((criterion: any) => (
                                            <div key={criterion.id} className="space-y-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-muted-foreground">
                                                            {criterion.weight}%
                                                        </div>
                                                        <h4 className="text-xs font-black text-foreground uppercase tracking-widest">{criterion.text}</h4>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                    {(assignment.instrument_config?.levels || []).map((level: any) => (
                                                        <button
                                                            key={level.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const newScores = { ...performanceData.scores, [criterion.id]: level.id };
                                                                setPerformanceData({ ...performanceData, scores: newScores });
                                                                const final = calculatePerformanceScore(newScores);
                                                                 teacherForm.setData('score', final);
                                                             }}
                                                             className={`p-5 rounded-3xl border-2 transition-all text-left flex flex-col justify-between h-full group ${performanceData.scores[criterion.id] === level.id ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-50 dark:border-slate-800 bg-slate-50/20 hover:border-emerald-200'}`}
                                                        >
                                                            <div>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <span className={`text-[9px] font-black uppercase tracking-tighter ${performanceData.scores[criterion.id] === level.id ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-emerald-500'}`}>{level.name}</span>
                                                                    {performanceData.scores[criterion.id] === level.id && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                                                </div>
                                                                <p className={`text-[10px] leading-relaxed font-medium ${performanceData.scores[criterion.id] === level.id ? 'text-slate-700 dark:text-slate-200' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                                                                    {criterion.descriptions[level.id] || 'Belum ada deskripsi.'}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Evidence & Notes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Bukti Praktik (Foto/Video)</label>
                                            <div className="relative group/upload h-40 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden hover:border-emerald-400 transition-all">
                                                {performanceData.evidence_preview ? (
                                                    <div className="relative w-full h-full group">
                                                        <img src={performanceData.evidence_preview} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setPerformanceData({ ...performanceData, evidence: null, evidence_preview: '' })}
                                                                className="h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <div className="h-12 w-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto group-hover/upload:scale-110 group-hover/upload:text-emerald-500 transition-all">
                                                            <Camera className="h-6 w-6" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Klik untuk unggah bukti</p>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*,video/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    setPerformanceData({ ...performanceData, evidence: file, evidence_preview: URL.createObjectURL(file) });
                                                                }
                                                            }}
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Umpan Balik Perbaikan</label>
                                            <textarea 
                                                rows={6}
                                                value={performanceData.notes}
                                                onChange={(e) => setPerformanceData({ ...performanceData, notes: e.target.value })}
                                                placeholder="Berikan catatan spesifik terkait keterampilan yang perlu ditingkatkan murid..."
                                                className="w-full rounded-[2rem] border border-border bg-slate-50/30 dark:border-slate-800/30 px-6 py-5 text-xs font-medium focus:border-emerald-400 outline-none transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSavePerformance}
                                        className="flex-[2] rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-xs font-black text-white shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Penilaian Kinerja
                                    </button>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'project' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
                                {/* Left Side: Submission Preview */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 flex items-center justify-center">
                                            <FolderOpen className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Karya Siswa</h4>
                                    </div>
                                    
                                    <div className="rounded-[2.5rem] bg-muted/40 border border-slate-100 dark:border-slate-700 p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                                        {submissionMap[selectedStudent.id] ? (
                                            <div className="w-full space-y-6">
                                                {/* File/Link Preview Logic */}
                                                <div className="aspect-video w-full rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-border flex flex-col items-center justify-center p-8">
                                                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center mb-4">
                                                        {submissionMap[selectedStudent.id].content_type?.includes('image') ? <ImageIcon className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                                                    </div>
                                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest truncate max-w-full px-4">
                                                        {submissionMap[selectedStudent.id].original_filename || 'File Tugas'}
                                                    </p>
                                                    <a 
                                                        href={submissionMap[selectedStudent.id].file_path ?? undefined} 
                                                        target="_blank"
                                                        className="mt-6 px-6 py-3 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                                                    >
                                                        Buka / Download File
                                                    </a>
                                                </div>
                                                <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                                                    <h5 className="text-[9px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <MessageSquare className="h-3 w-3" /> Komentar Siswa
                                                    </h5>
                                                    <p className="text-xs font-medium text-slate-600 dark:text-muted-foreground italic">
                                                        "{submissionMap[selectedStudent.id].content || 'Tidak ada komentar dari siswa.'}"
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto opacity-50">
                                                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-bold text-muted-foreground italic">Siswa belum mengumpulkan tugas.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Rubric Panel */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
                                                <Star className="h-4 w-4" />
                                            </div>
                                            <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Panel Penilaian Proyek</h4>
                                        </div>
                                        <div className="px-6 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block leading-none">Skor Akhir</span>
                                            <span className="text-2xl font-black text-emerald-600 tracking-tighter">{teacherForm.data.score}</span>
                                        </div>
                                    </div>

                                    <div className="max-h-[65vh] overflow-y-auto pr-3 custom-scrollbar space-y-8 pb-8">
                                        {(assignment.instrument_config?.criteria || []).map((criterion: any) => (
                                            <div key={criterion.id} className="space-y-4">
                                                <div className="flex items-center gap-2 ml-2">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{criterion.text}</span>
                                                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
                                                    <span className="text-[9px] font-bold text-muted-foreground">{criterion.weight}%</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(assignment.instrument_config?.levels || []).map((level: any) => (
                                                        <button
                                                            key={level.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const newScores = { ...projectData.scores, [criterion.id]: level.id };
                                                                setProjectData({ ...projectData, scores: newScores });
                                                                const final = calculatePerformanceScore(newScores);
                                                                teacherForm.setData('score', final);
                                                            }}
                                                            className={`p-4 rounded-2xl border-2 transition-all text-left group ${projectData.scores[criterion.id] === level.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-50 dark:border-slate-800 bg-slate-50/20 hover:border-indigo-200'}`}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${projectData.scores[criterion.id] === level.id ? 'text-indigo-600' : 'text-muted-foreground'}`}>{level.name}</span>
                                                                {projectData.scores[criterion.id] === level.id && <CheckCircle2 className="h-3 w-3 text-indigo-500" />}
                                                            </div>
                                                            <p className={`text-[9px] leading-snug font-medium line-clamp-3 ${projectData.scores[criterion.id] === level.id ? 'text-slate-700 dark:text-slate-200' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                                                                {criterion.descriptions[level.id] || 'N/A'}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="space-y-4 pt-6 border-t border-border">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Umpan Balik Proyek</label>
                                            <textarea 
                                                rows={4}
                                                value={projectData.notes}
                                                onChange={(e) => setProjectData({ ...projectData, notes: e.target.value })}
                                                placeholder="Berikan apresiasi atau arahan perbaikan untuk proyek ini..."
                                                className="w-full rounded-[2rem] border border-border bg-slate-50/30 px-6 py-5 text-xs font-medium focus:border-indigo-400 outline-none transition-all resize-none"
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedStudent(null)}
                                                className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                            >
                                                Batal
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={handleSaveProject}
                                                className="flex-[2] rounded-2xl bg-indigo-600 py-4 text-xs font-black text-white shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                            >
                                                Simpan & Beri Nilai
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'portfolio' ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Portfolio Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-amber-50 dark:bg-amber-950/20 p-8 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/30">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xl shadow-amber-200 dark:shadow-none">
                                            <Briefcase className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-amber-800 dark:text-amber-300 uppercase tracking-tight">Showcase Portofolio</h4>
                                            <p className="text-xs text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest mt-1">Kumpulan Karya Terbaik & Refleksi</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Skor Akhir</p>
                                            <input 
                                                type="number"
                                                value={teacherForm.data.score}
                                                onChange={(e) => teacherForm.setData('score', Number(e.target.value))}
                                                className="w-24 bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-2 text-center text-xl font-black text-amber-600 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left: Artifact Showcase (2 cols) */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="flex items-center gap-2 ml-4">
                                            <Layers className="h-4 w-4 text-amber-500" />
                                            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Galeri Karya Digital</h5>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {portfolioData.artifacts.length > 0 ? (
                                                portfolioData.artifacts.map((art: any, idx: number) => (
                                                    <div key={idx} className="group relative aspect-square rounded-[2rem] bg-white dark:bg-slate-900 border border-border shadow-sm overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                                                        {art.type?.includes('image') ? (
                                                            <img src={art.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-muted/50">
                                                                <FileText className="h-12 w-12 text-amber-500 mb-4" />
                                                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest text-center line-clamp-2 px-4">
                                                                    {art.name || 'Dokumen Karya'}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                            <a href={art.url} target="_blank" className="w-full py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-amber-500 hover:text-white transition-colors">
                                                                Lihat Detail
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-full h-60 rounded-[2rem] border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-8 opacity-50">
                                                    <AlertCircle className="h-10 w-10 text-slate-300 mb-2" />
                                                    <p className="text-sm font-bold text-muted-foreground italic">Belum ada karya yang disematkan.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Reflection & Feedback (1 col) */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 ml-4">
                                            <MessageSquare className="h-4 w-4 text-amber-500" />
                                            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Refleksi & Umpan Balik</h5>
                                        </div>

                                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-8">
                                            {/* Student Reflections */}
                                            <div className="space-y-4">
                                                {(assignment.instrument_config?.reflection_prompts || []).map((prompt: string, idx: number) => (
                                                    <div key={idx} className="p-6 rounded-3xl bg-muted/40 border border-slate-100 dark:border-slate-700 space-y-2">
                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-relaxed">{prompt}</p>
                                                        <p className="text-[11px] font-medium text-slate-600 dark:text-muted-foreground italic">
                                                            "{portfolioData.reflections[idx] || 'Siswa tidak menyertakan refleksi untuk pertanyaan ini.'}"
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Teacher Feedback */}
                                            <div className="space-y-4 pt-6 border-t border-border">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Catatan Evaluasi Guru</label>
                                                <textarea 
                                                    rows={6}
                                                    value={portfolioData.notes}
                                                    onChange={(e) => setPortfolioData({ ...portfolioData, notes: e.target.value })}
                                                    placeholder="Berikan apresiasi atas perkembangan murid dan arahan untuk tantangan selanjutnya..."
                                                    className="w-full rounded-[2rem] border border-border bg-white dark:bg-slate-900 px-6 py-5 text-xs font-medium focus:border-amber-500 outline-none transition-all resize-none shadow-sm"
                                                />
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setSelectedStudent(null)}
                                                    className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                >
                                                    Batal
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={handleSavePortfolio}
                                                    className="flex-[2] rounded-2xl bg-amber-600 py-4 text-xs font-black text-white shadow-xl shadow-amber-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                                >
                                                    Simpan Evaluasi
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'rubric' ? (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-10">
                                    {(assignment.instrument_config?.criteria || []).map((criterion: any) => (
                                        <div key={criterion.id} className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-6 w-6 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                                                    <Star className="h-3 w-3" />
                                                </div>
                                                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">{criterion.text}</h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {(assignment.instrument_config?.levels || []).map((level: any) => (
                                                    <button
                                                        key={level.id}
                                                        type="button"
                                                        onClick={() => setRubricData({ ...rubricData, [criterion.id]: level.id })}
                                                        className={`p-5 rounded-3xl border-2 transition-all text-left group flex flex-col justify-between h-full ${rubricData[criterion.id] === level.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-slate-50 dark:border-slate-800 bg-slate-50/20 hover:border-amber-200'}`}
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${rubricData[criterion.id] === level.id ? 'text-amber-600' : 'text-muted-foreground group-hover:text-amber-500'}`}>{level.name}</span>
                                                                {rubricData[criterion.id] === level.id && <CheckCircle2 className="h-3 w-3 text-amber-500" />}
                                                            </div>
                                                            <p className={`text-[10px] leading-relaxed font-medium ${rubricData[criterion.id] === level.id ? 'text-slate-700 dark:text-slate-200' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                                                                {criterion.descriptions[level.id] || 'Belum ada deskripsi.'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="space-y-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Umpan Balik Tambahan (Opsional)</label>
                                        <textarea 
                                            rows={3}
                                            value={teacherForm.data.feedback}
                                            onChange={(e) => teacherForm.setData('feedback', e.target.value)}
                                            placeholder="Berikan catatan tambahan terkait performa murid secara keseluruhan..."
                                            className="w-full rounded-[2rem] border border-border bg-slate-50/30 dark:bg-slate-800/30 px-6 py-5 text-xs font-medium focus:border-amber-400 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSaveRubric}
                                        className="flex-[2] rounded-[1.5rem] bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-xs font-black text-white shadow-xl shadow-amber-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Penilaian Rubrik
                                    </button>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'observation_checklist' ? (
                            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Checklist Indicators */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <ListChecks className="h-4 w-4" /> Daftar Indikator Perilaku
                                    </h4>
                                    <div className="grid gap-3">
                                        {(assignment.instrument_config?.indicators || []).map((indicator: any, idx: number) => (
                                            <div key={indicator.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:bg-white transition-all">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-slate-300">0{idx + 1}</span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{indicator.text}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setObsData({ ...obsData, checklist: { ...obsData.checklist, [indicator.id]: true } })}
                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${obsData.checklist[indicator.id] === true ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-500'}`}
                                                    >
                                                        Muncul
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setObsData({ ...obsData, checklist: { ...obsData.checklist, [indicator.id]: false } })}
                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${obsData.checklist[indicator.id] === false ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-muted-foreground hover:bg-rose-50 hover:text-rose-500'}`}
                                                    >
                                                        Belum
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Qualitative Notes */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Catatan Observasi</label>
                                        <textarea 
                                            rows={4}
                                            value={obsData.note}
                                            onChange={(e) => setObsData({ ...obsData, note: e.target.value })}
                                            placeholder="Deskripsikan perilaku menonjol atau kejadian saat itu..."
                                            className="w-full rounded-[2rem] border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 text-xs font-medium focus:border-sky-400 outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Strategi Tindak Lanjut</label>
                                        <textarea 
                                            rows={4}
                                            value={obsData.action_plan}
                                            onChange={(e) => setObsData({ ...obsData, action_plan: e.target.value })}
                                            placeholder="Tuliskan rencana bimbingan atau tantangan selanjutnya..."
                                            className="w-full rounded-[2rem] border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 text-xs font-medium focus:border-emerald-400 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSaveObservation}
                                        className="flex-1 rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-xs font-black text-white shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Observasi
                                    </button>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'performance_observation' ? (
                            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-emerald-500" /> Indikator Kinerja yang Diamati
                                    </h4>
                                    <div className="grid gap-3">
                                        {(assignment.instrument_config?.indicators || []).map((indicator: any, idx: number) => (
                                            <div key={indicator.id} className="p-5 rounded-3xl border border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:bg-white transition-all space-y-4 group">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[10px] font-black text-slate-300 mt-0.5">0{idx + 1}</span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 transition-colors">{indicator.text}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {[
                                                        { id: 'belum', label: 'Belum Terlihat', color: 'rose' },
                                                        { id: 'mulai', label: 'Mulai Terlihat', color: 'amber' },
                                                        { id: 'konsisten', label: 'Konsisten', color: 'emerald' }
                                                    ].map((lvl) => (
                                                        <button 
                                                            key={lvl.id}
                                                            type="button"
                                                            onClick={() => setPerformanceObsData({ ...performanceObsData, observations: { ...performanceObsData.observations, [indicator.id]: lvl.id } })}
                                                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${performanceObsData.observations[indicator.id] === lvl.id ? `bg-${lvl.color}-500 border-${lvl.color}-500 text-white shadow-lg shadow-${lvl.color}-100` : 'bg-white border-slate-100 text-muted-foreground hover:border-slate-200'}`}
                                                        >
                                                            {lvl.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Catatan Pengamatan & Umpan Balik</label>
                                    <textarea 
                                        rows={4}
                                        value={performanceObsData.notes}
                                        onChange={(e) => setPerformanceObsData({ ...performanceObsData, notes: e.target.value })}
                                        placeholder="Tuliskan detail observasi atau masukan perbaikan untuk siswa..."
                                        className="w-full rounded-[2rem] border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-5 text-xs font-medium focus:border-emerald-400 outline-none transition-all resize-none shadow-sm"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSavePerformanceObservation}
                                        className="flex-1 rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-xs font-black text-white shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Observasi Kinerja
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-10 text-center space-y-4">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Memuat Instrumen...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Grading Modal (Standard Quiz/Essay) */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl rounded-[3rem] bg-white dark:bg-slate-900 p-10 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col md:flex-row gap-8">
                        {/* Side: Student Response Preview */}
                        <div className="flex-1 space-y-6 overflow-y-auto max-h-[70vh] pr-4 custom-scrollbar">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-foreground tracking-tight">Evaluasi Jawaban: {selectedSubmission.student_name}</h3>
                            </div>
                            
                            {(() => {
                                try {
                                    const parsed = JSON.parse(selectedSubmission.content || '');
                                    if (parsed.type === 'quiz_response' && assignment.instrument_config?.questions) {
                                        const questions = assignment.instrument_config.questions;
                                        const answers = parsed.answers || {};
                                        let recalculatedScore = 0;
                                        questions.forEach((q: any) => {
                                            const studentAns = answers[q.id];
                                            const points = Number(q.points || 0);
                                            if (q.type === 'multiple_choice') {
                                                const correctOptId = q.answer || q.options?.find((o: any) => o.is_correct)?.id;
                                                if (correctOptId && studentAns == correctOptId) recalculatedScore += points;
                                            } else if (q.type === 'short_answer') {
                                                const correctAns = q.correct_answer || q.answer;
                                                if (correctAns && studentAns?.trim().toLowerCase() == correctAns?.trim().toLowerCase()) {
                                                    recalculatedScore += points;
                                                }
                                            }
                                        });

                                        return (
                                            <div className="space-y-8">
                                                <div className="flex items-center justify-between p-6 rounded-[2rem] bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                                    <div>
                                                        <h4 className="text-xs font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest leading-none mb-1">Skor Sistem</h4>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Kuis Objektif</p>
                                                    </div>
                                                    <span className="text-3xl font-black text-blue-600 tracking-tighter">{recalculatedScore}</span>
                                                </div>
                                                {assignment.instrument_config.questions.map((q: any, idx: number) => {
                                                    const studentAnswer = parsed.answers[q.id];
                                                    const isMcq = q.type === 'multiple_choice';
                                                    const correctOpt = isMcq ? (q.options?.find((o: any) => o.is_correct) || q.options?.find((o: any) => o.id === q.answer)) : null;
                                                    
                                                    return (
                                                        <div key={q.id} className="space-y-4 p-6 rounded-3xl bg-muted/50 border border-border">
                                                            <div className="flex items-start gap-3">
                                                                <span className="h-6 w-6 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-black text-muted-foreground flex items-center justify-center shadow-sm">{idx + 1}</span>
                                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{q.text}</p>
                                                            </div>
                                                            
                                                            <div className="grid sm:grid-cols-2 gap-4 ml-9">
                                                                <div className="space-y-2">
                                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Jawaban Siswa:</p>
                                                                    <div className={`p-4 rounded-2xl text-xs font-bold ${isMcq ? (studentAnswer === correctOpt?.id?.toString() ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100') : 'bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800 shadow-sm'}`}>
                                                                        {isMcq ? (q.options?.find((o: any) => o.id.toString() === studentAnswer)?.text || 'Tidak dijawab') : (studentAnswer || 'Kosong')}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Kunci / Referensi:</p>
                                                                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 text-xs font-bold italic">
                                                                        {isMcq ? (correctOpt?.text || 'Belum diatur') : (q.correct_answer || q.answer || 'Belum diatur')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {parsed.note && (
                                                    <div className="p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Catatan Siswa:</p>
                                                        <p className="text-xs text-slate-600 dark:text-muted-foreground italic font-medium">"{parsed.note}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'self_assessment') {
                                        const feelingMap: any = {
                                            very_happy: { label: 'Sangat Senang', icon: '🤩' },
                                            happy: { label: 'Senang', icon: '😊' },
                                            neutral: { label: 'Kurang Senang', icon: '😐' },
                                        };
                                        return (
                                            <div className="space-y-6">
                                                <div className="flex flex-wrap gap-3">
                                                    <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
                                                        <span className="text-xl">{feelingMap[parsed.feeling]?.icon}</span>
                                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{feelingMap[parsed.feeling]?.label || 'Biasa Saja'}</p>
                                                    </div>
                                                    <div className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
                                                        <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Skala Usaha Siswa</p>
                                                        <p className="text-xs font-bold text-sky-700 dark:text-sky-400">{parsed.effort_scale} / 4</p>
                                                    </div>
                                                </div>

                                                {parsed.feeling_reason && (
                                                    <div className="p-5 rounded-3xl bg-muted/50 border border-border">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Alasan Perasaan:</p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{parsed.feeling_reason}"</p>
                                                    </div>
                                                )}

                                                <div className="p-6 rounded-[2rem] bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Catatan Refleksi Siswa:</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-bold italic">"{parsed.reflection_notes}"</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'peer_assessment') {
                                        return (
                                            <div className="space-y-6">
                                                <div className="flex flex-wrap gap-3">
                                                    <div className="px-5 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                                                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Menilai Teman:</p>
                                                        <p className="text-sm font-black text-foreground">{parsed.peer_name}</p>
                                                    </div>
                                                    <div className="px-5 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <Star key={s} className={`h-3 w-3 ${parsed.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                                                            ))}
                                                        </div>
                                                        <p className="text-xs font-black text-amber-700 dark:text-amber-400">{parsed.rating} / 5</p>
                                                    </div>
                                                </div>

                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    <div className="p-5 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Terbaik di Kelompok:</p>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">"{parsed.best_performer}"</p>
                                                    </div>
                                                    <div className="p-5 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2">Perlu Peningkatan:</p>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">"{parsed.worst_performer}"</p>
                                                    </div>
                                                </div>

                                                <div className="p-5 rounded-3xl bg-muted border border-border shadow-sm">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Kendala Kelompok:</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{parsed.obstacles}"</p>
                                                </div>

                                                <div className="p-5 rounded-3xl bg-sky-50/30 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/30">
                                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">Harapan ke Depan:</p>
                                                    <p className="text-xs text-sky-800 dark:text-sky-300 font-bold italic">"{parsed.future_expectations}"</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'concept_map') {
                                        return (
                                            <div className="space-y-6">
                                                <div className="p-5 rounded-[2.5rem] bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 leading-none">Topik Utama:</p>
                                                    <p className="text-sm font-black text-foreground">{assignment.instrument_config?.central_topic}</p>
                                                </div>
                                                <div className="scale-90 origin-top">
                                                    <ConceptMapCanvas 
                                                        data={{ nodes: parsed.nodes || [], edges: parsed.edges || [] }} 
                                                        readOnly={true} 
                                                    />
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'written_test' || parsed.type === 'formative_quiz') {
                                        const systemScore = calculateSystemScore(selectedSubmission.content || '');

                                        return (
                                            <div className="space-y-8">
                                                <div className={`flex items-center justify-between p-6 ${
                                                    parsed.type === 'formative_quiz'
                                                        ? 'rounded-[8px] bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 text-[#5E6AD2]'
                                                        : 'rounded-[2rem] bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-500'
                                                }`}>
                                                    <div>
                                                        <h4 className={`text-xs font-black uppercase tracking-widest leading-none mb-1 ${
                                                            parsed.type === 'formative_quiz'
                                                                ? 'text-[#5E6AD2] dark:text-[#6E79D6]'
                                                                : 'text-rose-700 dark:text-rose-450'
                                                        }`}>Skor Sistem</h4>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Objektif (Pilihan Ganda & Isian)</p>
                                                    </div>
                                                    <span className={`text-3xl font-black tracking-tighter ${
                                                        parsed.type === 'formative_quiz' ? 'text-[#5E6AD2]' : 'text-rose-500'
                                                    }`}>{systemScore}</span>
                                                </div>

                                                <div className="space-y-10">
                                                    {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => {
                                                        const studentAns = parsed.answers?.[q.id];
                                                        const isMcq = q.type === 'multiple_choice';
                                                        const correctOpt = isMcq ? (q.options?.find((o: any) => o.is_correct) || q.options?.find((o: any) => o.id === q.answer)) : null;
                                                        const isCorrect = isMcq ? (correctOpt?.id == studentAns) : (studentAns?.trim().toLowerCase() == (q.correct_answer || q.answer)?.trim().toLowerCase());
                                                        
                                                        return (
                                                            <div key={q.id} className="space-y-4">
                                                                <div className="flex items-start gap-4">
                                                                    <span className="text-sm font-black text-slate-300 dark:text-slate-700 mt-0.5">0{idx + 1}</span>
                                                                    <div className="flex-1">
                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{q.text}</p>
                                                                        {q.image_url && (
                                                                            <div className="mt-4 max-w-xs">
                                                                                <img 
                                                                                    src={q.image_url} 
                                                                                    alt="Question Image" 
                                                                                    className="w-full rounded-2xl border border-border"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-2 mt-2">
                                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${q.type === 'essay' ? 'bg-indigo-50 text-indigo-500' : isCorrect ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                                                {q.type === 'essay' ? 'Review Manual' : isCorrect ? 'Benar' : 'Salah'}
                                                                            </span>
                                                                            <span className="text-[8px] font-bold text-muted-foreground uppercase">Max: {q.points} pts</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className={`ml-8 p-5 border space-y-3 ${
                                                                    parsed.type === 'formative_quiz'
                                                                        ? 'rounded-[8px] bg-slate-50 dark:bg-[#101014] border-slate-200 dark:border-[#2C2C3A]'
                                                                        : 'rounded-3xl bg-muted/50 border border-border'
                                                                }`}>
                                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Jawaban Murid:</p>
                                                                    {q.type === 'multiple_choice' ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                                                                                {isCorrect ? <CheckCircle2 className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                                                                            </div>
                                                                            <span className="text-xs font-black text-foreground">
                                                                                {q.options?.find((o: any) => o.id === studentAns)?.text || '(Tidak menjawab)'}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs font-bold text-foreground leading-relaxed">
                                                                            {studentAns || '(Tidak menjawab)'}
                                                                        </p>
                                                                    )}
                                                                    
                                                                    {q.type !== 'essay' && (
                                                                        <div className="pt-3 mt-3 border-t border-border">
                                                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Kunci Jawaban:</p>
                                                                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                                                                {isMcq ? correctOpt?.text : (q.correct_answer || q.answer)}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                } catch (e) {}
                                
                                return (
                                    <div className="space-y-6">
                                        <div className="p-8 rounded-[2.5rem] bg-muted/50 border border-border">
                                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Isi Jawaban:</p>
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(selectedSubmission.content || '');
                                                    if (parsed && typeof parsed === 'object') {
                                                        const answers = parsed.answers || parsed;
                                                        const note = parsed.note || '';
                                                        
                                                        return (
                                                            <div className="space-y-4">
                                                                {Object.entries(answers).map(([key, val], idx) => (
                                                                    <div key={key} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-sm">
                                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Pertanyaan {idx + 1}:</p>
                                                                        <p className="text-sm font-bold text-foreground">{String(val)}</p>
                                                                    </div>
                                                                ))}
                                                                {note && (
                                                                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                                                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Catatan Tambahan:</p>
                                                                        <p className="text-sm font-bold text-muted-foreground italic">"{note}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                } catch (e) {}

                                                return (
                                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap font-medium leading-relaxed italic">
                                                        {selectedSubmission.content ? `"${selectedSubmission.content}"` : "Siswa tidak mengirimkan jawaban teks atau file lampiran."}
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                        {selectedSubmission.file_path && (
                                            <a 
                                                href={`/storage/${selectedSubmission.file_path}`} 
                                                target="_blank" 
                                                className="flex items-center gap-3 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 text-primary border border-sky-100 dark:border-sky-900/30 hover:bg-sky-100 transition-all shadow-sm"
                                            >
                                                <Download className="h-5 w-5" />
                                                <div className="text-left">
                                                    <p className="text-xs font-black uppercase tracking-widest">Lihat Lampiran</p>
                                                    <p className="text-[10px] font-bold opacity-70">Klik untuk mengunduh/melihat file</p>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Side: Grading Form */}
                        <div className="w-full md:w-80 space-y-8 bg-muted/50 p-8 rounded-[2.5rem] border border-border">
                            <form onSubmit={handleGrade} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Skor Pencapaian (0-{assignment.max_points})</label>
                                    <input 
                                        type="number"
                                        max={assignment.max_points}
                                        min={0}
                                        value={teacherForm.data.score}
                                        onChange={(e) => teacherForm.setData('score', parseInt(e.target.value))}
                                        className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-4 text-xl font-black text-slate-800 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 transition-all text-center"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Umpan Balik Kualitatif</label>
                                    <textarea 
                                        rows={6}
                                        placeholder="Tuliskan masukan untuk pengembangan murid..."
                                        value={teacherForm.data.feedback}
                                        onChange={(e) => teacherForm.setData('feedback', e.target.value)}
                                        className="w-full rounded-[2rem] border border-slate-100 bg-white px-5 py-4 text-xs font-medium outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 transition-all resize-none"
                                    ></textarea>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {(!(assignment.instrument_config?.questions && assignment.instrument_config.questions.length > 0 && assignment.instrument_config.questions.every((q: any) => q.type === 'multiple_choice'))) && (
                                        <button 
                                            type="submit"
                                            disabled={teacherForm.processing}
                                            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 py-4 text-xs font-black text-white shadow-xl shadow-sky-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                        >
                                            {teacherForm.processing ? 'Menyimpan...' : 'Simpan Penilaian'}
                                        </button>
                                    )}
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedSubmission(null)}
                                        className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                        {(!(assignment.instrument_config?.questions && assignment.instrument_config.questions.length > 0 && assignment.instrument_config.questions.every((q: any) => q.type === 'multiple_choice'))) ? 'Tutup' : 'Selesai'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            </>

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Hapus Asesmen"
                message="Apakah Anda yakin ingin menghapus asesmen ini? Semua data pengumpulan akan ikut terhapus."
                onConfirm={handleDelete}
            />

            <Dialog open={submitSuccess} onOpenChange={setSubmitSuccess}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Berhasil</DialogTitle>
                        <DialogDescription>Jawaban berhasil dikirim!</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button variant="default" onClick={() => setSubmitSuccess(false)}>
                            Tutup
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={submitError !== null} onOpenChange={(open) => { if (!open) setSubmitError(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gagal</DialogTitle>
                        <DialogDescription>{submitError}</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button variant="destructive" onClick={() => setSubmitError(null)}>
                            Tutup
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

// Custom CSS for scrollbar
const scrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
`;
