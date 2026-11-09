/**
 * CreatePurchaseOrderPage — Draft a purchase order with load costs apportionment.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import { fetchSuppliers } from '@/features/suppliers';
import { fetchProducts } from '@/features/products';
import { fetchCustomers } from '@/features/customers';
import { createPurchaseOrder } from './api/purchaseOrderService';
import { Button, Input, Select, LoadingSpinner } from '@/components/ui';
import type { Supplier, Product, Customer } from '@/lib/database.types';

interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  quantityBags: number;
  unitRateRupees: number;
}

interface LoadCostLineItem {
  id: string;
  description: string;
  amountRupees: number;
  allocationMethod: 'by_bags' | 'by_value';
}

export function CreatePurchaseOrderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness, activeRole } = useBusiness();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<OrderLineItem[]>([
    {
      id: '1',
      productId: '',
      productName: '',
      customerId: '',
      customerName: '',
      quantityBags: 100,
      unitRateRupees: 0,
    },
  ]);

  const [loadCosts, setLoadCosts] = useState<LoadCostLineItem[]>([]);

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';
  const hasOwnerAccess = isOwner(activeRole ?? undefined);

  useEffect(() => {
    async function loadOptions() {
      if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) return;
      try {
        const [supData, prodData, custData] = await Promise.all([
          fetchSuppliers(activeBusiness.id),
          fetchProducts(activeBusiness.id),
          fetchCustomers(activeBusiness.id),
        ]);
        setSuppliers(supData);
        if (supData.length > 0 && supData[0]) setSupplierId(supData[0].id);
        setProducts(prodData.data);
        setCustomers(custData.data);
      } finally {
        setLoading(false);
      }
    }
    void loadOptions();
  }, [activeBusiness, isCattleFeed, hasOwnerAccess]);

  const handleProductSelect = (index: number, pId: string) => {
    const selected = products.find((p) => p.id === pId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId: pId,
              productName: selected ? selected.name : item.productName,
              unitRateRupees: selected
                ? selected.default_price_paise / 100
                : item.unitRateRupees,
            }
          : item,
      ),
    );
  };

  const handleCustomerSelect = (index: number, cId: string) => {
    const selected = customers.find((c) => c.id === cId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              customerId: cId,
              customerName: selected ? selected.name : '',
            }
          : item,
      ),
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        productId: '',
        productName: '',
        customerId: '',
        customerName: '',
        quantityBags: 50,
        unitRateRupees: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddLoadCost = () => {
    setLoadCosts((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: 'Transport / Freight',
        amountRupees: 0,
        allocationMethod: 'by_bags',
      },
    ]);
  };

  const handleRemoveLoadCost = (index: number) => {
    setLoadCosts((prev) => prev.filter((_, i) => i !== index));
  };

  // Math summary
  const totalGoodsRupees = items.reduce(
    (sum, item) => sum + item.quantityBags * item.unitRateRupees,
    0,
  );
  const totalLoadRupees = loadCosts.reduce((sum, lc) => sum + lc.amountRupees, 0);
  const totalBags = items.reduce((sum, item) => sum + item.quantityBags, 0);
  const averageLoadPerBag = totalBags > 0 ? totalLoadRupees / totalBags : 0;
  const grandTotalRupees = totalGoodsRupees + totalLoadRupees;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setError(null);

    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }

    const invalidItem = items.find(
      (it) => !it.productName.trim() || it.quantityBags <= 0,
    );
    if (invalidItem) {
      setError('Each item must have a product name and positive bag quantity');
      return;
    }

    setSaving(true);
    try {
      const order = await createPurchaseOrder(activeBusiness.id, {
        supplierId,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || null,
        items: items.map((it) => ({
          productId: it.productId || null,
          productName: it.productName,
          customerId: it.customerId || null,
          customerName: it.customerName || null,
          quantityBags: it.quantityBags,
          unitRateRupees: it.unitRateRupees,
        })),
        loadCosts: loadCosts.map((lc) => ({
          description: lc.description,
          amountRupees: lc.amountRupees,
          allocationMethod: lc.allocationMethod,
        })),
        notes: notes || null,
      });

      navigate(`/purchase-orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('purchaseOrders.createPO')}
          </h1>
          <p className="text-sm text-gray-500">{t('purchaseOrders.draftNotice')}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/purchase-orders')}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-6"
      >
        {/* Header Details */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Order Header</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label={t('purchaseOrders.supplier')}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Input
              label={t('purchaseOrders.orderDate')}
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
            />

            <Input
              label={t('purchaseOrders.deliveryDate')}
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {t('purchaseOrders.items')}
            </h2>
            <Button type="button" variant="secondary" onClick={handleAddItem}>
              + {t('purchaseOrders.addItem')}
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-2 rounded-md border border-gray-100 bg-gray-50 p-3 sm:grid-cols-12 sm:items-center"
              >
                <div className="sm:col-span-3">
                  <Select
                    label={t('purchaseOrders.product')}
                    value={item.productId}
                    onChange={(e) => handleProductSelect(index, e.target.value)}
                  >
                    <option value="">Manual Name</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Item Name"
                    type="text"
                    value={item.productName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, productName: val } : it,
                        ),
                      );
                    }}
                    placeholder="Product name"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Select
                    label={t('purchaseOrders.customerLink')}
                    value={item.customerId}
                    onChange={(e) => handleCustomerSelect(index, e.target.value)}
                  >
                    <option value="">None (Stock)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="sm:col-span-1">
                  <Input
                    label={t('purchaseOrders.bags')}
                    type="number"
                    min="1"
                    value={item.quantityBags}
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 0;
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, quantityBags: qty } : it,
                        ),
                      );
                    }}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label={t('purchaseOrders.ratePerBag')}
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitRateRupees}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, unitRateRupees: rate } : it,
                        ),
                      );
                    }}
                  />
                </div>

                <div className="text-right sm:col-span-1">
                  <span className="block text-xs text-gray-500">Effective</span>
                  <span className="text-xs font-semibold text-gray-900">
                    ₹{(item.unitRateRupees + averageLoadPerBag).toFixed(2)}
                  </span>
                </div>

                <div className="text-right sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length <= 1}
                    className="text-sm font-bold text-red-500 hover:text-red-700 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Load Costs */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {t('purchaseOrders.loadCosts')}
              </h2>
              <p className="text-xs text-gray-500">
                Transport and freight costs are apportioned into effective unit costs.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={handleAddLoadCost}>
              + {t('purchaseOrders.addLoadCost')}
            </Button>
          </div>

          {loadCosts.length === 0 ? (
            <p className="text-sm italic text-gray-400">
              No load or transport costs added.
            </p>
          ) : (
            <div className="space-y-3">
              {loadCosts.map((lc, index) => (
                <div
                  key={lc.id}
                  className="grid grid-cols-1 gap-2 rounded-md border border-gray-100 bg-gray-50 p-3 sm:grid-cols-12 sm:items-center"
                >
                  <div className="sm:col-span-6">
                    <Input
                      label="Description"
                      type="text"
                      value={lc.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLoadCosts((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, description: val } : l,
                          ),
                        );
                      }}
                      placeholder="e.g. Truck Freight, Hamali"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Input
                      label="Amount (₹)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={lc.amountRupees}
                      onChange={(e) => {
                        const amt = parseFloat(e.target.value) || 0;
                        setLoadCosts((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, amountRupees: amt } : l,
                          ),
                        );
                      }}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Select
                      label={t('purchaseOrders.allocationMethod')}
                      value={lc.allocationMethod}
                      onChange={(e) => {
                        const m = e.target.value as 'by_bags' | 'by_value';
                        setLoadCosts((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, allocationMethod: m } : l,
                          ),
                        );
                      }}
                    >
                      <option value="by_bags">{t('purchaseOrders.byBags')}</option>
                      <option value="by_value">{t('purchaseOrders.byValue')}</option>
                    </Select>
                  </div>

                  <div className="text-right sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveLoadCost(index)}
                      className="text-sm font-bold text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Financial Summary</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>
                {t('purchaseOrders.totalGoods')} ({totalBags} bags):
              </span>
              <span className="font-mono">₹{totalGoodsRupees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('purchaseOrders.totalLoad')}:</span>
              <span className="font-mono">₹{totalLoadRupees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>{t('purchaseOrders.grandTotal')}:</span>
              <span className="text-primary-700 font-mono">
                ₹{grandTotalRupees.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <Input
          label={t('suppliers.notes')}
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery instructions or purchase notes"
        />

        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate('/purchase-orders')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating Draft...' : 'Create Draft Purchase Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
