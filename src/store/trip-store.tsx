import React, { createContext, useCallback, useContext, useState } from 'react';

export type DepartureLocation = {
  label: string;
  lat: number;
  lng: number;
};

export type CustomPlace = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
};

export type SavedItinerary = {
  id: string;
  name: string;
  placeIds: string[];
  dwellMinutes: Record<string, number>;
  departureLocation: DepartureLocation | null;
  departureTime: string;
  savedAt: string;
};

type TripStore = {
  toGoIds: string[];
  myDaysIds: string[];
  myDaysRouteActive: boolean;
  departureLocation: DepartureLocation | null;
  departureTime: string;
  dwellMinutes: Record<string, number>;
  customPlaces: CustomPlace[];
  savedItineraries: SavedItinerary[];
  addToGo: (ids: string[]) => void;
  removeFromToGo: (id: string) => void;
  addToMyDays: (ids: string[]) => void;
  removeFromMyDays: (id: string) => void;
  moveMyDayItem: (fromIndex: number, toIndex: number) => void;
  setMyDaysRouteActive: (v: boolean) => void;
  setDepartureLocation: (loc: DepartureLocation | null) => void;
  setDepartureTime: (time: string) => void;
  setDwellMinutes: (placeId: string, minutes: number) => void;
  clearToGo: () => void;
  clearMyDays: () => void;
  addCustomPlace: (data: { name: string; address?: string; lat?: number; lng?: number }) => string;
  removeCustomPlace: (id: string) => void;
  saveCurrentAsItinerary: (name: string) => void;
  deleteItinerary: (id: string) => void;
  renameItinerary: (id: string, name: string) => void;
  loadItinerary: (itinerary: SavedItinerary) => void;
  startNewItinerary: (placeIds: string[]) => void;
  loadFromSupabase: (data: {
    toGoIds: string[];
    myDaysIds: string[];
    customPlaces: CustomPlace[];
    dwellMinutes: Record<string, number>;
    departureLocation: DepartureLocation | null;
    departureTime: string;
    savedItineraries?: SavedItinerary[];
  }) => void;
  clearAll: () => void;
};

const TripContext = createContext<TripStore | null>(null);

export function TripStoreProvider({ children }: { children: React.ReactNode }) {
  const [toGoIds, setToGoIds] = useState<string[]>([]);
  const [myDaysIds, setMyDaysIds] = useState<string[]>([]);
  const [myDaysRouteActive, setMyDaysRouteActive] = useState(false);
  const [departureLocation, setDepartureLocation] = useState<DepartureLocation | null>(null);
  const [departureTime, setDepartureTime] = useState('09:00');
  const [dwellMinutes, setDwellMinutesState] = useState<Record<string, number>>({});
  const [customPlaces, setCustomPlaces] = useState<CustomPlace[]>([]);
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);

  const setDwellMinutes = useCallback((placeId: string, minutes: number) => {
    setDwellMinutesState(prev => ({ ...prev, [placeId]: minutes }));
  }, []);

  const addToGo = useCallback((ids: string[]) => {
    setToGoIds(prev => {
      const newIds = ids.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  }, []);

  const removeFromToGo = useCallback((id: string) => {
    setToGoIds(prev => prev.filter(i => i !== id));
  }, []);

  const addToMyDays = useCallback((ids: string[]) => {
    setMyDaysIds(prev => {
      const newIds = ids.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  }, []);

  const removeFromMyDays = useCallback((id: string) => {
    setMyDaysIds(prev => prev.filter(i => i !== id));
  }, []);

  const moveMyDayItem = useCallback((fromIndex: number, toIndex: number) => {
    setMyDaysIds(prev => {
      const arr = [...prev];
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
      return arr;
    });
  }, []);

  const clearToGo = useCallback(() => setToGoIds([]), []);
  const clearMyDays = useCallback(() => setMyDaysIds([]), []);

  const addCustomPlace = useCallback((data: { name: string; address?: string; lat?: number; lng?: number }) => {
    const id = `custom_${Date.now()}`;
    setCustomPlaces(prev => [...prev, { id, ...data }]);
    return id;
  }, []);

  const removeCustomPlace = useCallback((id: string) => {
    setCustomPlaces(prev => prev.filter(p => p.id !== id));
    setToGoIds(prev => prev.filter(i => i !== id));
    setMyDaysIds(prev => prev.filter(i => i !== id));
  }, []);

  const saveCurrentAsItinerary = useCallback((name: string) => {
    setSavedItineraries(prev => [
      {
        id: `itin_${Date.now()}`,
        name,
        placeIds: myDaysIds,
        dwellMinutes,
        departureLocation,
        departureTime,
        savedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setMyDaysIds([]);
    setDwellMinutesState({});
    setDepartureLocation(null);
    setDepartureTime('09:00');
  }, [myDaysIds, dwellMinutes, departureLocation, departureTime]);

  const deleteItinerary = useCallback((id: string) => {
    setSavedItineraries(prev => prev.filter(i => i.id !== id));
  }, []);

  const renameItinerary = useCallback((id: string, name: string) => {
    setSavedItineraries(prev => prev.map(i => i.id === id ? { ...i, name } : i));
  }, []);

  const loadItinerary = useCallback((itinerary: SavedItinerary) => {
    setMyDaysIds(itinerary.placeIds);
    setDwellMinutesState(itinerary.dwellMinutes);
    setDepartureLocation(itinerary.departureLocation);
    setDepartureTime(itinerary.departureTime);
  }, []);

  const startNewItinerary = useCallback((placeIds: string[]) => {
    // 작업중인 일정이 있으면 자동 저장
    if (myDaysIds.length > 0) {
      setSavedItineraries(prev => [
        {
          id: `itin_${Date.now()}`,
          name: `일정 ${prev.length + 1}`,
          placeIds: myDaysIds,
          dwellMinutes,
          departureLocation,
          departureTime,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setMyDaysIds(placeIds);
    setDwellMinutesState({});
    setDepartureLocation(null);
    setDepartureTime('09:00');
  }, [myDaysIds, dwellMinutes, departureLocation, departureTime]);

  const loadFromSupabase = useCallback((data: {
    toGoIds: string[];
    myDaysIds: string[];
    customPlaces: CustomPlace[];
    dwellMinutes: Record<string, number>;
    departureLocation: DepartureLocation | null;
    departureTime: string;
    savedItineraries?: SavedItinerary[];
  }) => {
    setToGoIds(data.toGoIds ?? []);
    setMyDaysIds(data.myDaysIds ?? []);
    setCustomPlaces(data.customPlaces ?? []);
    setDwellMinutesState(data.dwellMinutes ?? {});
    setDepartureLocation(data.departureLocation ?? null);
    setDepartureTime(data.departureTime ?? '09:00');
    if (data.savedItineraries) setSavedItineraries(data.savedItineraries);
  }, []);

  const clearAll = useCallback(() => {
    setToGoIds([]);
    setMyDaysIds([]);
    setCustomPlaces([]);
    setDwellMinutesState({});
    setDepartureLocation(null);
    setDepartureTime('09:00');
    setMyDaysRouteActive(false);
    setSavedItineraries([]);
  }, []);

  return (
    <TripContext.Provider
      value={{
        toGoIds, myDaysIds, myDaysRouteActive,
        departureLocation, departureTime, dwellMinutes,
        customPlaces, savedItineraries,
        addToGo, removeFromToGo,
        addToMyDays, removeFromMyDays,
        moveMyDayItem,
        setMyDaysRouteActive,
        setDepartureLocation,
        setDepartureTime,
        setDwellMinutes,
        clearToGo, clearMyDays,
        addCustomPlace, removeCustomPlace,
        saveCurrentAsItinerary, deleteItinerary, renameItinerary, loadItinerary, startNewItinerary,
        loadFromSupabase, clearAll,
      }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripStore() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTripStore must be used within TripStoreProvider');
  return ctx;
}
