/**
 * QrRegistrationsListPage — Internal queue for staff to review public registrations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  fetchQrRegistrations,
  convertQrRegistrationToCustomer,
} from './api/qrRegistrationService';
import { Button, LoadingSpinner, EmptyState } from '@/components/ui';
import type { PublicQrRegistration } from '@/lib/database.types';

export function QrRegistrationsListPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [registrations, setRegistrations] = useState<PublicQrRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    const { data } = await fetchQrRegistrations(activeBusiness.id);
    setRegistrations(data);
    setLoading(false);
  }, [activeBusiness]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleConvert = async (registrationId: string) => {
    if (!activeBusiness) return;
    setConvertingId(registrationId);
    const { customerId } = await convertQrRegistrationToCustomer(
      registrationId,
      activeBusiness.id,
    );
    if (customerId) {
      await loadData();
    }
    setConvertingId(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('qr.title')}
        </h1>
        <p className="text-sm text-slate-500">
          {activeBusiness?.name} · Review and approve public registrations into customer
          profiles
        </p>
      </div>

      {registrations.length === 0 ? (
        <EmptyState
          icon="📱"
          title="No QR registrations received"
          description="Customers who scan your business QR code and register will appear here for verification."
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Name
                </th>
                <th scope="col" className="px-6 py-3.5">
                  WhatsApp Phone
                </th>
                <th scope="col" className="px-6 py-3.5">
                  DOB
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Category Interest
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{r.name}</td>
                  <td className="px-6 py-4 font-mono">{r.whatsapp_phone}</td>
                  <td className="px-6 py-4">{r.date_of_birth}</td>
                  <td className="px-6 py-4">{r.category_interest ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        r.status === 'converted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {r.status === 'pending_review' && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={convertingId === r.id}
                        onClick={() => void handleConvert(r.id)}
                      >
                        {t('qr.convertCustomer')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default QrRegistrationsListPage;
