import React, { useRef, useEffect } from 'react';
import { useTemplateStore } from '../store/useTemplateStore';
import { convertFromMm, convertToMm, formatUnitValue } from '../utils/units';

interface RulersProps {
  stageWidthPx: number;
  stageHeightPx: number;
  scale: number;
}

export const TopRuler: React.FC<RulersProps> = ({ stageWidthPx, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    currentTemplate,
    activeUnit,
    cursorPosMm,
    addGuide,
    showGuides,
  } = useTemplateStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    // Drag horizontal guide down from top ruler
    addGuide({
      type: 'horizontal',
      position: Math.max(0, Math.min(currentTemplate.cardHeight, cursorPosMm.y || 5)),
      color: '#3b82f6',
      locked: false,
      hidden: false,
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rulerHeight = 24;
    canvas.width = stageWidthPx * dpr;
    canvas.height = rulerHeight * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, stageWidthPx, rulerHeight);

    // Bottom border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight - 0.5);
    ctx.lineTo(stageWidthPx, rulerHeight - 0.5);
    ctx.stroke();

    const cardWidthMm = currentTemplate.cardWidth;
    const pxPerMm = (stageWidthPx / cardWidthMm) * scale;

    // Calculate step interval based on active unit
    let stepInMm = 5; // 5mm ticks default
    if (activeUnit === 'cm') stepInMm = 10;
    if (activeUnit === 'in') stepInMm = 25.4 / 4; // 1/4 inch
    if (activeUnit === 'px') stepInMm = 25.4 / 30; // ~10px step

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const maxMm = cardWidthMm;
    for (let mm = 0; mm <= maxMm; mm += stepInMm) {
      const xPx = mm * pxPerMm;
      if (xPx > stageWidthPx) break;

      const displayVal = convertFromMm(mm, activeUnit);
      const isMajor = mm % (stepInMm * 2) === 0;
      const tickHeight = isMajor ? 12 : 6;

      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(xPx, rulerHeight - tickHeight);
      ctx.lineTo(xPx, rulerHeight);
      ctx.stroke();

      if (isMajor && xPx > 15 && xPx < stageWidthPx - 15) {
        let label = `${displayVal}`;
        if (activeUnit === 'mm') label = `${Math.round(displayVal)}`;
        ctx.fillText(label, xPx, 2);
      }
    }

    // Cursor indicator line
    if (cursorPosMm.x >= 0 && cursorPosMm.x <= cardWidthMm) {
      const cursorPx = cursorPosMm.x * pxPerMm;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cursorPx, 0);
      ctx.lineTo(cursorPx, rulerHeight);
      ctx.stroke();
    }
  }, [stageWidthPx, scale, currentTemplate.cardWidth, activeUnit, cursorPosMm.x]);

  return (
    <div
      className="relative select-none cursor-row-resize border-b border-slate-700 bg-slate-800 text-[10px] text-slate-400"
      style={{ width: stageWidthPx, height: 24 }}
      onMouseDown={handleMouseDown}
      title="Click & Drag down to create a Horizontal Guide"
    >
      <canvas ref={canvasRef} style={{ width: stageWidthPx, height: 24 }} />
    </div>
  );
};

export const LeftRuler: React.FC<RulersProps> = ({ stageHeightPx, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    currentTemplate,
    activeUnit,
    cursorPosMm,
    addGuide,
  } = useTemplateStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    // Drag vertical guide right from left ruler
    addGuide({
      type: 'vertical',
      position: Math.max(0, Math.min(currentTemplate.cardWidth, cursorPosMm.x || 5)),
      color: '#3b82f6',
      locked: false,
      hidden: false,
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rulerWidth = 24;
    canvas.width = rulerWidth * dpr;
    canvas.height = stageHeightPx * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, rulerWidth, stageHeightPx);

    // Right border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rulerWidth - 0.5, 0);
    ctx.lineTo(rulerWidth - 0.5, stageHeightPx);
    ctx.stroke();

    const cardHeightMm = currentTemplate.cardHeight;
    const pxPerMm = (stageHeightPx / cardHeightMm) * scale;

    let stepInMm = 5;
    if (activeUnit === 'cm') stepInMm = 10;
    if (activeUnit === 'in') stepInMm = 25.4 / 4;
    if (activeUnit === 'px') stepInMm = 25.4 / 30;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const maxMm = cardHeightMm;
    for (let mm = 0; mm <= maxMm; mm += stepInMm) {
      const yPx = mm * pxPerMm;
      if (yPx > stageHeightPx) break;

      const displayVal = convertFromMm(mm, activeUnit);
      const isMajor = mm % (stepInMm * 2) === 0;
      const tickWidth = isMajor ? 12 : 6;

      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(rulerWidth - tickWidth, yPx);
      ctx.lineTo(rulerWidth, yPx);
      ctx.stroke();

      if (isMajor && yPx > 15 && yPx < stageHeightPx - 15) {
        let label = `${displayVal}`;
        if (activeUnit === 'mm') label = `${Math.round(displayVal)}`;
        ctx.save();
        ctx.translate(10, yPx);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }

    // Cursor indicator line
    if (cursorPosMm.y >= 0 && cursorPosMm.y <= cardHeightMm) {
      const cursorPx = cursorPosMm.y * pxPerMm;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cursorPx);
      ctx.lineTo(rulerWidth, cursorPx);
      ctx.stroke();
    }
  }, [stageHeightPx, scale, currentTemplate.cardHeight, activeUnit, cursorPosMm.y]);

  return (
    <div
      className="relative select-none cursor-col-resize border-r border-slate-700 bg-slate-800 text-[10px] text-slate-400"
      style={{ width: 24, height: stageHeightPx }}
      onMouseDown={handleMouseDown}
      title="Click & Drag right to create a Vertical Guide"
    >
      <canvas ref={canvasRef} style={{ width: 24, height: stageHeightPx }} />
    </div>
  );
};
