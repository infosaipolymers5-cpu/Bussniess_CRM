/**
 * Public Digital Visiting Card Page.
 * Standalone mobile-responsive public visiting card with zero internal data exposure.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicVisitingCard, buildQuoteWhatsAppUrl } from './api/digitalCardService';
import type { PublicVisitingCard } from '@/lib/database.types';

export function PublicDigitalCardPage() {
  const { slug } = useParams<{ slug: string }>();

  const [card, setCard] = useState<PublicVisitingCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<'mr' | 'en'>('mr');

  useEffect(() => {
    async function loadCard() {
      if (!slug) return;
      setLoading(true);
      setError(null);
      const res = await fetchPublicVisitingCard(slug);
      if (res.error) {
        setError(res.error);
      } else {
        setCard(res.data);
      }
      setLoading(false);
    }
    void loadCard();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center text-slate-500">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium">Loading Digital Card...</p>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
            📇
          </div>
          <h2 className="text-xl font-bold text-slate-900">Card Not Found</h2>
          <p className="mt-2 text-sm text-slate-500">
            {error || 'This digital visiting card is either unavailable or unpublished.'}
          </p>
        </div>
      </div>
    );
  }

  const isMr = currentLang === 'mr';
  const tagline = isMr
    ? card.tagline_mr || card.tagline_en
    : card.tagline_en || card.tagline_mr;
  const quoteUrl = buildQuoteWhatsAppUrl(card, undefined, currentLang);
  const fullAddress = [
    card.address_line1,
    card.address_line2,
    card.city_or_village,
    card.pincode ? `Pin - ${card.pincode}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    window.location.href,
  )}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-slate-100 px-3 py-6 sm:px-6">
      {/* Language Switcher Float */}
      <div className="mb-4 flex gap-2 self-center sm:self-end">
        <button
          type="button"
          onClick={() => setCurrentLang('mr')}
          className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-all ${
            currentLang === 'mr'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          मराठी
        </button>
        <button
          type="button"
          onClick={() => setCurrentLang('en')}
          className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-all ${
            currentLang === 'en'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          English
        </button>
      </div>

      {/* Main Visiting Card Container */}
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        {/* Banner / Header */}
        <div
          className="relative px-6 pb-16 pt-10 text-center text-white"
          style={{ backgroundColor: card.theme_color || '#1E40AF' }}
        >
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-4xl shadow-inner backdrop-blur-md">
            🏪
          </div>
          <h1 className="text-2xl font-black tracking-tight drop-shadow-sm sm:text-3xl">
            {card.display_name}
          </h1>
          {tagline && (
            <p className="mt-2 text-xs font-medium text-white/90 sm:text-sm">{tagline}</p>
          )}

          <div className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium tracking-wide">
            👤 {card.owner_name}
          </div>
        </div>

        {/* Quick Action Floating Bar */}
        <div className="relative -mt-8 px-6">
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-lg">
            <a
              href={`tel:${card.primary_phone}`}
              className="flex flex-col items-center justify-center rounded-xl p-2 text-slate-700 transition-colors hover:bg-blue-50"
            >
              <span className="text-2xl">📞</span>
              <span className="mt-1 text-xs font-bold text-slate-800">
                {isMr ? 'कॉल करा' : 'Call'}
              </span>
            </a>

            <a
              href={quoteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center rounded-xl p-2 text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <span className="text-2xl">💬</span>
              <span className="mt-1 text-xs font-bold text-emerald-800">
                {isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}
              </span>
            </a>

            {card.google_maps_url ? (
              <a
                href={card.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center rounded-xl p-2 text-rose-700 transition-colors hover:bg-rose-50"
              >
                <span className="text-2xl">📍</span>
                <span className="mt-1 text-xs font-bold text-rose-800">
                  {isMr ? 'गुगल मॅप' : 'Directions'}
                </span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl p-2 text-slate-400">
                <span className="text-2xl">📍</span>
                <span className="mt-1 text-xs font-bold text-slate-400">
                  {isMr ? 'पत्ता' : 'Address'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="space-y-6 p-6 text-sm text-slate-700">
          {/* Contact Details */}
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isMr ? 'संपर्क आणि पत्ता' : 'Contact & Address'}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-base">📱</span>
                <div>
                  <div className="font-semibold text-slate-900">{card.primary_phone}</div>
                  <div className="text-[11px] text-slate-500">
                    {isMr ? 'प्राथमिक संपर्क' : 'Primary Phone'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-base">💬</span>
                <div>
                  <div className="font-semibold text-slate-900">
                    {card.whatsapp_number}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isMr ? 'व्हॉट्सॲप ऑर्डर' : 'WhatsApp Orders'}
                  </div>
                </div>
              </div>

              {card.email && (
                <div className="flex items-center gap-3">
                  <span className="text-base">✉️</span>
                  <div>
                    <div className="font-semibold text-slate-900">{card.email}</div>
                    <div className="text-[11px] text-slate-500">Email</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 pt-1">
                <span className="text-base">🏠</span>
                <div>
                  <div className="font-medium leading-snug text-slate-800">
                    {fullAddress}
                  </div>
                  {card.google_maps_url && (
                    <a
                      href={card.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {isMr ? 'मॅपवर उघडा ↗' : 'Open in Maps ↗'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Services & Offerings */}
          {card.services_list && card.services_list.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isMr ? 'आमच्या सेवा आणि उत्पादने' : 'Products & Services'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {card.services_list.map((service, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"
                  >
                    ✨ {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verified Authorized Brands */}
          {card.brands && card.brands.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isMr ? 'अधिकृत ब्रँड भागीदार' : 'Authorized Brand Partners'}
                </h3>
                <span className="text-[11px] font-semibold text-emerald-600">
                  🛡️ {isMr ? 'अधिकृत' : 'Authorized'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {card.brands.map((b) => (
                  <div
                    key={b.id}
                    className="shadow-xs flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center"
                  >
                    <div className="mb-2 flex h-10 w-full items-center justify-center overflow-hidden">
                      {b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt={b.brand_name}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-700">
                          {b.brand_name}
                        </span>
                      )}
                    </div>
                    <span className="line-clamp-1 text-xs font-bold text-slate-800">
                      {b.brand_name}
                    </span>
                    {b.category_name && (
                      <span className="text-[10px] text-slate-400">
                        {b.category_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Quote Call to Action */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-center text-white shadow-md">
            <h4 className="text-base font-bold">
              {isMr ? 'दरपत्रक आणि कोटेशन हवे आहे का?' : 'Need Instant Pricing & Quote?'}
            </h4>
            <p className="mt-1 text-xs text-white/90">
              {isMr
                ? 'खालील बटणावर क्लिक करा आणि थेट व्हॉट्सॲपवर कोटेशन मिळवा.'
                : 'Click below to request quotes directly on WhatsApp.'}
            </p>
            <a
              href={quoteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-black text-emerald-800 shadow-md transition-transform hover:bg-emerald-50 active:scale-95"
            >
              💬 {isMr ? 'व्हॉट्सॲपवर कोटेशन मागा' : 'Request Quote on WhatsApp'}
            </a>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {isMr ? 'कार्ड शेअर करा / स्कॅन करा' : 'Share / Scan Card'}
            </h4>
            <div className="shadow-xs mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
              <img
                src={qrUrl}
                alt="Digital Card QR Code"
                className="h-36 w-36 object-contain"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {isMr
                ? 'हे कार्ड जतन करण्यासाठी कॅमेऱ्याने QR कोड स्कॅन करा'
                : 'Scan with mobile camera to open & share card'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {card.display_name}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
