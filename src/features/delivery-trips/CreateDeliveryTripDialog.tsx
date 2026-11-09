/**
 * Create Delivery Trip Dialog.
 * Plan route stops, bag quantities, and recipient lists without auto-billing.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createDeliveryTrip, type CreateTripStopInput } from './api/deliveryTripService';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/database.types';

interface CreateDeliveryTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onCreated: () => void;
}

export function CreateDeliveryTripDialog({
  isOpen,
  onClose,
  businessId,
  onCreated,
}: CreateDeliveryTripDialogProps) {
  const { t } = useTranslation();
  const [tripDate, setTripDate] = useState<string>(
    new Date().toISOString().split('T')[0] ?? '',
  );
  const [routeName, setRouteName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState<CreateTripStopInput[]>([
    { customerId: '', customerName: '', villageOrArea: '', phone: '', bagsCount: 10 },
  ]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      if (!businessId) return;
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      if (data) setCustomers(data);
    }
    if (isOpen) {
      void loadCustomers();
    }
  }, [businessId, isOpen]);

  const handleAddStop = () => {
    setStops((prev) => [
      ...prev,
      { customerId: '', customerName: '', villageOrArea: '', phone: '', bagsCount: 10 },
    ]);
  };

  const handleRemoveStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStopChange = (
    index: number,
    field: keyof CreateTripStopInput,
    value: string | number,
  ) => {
    setStops((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      if (cur) {
        updated[index] = { ...cur, [field]: value };
      }
      return updated;
    });
  };

  const handleSelectCustomer = (index: number, customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    setStops((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      if (cur) {
        updated[index] = {
          ...cur,
          customerId: cust.id,
          customerName: cust.name,
          villageOrArea: cust.area || '',
          phone: cust.display_phone || cust.normalized_phone || '',
        };
      }
      return updated;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!routeName.trim()) {
      setError(t('trips.routeRequired', 'Route name is required'));
      return;
    }

    const validStops = stops.filter(
      (s) => s.customerId && s.customerName.trim().length > 0,
    );
    if (validStops.length === 0) {
      setError(
        t('trips.atLeastOneStop', 'Please select at least one customer stop from CRM'),
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await createDeliveryTrip({
        businessId,
        tripDate,
        routeName,
        driverName,
        vehicleNumber,
        notes,
        stops: validStops,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onCreated();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setSaving(false);
    }
  };

  const totalBags = stops.reduce((sum, s) => sum + (Number(s.bagsCount) || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('trips.createTripTitle', 'Plan New Delivery Trip')}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="max-h-[80vh] space-y-4 overflow-y-auto pr-1 text-sm"
      >
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('trips.tripDate', 'Delivery Date')} *
            </label>
            <Input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('trips.routeName', 'Route Name / Sector')} *
            </label>
            <Input
              placeholder={t('trips.routePlaceholder', 'e.g. Pune - Shirur Route')}
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('trips.driverName', 'Driver / Operator')}
            </label>
            <Input
              placeholder={t('trips.driverPlaceholder', 'Driver name')}
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              {t('trips.vehicleNumber', 'Vehicle Number')}
            </label>
            <Input
              placeholder={t('trips.vehiclePlaceholder', 'e.g. MH 12 AB 1234')}
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Stops section */}
        <div className="border-t border-slate-200 pt-2">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold text-slate-800">
              {t('trips.stopsHeading', 'Customer Stops')} ({stops.length})
            </h4>
            <div className="text-xs font-semibold text-blue-700">
              {t('trips.totalBags', 'Total Bags')}: {totalBags}
            </div>
          </div>

          <div className="space-y-3">
            {stops.map((stop, idx) => (
              <div
                key={idx}
                className="relative space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>
                    #{idx + 1} {t('trips.stop', 'Stop')}
                  </span>
                  {stops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(idx)}
                      className="text-xs font-normal text-red-500 hover:text-red-700"
                    >
                      ✕ {t('common.remove', 'Remove')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="mb-0.5 block text-[11px] text-slate-500">
                      {t('trips.quickSelectCustomer', 'Select Customer')}
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs"
                      value={stop.customerId || ''}
                      onChange={(e) => handleSelectCustomer(idx, e.target.value)}
                    >
                      <option value="">
                        -- {t('trips.pickCustomer', 'Pick from CRM')} --
                      </option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.area ? `(${c.area})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-0.5 block text-[11px] text-slate-500">
                      {t('trips.customerName', 'Customer Name')} *
                    </label>
                    <Input
                      value={stop.customerName}
                      onChange={(e) =>
                        handleStopChange(idx, 'customerName', e.target.value)
                      }
                      placeholder={t('common.name', 'Name')}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <label className="mb-0.5 block text-[11px] text-slate-500">
                      {t('trips.villageOrArea', 'Village / Drop Area')}
                    </label>
                    <Input
                      value={stop.villageOrArea || ''}
                      onChange={(e) =>
                        handleStopChange(idx, 'villageOrArea', e.target.value)
                      }
                      placeholder={t('trips.area', 'Area')}
                    />
                  </div>

                  <div>
                    <label className="mb-0.5 block text-[11px] text-slate-500">
                      {t('common.phone', 'Phone')}
                    </label>
                    <Input
                      value={stop.phone || ''}
                      onChange={(e) => handleStopChange(idx, 'phone', e.target.value)}
                      placeholder="10-digit mobile"
                    />
                  </div>

                  <div>
                    <label className="mb-0.5 block text-[11px] text-slate-500">
                      {t('trips.bags', 'Bags Count')} *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={stop.bagsCount}
                      onChange={(e) =>
                        handleStopChange(
                          idx,
                          'bagsCount',
                          Math.max(1, parseInt(e.target.value, 10) || 1),
                        )
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStop}
            className="mt-3 w-full border-dashed"
          >
            + {t('trips.addAnotherStop', 'Add Another Stop')}
          </Button>
        </div>

        <div>
          <label className="mb-1 block font-medium text-slate-700">
            {t('trips.notes', 'Trip Notes / Logistics Instructions')}
          </label>
          <Input
            placeholder={t(
              'trips.notesPlaceholder',
              'e.g. Loading begins at 6 AM at godown',
            )}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? t('common.saving', 'Creating...')
              : t('trips.createTrip', 'Create Trip')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
