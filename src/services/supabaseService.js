/**
 * Supabase Cloud Storage & Database Service for Paramara Studio
 * Long-term persistent storage for Shopee Live screenshots and session records.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Upload a screenshot file to Supabase Storage Bucket 'shopee-screenshots'
 */
export async function uploadScreenshotToSupabase(file) {
  if (!supabase) return null;

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `shopee_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `screenshots/${fileName}`;

    const { data, error } = await supabase.storage
      .from('shopee-screenshots')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.warn("Supabase Storage Upload Warning:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('shopee-screenshots')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn("Supabase Storage Upload Exception:", err.message);
    return null;
  }
}

/**
 * Save a Shopee Live session record into Supabase Database 'shopee_sessions'
 */
export async function saveSessionToSupabase(sessionRecord) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('shopee_sessions')
      .insert([sessionRecord])
      .select();

    if (error) {
      console.warn("Supabase DB Insert Warning:", error.message);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.warn("Supabase DB Exception:", err.message);
    return null;
  }
}

/**
 * Fetch all sessions from Supabase Database
 */
export async function fetchSessionsFromSupabase() {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('shopee_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Supabase DB Fetch Warning:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn("Supabase DB Fetch Exception:", err.message);
    return null;
  }
}

/**
 * Save full studioData state to Supabase table 'studio_data'
 */
export async function saveStudioDataToSupabase(studioData) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('studio_data')
      .upsert([
        { 
          id: 'paramara_main', 
          payload: studioData,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    if (error) {
      console.warn("Supabase Save Studio Data Warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase Save Exception:", err.message);
    return false;
  }
}

/**
 * Load full studioData state from Supabase table 'studio_data'
 */
export async function loadStudioDataFromSupabase() {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('studio_data')
      .select('payload')
      .eq('id', 'paramara_main')
      .maybeSingle();

    if (error) {
      console.warn("Supabase Load Studio Data Warning:", error.message);
      return null;
    }

    return data?.payload || null;
  } catch (err) {
    console.warn("Supabase Load Exception:", err.message);
    return null;
  }
}

/**
 * Subscribe to real-time changes on Supabase table 'studio_data'
 */
export function subscribeToStudioDataSupabase(callback) {
  if (!supabase) return null;

  try {
    const channel = supabase
      .channel('public:studio_data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_data', filter: 'id=eq.paramara_main' }, (payload) => {
        if (payload.new && payload.new.payload) {
          callback(payload.new.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn("Supabase Realtime Subscribe Exception:", err.message);
    return null;
  }
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== "");

