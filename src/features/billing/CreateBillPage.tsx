/**
 * CreateBillPage — Cattle Feed bill creation workflow.
 * Calculates line items, allocates sequential FY bill number, and posts debit to customer ledger.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchCustomers } from '@/features/customers';
import { fetchProducts } from '@/features/products';
import { createBill } from './api/billingService';
import { Button, Input, Select, LoadingSpinner } from '@/components/ui';
import { todayInBusinessTz } from '@/lib/dates';
import { paiseToRupees } from '@/lib/money';
import type { Customer, Product } from '@/lib/database.types';

interface LineItemState {
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  unitPriceRupees: string;
}

export function CreateBillPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingPrereqs, setLoadingPrereqs] = useState(true);

  // Form fields
  const [customerId, setCustomerId] = useState('');
  const [billDate, setBillDate] = useState(todayInBusinessTz());
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<LineItemState[]>([
    { productId: '', productName: '', unit: 'bag', quantity: '1', unitPriceRupees: '0' },
  ]);
  const [discountRupees, setDiscountRupees] = useState('0');
  const [paidNowRupees, setPaidNowRupees] = useState('0');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPrereqs = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed) {
      setLoadingPrereqs(false);
      return;
    }
    setLoadingPrereqs(true);
    const [custRes, prodRes] = await Promise.all([
      fetchCustomers(activeBusiness.id),
      fetchProducts(activeBusiness.id, true),
    ]);
    setCustomers(custRes.data);
    setProducts(prodRes.data);
    setLoadingPrereqs(false);
  }, [activeBusiness, isCattleFeed]);

  useEffect(() => {
    void loadPrereqs();
  }, [loadPrereqs]);

  // Handle product selection in a line item
  const handleProductChange = (index: number, prodId: string) => {
    const selected = products.find((p) => p.id === prodId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId: prodId,
              productName: selected ? selected.name : item.productName,
              unit: selected ? selected.unit : item.unit,
              unitPriceRupees: selected
                ? String(paiseToRupees(selected.default_price_paise))
                : item.unitPriceRupees,
            }
          : item,
      ),
    );
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemState,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        productName: '',
        unit: 'bag',
        quantity: '1',
        unitPriceRupees: '0',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live math calculations
  const subtotal = items.reduce((sum, item) => {
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.unitPriceRupees) || 0;
    return sum + q * p;
  }, 0);

  const discount = parseFloat(discountRupees) || 0;
  const total = Math.max(0, subtotal - discount);
  const paidNow = parseFloat(paidNowRupees) || 0;
  const balanceDue = Math.max(0, total - paidNow);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!activeBusiness) return;
    if (!customerId) {
      setFormError('Please select a customer');
      return;
    }
    if (items.some((i) => !i.productName.trim() || (parseFloat(i.quantity) || 0) <= 0)) {
      setFormError('All items must have a valid name and quantity greater than 0');
      return;
    }

    setSubmitting(true);
    const { bill, error } = await createBill(activeBusiness.id, {
      customerId,
      billDate,
      dueDate: dueDate || null,
      items: items.map((i) => ({
        productId: i.productId || null,
        productName: i.productName,
        unit: i.unit,
        quantity: parseFloat(i.quantity) || 1,
        unitPriceRupees: parseFloat(i.unitPriceRupees) || 0,
      })),
      discountRupees: discount,
      paidNowRupees: paidNow,
      notes: notes || null,
    });
    setSubmitting(false);

    if (error || !bill) {
      setFormError(error ?? 'Failed to create bill');
      return;
    }

    navigate(`/bills/${bill.id}`);
  };

  if (!isCattleFeed) {
    return (
      <div className="rounded-card border border-amber-200 bg-amber-50 p-6 shadow-card">
        <h2 className="text-base font-semibold text-amber-800">
          {t('bills.cattleFeedNotice')}
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          Billing, invoices, customer dues, and payment allocation apply strictly to
          Cattle Feed. PVC is non-billing by architectural design.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('bills.createBill')}
        </h1>
        <p className="text-sm text-slate-500">
          {activeBusiness?.name} · Post an immutable sequential Cattle Feed invoice
        </p>
      </div>

      {loadingPrereqs ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-6"
        >
          {formError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {formError}
            </div>
          )}

          {/* Customer & Date Selection */}
          <div className="grid grid-cols-1 gap-4 rounded-card border border-slate-200 bg-white p-6 shadow-card md:grid-cols-3">
            <div>
              <Select
                label={t('customers.customer')}
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.display_phone})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Input
                label={t('bills.billDate')}
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label={t('bills.dueDate')}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items Card */}
          <div className="space-y-4 rounded-card border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-900">
                {t('bills.items')}
              </h2>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                + {t('bills.addItem')}
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-500 sm:hidden">
                      Catalogue / Name
                    </label>
                    <div className="space-y-1">
                      {products.length > 0 && (
                        <select
                          className="w-full rounded border-slate-300 bg-white p-1 text-xs text-slate-700"
                          value={item.productId}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                        >
                          <option value="">-- Choose Catalogue Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (₹{paiseToRupees(p.default_price_paise)}/{p.unit})
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        value={item.productName}
                        onChange={(e) =>
                          handleLineItemChange(index, 'productName', e.target.value)
                        }
                        placeholder="Item name / Description"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 sm:hidden">
                      Unit
                    </label>
                    <select
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      value={item.unit}
                      onChange={(e) =>
                        handleLineItemChange(index, 'unit', e.target.value)
                      }
                    >
                      <option value="bag">Bag</option>
                      <option value="kg">Kg</option>
                      <option value="quintal">Quintal</option>
                      <option value="unit">Unit</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 sm:hidden">
                      Qty
                    </label>
                    <input
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(index, 'quantity', e.target.value)
                      }
                      placeholder="Qty"
                      required
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 sm:hidden">
                      Rate (₹)
                    </label>
                    <input
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPriceRupees}
                      onChange={(e) =>
                        handleLineItemChange(index, 'unitPriceRupees', e.target.value)
                      }
                      placeholder="Rate"
                      required
                    />
                  </div>

                  <div className="col-span-10 text-right text-sm font-medium text-slate-900 sm:col-span-1">
                    ₹
                    {(
                      (parseFloat(item.quantity) || 0) *
                      (parseFloat(item.unitPriceRupees) || 0)
                    ).toFixed(2)}
                  </div>

                  <div className="col-span-2 text-right sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length <= 1}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Payment Summary Card */}
          <div className="grid grid-cols-1 gap-6 rounded-card border border-slate-200 bg-white p-6 shadow-card md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {t('customers.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="Optional delivery details, bag types, or remarks..."
              />
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>{t('bills.subtotal')}:</span>
                <span className="font-semibold text-slate-900">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>{t('bills.discount')}:</span>
                <div className="w-32">
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountRupees}
                    onChange={(e) => setDiscountRupees(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>{t('bills.totalAmount')}:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-slate-600">
                <span>{t('bills.paidNow')}:</span>
                <div className="w-32">
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paidNowRupees}
                    onChange={(e) => setPaidNowRupees(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-1 text-sm font-semibold text-rose-700">
                <span>{t('bills.balanceDue')}:</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/bills')}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('bills.createBill')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
