import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useTripStore } from '@/store/trip-store';

export default function SupabaseSyncBridge() {
  const { user } = useAuthStore();
  const {
    toGoIds, myDaysIds, customPlaces, dwellMinutes,
    departureLocation, departureTime,
    loadFromSupabase,
  } = useTripStore();

  const loadedRef = useRef(false);
  const syncingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load from Supabase when user logs in; clear on logout
  useEffect(() => {
    if (!user) {
      loadedRef.current = false;
      // clearAll 하지 않음 — 로그아웃 후에도 로컬 데이터 유지
      return;
    }

    syncingRef.current = true;
    supabase
      .from('user_trips')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // 서버에 데이터 있으면 서버 데이터로 덮어씀
          loadFromSupabase({
            toGoIds: data.to_go_ids ?? [],
            myDaysIds: data.my_days_ids ?? [],
            customPlaces: data.custom_places ?? [],
            dwellMinutes: data.dwell_minutes ?? {},
            departureLocation: data.departure_location ?? null,
            departureTime: data.departure_time ?? '09:00',
          });
        }
        // 서버에 데이터 없으면 (첫 로그인) 현재 로컬 데이터를 그대로 유지
        // → 이후 auto-save가 로컬 데이터를 서버에 올려줌
        setTimeout(() => {
          syncingRef.current = false;
          loadedRef.current = true;
        }, 500);
      });
  }, [user?.id]);

  // Auto-save on any change (debounced 2s)
  useEffect(() => {
    if (!user || !loadedRef.current || syncingRef.current) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      supabase.from('user_trips').upsert({
        user_id: user.id,
        to_go_ids: toGoIds,
        my_days_ids: myDaysIds,
        custom_places: customPlaces,
        dwell_minutes: dwellMinutes,
        departure_location: departureLocation,
        departure_time: departureTime,
        updated_at: new Date().toISOString(),
      });
    }, 2000);

    return () => clearTimeout(saveTimerRef.current);
  }, [user?.id, toGoIds, myDaysIds, customPlaces, dwellMinutes, departureLocation, departureTime]);

  return null;
}
