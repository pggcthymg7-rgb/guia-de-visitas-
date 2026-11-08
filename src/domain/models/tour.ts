/**
 * Bounded Context: TourCatalogContext
 * Aggregate Root: VisitTour
 * Entity: PropertyStop
 */

export interface PropertyStop {
  id: string;
  orderIndex: number; // 1-based index (1..N)
  condominiumName: string;
  priceCents: number; // Stored in cents, e.g., 250000000 = R$ 2.500.000,00
  title: string;
  fullDescription: string;
  facadeImageDataUrl: string; // Base64 data URL or external HTTPS image URL
}

export interface VisitTour {
  id: string;
  title: string;
  visitDate: string; // ISO date string (YYYY-MM-DD)
  brokerName: string;
  visitorCount: 1 | 2;
  visitor1Name: string;
  visitor2Name?: string;
  stops: PropertyStop[];
  createdAtIso: string;
  updatedAtIso: string;
}

export type CreatePropertyStopInput = Omit<PropertyStop, 'id' | 'orderIndex'> & {
  id?: string;
};

export type CreateTourInput = Omit<VisitTour, 'id' | 'createdAtIso' | 'updatedAtIso' | 'stops'> & {
  id?: string;
  stops?: PropertyStop[];
};

/**
 * Creates a normalized PropertyStop ensuring trimmed strings and orderIndex.
 */
export function createPropertyStop(input: CreatePropertyStopInput, orderIndex: number): PropertyStop {
  return {
    id: input.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    orderIndex,
    condominiumName: input.condominiumName.trim(),
    priceCents: Math.max(0, Math.floor(input.priceCents || 0)),
    title: input.title.trim(),
    fullDescription: input.fullDescription.trim(),
    facadeImageDataUrl: input.facadeImageDataUrl.trim(),
  };
}

/**
 * Creates a new VisitTour aggregate with normalized metadata and timestamps.
 */
export function createTour(input: CreateTourInput): VisitTour {
  const now = new Date().toISOString();
  const stops = (input.stops || []).map((stop, idx) => ({
    ...stop,
    orderIndex: idx + 1,
  }));

  return {
    id: input.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tour-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    title: input.title.trim(),
    visitDate: input.visitDate.trim(),
    brokerName: input.brokerName.trim(),
    visitorCount: input.visitorCount,
    visitor1Name: input.visitor1Name.trim(),
    visitor2Name: input.visitorCount === 2 && input.visitor2Name ? input.visitor2Name.trim() : undefined,
    stops,
    createdAtIso: now,
    updatedAtIso: now,
  };
}

/**
 * Reorders property stops from fromIndex to toIndex, recalculating orderIndex (1..N).
 */
export function reorderStops(stops: PropertyStop[], fromIndex: number, toIndex: number): PropertyStop[] {
  if (fromIndex < 0 || fromIndex >= stops.length || toIndex < 0 || toIndex >= stops.length || fromIndex === toIndex) {
    return stops;
  }
  const result = [...stops];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result.map((stop, idx) => ({
    ...stop,
    orderIndex: idx + 1,
  }));
}

/**
 * Moves a stop up by one position (boundary locked at 0).
 */
export function moveStopUp(stops: PropertyStop[], index: number): PropertyStop[] {
  if (index <= 0 || index >= stops.length) return stops;
  return reorderStops(stops, index, index - 1);
}

/**
 * Moves a stop down by one position (boundary locked at stops.length - 1).
 */
export function moveStopDown(stops: PropertyStop[], index: number): PropertyStop[] {
  if (index < 0 || index >= stops.length - 1) return stops;
  return reorderStops(stops, index, index + 1);
}

/**
 * Adds a new stop to the list, placing it at the end with orderIndex = stops.length + 1.
 */
export function addStop(stops: PropertyStop[], input: CreatePropertyStopInput): PropertyStop[] {
  const newStop = createPropertyStop(input, stops.length + 1);
  return [...stops, newStop];
}

/**
 * Removes a stop by id and reindexes remaining stops 1..N.
 */
export function removeStop(stops: PropertyStop[], stopId: string): PropertyStop[] {
  return stops
    .filter(s => s.id !== stopId)
    .map((stop, idx) => ({
      ...stop,
      orderIndex: idx + 1,
    }));
}

/**
 * Updates a stop by id, preserving orderIndex.
 */
export function updateStop(stops: PropertyStop[], updated: PropertyStop): PropertyStop[] {
  return stops.map(stop => (stop.id === updated.id ? { ...updated, orderIndex: stop.orderIndex } : stop));
}
