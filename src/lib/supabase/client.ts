import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function getRadarCoreClient() {
  return createSupabaseBrowserClient().schema("radar_core");
}

export function getB2BClient() {
  return createSupabaseBrowserClient().schema("b2b_enterprise");
}

export function getCommunityClient() {
  return createSupabaseBrowserClient().schema("community_consumer");
}
