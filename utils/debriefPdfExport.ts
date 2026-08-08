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

  // Inject CSS override to disable all CSS animations & force clean sans-serif/mono system font fallbacks (preventing Times New Roman serif canvas fallback)
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    #pdf-slide-export-root * {
      transition: none !important;
      animation: none !important;
      transition-duration: 0s !important;
      animation-duration: 0s !important;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }
    #pdf-slide-export-root .overflow-hidden {
      overflow: visible !important;
    }
    #pdf-slide-export-root text, #pdf-slide-export-root tspan {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }
    #pdf-slide-export-root .font-mono {
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
    }
  `;
  container.appendChild(styleEl);

  const mountPoint = document.createElement('div');
  mountPoint.style.width = '1920px';
  mountPoint.style.height = '1080px';
  container.appendChild(mountPoint);

  document.body.appendChild(container);

  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }

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

      // Render into DOM container and wait for double requestAnimationFrame + layout paint to settle 100%
      await new Promise<void>((resolve) => {
        root.render(slideWrapper);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 500);
          });
        });
      });

      // Capture high-res screenshot with html2canvas (scale 1.5 with high quality JPEG to optimize memory)
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

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage([1920, 1080], 'landscape');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
    }

    const safeClassName = (dataset.className || 'Class').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Techtabs_Debrief_Slides_Year_${dataset.period}_${safeClassName}.pdf`;

    try {
      pdf.save(fileName);
    } catch (saveErr) {
      console.warn('pdf.save failed, using fallback blob download', saveErr);
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }
  } catch (error) {
    console.error('Failed to generate debrief PDF:', error);
    alert('An error occurred while generating the PDF slides. Please try again.');
  } finally {
    try {
      root.unmount();
    } catch (e) {}
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
