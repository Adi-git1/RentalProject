/**
 * Geocoding + distance from the pickup location.
 * Uses OpenStreetMap Nominatim (no API key). Low volume only; be polite.
 */

// Pickup: Madison Trust Elementary School parking lot, Brambleton, VA 20148
// (42380 Founders Dr). Used as the origin for the delivery-radius check.
export const PICKUP_COORDS = { lat: 38.9836, lon: -77.5389 } as const;

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

export async function geocode(address: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", address);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AnyTimeRental/1.0 (rental site checkout distance check)",
        "Accept-Language": "en",
      },
      // 10s guard
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data.length) return null;
    return {
      lat: Number(data[0].lat),
      lon: Number(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export function haversineMiles(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 3958.7613; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface DeliveryCheck {
  ok: boolean;
  distanceMiles: number | null;
  reason?: string;
}

/** Resolve an address and check it is within the delivery radius of pickup. */
export async function checkDeliveryAddress(
  address: string,
  radiusMiles: number,
  pickupAddress = "Madison Trust Elementary School parking lot, Brambleton, VA 20148",
): Promise<DeliveryCheck> {
  const geo = await geocode(address);
  if (!geo) {
    return {
      ok: false,
      distanceMiles: null,
      reason:
        "We couldn't locate that address. Double-check it, or choose pickup instead.",
    };
  }
  const distance = haversineMiles(PICKUP_COORDS, geo);
  if (distance > radiusMiles) {
    return {
      ok: false,
      distanceMiles: Math.round(distance * 10) / 10,
      reason: `That address is about ${Math.round(distance)} miles away — outside our ${radiusMiles}-mile delivery range. Pickup is available at ${pickupAddress}.`,
    };
  }
  return { ok: true, distanceMiles: Math.round(distance * 10) / 10 };
}
