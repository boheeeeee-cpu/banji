import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' && { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export type UserTrip = {
  user_id: string;
  to_go_ids: string[];
  my_days_ids: string[];
  custom_places: Array<{ id: string; name: string; address?: string; lat?: number; lng?: number }>;
  dwell_minutes: Record<string, number>;
  departure_location: { label: string; lat: number; lng: number } | null;
  departure_time: string;
  updated_at: string;
};
