import React from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DebriefDataset } from '../hooks/useDebriefData';
import { compileDebriefSlides } from './debriefSlides';

export async function downloadDebriefDeckPdf(
  dataset: DebriefDataset,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!dataset || dataset.teams.length === 0) return;

  const slides = compileDebriefSlides(dataset);
  if (slides.length === 0) return;

  // Create full-screen viewport container at (0,0) so html2canvas captures full layout
  const container = document.createElement('div');
  container.id = 'pdf-slide-export-root';
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.width = '1920px';
  container.style.height = '1080px';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#0f172a'; // Slate-900 background
  container.style.zIndex = '99999';
  container.style.pointerEvents = 'none';

  // Inject CSS override to disable all CSS animations & transitions so layout is captured at 100% final state
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    #pdf-slide-export-root * {
      transition: none !important;
      animation: none !important;
      transition-duration: 0s !important;
      animation-duration: 0s !important;
      opacity: 1 !important;
    }
  `;
  container.appendChild(styleEl);

  const mountPoint = document.createElement('div');
  mountPoint.style.width = '1920px';
  mountPoint.style.height = '1080px';
  container.appendChild(mountPoint);

  document.body.appendChild(container);

  const root = createRoot(mountPoint);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080]
  });

  try {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (onProgress) {
        onProgress(i + 1, slides.length);
      }

      // Render slide content fully revealed (revealStep 999) inside 1920x1080 flex container
      const slideContent = slide.render({
        dataset,
        revealStep: 999,
        currentSlide: i + 1,
        totalSlides: slides.length
      });

      const slideWrapper = React.createElement(
        'div',
        {
          style: { width: '1920px', height: '1080px', backgroundColor: '#0f172a' },
          className: 'w-[1920px] h-[1080px] bg-slate-900 text-slate-900 overflow-hidden flex flex-col relative select-none'
        },
        slideContent
      );

      // Render into DOM container and wait 1000ms for React paint, SVGs, text nodes, and layout to settle 100%
      await new Promise<void>((resolve) => {
        root.render(slideWrapper);
        setTimeout(resolve, 1000);
      });

      // Capture full-color screenshot with html2canvas at 100% stable state
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 1920,
        height: 1080,
        windowWidth: 1920,
        windowHeight: 1080,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#0f172a'
      });

      const imgData = canvas.toDataURL('image/png');

      if (i > 0) {
        pdf.addPage([1920, 1080], 'landscape');
      }

      pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080);
    }

    const safeClassName = (dataset.className || 'Class').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Techtabs_Debrief_Slides_Year_${dataset.period}_${safeClassName}.pdf`;
    pdf.save(fileName);
  } finally {
    try {
      root.unmount();
    } catch (e) {}
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
