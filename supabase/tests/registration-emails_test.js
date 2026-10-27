import {
  DeliveryError,
  NotificationEngine,
} from "../functions/registration-emails/engine.js";
import { renderEmail } from "../functions/registration-emails/templates.js";
import { PGlite } from "@electric-sql/pglite";

function assert(condition, message = "Assertion failed") {
  if (!condition) throw new Error(message);
}
const engineConfig = {
  tokenUrl: "https://idm.test/token",
  apiUrl: "https://notify.test/api",
  clientId: "playpadelcoop-api",
  clientSecret: "test-secret",
};
const event = {
  registration_id: "ins-123",
  event_name: "registration_received",
  recipient: "player@example.test",
  idempotency_key: "stable-key",
  payload: { name: '<img src=x onerror="bad">', category: "M2" },
};
const json = (data, status = 200) => Response.json(data, { status });

Deno.test("templates: acknowledgement, waitlist, promotion, confirmation and escaping", () => {
  const config = {
    tornNome: "Clausura",
    tornClube: "<Club>",
    tornTelOrg: "+258 84 123 4567",
  };
  const content = renderEmail(event, config);
  assert(content.subject === "Pré-inscrição recebida — Clausura");
  assert(content.body.includes("pendente de pagamento"));
  assert(content.body.includes("diretamente nas instalações"));
  assert(content.body.includes("PP-123"));
  assert(content.body.includes("&lt;img"));
  assert(!content.body.includes("<img"));
  assert(content.body.includes("&lt;Club&gt;"));
  assert(content.body.includes("https://wa.me/258841234567"));
  const waiting = renderEmail({
    ...event,
    event_name: "registration_waitlisted",
  }, config);
  assert(waiting.body.includes("Não efetues qualquer pagamento"));
  const promoted = renderEmail({
    ...event,
    event_name: "registration_promoted",
  }, config);
  assert(promoted.body.includes("retirou a tua inscrição da lista de espera"));
  const confirmed = renderEmail({
    ...event,
    event_name: "registration_confirmed",
  }, config);
  assert(!confirmed.body.includes("pendente de pagamento"));
});

Deno.test("engine: caches OAuth, exact payload, accepts 202 and stable idempotency", async () => {
  const calls = [];
  const engine = new NotificationEngine(engineConfig, (url, options) => {
    calls.push({ url, options });
    return Promise.resolve(
      url === engineConfig.tokenUrl
        ? json({ access_token: "token", expires_in: 300 })
        : json({ id: "notification-1", status: "PENDING" }, 202),
    );
  });
  const content = renderEmail(event, {});
  assert(await engine.send(event, content) === "notification-1");
  await engine.send(event, content);
  assert(calls.length === 3);
  assert(calls[0].options.body.get("grant_type") === "client_credentials");
  const send = calls[1];
  assert(send.url === "https://notify.test/api/notifications");
  assert(send.options.headers.Authorization === "Bearer token");
  assert(send.options.headers["Idempotency-Key"] === "stable-key");
  const body = JSON.parse(send.options.body);
  assert(
    body.channel === "EMAIL" && body.bodyFormat === "HTML" &&
      body.sensitive === true,
  );
  assert(body.recipient === event.recipient);
  assert(
    body.externalReference === "playpadelcoop:registration_received:ins-123",
  );
  assert(!("client_secret" in body) && !("from" in body));
});

Deno.test("engine: refreshes once on 401 without changing event key", async () => {
  let tokens = 0;
  let sends = 0;
  const engine = new NotificationEngine(engineConfig, (url, options) => {
    if (url === engineConfig.tokenUrl) {
      return Promise.resolve(
        json({ access_token: `token-${++tokens}`, expires_in: 300 }),
      );
    }
    sends++;
    assert(options.headers["Idempotency-Key"] === "stable-key");
    return Promise.resolve(
      sends === 1 ? json({}, 401) : json({ id: "notification" }, 202),
    );
  });
  await engine.send(event, renderEmail(event, {}));
  assert(tokens === 2 && sends === 2);
});

Deno.test("engine: permanent 4xx, transient 5xx and network failures are distinguished", async () => {
  for (
    const [status, retryable] of [[400, false], [401, false], [429, true], [
      503,
      true,
    ]]
  ) {
    const engine = new NotificationEngine(
      engineConfig,
      (url) =>
        Promise.resolve(
          url === engineConfig.tokenUrl
            ? json({ access_token: "t", expires_in: 300 })
            : json({}, status),
        ),
    );
    let caught;
    try {
      await engine.send(event, renderEmail(event, {}));
    } catch (error) {
      caught = error;
    }
    assert(
      caught instanceof DeliveryError && caught.retryable === retryable,
      `HTTP ${status}`,
    );
  }
  const engine = new NotificationEngine(engineConfig, () => {
    throw new Error("private provider response");
  });
  try {
    await engine.token();
    throw new Error("Expected failure");
  } catch (error) {
    assert(error.message === "engine_network_timeout" && error.retryable);
  }
});

Deno.test("engine: expiry margin and asynchronous delivery status", async () => {
  let now = 0;
  let tokens = 0;
  const engine = new NotificationEngine(engineConfig, (url) =>
    Promise.resolve(
      url === engineConfig.tokenUrl
        ? json({ access_token: `token-${++tokens}`, expires_in: 100 })
        : json({ status: "SENT", contentPurged: true }),
    ), () => now);
  await engine.token();
  now = 69000;
  await engine.token();
  assert(tokens === 1);
  now = 70000;
  await engine.token();
  assert(tokens === 2);
  assert((await engine.status("provider-id")).status === "SENT");
});

Deno.test("database: atomic outbox, optional email, pairs, transitions, quotas and private access", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create table public.inscricoes (
        id text primary key, estado text, email text, nome1 text, categoria text
      );
      insert into public.inscricoes values ('existing','nova','before@example.test','Old','M1');
    `);
    const migration = await Deno.readTextFile(
      new URL("../fase6-notificacoes.sql", import.meta.url),
    );
    await db.exec(migration);
    await db.exec(migration);
    const count = async (where = "true") =>
      Number(
        (await db.query(
          `select count(*) as n from public.notification_outbox where ${where}`,
        )).rows[0].n,
      );
    assert(await count() === 0, "No historical backfill");
    await db.exec(`
      insert into public.inscricoes values
        ('ins-no-email','nova',null,'Solo','M1'),
        ('ins-pair-a','nova','a@example.test','A','M2'),
        ('ins-pair-b','nova',null,'B','M2'),
        ('ins-wait','espera','wait@example.test','Wait','F1'),
        ('test-synthetic','nova','test@example.test','Test','M1');
    `);
    assert(await count("status = 'pending'") === 2);
    assert(await count("status = 'skipped_no_email'") === 2);
    assert(await count("registration_id = 'test-synthetic'") === 0);
    await db.exec(
      "update public.inscricoes set estado = 'nova' where id = 'ins-pair-a'",
    );
    assert(
      await count("registration_id = 'ins-pair-a'") === 1,
      "Repeated upsert must not duplicate",
    );
    await db.exec(
      "update public.inscricoes set estado = 'nova' where id = 'ins-wait'",
    );
    await db.exec(
      "update public.inscricoes set estado = 'confirmada' where id = 'ins-wait'",
    );
    assert(
      await count("registration_id = 'ins-wait'") === 3,
      "Waitlist, promoted, confirmed",
    );
    await db.exec(
      "update public.inscricoes set email = 'added@example.test' where id = 'ins-no-email'",
    );
    assert(
      await count("registration_id = 'ins-no-email' and status = 'pending'") ===
        1,
    );
    await db.exec(
      "begin; insert into public.inscricoes values ('rollback','nova','rollback@example.test','R','M1'); rollback;",
    );
    assert(
      await count("registration_id = 'rollback'") === 0,
      "Queue rolls back with registration",
    );
    await db.exec(`
      insert into public.inscricoes
      select 'limit-' || n, 'nova', 'quota@example.test', 'Quota', 'M1'
      from generate_series(1,6) n;
    `);
    assert(
      await count(
        "recipient = 'quota@example.test' and status = 'suppressed'",
      ) === 1,
    );
    const claimed =
      (await db.query("select * from public.claim_registration_emails(3)"))
        .rows;
    assert(
      claimed.length === 3 &&
        claimed.every((row) => row.attempts === 1 && row.lease_id),
    );
    const next =
      (await db.query("select * from public.claim_registration_emails(3)"))
        .rows;
    assert(
      next.every((row) => !claimed.some((previous) => previous.id === row.id)),
    );
    await db.exec(
      `update public.notification_outbox set locked_until = now() - interval '1 minute' where id = '${
        claimed[0].id
      }'`,
    );
    const reclaimed =
      (await db.query("select * from public.claim_registration_emails(5)")).rows
        .find((row) => row.id === claimed[0].id);
    assert(
      reclaimed && reclaimed.idempotency_key === claimed[0].idempotency_key,
    );
    assert(reclaimed.lease_id !== claimed[0].lease_id);
    const grants = (await db.query(`
      select has_table_privilege('anon', 'public.notification_outbox', 'select') as can_read,
      has_function_privilege('anon', 'public.claim_registration_emails(integer)', 'execute') as can_claim
    `)).rows[0];
    assert(!grants.can_read && !grants.can_claim);
  } finally {
    await db.close();
  }
});

Deno.test("worker: private authentication, saved event, delivery polling, retry and stale suppression", async () => {
  const originalFetch = globalThis.fetch;
  const originalServe = Deno.serve;
  const environment = {
    SUPABASE_URL: "https://database.test",
    SUPABASE_SERVICE_ROLE_KEY: "private-service-role",
    NOTIFY_TOKEN_URL: engineConfig.tokenUrl,
    NOTIFY_API_URL: engineConfig.apiUrl,
    NOTIFY_CLIENT_ID: engineConfig.clientId,
    NOTIFY_CLIENT_SECRET: engineConfig.clientSecret,
    NOTIFY_WORKER_SECRET: "a-private-worker-secret-of-at-least-32-characters",
  };
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, Deno.env.get(key)]),
  );
  let handler;
  const patches = [];
  let sends = 0;
  let mode = "success";
  const queued = {
    ...event,
    id: "11111111-1111-4111-8111-111111111111",
    lease_id: "22222222-2222-4222-8222-222222222222",
    attempts: 1,
    payload: { ...event.payload, state: "nova" },
  };
  try {
    for (const [key, value] of Object.entries(environment)) {
      Deno.env.set(key, value);
    }
    globalThis.fetch = async (input, options) => {
      const url = String(input);
      if (url === engineConfig.tokenUrl) {
        return json({ access_token: "oauth-token", expires_in: 300 });
      }
      if (url.startsWith(engineConfig.apiUrl)) {
        assert(options.headers.Authorization === "Bearer oauth-token");
        if (options.method === "GET") return json({ status: "SENT" });
        sends++;
        if (mode === "retry") return json({}, 503);
        assert(options.headers["Idempotency-Key"] === queued.idempotency_key);
        return json({ id: "provider-id", status: "PENDING" }, 202);
      }
      assert(url.startsWith(environment.SUPABASE_URL));
      assert(options.headers.Authorization === "Bearer private-service-role");
      if (options.method === "PATCH") {
        patches.push(JSON.parse(options.body));
        return json([{ id: queued.id }]);
      }
      if (url.includes("/config?")) {
        return json([{ key: "tornNome", value: "Clausura" }]);
      }
      if (url.endsWith("/rpc/claim_registration_emails")) return json([queued]);
      if (url.includes("/inscricoes?")) {
        return json([{
          estado: mode === "stale" ? "cancelada" : "nova",
          email: queued.recipient,
        }]);
      }
      if (url.includes("/notification_outbox?")) {
        return json(
          mode === "success" ? [{ ...queued, provider_id: "provider-id" }] : [],
        );
      }
      throw new Error("Unexpected request " + url);
    };
    Deno.serve = (callback) => {
      handler = callback;
    };
    await import("../functions/registration-emails/index.ts");
    const request = (authorized = true) =>
      new Request("https://worker.test", {
        method: "POST",
        headers: authorized
          ? { Authorization: `Bearer ${environment.NOTIFY_WORKER_SECRET}` }
          : {},
      });
    assert((await handler(request(false))).status === 401);
    assert((await handler(new Request("https://worker.test"))).status === 405);
    assert(sends === 0);
    let response = await handler(request());
    assert(response.status === 200 && (await response.json()).processed === 1);
    assert(
      patches.some((patch) =>
        patch.status === "accepted" && patch.provider_id === "provider-id"
      ),
    );
    assert(patches.some((patch) => patch.status === "delivered"));
    assert(patches[0].rendered_content && !("lease_id" in patches[0]));
    mode = "retry";
    response = await handler(request());
    await response.body?.cancel();
    assert(response.status === 200);
    assert(
      patches.at(-1).status === "pending" &&
        patches.at(-1).last_error === "engine_http_503",
    );
    queued.attempts = 6;
    response = await handler(request());
    await response.body?.cancel();
    assert(response.status === 200 && patches.at(-1).status === "failed");
    queued.attempts = 1;
    const priorSends = sends;
    mode = "stale";
    response = await handler(request());
    await response.body?.cancel();
    assert(response.status === 200 && sends === priorSends);
    assert(patches.at(-1).status === "skipped_stale");
  } finally {
    globalThis.fetch = originalFetch;
    Deno.serve = originalServe;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
