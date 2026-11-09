/**
 * PublicQrRegistrationPage — Publicly accessible sign-up page.
 * Accessible without authentication (no internal customer or rate data exposed).
 * Enforces recorded user consent before submission.
 */

import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { submitPublicQrRegistration } from './api/qrRegistrationService';
import { Button, Input } from '@/components/ui';
import { LanguageSelector } from '@/components/layout/LanguageSelector';

export function PublicQrRegistrationPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [categoryInterest, setCategoryInterest] = useState('');
  const [consentRecorded, setConsentRecorded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Fallback businessId if accessed without params
  const targetBusinessId = businessId || '10000000-0000-0000-0000-000000000001';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consentRecorded) {
      setError(t('qr.consentLabel'));
      return;
    }

    setLoading(true);
    setError(null);

    const { success, error: submitErr } = await submitPublicQrRegistration({
      businessId: targetBusinessId,
      name,
      whatsappPhone,
      dateOfBirth,
      categoryInterest: categoryInterest || null,
      consentRecorded: true,
    });

    if (success) {
      setSubmitted(true);
    } else {
      setError(submitErr ?? 'Submission failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white shadow-md">
          RC
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          {t('qr.publicTitle')}
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          {t('qr.publicSubtitle')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {submitted ? (
            <div className="space-y-3 py-6 text-center">
              <span className="text-5xl" aria-hidden="true">
                🎉
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {t('qr.submittedTitle')}
              </h2>
              <p className="text-sm text-slate-600">{t('qr.submittedDesc')}</p>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <Input
                label={t('customers.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                placeholder="Full Name"
              />

              <Input
                label={t('customers.phone')}
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                required
                disabled={loading}
                placeholder="10-digit WhatsApp number"
              />

              <Input
                label={t('customers.dob')}
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                label={`${t('qr.interest')} (${t('common.optional')})`}
                value={categoryInterest}
                onChange={(e) => setCategoryInterest(e.target.value)}
                disabled={loading}
                placeholder="e.g. Cattle Feed, PVC Pipes, Drip fittings"
              />

              {/* Required Consent Checkbox */}
              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentRecorded}
                  onChange={(e) => setConsentRecorded(e.target.checked)}
                  required
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label
                  htmlFor="consent"
                  className="cursor-pointer text-xs text-slate-600"
                >
                  {t('qr.consentLabel')}
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  className="w-full"
                >
                  Submit Registration
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default PublicQrRegistrationPage;
