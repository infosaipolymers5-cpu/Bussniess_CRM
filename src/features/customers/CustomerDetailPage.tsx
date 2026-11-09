/**
 * CustomerDetailPage — View & manage individual customer profile:
 * - Details: Name, Display Phone, DOB, Area, Notes
 * - Marketing Opt-Out toggle with immediate persistence
 * - Call Notes & Promise-to-Pay follow-up queue logging
 * - Linked Groups & Tags
 */

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/AuthProvider';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  getCustomerDetails,
  addCustomerNote,
  updateCustomerPreferences,
  type CustomerWithMeta,
} from './api/customerService';
import { Button, Input, LoadingSpinner, EmptyState } from '@/components/ui';
import { CustomerTillerSection } from '@/features/tiller-details';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();

  const [customer, setCustomer] = useState<CustomerWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Note Form
  const [noteContent, setNoteContent] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: err } = await getCustomerDetails(id);
    if (err || !data) {
      setError(err ?? 'Failed to load customer');
    } else {
      setCustomer(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleOptOut = async () => {
    if (!customer) return;
    const currentStatus = customer.preferences?.opted_out_marketing ?? false;
    const { preferences, error: prefErr } = await updateCustomerPreferences(customer.id, {
      optedOutMarketing: !currentStatus,
    });
    if (!prefErr && preferences) {
      setCustomer((prev) => (prev ? { ...prev, preferences } : null));
    }
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer || !user || !noteContent.trim()) return;

    setSubmittingNote(true);
    const { note, error: noteErr } = await addCustomerNote(customer.id, user.id, {
      content: noteContent,
      promiseToPayDate: promiseDate || null,
    });

    if (!noteErr && note) {
      setNoteContent('');
      setPromiseDate('');
      await loadData();
    }
    setSubmittingNote(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          ← {t('common.back')}
        </Button>
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error ?? 'Customer not found'}
        </div>
      </div>
    );
  }

  const isOptedOut = customer.preferences?.opted_out_marketing ?? false;

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          ← {t('common.back')}
        </Button>
        <span className="text-xs text-slate-500">{activeBusiness?.name}</span>
      </div>

      {/* Main Profile Header */}
      <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {customer.name}
              </h1>
              {isOptedOut && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                  🚫 {t('customers.optedOut')}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600">
              📞 {customer.display_phone}
            </p>
          </div>

          {/* Opt-out toggle */}
          <div className="flex items-center gap-3">
            <Button
              variant={isOptedOut ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => void handleToggleOptOut()}
            >
              {isOptedOut ? 'Remove Marketing Opt-Out' : 'Set Marketing Opt-Out'}
            </Button>
          </div>
        </div>

        {/* Profile metadata grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">
              {t('customers.dob')}
            </span>
            <p className="mt-0.5 font-medium text-slate-800">
              {customer.date_of_birth ?? '—'}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">
              {t('customers.area')}
            </span>
            <p className="mt-0.5 font-medium text-slate-800">{customer.area ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">
              {t('customers.channel')}
            </span>
            <p className="mt-0.5 font-medium uppercase text-slate-800">
              {customer.preferences?.preferred_channel ?? 'whatsapp'}
            </p>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            <strong>Notes:</strong> {customer.notes}
          </div>
        )}
      </div>

      {/* Groups & Tags Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-600">
            {t('customers.groups')}
          </h2>
          {customer.groups && customer.groups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customer.groups.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  🏷️ {g.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No groups assigned</p>
          )}
        </div>

        <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-600">
            {t('customers.tags')}
          </h2>
          {customer.tags && customer.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customer.tags.map((t) => (
                <span
                  key={t.id}
                  style={{ backgroundColor: `${t.color}20`, color: t.color }}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                >
                  ● {t.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No tags assigned</p>
          )}
        </div>
      </div>

      {/* Power-Tiller Machinery Profile */}
      {activeBusiness?.id && customer.id && (
        <CustomerTillerSection businessId={activeBusiness.id} customerId={customer.id} />
      )}

      {/* Call Notes & Promise to Pay Follow-ups */}
      <div className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold text-slate-900">{t('customers.callNotes')}</h2>

        {/* Add Note Form */}
        <form
          onSubmit={(e) => void handleAddNote(e)}
          className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <h3 className="text-sm font-semibold text-slate-800">
            {t('customers.addNote')}
          </h3>
          <div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Record call discussion, customer commitments or inquiries…"
              rows={3}
              required
              disabled={submittingNote}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
            <Input
              label={t('customers.promiseToPay')}
              type="date"
              value={promiseDate}
              onChange={(e) => setPromiseDate(e.target.value)}
              disabled={submittingNote}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" loading={submittingNote}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </form>

        {/* Notes Timeline */}
        {customer.latestNote ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>{new Date(customer.latestNote.call_date).toLocaleDateString()}</span>
              {customer.latestNote.promise_to_pay_date && (
                <span className="rounded bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                  ⏰ Promised payment: {customer.latestNote.promise_to_pay_date}
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-800">
              {customer.latestNote.content}
            </p>
          </div>
        ) : (
          <EmptyState
            icon="📝"
            title="No call notes recorded"
            description="Log interactions and promise dates to track follow-up commitments."
          />
        )}
      </div>
    </div>
  );
}

export default CustomerDetailPage;
