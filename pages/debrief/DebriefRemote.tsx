import React from 'react';
import { ChevronLeft, ChevronRight, Play, Square, ExternalLink, Presentation } from 'lucide-react';
import { useDebriefState } from '../../hooks/useDebriefState';
import { useDebriefData } from '../../hooks/useDebriefData';
import { compileDebriefSlides } from '../../utils/debriefSlides';

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

  const yearsAvailable = Array.from({ length: Math.max(1, currentPeriod) }, (_, i) => i + 1);

  return (
    <div className="bg-[#0B1220] border border-[#22304A] rounded-2xl p-5 text-[#E8EDF7] shadow-xl space-y-4 my-4">
      <div className="flex items-center justify-between border-b border-[#22304A] pb-3">
        <div className="flex items-center gap-2 font-bold text-lg text-[#37D9A4]">
          <Presentation className="w-5 h-5" />
          <span>Debrief Presenter Controller</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131C2E] hover:bg-[#22304A] text-xs font-semibold rounded-lg border border-[#22304A] transition-colors"
            title="Pop out projector window"
          >
            <ExternalLink size={14} /> Pop-out
          </button>
          <button
            onClick={() => updateState({ isLive: !state.isLive })}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              state.isLive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {state.isLive ? 'End Session' : 'Resume Live'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Year Selector */}
        <div>
          <label className="text-xs font-semibold text-[#8296B4] block mb-1">Debrief Year</label>
          <select
            value={state.period}
            onChange={(e) => updateState({ period: Number(e.target.value), slideIndex: 0, revealStep: 0 })}
            className="w-full bg-[#131C2E] border border-[#22304A] text-[#E8EDF7] text-sm rounded-lg px-3 py-2 font-mono font-bold focus:ring-2 focus:ring-[#37D9A4]"
          >
            {yearsAvailable.map(yr => (
              <option key={yr} value={yr}>Year {yr}</option>
            ))}
          </select>
        </div>

        {/* Slide Selector */}
        <div>
          <label className="text-xs font-semibold text-[#8296B4] block mb-1">Jump to Slide</label>
          <select
            value={currentSlideIdx}
            onChange={(e) => updateState({ slideIndex: Number(e.target.value), revealStep: 0 })}
            className="w-full bg-[#131C2E] border border-[#22304A] text-[#E8EDF7] text-sm rounded-lg px-3 py-2 font-mono font-bold focus:ring-2 focus:ring-[#37D9A4]"
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
            className="p-3 bg-[#131C2E] hover:bg-[#22304A] disabled:opacity-40 rounded-xl border border-[#22304A] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center font-mono px-3">
            <div className="text-xs text-[#8296B4]">Slide</div>
            <div className="text-base font-bold text-[#37D9A4]">
              {currentSlideIdx + 1} / {slides.length}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={currentSlideIdx === slides.length - 1 && state.revealStep >= (currentSlideDef?.maxRevealSteps || 0)}
            className="p-3 bg-[#37D9A4] hover:bg-[#2fb88b] text-[#0B1220] font-bold rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
