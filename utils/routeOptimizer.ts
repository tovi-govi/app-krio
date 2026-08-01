import { DeliverySchedule, Organization } from "@/context/CartContext";

export type OptimizedRouteStop = DeliverySchedule & {
  stopNumber: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  distanceToNextKm?: number;
  estimatedTimeMins?: number;
  estimatedArrival?: string;
  hasLocation: boolean;
};

export type OptimizedRouteResult = {
  stops: OptimizedRouteStop[];
  totalDistanceKm: number;
  totalTimeMins: number;
  isOptimized: boolean;
  optimizedCount: number;
  unlocatedCount: number;
};

// Earth radius in kilometers
const R = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Optimizes today's delivery route using Nearest-Neighbor TSP algorithm based on organization coordinates.
 */
export function optimizeDeliveryRoute(
  schedules: DeliverySchedule[],
  organizations: Organization[],
  startCoords?: { latitude: number; longitude: number }
): OptimizedRouteResult {
  if (!schedules || schedules.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      totalTimeMins: 0,
      isOptimized: false,
      optimizedCount: 0,
      unlocatedCount: 0,
    };
  }

  // Map schedules with organization location coordinates
  const schedulesWithLoc = schedules.map((schedule) => {
    const org = organizations.find((o) => o.id === schedule.organizationId);
    const hasLocation = Boolean(org?.location?.latitude && org?.location?.longitude);
    return {
      schedule,
      org,
      hasLocation,
      lat: org?.location?.latitude,
      lng: org?.location?.longitude,
      address: org?.address || "",
    };
  });

  const located = schedulesWithLoc.filter((s) => s.hasLocation && s.lat !== undefined && s.lng !== undefined);
  const unlocated = schedulesWithLoc.filter((s) => !s.hasLocation);

  let currentLat = startCoords?.latitude ?? (located.length > 0 ? located[0].lat! : 0);
  let currentLng = startCoords?.longitude ?? (located.length > 0 ? located[0].lng! : 0);

  const remaining = [...located];
  const orderedLocated: typeof remaining = [];

  // Nearest-neighbor TSP ordering
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(currentLat, currentLng, remaining[i].lat!, remaining[i].lng!);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const nextStop = remaining.splice(nearestIdx, 1)[0];
    orderedLocated.push(nextStop);
    currentLat = nextStop.lat!;
    currentLng = nextStop.lng!;
  }

  const finalSchedules = [...orderedLocated, ...unlocated];
  let totalDist = 0;
  let totalMins = 0;
  const now = new Date();

  const stops: OptimizedRouteStop[] = finalSchedules.map((item, idx) => {
    const nextItem = finalSchedules[idx + 1];
    let distToNext = 0;

    if (item.hasLocation && nextItem && nextItem.hasLocation) {
      distToNext = haversineDistance(item.lat!, item.lng!, nextItem.lat!, nextItem.lng!);
    }

    totalDist += distToNext;
    // Assume average speed 30 km/h in city traffic + 10 mins per delivery stop
    const travelTime = distToNext > 0 ? Math.round((distToNext / 30) * 60) : 0;
    totalMins += travelTime + 10;

    const arrivalTime = new Date(now.getTime() + totalMins * 60000);
    const arrivalFormatted = arrivalTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return {
      ...item.schedule,
      stopNumber: idx + 1,
      latitude: item.lat,
      longitude: item.lng,
      address: item.address,
      distanceToNextKm: distToNext,
      estimatedTimeMins: travelTime,
      estimatedArrival: arrivalFormatted,
      hasLocation: item.hasLocation,
    };
  });

  return {
    stops,
    totalDistanceKm: Number(totalDist.toFixed(1)),
    totalTimeMins: Math.round(totalMins),
    isOptimized: located.length > 1,
    optimizedCount: located.length,
    unlocatedCount: unlocated.length,
  };
}
