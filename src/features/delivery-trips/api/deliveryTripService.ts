/**
 * Delivery Trips & Route Planning API Service.
 * Coordinates logistics routes, customer stop sequences, bag capacities,
 * and delivery announcements without auto-billing.
 */

import { supabase } from '@/lib/supabase';
import { checkRecipientEligibility } from '@/features/messaging/eligibilityService';
import { queueMessageJob } from '@/features/messaging/messageQueueService';
import type { Customer, DeliveryTrip, DeliveryTripStop } from '@/lib/database.types';

export interface TripStopWithCustomer extends DeliveryTripStop {
  customer_name?: string;
  village_or_area?: string | null;
  phone?: string | null;
  customer?: Customer | null;
}

export interface TripWithStops extends DeliveryTrip {
  stops: TripStopWithCustomer[];
}

export interface CreateTripStopInput {
  customerId: string;
  customerName: string;
  villageOrArea?: string;
  phone?: string;
  bagsCount?: number;
  specialInstructions?: string;
}

export interface CreateTripInput {
  businessId: string;
  tripDate: string; // YYYY-MM-DD
  routeName: string;
  driverName?: string;
  vehicleNumber?: string;
  notes?: string;
  stops: CreateTripStopInput[];
}

export async function fetchDeliveryTrips(
  businessId: string,
): Promise<{ data: TripWithStops[]; error: string | null }> {
  try {
    const { data: rawTrips, error: tripsErr } = await supabase
      .from('delivery_trips')
      .select('*, stops:delivery_trip_stops(*, customer:customers(*))')
      .eq('business_id', businessId)
      .order('trip_date', { ascending: false });

    if (tripsErr) {
      return { data: [], error: tripsErr.message };
    }

    type RawStop = DeliveryTripStop & { customer?: Customer | null };
    type RawTrip = DeliveryTrip & { stops?: RawStop[] };

    const trips: TripWithStops[] = (((rawTrips as unknown[]) || []) as RawTrip[]).map(
      (t) => {
        const sortedStops: TripStopWithCustomer[] = (t.stops || [])
          .sort((a, b) => a.stop_order - b.stop_order)
          .map((s) => ({
            ...s,
            customer_name: s.customer?.name || 'Customer',
            village_or_area: s.customer?.area || null,
            phone: s.customer?.display_phone || s.customer?.normalized_phone || null,
          }));

        return {
          ...t,
          stops: sortedStops,
        };
      },
    );

    return { data: trips, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch delivery trips',
    };
  }
}

export async function createDeliveryTrip(
  input: CreateTripInput,
): Promise<{ data: TripWithStops | null; error: string | null }> {
  try {
    const tripNumber = `TRIP-${Date.now().toString().slice(-6)}`;

    // 1. Insert Trip
    const { data: tripData, error: tripErr } = await supabase
      .from('delivery_trips')
      .insert({
        business_id: input.businessId,
        trip_number: tripNumber,
        trip_date: input.tripDate,
        driver_name: input.driverName || null,
        vehicle_number: input.vehicleNumber || null,
        area: input.routeName,
        notes: input.notes || null,
        total_stops: input.stops.length,
        status: 'planned',
      })
      .select()
      .single();

    if (tripErr) {
      return { data: null, error: tripErr.message };
    }

    const trip = tripData;

    // 2. Insert Stops
    if (input.stops.length > 0) {
      const stopRows = input.stops.map((s, index) => ({
        trip_id: trip.id,
        customer_id: s.customerId,
        stop_order: index + 1,
        load_description: `${s.customerName} - ${s.bagsCount ?? 0} bags`,
        bag_count: s.bagsCount ?? 0,
        status: 'pending' as const,
      }));

      const { data: stopsData, error: stopsErr } = await supabase
        .from('delivery_trip_stops')
        .insert(stopRows)
        .select('*, customer:customers(*)');

      if (stopsErr) {
        return { data: null, error: stopsErr.message };
      }

      const stopsWithCust: TripStopWithCustomer[] = (
        ((stopsData as unknown[]) || []) as Array<
          DeliveryTripStop & { customer?: Customer | null }
        >
      ).map((s) => ({
        ...s,
        customer_name: s.customer?.name || 'Customer',
        village_or_area: s.customer?.area || null,
        phone: s.customer?.display_phone || s.customer?.normalized_phone || null,
      }));

      return {
        data: {
          ...trip,
          stops: stopsWithCust,
        },
        error: null,
      };
    }

    return {
      data: {
        ...trip,
        stops: [],
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create delivery trip',
    };
  }
}

export async function updateStopStatus(
  stopId: string,
  status: 'pending' | 'delivered' | 'rescheduled' | 'cancelled',
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('delivery_trip_stops')
      .update({
        status,
      })
      .eq('id', stopId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update stop status',
    };
  }
}

export function buildDeliveryAnnouncementText(params: {
  customerName: string;
  tripDate: string;
  villageOrArea?: string;
  bagsCount: number;
  businessName: string;
  driverPhone?: string;
  language?: 'mr' | 'en';
}): string {
  const areaPart = params.villageOrArea ? ` (${params.villageOrArea})` : '';
  const driverLine = params.driverPhone
    ? `\nड्रायव्हर संपर्क: ${params.driverPhone}`
    : '';

  if (params.language === 'en') {
    return `Dear ${params.customerName},\n\nRushi Cattle Feed delivery vehicle is arriving in your area${areaPart} on ${params.tripDate}.\nScheduled order: ${params.bagsCount} bags.\nPlease ensure someone is available at your drop location.${params.driverPhone ? `\nDriver Contact: ${params.driverPhone}` : ''}\n\nThank you!`;
  }

  // Marathi default
  return `नमस्कार ${params.customerName} जी,\n\n${params.businessName} ची गाडी दिनांक ${params.tripDate} रोजी आपल्या भागात${areaPart} येत आहे. नियोजित पुरवठा: ${params.bagsCount} पोती.\nकृपया गाडी आल्यावर माल ताब्यात घेण्यासाठी उपलब्ध राहावे.${driverLine}\n\nधन्यवाद!`;
}

export async function queueTripAnnouncements(params: {
  businessId: string;
  trip: TripWithStops;
  businessName: string;
  driverPhone?: string;
  language?: 'mr' | 'en';
}): Promise<{
  queuedCount: number;
  skippedCount: number;
  error: string | null;
}> {
  try {
    let queued = 0;
    let skipped = 0;

    // Fetch customer records to check opt-out
    const customerIds = params.trip.stops
      .map((s) => s.customer_id)
      .filter((id): id is string => !!id);

    type CustomerWithPref = Customer & {
      preferences?: { opted_out_marketing?: boolean } | null;
    };
    const customerMap = new Map<string, CustomerWithPref>();
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('*, preferences:customer_preferences(*)')
        .in('id', customerIds);
      (((customers as unknown[]) || []) as CustomerWithPref[]).forEach((c) =>
        customerMap.set(c.id, c),
      );
    }

    for (const stop of params.trip.stops) {
      const customer = stop.customer_id ? customerMap.get(stop.customer_id) : null;
      const phone =
        stop.phone || customer?.display_phone || customer?.normalized_phone || '';

      if (!phone) {
        skipped++;
        continue;
      }

      // Check opt out
      if (customer) {
        const eligibility = checkRecipientEligibility({
          customer,
          workflowType: 'delivery_notice',
          businessKind: 'cattle_feed',
          optOut: customer.preferences?.opted_out_marketing ?? false,
        });

        if (!eligibility.isEligible) {
          skipped++;
          continue;
        }
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone =
        cleanPhone.startsWith('91') && cleanPhone.length > 10
          ? cleanPhone
          : `91${cleanPhone.slice(-10)}`;

      const messageText = buildDeliveryAnnouncementText({
        customerName: stop.customer_name || 'Customer',
        tripDate: params.trip.trip_date,
        villageOrArea: stop.village_or_area || undefined,
        bagsCount: stop.bag_count,
        businessName: params.businessName,
        driverPhone: params.driverPhone,
        language: params.language ?? 'mr',
      });

      const idempotencyKey = `delivery_${params.businessId}_${params.trip.id}_${stop.id}`;

      await queueMessageJob({
        businessId: params.businessId,
        customerId: stop.customer_id || null,
        workflowType: 'delivery_notice',
        transportMode: 'manual_handoff',
        scheduledDate: params.trip.trip_date,
        idempotencyKey,
        recipientPhone: fullPhone,
        recipientName: stop.customer_name || 'Customer',
        messageText,
        contextId: params.trip.id,
        metadata: {
          tripId: params.trip.id,
          stopId: stop.id,
          bagsCount: stop.bag_count,
        },
      });

      queued++;
    }

    return { queuedCount: queued, skippedCount: skipped, error: null };
  } catch (err) {
    return {
      queuedCount: 0,
      skippedCount: 0,
      error: err instanceof Error ? err.message : 'Failed to queue announcements',
    };
  }
}
