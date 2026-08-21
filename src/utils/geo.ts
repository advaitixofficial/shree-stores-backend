// ============================================================
// Shree Stores Backend — Geolocation Utilities
// Haversine formula for distance calculation.
// ============================================================

import { BadRequestError } from './errors';

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using the Haversine formula.
 * @returns Distance in kilometers.
 */
export function calculateDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  validateCoordinates(lat1, lon1);
  validateCoordinates(lat2, lon2);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Validate that coordinates are within valid ranges.
 */
export function validateCoordinates(lat: number, lon: number): void {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new BadRequestError('Invalid coordinates: must be numbers');
  }
  if (lat < -90 || lat > 90) {
    throw new BadRequestError(`Invalid latitude: ${lat}. Must be between -90 and 90`);
  }
  if (lon < -180 || lon > 180) {
    throw new BadRequestError(`Invalid longitude: ${lon}. Must be between -180 and 180`);
  }
}

/**
 * Check if a location is within delivery radius from the store.
 */
export function isWithinDeliveryRadius(
  storeLat: number,
  storeLon: number,
  customerLat: number,
  customerLon: number,
  radiusKm: number
): boolean {
  const distance = calculateDistanceInKm(storeLat, storeLon, customerLat, customerLon);
  return distance <= radiusKm;
}
