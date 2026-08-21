import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { SCENARIO_TEMPLATES } from '../../constants';
import { resolveScenario } from '../../utils/scenarioResolver';
import { MarkdownViewer } from '../../components/common/MarkdownViewer';
import { ClassEvent } from '../../types';
import { 
  BookOpen, 
  School, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Save, 
  Plus, 
  Edit3, 
  Trash2, 
  Pin, 
  Download, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';

export default function ALPManager() {
  const { 
    currentClassId, 
    classes, 
    selectClass, 
    updateClassIsALP,
    addClassEvent,
    updateClassEvent,
    deleteClassEvent,
    upsertScenarioOverride,
    clearScenarioOverride
  } = useSimulation();

  const currentClass = classes.find(c => c.id === currentClassId);

  // Available periods list (1, 2, 3 + any period in class)
  const templatePeriodNums = Object.keys(SCENARIO_TEMPLATES).map(Number);
  const classPeriod = currentClass?.currentPeriod ?? 1;
  const periodOptions = Array.from(new Set([...templatePeriodNums, classPeriod])).sort((a, b) => a - b);

  const [selectedPeriod, setSelectedPeriod] = useState<number>(classPeriod);

  // Sync default selected period when class changes or loads
  useEffect(() => {
    if (currentClass) {
      setSelectedPeriod(currentClass.currentPeriod);
    }
  }, [currentClass?.id, currentClass?.currentPeriod]);

  // Resolved scenario for selected period
  const resolved = resolveScenario(currentClass, selectedPeriod);

  // Custom scenario editor state
  const [customTitle, setCustomTitle] = useState<string>(resolved.title);
  const [customBody, setCustomBody] = useState<string>(resolved.body);

  // Re-sync local edit state when period or resolved scenario changes
  useEffect(() => {
    setCustomTitle(resolved.title);
    setCustomBody(resolved.body);
  }, [selectedPeriod, resolved.title, resolved.body, resolved.source]);

  // Event form state
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventBody, setEventBody] = useState<string>('');
  const [eventPeriod, setEventPeriod] = useState<number>(classPeriod);
  const [eventVisible, setEventVisible] = useState<boolean>(true);
  const [eventPinned, setEventPinned] = useState<boolean>(false);

  // Currently editing event state
  const [editingEvent, setEditingEvent] = useState<ClassEvent | null>(null);

  // If no class selected, return selection prompt
  if (!currentClass) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-10">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Select a Class for Action Learning Project</h1>
          <p className="text-slate-500 mt-2">Choose a class to manage scenarios and class events.</p>
        </div>
        {classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
              <button 
                key={cls.id}
                onClick={() => selectClass(cls.id)}
                className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left relative overflow-hidden shadow-sm w-full"
              >
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{cls.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Period {cls.currentPeriod} • {cls.teams?.length || 0} teams</p>
                {cls.isActionLearningProject && (
                  <span className="mt-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                    ALP Active
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400">No classes found.</p>
        )}
      </div>
    );
  }

  const isALP = !!currentClass.isActionLearningProject;

  // Handlers for Scenario
  const handleVariantChange = (variantId: string) => {
    upsertScenarioOverride(selectedPeriod, { activeVariantId: variantId });
  };

  const handleSaveOverride = () => {
    upsertScenarioOverride(selectedPeriod, {
      title: customTitle,
      body: customBody
    });
  };

  const handleRevertOverride = () => {
    if (window.confirm('Are you sure you want to revert to the standard scenario template? Custom edits for this period will be removed.')) {
      clearScenarioOverride(selectedPeriod);
    }
  };

  const handleToggleHide = () => {
    upsertScenarioOverride(selectedPeriod, { hidden: !resolved.hidden });
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(resolved.title || `Period ${selectedPeriod} Scenario`, 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);

      const splitText = doc.splitTextToSize(resolved.body.replace(/[#*|_]/g, ''), 180);
      doc.text(splitText, 14, 30);
      doc.save(`${currentClass.name}_Period_${selectedPeriod}_Scenario.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  // Handlers for Events
  const handleAddEvent = () => {
    if (!eventTitle.trim()) return;
    addClassEvent({
      title: eventTitle.trim(),
      body: eventBody.trim(),
      period: Number(eventPeriod),
      visibleToStudents: eventVisible,
      pinned: eventPinned
    });

    // Reset form
    setEventTitle('');
    setEventBody('');
    setEventPeriod(classPeriod);
    setEventVisible(true);
    setEventPinned(false);
  };

  const handleSaveEditEvent = () => {
    if (!editingEvent || !editingEvent.title.trim()) return;
    updateClassEvent(editingEvent);
    setEditingEvent(null);
  };

  const handleDeleteEventClick = (eventId: string) => {
    if (window.confirm('Delete this class event?')) {
      deleteClassEvent(eventId);
    }
  };

  // Sort class events: pinned first, then newest first
  const sortedEvents = [...(currentClass.classEvents || [])].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
      {/* Header & ALP Toggle */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">Action Learning Project</h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Class: <span className="font-semibold text-slate-800">{currentClass.name}</span> (Period {currentClass.currentPeriod})
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-sm font-semibold text-slate-700">ALP Mode</span>
            <button
              type="button"
              onClick={() => updateClassIsALP(!isALP)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isALP ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isALP ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {isALP ? (
          <div className="flex items-center space-x-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>ALP is <strong>Active</strong>. Students in this class can view the Scenario tab and published class events.</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>ALP is <strong>Disabled</strong>. Students will not see the Scenario tab or class events until ALP mode is turned on.</span>
          </div>
        )}
      </div>

      {/* SECTION 1: SCENARIO MANAGER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Period Scenario Manager
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a period to preview, switch template variants, or write custom text.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600">Period:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                {periodOptions.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      selectedPeriod === p
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Year {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Variant Picker (if available) */}
            {resolved.availableVariants.length > 1 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600">Variant:</span>
                <select
                  value={resolved.variantId || resolved.availableVariants[0].id}
                  onChange={e => handleVariantChange(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {resolved.availableVariants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PDF Export Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Status badges & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-600">Source:</span>
            {resolved.source === 'override' && (
              <span className="px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                Custom Class Override
              </span>
            )}
            {resolved.source === 'variant' && (
              <span className="px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                Template ({resolved.variantId || 'default'})
              </span>
            )}
            {resolved.source === 'none' && (
              <span className="px-2 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700">
                No Scenario Defined
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Hide Checkbox */}
            <label className="inline-flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={resolved.hidden}
                onChange={handleToggleHide}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="flex items-center gap-1">
                {resolved.hidden ? <EyeOff className="w-3.5 h-3.5 text-rose-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                Hide from students
              </span>
            </label>

            {/* Revert Button */}
            {resolved.source === 'override' && (
              <button
                type="button"
                onClick={handleRevertOverride}
                className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-800 font-medium px-2 py-1 hover:bg-rose-50 rounded transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to Template</span>
              </button>
            )}
          </div>
        </div>

        {/* Editor + Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Scenario Content Editor</h3>
              <button
                type="button"
                onClick={handleSaveOverride}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Override</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Scenario Title</label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Title..."
              />
            </div>

            <div className="flex-1 flex flex-col min-h-[350px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Scenario Body (Markdown / Pipe Tables supported)</label>
              <textarea
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
                className="w-full flex-1 text-xs font-mono bg-white border border-slate-300 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                placeholder="Markdown text..."
              />
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Live Student Preview
              </h3>
              {resolved.hidden && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  Hidden from Students
                </span>
              )}
            </div>

            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-5 overflow-y-auto max-h-[500px]">
              {customBody.trim() ? (
                <MarkdownViewer content={customBody} />
              ) : (
                <p className="text-slate-400 text-sm italic text-center py-12">
                  No scenario text defined for Year {selectedPeriod}.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CLASS EVENTS (INFORMATIONAL) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Class Events & Announcements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Post informational notices, injects, or context notes. These are class-specific and have no effect on engine calculations.
          </p>
        </div>

        {/* Add / Edit Event Form (No HTML <form> tag) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            {editingEvent ? <Edit3 className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
            {editingEvent ? 'Edit Class Event' : 'Add New Class Event'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Event Title</label>
              <input
                type="text"
                value={editingEvent ? editingEvent.title : eventTitle}
                onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, title: e.target.value }) : setEventTitle(e.target.value)}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Breakout Room Announcement, Inflation Warning..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Applies to Period</label>
              <select
                value={editingEvent ? editingEvent.period : eventPeriod}
                onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, period: Number(e.target.value) }) : setEventPeriod(Number(e.target.value))}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={0}>All Periods (0)</option>
                {periodOptions.map(p => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Body / Message</label>
            <textarea
              value={editingEvent ? editingEvent.body : eventBody}
              onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, body: e.target.value }) : setEventBody(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-y"
              placeholder="Notice details..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={editingEvent ? editingEvent.visibleToStudents : eventVisible}
                  onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, visibleToStudents: e.target.checked }) : setEventVisible(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Visible to students</span>
              </label>

              <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={editingEvent ? !!editingEvent.pinned : eventPinned}
                  onChange={e => editingEvent ? setEditingEvent({ ...editingEvent, pinned: e.target.checked }) : setEventPinned(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1">
                  <Pin className="w-3 h-3 text-indigo-600" /> Pin to top
                </span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              {editingEvent ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditEvent}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    Update Event
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleAddEvent}
                  disabled={!eventTitle.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Add Event
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Existing Events List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Events ({sortedEvents.length})
          </h3>

          {sortedEvents.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
              {sortedEvents.map(evt => (
                <div key={evt.id} className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors ${evt.pinned ? 'bg-indigo-50/30' : ''}`}>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      {evt.pinned && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <h4 className="font-bold text-slate-900 text-sm">{evt.title}</h4>
                      <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {evt.period === 0 ? 'All Periods' : `Period ${evt.period}`}
                      </span>
                      {evt.visibleToStudents ? (
                        <span className="text-xs font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          Visible
                        </span>
                      ) : (
                        <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          Hidden
                        </span>
                      )}
                    </div>
                    {evt.body && (
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                        {evt.body}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 pt-1">
                      Added {new Date(evt.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-start">
                    <button
                      type="button"
                      onClick={() => setEditingEvent(evt)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEventClick(evt.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
              No class events created yet. Use the form above to add announcements.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
