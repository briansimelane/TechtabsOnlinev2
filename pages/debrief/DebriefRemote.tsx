import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Square, ExternalLink, Presentation, Download } from 'lucide-react';
import { useDebriefState } from '../../hooks/useDebriefState';
import { useDebriefData } from '../../hooks/useDebriefData';
import { compileDebriefSlides } from '../../utils/debriefSlides';
import { downloadDebriefDeckPdf } from '../../utils/debriefPdfExport';

interface DebriefRemoteProps {
  classId: string;
  currentPeriod: number;
}

export const DebriefRemote: React.FC<DebriefRemoteProps> = ({ classId, currentPeriod }) => {
  const { state, updateState } = useDebriefState(classId, currentPeriod || 1);
  const dataset = useDebriefData(classId, state.period);
  const slides = compileDebriefSlides(dataset);
  const currentSlideIdx = Math.max(0, Math.min(state.slideIndex, slides.length - 1));
  const currentSlideDef = slides[currentSlideIdx];

  const handlePrev = () => {
    if (state.revealStep > 0) {
      updateState({ revealStep: state.revealStep - 1 });
    } else if (currentSlideIdx > 0) {
      const prevSlide = slides[currentSlideIdx - 1];
      updateState({ slideIndex: currentSlideIdx - 1, revealStep: prevSlide?.maxRevealSteps || 0 });
    }
  };

  const handleNext = () => {
    const maxRev = currentSlideDef?.maxRevealSteps || 0;
    if (state.revealStep < maxRev) {
      updateState({ revealStep: state.revealStep + 1 });
    } else if (currentSlideIdx < slides.length - 1) {
      updateState({ slideIndex: currentSlideIdx + 1, revealStep: 0 });
    }
  };

  const handleOpenWindow = () => {
    const popupUrl = `${window.location.origin}${window.location.pathname}#/debrief/${classId}`;
    window.open(popupUrl, 'techtabs-debrief', 'popup,width=1600,height=900');
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      setExportProgress({ current: 0, total: slides.length });
      await downloadDebriefDeckPdf(dataset, (current, total) => {
        setExportProgress({ current, total });
      });
    } catch (err) {
      console.error("Failed to download debrief deck PDF", err);
    } finally {
      setIsExportingPdf(false);
      setExportProgress(null);
    }
  };

  const yearsAvailable = Array.from({ length: Math.max(1, currentPeriod) }, (_, i) => i + 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4 my-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 font-bold text-lg text-emerald-400">
          <Presentation className="w-5 h-5" />
          <span>Debrief Presenter Controller</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf || dataset.loading || dataset.teams.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg border border-indigo-500 transition-colors text-white disabled:opacity-50"
            title="Download Executive Debrief Presentation Deck as PDF"
          >
            <Download size={14} /> {isExportingPdf ? `Exporting Slide ${exportProgress?.current || 0}/${exportProgress?.total || slides.length}...` : 'Download PDF Deck'}
          </button>
          <button
            onClick={handleOpenWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition-colors text-white"
            title="Pop out projector window"
          >
            <ExternalLink size={14} /> Pop-out Presenter
          </button>
          <button
            onClick={() => updateState({ isLive: !state.isLive })}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              state.isLive ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
            }`}
          >
            {state.isLive ? 'End Session' : 'Resume Live'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Year Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Debrief Year</label>
          <select
            value={state.period}
            onChange={(e) => updateState({ period: Number(e.target.value), slideIndex: 0, revealStep: 0 })}
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {yearsAvailable.map(yr => (
              <option key={yr} value={yr}>Year {yr}</option>
            ))}
          </select>
        </div>

        {/* Slide Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Jump to Slide</label>
          <select
            value={currentSlideIdx}
            onChange={(e) => updateState({ slideIndex: Number(e.target.value), revealStep: 0 })}
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {slides.map((s, idx) => (
              <option key={s.id} value={idx}>
                {idx + 1}. {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-end gap-2 pt-4 md:pt-0">
          <button
            onClick={handlePrev}
            disabled={currentSlideIdx === 0 && state.revealStep === 0}
            className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl border border-slate-700 transition-colors text-white"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center font-mono px-3">
            <div className="text-xs text-slate-400">Slide</div>
            <div className="text-base font-bold text-emerald-400">
              {currentSlideIdx + 1} / {slides.length}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={currentSlideIdx === slides.length - 1 && state.revealStep >= (currentSlideDef?.maxRevealSteps || 0)}
            className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
