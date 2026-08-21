import React from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import { resolveScenario } from '../utils/scenarioResolver';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
import { BookOpen, Calendar, Pin, AlertCircle, Info } from 'lucide-react';

export default function ScenarioBriefing() {
  const { currentTeam, classes, currentClassId } = useSimulation();
  const currentClass = classes.find(c => c.id === currentClassId);

  const activePeriod = currentTeam?.currentPeriod || currentClass?.currentPeriod || 1;
  const isALP = !!currentClass?.isActionLearningProject;

  // Non-ALP Class Notice
  if (!isALP) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Action Learning Project Not Active</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            This simulation class is currently not configured as an Action Learning Project. Scenarios and class announcements are disabled.
          </p>
        </div>
      </div>
    );
  }

  // Resolve active period scenario
  const resolved = resolveScenario(currentClass, activePeriod);

  // Filter visible events for active period (or period 0)
  const visibleEvents = (currentClass?.classEvents || [])
    .filter(e => e.visibleToStudents && (e.period === activePeriod || e.period === 0))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-2">
        <div className="flex items-center space-x-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>Action Learning Project Briefing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{resolved.title}</h1>
        <p className="text-blue-100 text-sm">
          Period {activePeriod} Official Narrative & Market Conditions
        </p>
      </div>

      {/* Class Events Announcements (if any) */}
      {visibleEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Class Announcements & Injects
          </h2>
          <div className="space-y-3">
            {visibleEvents.map(evt => (
              <div
                key={evt.id}
                className={`p-4 rounded-xl border transition-all ${
                  evt.pinned
                    ? 'bg-indigo-50/60 border-indigo-200 shadow-sm'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    {evt.pinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    <h3 className="font-bold text-slate-900 text-sm">{evt.title}</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(evt.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {evt.body && (
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {evt.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenario Body Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {resolved.hidden || resolved.source === 'none' || !resolved.body.trim() ? (
          <div className="py-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 font-medium text-sm">
              No scenario has been published for this period yet.
            </p>
            <p className="text-xs text-slate-400">
              Please check back later or wait for your facilitator's instructions.
            </p>
          </div>
        ) : (
          <article className="prose max-w-none">
            <MarkdownViewer content={resolved.body} />
          </article>
        )}
      </div>
    </div>
  );
}
