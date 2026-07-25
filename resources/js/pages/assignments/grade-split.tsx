import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, FileText, Image as ImageIcon, Camera, UploadCloud, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface GradeSplitProps {
    assignment: any;
    students: any[];
}

export default function GradeSplitPage({ assignment, students }: GradeSplitProps) {
    const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
    const currentStudent = students[currentStudentIndex];
    
    const submission = assignment.submissions.find((s: any) => s.student_id === currentStudent?.id);
    
    // States for grading
    const [score, setScore] = useState<number | string>(submission?.score ?? '');
    const [feedback, setFeedback] = useState(submission?.feedback ?? '');
    const [kktpDetails, setKktpDetails] = useState<any>(submission?.kktp_details ?? {});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingProof, setIsUploadingProof] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    let isOffline = false;
    let textContent = submission?.content || '';
    if (submission?.content) {
        try {
            const parsed = JSON.parse(submission.content);
            isOffline = !!parsed.submitted_offline;
            if (isOffline) {
                textContent = '';
            }
        } catch(e) {}
    }

    // Update states when student changes
    useEffect(() => {
        setScore(submission?.score ?? '');
        setFeedback(submission?.feedback ?? '');
        setKktpDetails(submission?.kktp_details ?? {});
    }, [currentStudentIndex, submission]);

    const handleSave = async () => {
        if (!currentStudent) return;
        setIsSaving(true);
        try {
            await axios.post(route('assignments.grade'), {
                assignment_id: assignment.id,
                student_id: currentStudent.id,
                score: score ? Number(score) : null,
                feedback: feedback,
                kktp_details: kktpDetails
            });
            showNotification('Nilai berhasil disimpan!', 'success');
        } catch (error) {
            showNotification('Gagal menyimpan nilai.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentStudent) return;

        setIsUploadingProof(true);
        const formData = new FormData();
        formData.append('student_id', currentStudent.id);
        formData.append('file', file);

        try {
            await axios.post(route('assignments.upload-proof', assignment.id), formData);
            showNotification('Karya fisik berhasil difoto/diunggah!', 'success');
            router.reload({ only: ['assignment'] });
        } catch(err) {
            showNotification('Gagal mengunggah foto.', 'error');
        } finally {
            setIsUploadingProof(false);
        }
    };

    const handleNext = () => {
        if (currentStudentIndex < students.length - 1) {
            setCurrentStudentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStudentIndex > 0) {
            setCurrentStudentIndex(prev => prev - 1);
        }
    };

    const handleRubricClick = (criterionIndex: number, levelScore: number, levelName: string) => {
        const newDetails = { ...kktpDetails, [criterionIndex]: levelName };
        setKktpDetails(newDetails);
        
        // Auto-calculate score if using simple rubric
        if (assignment.scoring_tool === 'rubric' && assignment.instrument_config?.kktp?.criteria) {
            const totalCriteria = assignment.instrument_config.kktp.criteria.length;
            const currentTotal = Object.keys(newDetails).reduce((acc, key) => {
                // simple weight logic based on string
                let val = 0;
                if (newDetails[key] === 'Sangat Baik') val = 100;
                else if (newDetails[key] === 'Baik') val = 75;
                else if (newDetails[key] === 'Cukup') val = 50;
                else if (newDetails[key] === 'Perlu Bimbingan') val = 25;
                return acc + val;
            }, 0);
            
            // Just a rough estimate for auto-scoring
            const autoScore = Math.round((currentTotal / (totalCriteria * 100)) * (assignment.max_points || 100));
            setScore(autoScore);
        }
    };

    const renderSubmissionContent = () => {
        if (!submission) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                    <FileText className="w-12 h-12 mb-2 text-slate-300" />
                    <p>Siswa belum mengumpulkan tugas.</p>
                </div>
            );
        }

        const isImage = submission.file_path && /\.(jpeg|jpg|gif|png)$/i.test(submission.file_path);
        const isPdf = submission.file_path && /\.pdf$/i.test(submission.file_path);

        return (
            <div className="h-full flex flex-col space-y-4 relative">
                {isOffline && !submission.file_path && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <h4 className="font-bold text-amber-800 dark:text-amber-400">Tugas Diserahkan Langsung</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-500">Siswa melapor bahwa tugas fisik telah diserahkan di kelas.</p>
                    </div>
                )}
                
                {textContent && (
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex-1 overflow-y-auto">
                        <h4 className="font-semibold text-sm mb-2">Teks Jawaban:</h4>
                        <div className="text-sm whitespace-pre-wrap">{textContent}</div>
                    </div>
                )}
                
                {submission.file_path && (
                    <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col relative min-h-[400px]">
                        {isImage ? (
                            <img src={`/storage/${submission.file_path}`} alt="Submission" className="object-contain w-full h-full" />
                        ) : isPdf ? (
                            <iframe src={`/storage/${submission.file_path}`} className="w-full h-full border-0" title="PDF Viewer" />
                        ) : (
                            <div className="flex items-center justify-center h-full flex-col text-slate-500">
                                <FileText className="w-16 h-16 mb-4 text-slate-300" />
                                <a href={`/storage/${submission.file_path}`} target="_blank" rel="noreferrer" className="text-indigo-600 font-medium hover:underline flex items-center">
                                    Download File Lampiran
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Teacher Camera / Upload Proof */}
                <div className="mt-auto">
                    <label className={`flex items-center justify-center gap-2 w-full p-4 rounded-xl border-2 border-dashed ${isUploadingProof ? 'opacity-50 cursor-not-allowed border-slate-300 bg-slate-100' : 'cursor-pointer border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300'}`}>
                        <Camera className="w-5 h-5" />
                        <span className="font-bold text-sm">
                            {isUploadingProof ? 'Mengunggah...' : 'Kamera Portofolio (Foto Karya Siswa)'}
                        </span>
                        <input 
                            type="file" 
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleUploadProof}
                            disabled={isUploadingProof}
                        />
                    </label>
                </div>
            </div>
        );
    };

    return (
        <AppLayout title="Penilaian Layar Terbelah">
            <Head title="Penilaian Tugas" />

            <div className="h-[calc(100vh-65px)] flex flex-col mt-[-24px]">
                {/* Header Bar */}
                <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row justify-between items-center z-10 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href={route('assignments.show', assignment.id)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight truncate max-w-[300px]">{assignment.title}</h1>
                            <p className="text-xs text-slate-500">Mode Penilaian Layar Terbelah</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-2 mr-2">
                            <Button variant="outline" size="icon" onClick={handlePrev} disabled={currentStudentIndex === 0}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-medium w-32 text-center truncate px-2">
                                {currentStudent?.name || 'Siswa'}
                            </span>
                            <Button variant="outline" size="icon" onClick={handleNext} disabled={currentStudentIndex === students.length - 1}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <Badge variant={submission?.score !== null ? 'default' : 'secondary'} className={submission?.score !== null ? 'bg-emerald-500 hidden sm:inline-flex' : 'hidden sm:inline-flex'}>
                            {submission?.score !== null ? 'Dinilai' : 'Belum Dinilai'}
                        </Badge>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white">
                            <Save className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{isSaving ? 'Menyimpan...' : 'Simpan Nilai'}</span>
                        </Button>
                    </div>
                </div>

                {/* Split Content */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Left Side: Student Work Viewer */}
                    <div className="w-full md:w-7/12 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
                        {renderSubmissionContent()}
                    </div>

                    {/* Right Side: Rubric & Grading */}
                    <div className="w-full md:w-5/12 p-4 md:p-6 overflow-y-auto bg-white dark:bg-slate-900 flex flex-col gap-6">
                        
                        {/* Interactive Rubric Section */}
                        {assignment.scoring_tool === 'rubric' && assignment.instrument_config?.kktp?.criteria ? (
                            <div className="space-y-4">
                                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center">
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-500" />
                                    Rubrik Penilaian (Klik Cepat)
                                </h3>
                                
                                <div className="space-y-3">
                                {assignment.instrument_config.kktp.criteria.map((crit: any, i: number) => (
                                    <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                        <p className="font-semibold text-sm mb-3">{crit.name}</p>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                            {['Perlu Bimbingan', 'Cukup', 'Baik', 'Sangat Baik'].map((lvl) => {
                                                const isSelected = kktpDetails[i] === lvl;
                                                return (
                                                    <button
                                                        key={lvl}
                                                        onClick={() => handleRubricClick(i, 0, lvl)}
                                                        className={`text-sm p-4 py-3 rounded-lg border text-center transition-all ${
                                                            isSelected 
                                                                ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold dark:bg-indigo-900/50 dark:border-indigo-400 dark:text-indigo-200' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        {lvl}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-500 text-center border border-dashed border-slate-300 dark:border-slate-700">
                                Tidak ada rubrik terstruktur (KKTP) yang diatur untuk asesmen ini.
                            </div>
                        )}

                        {/* Final Score & Feedback */}
                        <div className="space-y-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/30 mt-auto">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Skor Akhir (0 - {assignment.max_points || 100})
                                </label>
                                <Input 
                                    type="number" 
                                    value={score} 
                                    onChange={(e) => setScore(e.target.value)}
                                    className="text-2xl font-bold w-full max-wxs h-12 text-indigo-700 dark:text-indigo-400"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Umpan Balik (Feedback)
                                </label>
                                <Textarea 
                                    placeholder="Berikan umpan balik konstruktif untuk siswa..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="min-h-[120px] bg-white dark:bg-slate-800"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Custom Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${
                    toastMessage.type === 'success' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-rose-600 text-white'
                }`}>
                    {toastMessage.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-semibold text-sm">{toastMessage.message}</span>
                </div>
            )}
        </AppLayout>
    );
}
