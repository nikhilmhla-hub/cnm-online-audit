import type { SupabaseClient } from "@supabase/supabase-js";

type LeadRow = {
  id: string | number;
  queue_number: string | null;
  submission_id?: string | null;
  replayed?: boolean;
};
type Input = Record<string, unknown>;
export type DeliveryDependencies = {
  getDatabase: () => Promise<SupabaseClient>;
  backupUrl?: string;
  fetchBackup?: typeof fetch;
  timeoutMs?: number;
  makeReference?: () => string;
};

function normalizePhone(value: string) {
  let phone = value.replace(/[\s()-]/g, "");
  if (phone.startsWith("+91") && phone.length === 13) phone = phone.slice(3);
  else if (phone.startsWith("91") && phone.length === 12)
    phone = phone.slice(2);
  else if (phone.startsWith("0") && phone.length === 11) phone = phone.slice(1);
  return phone;
}

// A successful HTTP response alone is not proof that the backup accepted a lead.
async function saveBackup(payload: Input, deps: DeliveryDependencies) {
  if (!deps.backupUrl || deps.backupUrl.includes("MOCK_WEB_APP_ID"))
    return false;
  try {
    const response = await (deps.fetchBackup || fetch)(deps.backupUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 8000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result?.status === "success";
  } catch {
    return false;
  }
}

async function savePrimary(
  payload: Input,
  deps: DeliveryDependencies,
): Promise<LeadRow> {
  const db = await deps.getDatabase();
  const signal = AbortSignal.timeout(deps.timeoutMs ?? 8000);
  const phone = payload.phone as string;
  const row = {
    submission_id: payload.submissionId,
    name: payload.name,
    class: payload.class || payload.studentClass || null,
    exam: payload.exam || null,
    overall_score: payload.overallScore ?? payload.overall_score ?? null,
    archetype: payload.archetype || null,
    bottleneck: payload.primaryBottleneck || payload.bottleneck || "None",
    status: payload.status || "Audit Completed",
    source: payload.source,
  };
  const find = async () => {
    const result = await db
      .from("leads")
      .select("id, queue_number, submission_id")
      .eq("phone", phone)
      .limit(1)
      .abortSignal(signal);
    if (result.error) throw result.error;
    return result.data?.[0] as LeadRow | undefined;
  };
  const update = async (existing: LeadRow) => {
    // A retry of the same submission returns the existing receipt without overwriting it.
    if (existing.submission_id === payload.submissionId)
      return { ...existing, replayed: true };
    const result = await db
      .from("leads")
      .update(row)
      .eq("id", existing.id)
      .select("id, queue_number, submission_id")
      .abortSignal(signal);
    if (result.error || !result.data?.[0])
      throw result.error || new Error("Write not confirmed");
    return result.data[0] as LeadRow;
  };
  const existing = await find();
  if (existing) return update(existing);
  const latest = await db
    .from("leads")
    .select("queue_number")
    .not("queue_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .abortSignal(signal);
  if (latest.error) throw latest.error;
  const match = String(latest.data?.[0]?.queue_number || "").match(
    /^CNM(\d+)$/i,
  );
  const queue = `CNM${String(match ? Number(match[1]) + 1 : 1).padStart(3, "0")}`;
  const result = await db
    .from("leads")
    .insert({ ...row, phone, queue_number: queue })
    .select("id, queue_number, submission_id")
    .abortSignal(signal);
  if (result.error) {
    // Only resolve a competing insert for this phone. Do not erase submission IDs on other conflicts.
    if (result.error.code === "23505") {
      const concurrent = await find();
      if (concurrent) return update(concurrent);
    }
    throw result.error;
  }
  if (!result.data?.[0]) throw new Error("Write not confirmed");
  return result.data[0] as LeadRow;
}

export async function deliverEnquiry(
  request: Request,
  deps: DeliveryDependencies,
) {
  let data: Input;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Invalid body");
    data = parsed;
  } catch {
    return Response.json(
      {
        status: "error",
        code: "INVALID_REQUEST",
        message: "Please submit a valid enquiry.",
      },
      { status: 400 },
    );
  }
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const phone =
    typeof data.phone === "string" ? normalizePhone(data.phone) : "";
  const source =
    typeof data.source === "string" && data.source.trim()
      ? data.source.trim().slice(0, 64)
      : "Social Media";
  if (name.length < 2 || name.length > 80 || !/^[6-9]\d{9}$/.test(phone)) {
    return Response.json(
      {
        status: "error",
        code: "INVALID_CONTACT",
        message: "Enter your name and a valid 10-digit Indian mobile number.",
      },
      { status: 400 },
    );
  }
  if (source === "Website Audit" && data.consent !== true) {
    return Response.json(
      {
        status: "error",
        code: "CONSENT_REQUIRED",
        message: "Choose whether to share your enquiry before sending it.",
      },
      { status: 400 },
    );
  }
  const suppliedId = data.submissionId || data.submission_id;
  const reference =
    typeof suppliedId === "string" && /^[a-zA-Z0-9_-]{6,80}$/.test(suppliedId)
      ? suppliedId
      : (deps.makeReference || (() => crypto.randomUUID()))();
  const payload = { ...data, name, phone, source, submissionId: reference };
  let primary: LeadRow | undefined;
  try {
    primary = await savePrimary(payload, deps);
  } catch (error) {
    // Keep logs useful without exposing contact data, URLs or credentials.
    const details =
      error && typeof error === "object"
        ? (error as { name?: string; code?: string; message?: string })
        : {};
    const reason = /fetch failed/i.test(details.message || "")
      ? "UPSTREAM_FETCH_FAILED"
      : details.name === "TimeoutError" || details.name === "AbortError"
        ? "STORAGE_TIMEOUT"
        : "DATABASE_UNCONFIRMED";
    console.error(
      JSON.stringify({
        event: "enquiry_primary_unconfirmed",
        reference,
        reason,
        code:
          typeof details.code === "string" &&
          /^[A-Z0-9_]{1,12}$/.test(details.code)
            ? details.code
            : undefined,
      }),
    );
  }
  // Also try the existing backup when the database is unreachable, not just after a successful write.
  const backupSaved = primary?.replayed
    ? false
    : await saveBackup({ ...payload, leadSaved: "Yes" }, deps);
  if (primary || backupSaved) {
    return Response.json(
      {
        status: "success",
        receiptId: reference,
        storage: primary ? "primary" : "backup",
        leadId: primary?.id,
        queueNumber: primary?.queue_number,
        backupSaved,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    {
      status: "error",
      code: "ENQUIRY_NOT_CONFIRMED",
      reference,
      message:
        "We could not confirm that your enquiry was saved. Keep this reference and contact CNM directly; do not assume a callback is scheduled.",
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "30" },
    },
  );
}
