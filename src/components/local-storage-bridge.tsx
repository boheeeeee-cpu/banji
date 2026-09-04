import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTripStore } from '@/store/trip-store';

const KEY = '@banji/trip';

export default function LocalStorageBridge() {
  const {
    toGoIds, myDaysIds, customPlaces, dwellMinutes,
    departureLocation, departureTime, savedItineraries,
    loadFromSupabase,
  } = useTripStore();

  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // 앱 시작 시 로컬 스토리지에서 불러오기
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(json => {
      if (json) {
        try {
          const data = JSON.parse(json);
          loadFromSupabase({
            toGoIds: data.toGoIds ?? [],
            myDaysIds: data.myDaysIds ?? [],
            customPlaces: data.customPlaces ?? [],
            dwellMinutes: data.dwellMinutes ?? {},
            departureLocation: data.departureLocation ?? null,
            departureTime: data.departureTime ?? '09:00',
            savedItineraries: data.savedItineraries ?? [],
          });
        } catch {}
      }
      setTimeout(() => { loadedRef.current = true; }, 300);
    });
  }, []);

  // 상태 변경 시 로컬 저장 (1초 디바운스)
  useEffect(() => {
    if (!loadedRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify({
        toGoIds, myDaysIds, customPlaces, dwellMinutes,
        departureLocation, departureTime, savedItineraries,
      }));
    }, 1000);
    return () => clearTimeout(timerRef.current);
  }, [toGoIds, myDaysIds, customPlaces, dwellMinutes, departureLocation, departureTime, savedItineraries]);

  return null;
}
