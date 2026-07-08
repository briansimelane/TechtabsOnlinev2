import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../contexts/SimulationContext';
import { DEFAULT_SURVEY_CONFIG } from '../constants';
import { ClipboardCheck, Info, CheckCircle2, ChevronRight, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';

const Survey: React.FC = () => {
  const { classes, currentClassId, currentTeam, currentUser, currentRole, submitSurveyResponse, login } = useSimulation();
  const navigate = useNavigate();
  
  // Find current class data
  const currentClass = classes.find(c => c.id === currentClassId);
  const surveyConfig = currentClass?.surveyConfig || DEFAULT_SURVEY_CONFIG;
  const responses = currentClass?.surveyResponses || [];
  
  // Check if current user has already submitted for the current period
  const hasSubmitted = currentUser 
    ? responses.some(r => r.userId === currentUser.uid && r.period === (currentTeam?.currentPeriod || 1))
    : false;

  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // States for access code login when unauthenticated
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Filter active questions
  const activeQuestions = surveyConfig.questions.filter(q => q.isActive);
  const activeSections = surveyConfig.sections.filter(sec => 
    activeQuestions.some(q => q.sectionId === sec.id)
  );

  const handleLikertChange = (questionId: string, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    setValidationError(null);
  };

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    setValidationError(null);
  };

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const result = await login(accessCode.trim());
      if (result.success) {
        if (result.role === 'FACILITATOR') {
          navigate('/facilitator/classes');
        } else if (result.role === 'ADMIN') {
          navigate('/admin/dashboard');
        }
      } else {
        setAuthError(result.message || 'Invalid access code. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate that all active questions are answered
    const unanswered = activeQuestions.filter(q => {
      const ans = answers[q.id];
      if (q.type === 'likert') {
        return ans === undefined || ans === null;
      } else {
        return !ans || (ans as string).trim() === '';
      }
    });

    if (unanswered.length > 0) {
      const unansweredNumbers = unanswered.map(q => q.number).join(', ');
      setValidationError(`Please answer all questions before submitting. Unanswered questions: ${unansweredNumbers}`);
      
      // Scroll to first unanswered question
      const firstUnansweredId = `question-container-${unanswered[0].id}`;
      document.getElementById(firstUnansweredId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitSurveyResponse(answers);
      setSuccess(true);
    } catch (error) {
      console.error("Error submitting survey", error);
      setValidationError("Failed to submit survey. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If unauthenticated, show access code entry form
  if (!currentClassId || !currentTeam) {
    return (
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 my-8">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-8 text-center text-white relative">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="mx-auto w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mb-4 border border-white/10 shadow-inner">
            <ClipboardCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Team Dynamics Survey</h1>
          <p className="text-indigo-100 text-sm mt-2">Enter your access code to start the survey</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleAccessSubmit} className="space-y-6">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-semibold text-slate-700 mb-2">
                Team Access Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="accessCode"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase tracking-widest font-mono placeholder:normal-case placeholder:tracking-normal text-sm"
                  placeholder="e.g. TM1-1234"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setAuthError(null);
                  }}
                  disabled={isAuthenticating}
                />
              </div>
              {authError && (
                <p className="mt-3 text-xs text-red-600 flex items-center bg-red-50 border border-red-100 px-3 py-2 rounded-lg font-medium">
                  <AlertCircle size={14} className="mr-2 text-red-500 shrink-0" />
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-lg disabled:opacity-70"
            >
              {isAuthenticating ? 'Accessing...' : (
                <>
                  Access Survey
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              If you don't know your access code, please ask your facilitator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If the survey is hidden by the facilitator
  if (!currentClass?.showSurvey && currentRole === 'STUDENT') {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xl relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 to-orange-500"></div>
          
          <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-amber-100 shadow-inner">
            <AlertCircle size={44} className="text-amber-500" />
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Survey Unavailable</h1>
          <p className="text-slate-600 mb-1 leading-relaxed">
            The facilitator has disabled or hidden the **Team Dynamics Survey** module for this session.
          </p>
          
          <div className="mt-8 border-t border-slate-100 pt-6 w-full flex justify-center">
            <a href="#/dashboard" className="inline-flex items-center px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-sm">
              Go to Dashboard <ChevronRight size={16} className="ml-1" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (hasSubmitted || success) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xl relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          
          <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-inner">
            <CheckCircle2 size={44} className="text-emerald-500 animate-bounce" />
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Survey Submitted!</h1>
          <p className="text-slate-600 mb-1">
            Thank you for completing the **Team Dynamics Survey** for Period {currentTeam.currentPeriod}.
          </p>
          <p className="text-sm text-slate-400 mt-6 max-w-sm">
            Your anonymous responses have been recorded to help calculate your team's Decision Dynamics Index (DDI).
          </p>

          <div className="mt-8 border-t border-slate-100 pt-6 w-full flex justify-center">
            <a href="#/dashboard" className="inline-flex items-center px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-sm">
              Return to Dashboard <ChevronRight size={16} className="ml-1" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const likertOptions = [
    { label: 'Strongly disagree', value: 1, color: 'hover:bg-red-50 hover:text-red-700 peer-checked:bg-red-500 peer-checked:border-red-500' },
    { label: 'Disagree', value: 2, color: 'hover:bg-orange-50 hover:text-orange-700 peer-checked:bg-orange-500 peer-checked:border-orange-500' },
    { label: 'Neutral', value: 3, color: 'hover:bg-slate-100 hover:text-slate-700 peer-checked:bg-slate-500 peer-checked:border-slate-500' },
    { label: 'Agree', value: 4, color: 'hover:bg-emerald-50 hover:text-emerald-700 peer-checked:bg-emerald-500 peer-checked:border-emerald-500' },
    { label: 'Strongly agree', value: 5, color: 'hover:bg-teal-50 hover:text-teal-700 peer-checked:bg-teal-600 peer-checked:border-teal-600' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pb-24">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-2xl text-white p-6 md:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-0 bottom-0 -translate-x-10 translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="bg-white/15 text-white/90 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">
              Post-Simulation Diagnostic
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight">
              Decision Dynamics Framework
            </h1>
            <p className="text-indigo-100/90 font-medium text-lg mt-2">
              Team Dynamics — Participant Survey (Period {currentTeam.currentPeriod})
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 shrink-0 self-start md:self-auto">
            <ClipboardCheck size={28} className="text-indigo-200" />
            <div>
              <p className="text-xs text-indigo-200 font-semibold uppercase">Anonymous</p>
              <p className="text-sm font-bold">~3 minutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8 flex gap-4 text-blue-900 shadow-sm">
        <Info className="shrink-0 text-blue-600 mt-0.5" size={22} />
        <div>
          <h3 className="font-bold text-blue-950 mb-1">Instructions</h3>
          <p className="text-sm leading-relaxed">
            This survey captures your experience of how your team worked together during the simulation. 
            There are no right or wrong answers. Your responses are anonymous and will be used alongside team transcripts 
            to produce a **Decision Dynamics Index (DDI)** report—a diagnostic showing how team behavior influenced decision quality.
          </p>
          <p className="text-sm font-bold mt-2 text-blue-950">
            Please respond based on what actually happened, not what you think should have happened.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {activeSections.map((sec) => (
          <div key={sec.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Section Banner */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-md font-bold uppercase tracking-wider text-slate-800">
                {sec.name}
              </h2>
              {sec.description && (
                <p className="text-xs text-slate-500 mt-1">{sec.description}</p>
              )}
            </div>

            {/* Questions List */}
            <div className="divide-y divide-slate-100">
              {activeQuestions
                .filter(q => q.sectionId === sec.id)
                .map((q) => (
                  <div 
                    key={q.id} 
                    id={`question-container-${q.id}`}
                    className="p-6 transition-colors duration-200 hover:bg-slate-50/50"
                  >
                    <div className="flex items-start gap-4">
                      <span className="bg-slate-100 text-slate-700 font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-slate-200">
                        {q.number}
                      </span>
                      <div className="flex-1 space-y-4">
                        <label className="text-base font-semibold text-slate-900 block leading-tight pt-0.5">
                          {q.text}
                        </label>

                        {/* Likert Scale */}
                        {q.type === 'likert' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
                            {likertOptions.map((opt) => {
                              const uniqueId = `opt-${q.id}-${opt.value}`;
                              const isChecked = answers[q.id] === opt.value;
                              
                              return (
                                <div key={opt.value} className="relative">
                                  <input 
                                    type="radio"
                                    id={uniqueId}
                                    name={`question-${q.id}`}
                                    value={opt.value}
                                    checked={isChecked}
                                    onChange={() => handleLikertChange(q.id, opt.value)}
                                    className="sr-only peer"
                                  />
                                  <label 
                                    htmlFor={uniqueId}
                                    className={`flex flex-col items-center justify-center px-3 py-3 border border-slate-200 rounded-lg text-center cursor-pointer font-medium text-xs text-slate-600 transition-all duration-200 hover:border-slate-300 select-none h-14 peer-checked:text-white peer-checked:shadow-sm ${opt.color}`}
                                  >
                                    <span className="font-bold text-sm mb-0.5">{opt.value}</span>
                                    <span>{opt.label}</span>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Text Area
                          <div className="pt-2">
                            <textarea
                              rows={4}
                              placeholder="Type your response here..."
                              value={(answers[q.id] as string) || ''}
                              onChange={(e) => handleTextChange(q.id, e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 text-sm shadow-inner transition-all placeholder:text-slate-400"
                            />
                            <div className="text-right text-xs text-slate-400 mt-1">
                              {((answers[q.id] as string) || '').length} characters
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Validation and Submit */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center gap-3 animate-pulse">
            <AlertCircle className="text-red-500 shrink-0" />
            <p className="text-sm font-medium">{validationError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
          <a 
            href="#/dashboard"
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Survey'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Survey;
