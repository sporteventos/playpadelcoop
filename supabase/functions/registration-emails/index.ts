import { DeliveryError, NotificationEngine } from "./engine.js";
import { renderEmail } from "./templates.js";

type Event = {
  id: string;
  registration_id: string;
  event_name: string;
  recipient: string | null;
  payload: { name: string; category: string; state: string };
  idempotency_key: string;
  attempts: number;
  lease_id: string;
  provider_id?: string;
  accepted_at?: string;
  rendered_content?: { subject: string; body: string };
};

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name}`);
  return value;
}

async function sameSecret(actual: string, expected: string): Promise<boolean> {
  const encode = new TextEncoder();
  const [a, b] = await Promise.all(
    [actual, expected].map(async (value) =>
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", encode.encode(value)),
      )
    ),
  );
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

async function db(path: string, options: RequestInit = {}) {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(required("SUPABASE_URL") + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`database_http_${response.status}`);
  return await response.json();
}

async function updateEvent(
  event: Event,
  patch: Record<string, unknown>,
  leased = true,
  releaseLease = true,
) {
  const filter = leased
    ? `&status=eq.processing&lease_id=eq.${encodeURIComponent(event.lease_id)}`
    : "&status=eq.accepted";
  const rows = await db(`notification_outbox?id=eq.${event.id}${filter}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...patch,
      ...(leased && releaseLease ? { locked_until: null, lease_id: null } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!rows.length) throw new Error("outbox_lease_lost");
}

let engine: NotificationEngine | undefined;
function getEngine() {
  if (!engine) {
    const tokenUrl = required("NOTIFY_TOKEN_URL");
    const apiUrl = required("NOTIFY_API_URL");
    if (!tokenUrl.startsWith("https://") || !apiUrl.startsWith("https://")) {
      throw new Error("notification_urls_require_https");
    }
    engine = new NotificationEngine({
      tokenUrl,
      apiUrl,
      clientId: required("NOTIFY_CLIENT_ID"),
      clientSecret: required("NOTIFY_CLIENT_SECRET"),
    });
  }
  return engine;
}

async function processEvent(event: Event, config: Record<string, string>) {
  const registrations = await db(
    `inscricoes?select=estado,email&id=eq.${
      encodeURIComponent(event.registration_id)
    }`,
  );
  const registration = registrations[0];
  if (
    !registration || registration.estado !== event.payload.state ||
    (registration.email || "").trim().toLowerCase() !== event.recipient
  ) {
    await updateEvent(event, {
      status: "skipped_stale",
      last_error: "registration_changed",
    });
    return;
  }
  if (!event.recipient) {
    await updateEvent(event, { status: "skipped_no_email" });
    return;
  }
  try {
    const content = event.rendered_content || renderEmail(event, config);
    if (!event.rendered_content) {
      await updateEvent(event, { rendered_content: content }, true, false);
    }
    const providerId = await getEngine().send(event, content);
    await updateEvent(event, {
      status: "accepted",
      provider_id: providerId,
      accepted_at: new Date().toISOString(),
      last_error: null,
    });
  } catch (error) {
    if (!(error instanceof DeliveryError)) throw error;
    const retry = error.retryable && event.attempts < 6;
    await updateEvent(event, {
      status: retry ? "pending" : "failed",
      last_error: error.message,
      next_attempt_at: new Date(
        Date.now() + Math.min(3600, 60 * 2 ** (event.attempts - 1)) * 1000,
      ).toISOString(),
    });
  }
}

async function checkAccepted() {
  const events: Event[] = await db(
    "notification_outbox?select=*&status=eq.accepted&order=checked_at.asc.nullsfirst&limit=5",
  );
  for (const event of events) {
    try {
      if (!event.provider_id) throw new Error("accepted_without_provider_id");
      const provider = await getEngine().status(event.provider_id);
      const status = provider.status === "SENT"
        ? "delivered"
        : provider.status === "FAILED"
        ? "failed"
        : "accepted";
      await updateEvent(event, {
        status,
        ...(status === "delivered" ? { rendered_content: null } : {}),
        checked_at: new Date().toISOString(),
        // Não persistir lastErrorMessage do fornecedor: pode conter conteúdo sensível.
        last_error: status === "failed" ? "provider_delivery_failed" : null,
      }, false);
    } catch (error) {
      if (!(error instanceof DeliveryError)) throw error;
      await updateEvent(event, {
        checked_at: new Date().toISOString(),
        last_error: error.message,
      }, false);
    }
  }
  return events.length;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    const secret = required("NOTIFY_WORKER_SECRET");
    if (secret.length < 32) throw new Error("worker_secret_too_short");
    if (
      !await sameSecret(
        request.headers.get("Authorization") || "",
        `Bearer ${secret}`,
      )
    ) {
      return new Response(null, { status: 401 });
    }
    getEngine();
    const rows = await db(
      "config?select=key,value&key=in.(tornNome,tornClube,tornTelOrg,tornDatas,tornLocal)",
    );
    const config = Object.fromEntries(
      rows.map((row: { key: string; value: string }) => [row.key, row.value]),
    );
    const events: Event[] = await db("rpc/claim_registration_emails", {
      method: "POST",
      body: JSON.stringify({ batch_size: 3 }),
    });
    for (const event of events) await processEvent(event, config);
    const checked = await checkAccepted();
    return Response.json({ processed: events.length, checked });
  } catch (error) {
    // Os erros da aplicação são códigos, nunca respostas OAuth ou dados do jogador.
    console.error(
      "registration-emails:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return Response.json({ error: "notification_worker_failed" }, {
      status: 500,
    });
  }
});
