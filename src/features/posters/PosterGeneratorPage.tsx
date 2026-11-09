/**
 * PosterGeneratorPage — Reusable Marketing Posters & Festival Greeting Canvas Generator.
 * Implements Features 7 & 42:
 * - Templates for Cattle Feed batches, Milk yield boost, Festive greetings, and PVC irrigation
 * - High-DPI canvas generation (1:1 and 9:16)
 * - Lossless PNG export for WhatsApp status and device storage
 * - Business branding injection with customizable copy
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { POSTER_TEMPLATES } from './templates';
import {
  PosterCanvas,
  type PosterCanvasHandle,
  type PosterCustomData,
} from './PosterCanvas';
import { Button, Input, Select } from '@/components/ui';

export function PosterGeneratorPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();
  const canvasRef = useRef<PosterCanvasHandle>(null);

  const defaultPreset = POSTER_TEMPLATES[0]!;
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultPreset.id);
  const selectedPreset =
    POSTER_TEMPLATES.find((t) => t.id === selectedTemplateId) || defaultPreset;

  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('1:1');
  const [firmName, setFirmName] = useState(
    activeBusiness?.name || 'रुषी ॲग्रो अँड सप्लायर्स',
  );
  const [phone, setPhone] = useState('9876543210');
  const [address, setAddress] = useState('मुख्य बाजारपेठ, ता. संगमनेर');
  const [tagline, setTagline] = useState(selectedPreset.tagline);
  const [headline, setHeadline] = useState(selectedPreset.headline);
  const [subheadline, setSubheadline] = useState(selectedPreset.subheadline);
  const [highlights, setHighlights] = useState<string[]>(selectedPreset.highlights);
  const [footerCallout, setFooterCallout] = useState(selectedPreset.footer_callout);

  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // When changing template, reset content to that template's copy
  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = POSTER_TEMPLATES.find((t) => t.id === id);
    if (tmpl) {
      setTagline(tmpl.tagline);
      setHeadline(tmpl.headline);
      setSubheadline(tmpl.subheadline);
      setHighlights(tmpl.highlights);
      setFooterCallout(tmpl.footer_callout);
    }
  };

  const handleDownload = () => {
    const filename = `${selectedPreset.id}-${aspectRatio.replace(':', 'x')}.png`;
    canvasRef.current?.downloadPng(filename);
  };

  const handleCopyShareText = () => {
    const text = [
      `*${headline}*`,
      subheadline,
      '',
      ...highlights,
      '',
      footerCallout,
      `📞 संपर्क: ${phone}`,
      `📍 पत्ता: ${address}`,
      `\n— ${firmName}`,
    ].join('\n');

    void navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const customData: PosterCustomData = {
    firmName,
    phone,
    address,
    tagline,
    headline,
    subheadline,
    highlights,
    footerCallout,
    aspectRatio,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('posters.title', 'मार्केटिंग पोस्टर मेकर (Marketing Poster Maker)')}
          </h1>
          <p className="text-sm text-slate-500">
            {t(
              'posters.subtitle',
              'व्हॉट्सॲप स्टेटस आणि सोशल मीडियासाठी दर्जेदार मराठी जाहिरात पोस्टर्स तयार करा',
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleCopyShareText}>
            {copiedSuccess
              ? '✓ Text Copied!'
              : t('posters.copyShareText', '📋 Copy Message Text')}
          </Button>
          <Button variant="primary" onClick={handleDownload}>
            {t('posters.downloadPng', '⬇️ Download PNG (1080p)')}
          </Button>
        </div>
      </div>

      {/* Editor Limitations Notice Banner */}
      <div className="rounded-card border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
        <p className="font-semibold">💡 Native Client-Side Canvas Rendering:</p>
        <p className="mt-0.5">
          Posters are rendered losslessly directly in your browser as 1080p PNG images,
          ready for immediate WhatsApp Status, DP, or marketing broadcasts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="space-y-5 lg:col-span-6">
          {/* Template Selection */}
          <div className="space-y-4 rounded-card border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-base font-semibold text-slate-900">
              1. {t('posters.selectTemplate', 'Select Template Preset')}
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {POSTER_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    selectedTemplateId === tmpl.id
                      ? 'border-brand-600 bg-brand-50 shadow-sm ring-2 ring-brand-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{tmpl.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                    {tmpl.headline}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <Select
                label={t('posters.aspectRatio', 'Aspect Ratio (आकार)')}
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as '1:1' | '9:16')}
              >
                <option value="1:1">1:1 Square (WhatsApp Post / DP)</option>
                <option value="9:16">9:16 Portrait (WhatsApp Status / Story)</option>
              </Select>

              <Input
                label={t('posters.firmName', 'Firm Name (दुकानाचे नाव)')}
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
              />
            </div>
          </div>

          {/* Copy Customization */}
          <div className="space-y-4 rounded-card border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-base font-semibold text-slate-900">
              2. {t('posters.customizeContent', 'Customize Text & Highlights')}
            </h2>

            <Input
              label={t('posters.headline', 'Main Headline (मुख्य शीर्षक)')}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />

            <Input
              label={t('posters.subheadline', 'Subheadline (उल्लेख / वर्णन)')}
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
            />

            <Input
              label={t('posters.tagline', 'Top Tagline')}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Key Highlights (वैशिष्ट्ये)
              </label>
              {highlights.map((hl, idx) => (
                <Input
                  key={idx}
                  label={`Highlight #${idx + 1}`}
                  value={hl}
                  onChange={(e) => {
                    const next = [...highlights];
                    next[idx] = e.target.value;
                    setHighlights(next);
                  }}
                />
              ))}
            </div>

            <Input
              label={t('posters.footerCallout', 'Callout / Action Note')}
              value={footerCallout}
              onChange={(e) => setFooterCallout(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('posters.phone', 'Contact Phone')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label={t('posters.address', 'Location / Area')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Canvas Preview (5 cols) */}
        <div className="lg:col-span-6">
          <div className="sticky top-6 rounded-card border border-slate-200 bg-slate-900 p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between text-white">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Live Preview
              </span>
              <span className="text-xs text-amber-400">
                {aspectRatio === '9:16' ? '1080 × 1920' : '1080 × 1080'}
              </span>
            </div>

            <PosterCanvas ref={canvasRef} preset={selectedPreset} data={customData} />

            <div className="mt-5 flex items-center justify-center gap-3">
              <Button variant="primary" onClick={handleDownload} className="w-full">
                ⬇️ {t('posters.downloadNow', 'Download High-Res Poster')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
