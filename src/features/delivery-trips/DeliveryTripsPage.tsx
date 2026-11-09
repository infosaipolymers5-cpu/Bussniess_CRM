/**
 * Delivery Trips & Planning Page.
 * Routes management, stop tracking, and customer drop notifications without auto-billing.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  fetchDeliveryTrips,
  updateStopStatus,
  queueTripAnnouncements,
  type TripWithStops,
} from './api/deliveryTripService';
import { CreateDeliveryTripDialog } from './CreateDeliveryTripDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function DeliveryTripsPage() {
  const { t, i18n } = useTranslation();
  const { activeBusiness } = useBusiness();
  const [trips, setTrips] = useState<TripWithStops[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [announcingTripId, setAnnouncingTripId] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDeliveryTrips(activeBusiness.id);
      if (res.error) {
        setError(res.error);
      } else {
        setTrips(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery trips');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const handleUpdateStop = async (
    stopId: string,
    status: 'delivered' | 'cancelled' | 'pending',
  ) => {
    try {
      const res = await updateStopStatus(stopId, status);
      if (res.error) {
        alert(res.error);
      } else {
        await loadTrips();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update stop');
    }
  };

  const handleNotifyCustomers = async (trip: TripWithStops) => {
    if (!activeBusiness) return;
    if (
      !confirm(
        t(
          'trips.confirmAnnounce',
          'Queue delivery WhatsApp arrival announcements for all eligible stops in this route?',
        ),
      )
    ) {
      return;
    }

    setAnnouncingTripId(trip.id);
    try {
      const res = await queueTripAnnouncements({
        businessId: activeBusiness.id,
        trip,
        businessName: activeBusiness.name,
        language: i18n.language === 'mr' ? 'mr' : 'en',
      });

      if (res.error) {
        alert(res.error);
      } else {
        alert(
          t(
            'trips.announceQueued',
            `Announcements queued! ${res.queuedCount} stops scheduled (${res.skippedCount} skipped/opted out). Check Messages hub to dispatch.`,
          ),
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to queue announcements');
    } finally {
      setAnnouncingTripId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('trips.title', 'Delivery Trips & Logistics')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              'trips.subtitle',
              'Plan route stops, load bags, and notify farmers of vehicle arrival (never auto-creates bills).',
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void loadTrips();
            }}
            disabled={loading}
          >
            {loading ? t('common.loading', 'Loading...') : t('common.refresh', 'Refresh')}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            + {t('trips.planTrip', 'Plan Delivery Trip')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Trips list */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">
          {t('common.loading', 'Loading delivery routes...')}
        </div>
      ) : trips.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-base font-medium">
            {t('trips.noTrips', 'No delivery trips planned yet.')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t(
              'trips.startPlanning',
              'Click "Plan Delivery Trip" to group orders by route and prepare bag loading.',
            )}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const deliveredStops = trip.stops.filter(
              (s) => s.status === 'delivered',
            ).length;

            return (
              <Card key={trip.id} className="space-y-4 border-l-4 border-l-blue-600 p-5">
                <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {trip.area || trip.trip_number}
                      </span>
                      <Badge variant="primary" className="bg-blue-100 text-blue-800">
                        📅 {trip.trip_date}
                      </Badge>
                      <Badge
                        variant={
                          trip.status === 'completed'
                            ? 'success'
                            : trip.status === 'in_transit'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {trip.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {trip.driver_name && (
                        <span>
                          {t('trips.driver', 'Driver')}:{' '}
                          <strong>{trip.driver_name}</strong>
                        </span>
                      )}
                      {trip.vehicle_number && (
                        <span>
                          {t('trips.vehicle', 'Vehicle')}:{' '}
                          <strong>{trip.vehicle_number}</strong>
                        </span>
                      )}
                      <span>
                        {t('trips.totalBags', 'Total Load')}:{' '}
                        <strong>
                          {trip.stops.reduce((sum, s) => sum + s.bag_count, 0)}{' '}
                          {t('common.bags', 'bags')}
                        </strong>
                      </span>
                      <span>
                        {t('trips.progress', 'Progress')}: {deliveredStops}/
                        {trip.stops.length} {t('trips.stopsDelivered', 'stops delivered')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-600 text-green-700 hover:bg-green-50"
                      disabled={announcingTripId === trip.id}
                      onClick={() => {
                        void handleNotifyCustomers(trip);
                      }}
                    >
                      💬{' '}
                      {announcingTripId === trip.id
                        ? t('common.queueing', 'Queueing...')
                        : t('trips.announceArrival', 'Announce via WhatsApp')}
                    </Button>
                  </div>
                </div>

                {/* Stops Subtable */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t('trips.routeStops', 'Route Stops')}
                  </h4>

                  <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/50">
                    {trip.stops.map((stop) => (
                      <div
                        key={stop.id}
                        className="flex flex-col items-start justify-between gap-2 bg-white p-3 text-xs hover:bg-slate-50 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                            {stop.stop_order}
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {stop.customer_name}
                            </div>
                            <div className="text-slate-500">
                              {stop.village_or_area && `${stop.village_or_area} • `}
                              {stop.phone && (
                                <a
                                  href={`tel:${stop.phone}`}
                                  className="font-mono text-blue-600 hover:underline"
                                >
                                  {stop.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-800">
                            {stop.bag_count} {t('common.bags', 'bags')}
                          </span>

                          <Badge
                            variant={
                              stop.status === 'delivered'
                                ? 'success'
                                : stop.status === 'cancelled'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {stop.status}
                          </Badge>

                          {stop.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 py-0.5 text-xs"
                              onClick={() => {
                                void handleUpdateStop(stop.id, 'delivered');
                              }}
                            >
                              ✓ {t('trips.markDelivered', 'Delivered')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Trip Dialog */}
      {activeBusiness && (
        <CreateDeliveryTripDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          businessId={activeBusiness.id}
          onCreated={() => {
            void loadTrips();
          }}
        />
      )}
    </div>
  );
}
