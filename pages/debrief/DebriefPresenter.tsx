import React, { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DebriefScaler } from './DebriefScaler';
import { useDebriefState } from '../../hooks/useDebriefState';
import { useDebriefData } from '../../hooks/useDebriefData';
import { compileDebriefSlides } from '../../utils/debriefSlides';

export const DebriefPresenter: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();

  const { state, updateState } = useDebriefState(classId || null);
  const dataset = useDebriefData(classId || null, state.period);

  const compiledSlides = compileDebriefSlides(dataset);
  const totalSlides = compiledSlides.length;

  const currentSlideIdx = Math.max(0, Math.min(state.slideIndex, totalSlides - 1));
  const currentSlideDef = compiledSlides[currentSlideIdx] || compiledSlides[0];

  // Fullscreen helper
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea focused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        updateState({ slideIndex: 0, revealStep: 0 });
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        updateState({ slideIndex: totalSlides - 1, revealStep: 0 });
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        const maxRev = currentSlideDef?.maxRevealSteps || 0;
        if (state.revealStep < maxRev) {
          updateState({ revealStep: state.revealStep + 1 });
        } else if (currentSlideIdx < totalSlides - 1) {
          updateState({ slideIndex: currentSlideIdx + 1, revealStep: 0 });
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (state.revealStep > 0) {
          updateState({ revealStep: state.revealStep - 1 });
        } else if (currentSlideIdx > 0) {
          const prevSlide = compiledSlides[currentSlideIdx - 1];
          updateState({ slideIndex: currentSlideIdx - 1, revealStep: prevSlide?.maxRevealSteps || 0 });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIdx, state.revealStep, totalSlides, currentSlideDef, updateState, toggleFullscreen, compiledSlides]);

  if (dataset.loading) {
    return (
      <DebriefScaler>
        <div className="w-full h-full flex flex-col justify-center items-center text-center p-12 bg-slate-50 text-slate-900">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-4xl font-bold font-['Archivo']">Loading Debrief Deck...</h2>
        </div>
      </DebriefScaler>
    );
  }

  if (dataset.error) {
    return (
      <DebriefScaler>
        <div className="w-full h-full flex flex-col justify-center items-center text-center p-12 bg-slate-50 text-slate-900">
          <h2 className="text-4xl font-bold text-rose-600 mb-4 font-['Archivo']">Debrief Load Error</h2>
          <p className="text-2xl text-slate-600 font-mono">{dataset.error}</p>
        </div>
      </DebriefScaler>
    );
  }

  if (!state.isLive) {
    return (
      <DebriefScaler>
        <div className="w-full h-full flex flex-col justify-center items-center text-center p-20 bg-slate-50 text-slate-900 space-y-6">
          <div className="text-slate-500 text-3xl uppercase tracking-widest font-bold">Session Concluded</div>
          <h1 className="text-7xl font-extrabold font-['Archivo'] text-slate-900">
            {dataset.className}
          </h1>
          <p className="text-3xl text-emerald-700 font-mono font-semibold">
            Year {dataset.period} Executive Debrief Completed
          </p>
        </div>
      </DebriefScaler>
    );
  }

  return (
    <DebriefScaler>
      {currentSlideDef ? (
        currentSlideDef.render({
          dataset,
          revealStep: state.revealStep,
          currentSlide: currentSlideIdx + 1,
          totalSlides
        })
      ) : (
        <div className="text-center p-12 text-2xl text-[#8296B4]">No slides compiled</div>
      )}
    </DebriefScaler>
  );
};
