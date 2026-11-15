import { useEffect, useRef } from 'react';
import { localStorageReady } from '@/components/local-storage-bridge';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { type CustomPlace, type SavedItinerary, useTripStore } from '@/store/trip-store';

/** user_trips 표에 saved_itineraries 칸이 없으면 false로 바뀌고, 그 뒤로는 그 칸 없이 저장 */
let savedItinerariesColumnAvailable = true;

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST204' || /saved_itineraries/.test(error.message ?? '');
}

function unionIds(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

function unionById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const seen = new Set(a.map(x => x.id));
  return [...a, ...b.filter(x => !seen.has(x.id))];
}

export default function SupabaseSyncBridge() {
  const { user } = useAuthStore();
  const store = useTripStore();
  const {
    toGoIds, myDaysIds, customPlaces, dwellMinutes,
    departureLocation, departureTime, savedItineraries,
    loadFromSupabase,
  } = store;

  // 비동기 응답이 왔을 때 그 시점의 기기 데이터를 읽기 위해 최신 값을 ref에 둠
  const latestRef = useRef(store);
  latestRef.current = store;

  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const upsert = async (userId: string, data: {
    toGoIds: string[]; myDaysIds: string[]; customPlaces: CustomPlace[];
    dwellMinutes: Record<string, number>; departureLocation: typeof departureLocation;
    departureTime: string; savedItineraries: SavedItinerary[];
  }) => {
    const row: Record<string, unknown> = {
      user_id: userId,
      to_go_ids: data.toGoIds,
      my_days_ids: data.myDaysIds,
      custom_places: data.customPlaces,
      dwell_minutes: data.dwellMinutes,
      departure_location: data.departureLocation,
      departure_time: data.departureTime,
      updated_at: new Date().toISOString(),
    };
    if (savedItinerariesColumnAvailable) row.saved_itineraries = data.savedItineraries;

    const { error } = await supabase.from('user_trips').upsert(row);
    if (error && savedItinerariesColumnAvailable && isMissingColumnError(error)) {
      // 아직 Supabase에 칸을 안 만든 경우: 칸 없이 다시 저장
      savedItinerariesColumnAvailable = false;
      delete row.saved_itineraries;
      await supabase.from('user_trips').upsert(row);
    }
  };

  // 로그인하면 계정 데이터와 기기 데이터를 합침. 로그아웃해도 기기 데이터는 그대로 둠
  useEffect(() => {
    if (!user) {
      loadedRef.current = false;
      return;
    }

    let cancelled = false;
    supabase
      .from('user_trips')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        // 기기 저장소를 다 읽기 전에 합치면 기기 데이터가 빠지므로 기다림
        await localStorageReady;
        if (cancelled) return;
        const local = latestRef.current;

        const merged = {
          // 찜·직접 추가한 장소·저장된 일정: 양쪽 다 남김 (중복 제거)
          toGoIds: unionIds(data?.to_go_ids ?? [], local.toGoIds),
          customPlaces: unionById<CustomPlace>(data?.custom_places ?? [], local.customPlaces),
          savedItineraries: unionById<SavedItinerary>(data?.saved_itineraries ?? [], local.savedItineraries),
          // 작업 중인 일정: 계정 쪽을 쓰고, 계정에 없으면 기기 쪽
          myDaysIds: (data?.my_days_ids?.length ?? 0) > 0 ? data!.my_days_ids : local.myDaysIds,
          dwellMinutes: { ...local.dwellMinutes, ...(data?.dwell_minutes ?? {}) },
          departureLocation: data?.departure_location ?? local.departureLocation,
          departureTime: data?.departure_time ?? local.departureTime,
        };

        loadFromSupabase(merged);
        await upsert(user.id, merged);
        if (!cancelled) loadedRef.current = true;
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 바뀔 때마다 계정에 저장 (2초 모아서)
  useEffect(() => {
    if (!user || !loadedRef.current) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      upsert(user.id, {
        toGoIds, myDaysIds, customPlaces, dwellMinutes,
        departureLocation, departureTime, savedItineraries,
      });
    }, 2000);

    return () => clearTimeout(saveTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, toGoIds, myDaysIds, customPlaces, dwellMinutes, departureLocation, departureTime, savedItineraries]);

  return null;
}
