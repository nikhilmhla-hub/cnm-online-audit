import { deliverEnquiry } from "@/lib/enquiry-delivery";

export const maxDuration = 30;
export async function POST(request: Request) {
  return deliverEnquiry(request, {
    // Lazy initialization lets validation and the existing backup work when DB configuration fails.
    getDatabase: async () => (await import("@/lib/supabase")).supabase,
    backupUrl: process.env.SHEET_WEBHOOK_URL,
  });
}
