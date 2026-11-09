/**
 * PosterCanvas — High-resolution HTML5 canvas marketing & greetings generator.
 * Draws rich banners, typography, borders, and firm branding for WhatsApp Status and Social Media.
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { PosterTemplatePreset } from '@/lib/pdf/types';

export interface PosterCustomData {
  firmName: string;
  phone: string;
  address: string;
  tagline: string;
  headline: string;
  subheadline: string;
  highlights: string[];
  footerCallout: string;
  aspectRatio: '1:1' | '9:16';
}

export interface PosterCanvasHandle {
  toDataUrl: () => string;
  downloadPng: (filename?: string) => void;
}

interface PosterCanvasProps {
  preset: PosterTemplatePreset;
  data: PosterCustomData;
}

export const PosterCanvas = forwardRef<PosterCanvasHandle, PosterCanvasProps>(
  ({ preset, data }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Dimensions: high-res 1080px base
    const width = 1080;
    const height = data.aspectRatio === '9:16' ? 1920 : 1080;

    useImperativeHandle(ref, () => ({
      toDataUrl: () => {
        return canvasRef.current?.toDataURL('image/png') || '';
      },
      downloadPng: (filename = 'rushi-poster.png') => {
        if (!canvasRef.current) return;
        const url = canvasRef.current.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // 1. Background Gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, preset.theme.bg_gradient[0]);
      grad.addColorStop(1, preset.theme.bg_gradient[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle textured circles in background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.arc(width * 0.85, height * 0.15, 320, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width * 0.15, height * 0.85, 280, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outer Border Frame
      const margin = 40;
      ctx.strokeStyle = preset.theme.accent_color;
      ctx.lineWidth = 3;
      ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

      // Inner thin border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        margin + 12,
        margin + 12,
        width - (margin + 12) * 2,
        height - (margin + 12) * 2,
      );

      // 3. Top Firm Header
      const headerY = margin + 65;
      ctx.textAlign = 'center';
      ctx.fillStyle = preset.theme.accent_color;
      ctx.font = 'bold 36px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(data.firmName || 'रुषी ॲग्रो अँड सप्लायर्स', width / 2, headerY);

      if (data.tagline) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '22px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(data.tagline, width / 2, headerY + 36);
      }

      // Divider line
      const divY = headerY + 60;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.25, divY);
      ctx.lineTo(width * 0.75, divY);
      ctx.stroke();

      // 4. Main Headline & Subheadline
      const contentStartY = data.aspectRatio === '9:16' ? divY + 140 : divY + 60;

      // Glow effect on headline
      ctx.shadowColor = preset.theme.accent_color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(data.headline, width / 2, contentStartY);

      ctx.shadowBlur = 0; // reset glow

      if (data.subheadline) {
        ctx.fillStyle = preset.theme.accent_color;
        ctx.font = '28px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(data.subheadline, width / 2, contentStartY + 50);
      }

      // 5. Highlights Card
      const cardMargin = 85;
      const cardWidth = width - cardMargin * 2;
      const cardY = contentStartY + 95;
      const cardHeight = data.aspectRatio === '9:16' ? 520 : 360;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cardMargin, cardY, cardWidth, cardHeight, 16);
      ctx.fill();
      ctx.stroke();

      // Highlight bullet points
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px "Segoe UI", Roboto, sans-serif';

      const lineSpacing = data.aspectRatio === '9:16' ? 70 : 54;
      const bulletsStartY = cardY + (data.aspectRatio === '9:16' ? 75 : 55);

      data.highlights.forEach((bullet, idx) => {
        const by = bulletsStartY + idx * lineSpacing;
        ctx.fillText(bullet, cardMargin + 40, by);
      });

      // Callout inside card bottom
      if (data.footerCallout) {
        const calloutY = cardY + cardHeight - (data.aspectRatio === '9:16' ? 45 : 30);
        ctx.textAlign = 'center';
        ctx.fillStyle = preset.theme.accent_color;
        ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(data.footerCallout, width / 2, calloutY);
      }

      // 6. Bottom Contact Footer Card
      const footerHeight = 120;
      const footerY = height - margin - footerHeight - 15;

      ctx.fillStyle = preset.theme.card_bg;
      ctx.strokeStyle = preset.theme.accent_color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardMargin, footerY, cardWidth, footerHeight, 14);
      ctx.fill();
      ctx.stroke();

      // Contact details
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Segoe UI", Roboto, sans-serif';
      const phoneText = data.phone
        ? `📞 संपर्क / ऑर्डर: ${data.phone}`
        : '📞 संपर्क: त्वरित कॉल करा';
      ctx.fillText(phoneText, width / 2, footerY + 45);

      if (data.address) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '22px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`📍 पत्ता: ${data.address}`, width / 2, footerY + 85);
      }
    }, [preset, data, width, height]);

    return (
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="max-h-[560px] w-auto rounded-lg border border-slate-700 shadow-2xl"
          style={{ aspectRatio: data.aspectRatio === '9:16' ? '9/16' : '1/1' }}
        />
        <p className="mt-2 text-xs text-slate-400">
          Native {width}x{height}px Canvas Output (Lossless PNG)
        </p>
      </div>
    );
  },
);

PosterCanvas.displayName = 'PosterCanvas';
