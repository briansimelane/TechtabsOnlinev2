import React, { useEffect, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Maximize2, Presentation, Lock } from 'lucide-react';
import { DebriefScaler } from './DebriefScaler';
import { useDebriefState } from '../../hooks/useDebriefState';
import { useDebriefData } from '../../hooks/useDebriefData';
import { compileDebriefSlides } from '../../utils/debriefSlides';
import { useSimulation } from '../../contexts/SimulationContext';

interface DebriefPresenterProps {
  embedded?: boolean;
}

export const DebriefPresenter: React.FC<DebriefPresenterProps> = ({ embedded = false }) => {
  const { classId: routeClassId } = useParams<{ classId: string }>();
  const { currentClassId, currentRole } = useSimulation();
  const classId = routeClassId || currentClassId;
  const isFacilitatorOrAdmin = currentRole === 'FACILITATOR' || currentRole === 'ADMIN';

  const { state, updateState } = useDebriefState(classId || null);
  const dataset = useDebriefData(classId || null, state.period);

  // Local slide override for participants browsing slides when shared
  const [localSlideIdx, setLocalSlideIdx] = useState<number | null>(null);
  const [localRevealStep, setLocalRevealStep] = useState<number | null>(null);

  // Sync participant view back to facilitator whenever facilitator advances slide/period
  useEffect(() => {
    setLocalSlideIdx(null);
    setLocalRevealStep(null);
  }, [state.slideIndex, state.revealStep, state.period]);

  const compiledSlides = compileDebriefSlides(dataset);
  const totalSlides = compiledSlides.length;

  const activeSlideIndex = localSlideIdx !== null ? localSlideIdx : state.slideIndex;
  const currentSlideIdx = Math.max(0, Math.min(activeSlideIndex, totalSlides - 1));
  const currentSlideDef = compiledSlides[currentSlideIdx] || compiledSlides[0];
  const activeRevealStep = localRevealStep !== null
    ? localRevealStep
    : (localSlideIdx !== null ? (currentSlideDef?.maxRevealSteps || 0) : state.revealStep);

  // Fullscreen helper
  const toggleFullscreen = useCallback(() => {
    const el = document.getElementById('debrief-stage-container') || document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  }, []);

  const stepPrev = useCallback(() => {
    if (isFacilitatorOrAdmin && !embedded) {
      if (state.revealStep > 0) {
        updateState({ revealStep: state.revealStep - 1 });
      } else if (currentSlideIdx > 0) {
        const prevSlide = compiledSlides[currentSlideIdx - 1];
        updateState({ slideIndex: currentSlideIdx - 1, revealStep: prevSlide?.maxRevealSteps || 0 });
      }
    } else {
      if (activeRevealStep > 0) {
        setLocalSlideIdx(currentSlideIdx);
        setLocalRevealStep(activeRevealStep - 1);
      } else if (currentSlideIdx > 0) {
        const prevSlide = compiledSlides[currentSlideIdx - 1];
        setLocalSlideIdx(currentSlideIdx - 1);
        setLocalRevealStep(prevSlide?.maxRevealSteps || 0);
      }
    }
  }, [isFacilitatorOrAdmin, embedded, state.revealStep, currentSlideIdx, compiledSlides, updateState, activeRevealStep]);

  const stepNext = useCallback(() => {
    const maxRev = currentSlideDef?.maxRevealSteps || 0;
    if (isFacilitatorOrAdmin && !embedded) {
      if (state.revealStep < maxRev) {
        updateState({ revealStep: state.revealStep + 1 });
      } else if (currentSlideIdx < totalSlides - 1) {
        updateState({ slideIndex: currentSlideIdx + 1, revealStep: 0 });
      }
    } else {
      if (activeRevealStep < maxRev) {
        setLocalSlideIdx(currentSlideIdx);
        setLocalRevealStep(activeRevealStep + 1);
      } else if (currentSlideIdx < totalSlides - 1) {
        const nextSlide = compiledSlides[currentSlideIdx + 1];
        setLocalSlideIdx(currentSlideIdx + 1);
        setLocalRevealStep(nextSlide?.maxRevealSteps || 0);
      }
    }
  }, [currentSlideDef, isFacilitatorOrAdmin, embedded, state.revealStep, currentSlideIdx, totalSlides, updateState, activeRevealStep, compiledSlides]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!isFacilitatorOrAdmin && !state.isLive) return;

      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        if (isFacilitatorOrAdmin && !embedded) {
          updateState({ slideIndex: 0, revealStep: 0 });
        } else {
          setLocalSlideIdx(0);
          setLocalRevealStep(compiledSlides[0]?.maxRevealSteps || 0);
        }
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        if (isFacilitatorOrAdmin && !embedded) {
          updateState({ slideIndex: totalSlides - 1, revealStep: 0 });
        } else {
          const lastIdx = Math.max(0, totalSlides - 1);
          setLocalSlideIdx(lastIdx);
          setLocalRevealStep(compiledSlides[lastIdx]?.maxRevealSteps || 0);
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        stepNext();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        stepPrev();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFacilitatorOrAdmin, embedded, state.isLive, totalSlides, updateState, toggleFullscreen, compiledSlides, stepNext, stepPrev]);

  if (dataset.loading) {
    return (
      <div className={embedded ? 'w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-200' : 'w-screen h-screen'}>
        <DebriefScaler>
          <div className="w-full h-full flex flex-col justify-center items-center text-center p-12 bg-slate-50 text-slate-900">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-4xl font-bold font-['Archivo']">Loading Debrief Deck...</h2>
          </div>
        </DebriefScaler>
      </div>
    );
  }

  if (dataset.error) {
    return (
      <div className={embedded ? 'w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-200' : 'w-screen h-screen'}>
        <DebriefScaler>
          <div className="w-full h-full flex flex-col justify-center items-center text-center p-12 bg-slate-50 text-slate-900">
            <h2 className="text-4xl font-bold text-rose-600 mb-4 font-['Archivo']">Debrief Load Error</h2>
            <p className="text-2xl text-slate-600 font-mono">{dataset.error}</p>
          </div>
        </DebriefScaler>
      </div>
    );
  }

  // If the user is a participant (not facilitator/admin) and "Show slides to participants" is unticked
  if (!state.isLive && !isFacilitatorOrAdmin) {
    if (embedded) {
      return (
        <div className="max-w-3xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Debrief Slides Not Available</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            The facilitator has not enabled debrief slide viewing for participants at this time.
          </p>
        </div>
      );
    }
    return (
      <div className="w-screen h-screen">
        <DebriefScaler>
          <div className="w-full h-full flex flex-col justify-center items-center text-center p-20 bg-slate-50 text-slate-900 space-y-6">
            <div className="text-slate-500 text-3xl uppercase tracking-widest font-bold">Slides Hidden</div>
            <h1 className="text-7xl font-extrabold font-['Archivo'] text-slate-900">
              {dataset.className}
            </h1>
            <p className="text-3xl text-slate-600 font-mono font-semibold">
              Waiting for the facilitator to share the Executive Debrief slides...
            </p>
          </div>
        </DebriefScaler>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Presentation size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Executive Debrief Slides — Year {dataset.period}</h1>
              <p className="text-xs text-slate-500">
                Slide {currentSlideIdx + 1} of {totalSlides}: <span className="font-semibold text-slate-700">{currentSlideDef?.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentSlideIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setLocalSlideIdx(idx);
                setLocalRevealStep(compiledSlides[idx]?.maxRevealSteps || 0);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-2 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {compiledSlides.map((s, idx) => (
                <option key={s.id} value={idx}>
                  {idx + 1}. {s.title}
                </option>
              ))}
            </select>

            <button
              onClick={stepPrev}
              disabled={currentSlideIdx === 0 && activeRevealStep === 0}
              className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 transition-colors"
              title="Previous Slide"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={stepNext}
              disabled={currentSlideIdx === totalSlides - 1 && activeRevealStep >= (currentSlideDef?.maxRevealSteps || 0)}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-white transition-colors"
              title="Next Slide"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
              title="Fullscreen (F)"
            >
              <Maximize2 size={14} />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>

        <div id="debrief-stage-container" className="w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-950">
          <DebriefScaler>
            {currentSlideDef ? (
              currentSlideDef.render({
                dataset,
                revealStep: activeRevealStep,
                currentSlide: currentSlideIdx + 1,
                totalSlides
              })
            ) : (
              <div className="text-center p-12 text-2xl text-[#8296B4]">No slides compiled</div>
            )}
          </DebriefScaler>
        </div>
      </div>
    );
  }

  return (
    <div id="debrief-stage-container" className="w-screen h-screen">
      <DebriefScaler>
        {currentSlideDef ? (
          currentSlideDef.render({
            dataset,
            revealStep: activeRevealStep,
            currentSlide: currentSlideIdx + 1,
            totalSlides
          })
        ) : (
          <div className="text-center p-12 text-2xl text-[#8296B4]">No slides compiled</div>
        )}
      </DebriefScaler>
    </div>
  );
};
