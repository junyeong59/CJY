import { BANK_TRANSFER_CONSENT_VERSION, isBankTransferPolicy } from "./bank_transfer.ts";
export type Config = {
  origin: string;
  environment: string;
};
export class Fault extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function price(plan: string, quantity: number = 1) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 30) throw new Fault(400, "quantity");
  const itemSupply =
    ({ Standard: 4900, Deluxe: 9900, Premium: 34900 } as Record<
      string,
      number
    >)[plan];
  if (!Number.isSafeInteger(itemSupply)) throw new Fault(400, "plan");
  const supply = itemSupply * quantity;
  return supply + Math.round(supply * 10 / 100);
}
function validateForm(b: any, allowCinematic = false) {
  const f: any = {};
  for (
    const k of [
      "customerName",
      "customerPhone",
      "service",
      "plan",
      "autoPost",
      "existingAccount",
      "brief",
      "channel",
    ]
  ) {
    if (typeof b[k] !== "string") throw new Fault(400, "form");
    f[k] = b[k].trim();
  }
  if (
    !f.customerName || new TextEncoder().encode(f.customerName).length > 30 ||
    !/^\+?[\d ()-]{7,30}$/.test(f.customerPhone) ||
    f.customerPhone.replace(/\D/g, "").length < 7 ||
    f.customerPhone.replace(/\D/g, "").length > 15 || !f.brief ||
    f.brief.length > 10000 || !(f.service === "reels" || (allowCinematic && f.service === "cinematic")) ||
    !["yes", "no"].includes(f.autoPost) ||
    !["yes", "no"].includes(f.existingAccount) ||
    !["manual", "discord", "telegram", "gmail"].includes(f.channel)
  ) throw new Fault(400, "form");
  if (f.autoPost === "no") f.existingAccount = "no";
  // Missing quantity remains absent for byte-exact legacy snapshot replay.
  // New browser requests always carry a numeric item count.
  if (b.quantity !== undefined) f.quantity = b.quantity;
  if (f.service === "cinematic") {
    if (f.plan !== "Cinematic" || f.quantity !== 1 || f.autoPost !== "no" || f.existingAccount !== "no" || f.channel !== "manual") throw new Fault(400, "cinematic_form");
  } else price(f.plan, f.quantity);
  return f;
}
function validateDraftConsent(b: any) {
  const c = b.draftConsent;
  if (c?.version !== "cjy-draft-2026-10-02" || c.privacy !== true) throw new Fault(400, "consent");
  return c;
}
async function command(
  d: Dependencies,
  u: string,
  action: string,
  id: string,
  form: unknown,
  policy: unknown,
  consent: unknown,
  amount: number,
) {
  const { data, error } = await d.db.rpc("cjy_application_command", {
    p_user: u,
    p_action: action,
    p_draft: id,
    p_form: form,
    p_policy: policy,
    p_consent: consent,
    p_amount: amount,
    p_env: d.config.environment,
    p_store: "",
    p_channel: "",
  });
  if (error) {
    throw new Fault(
      error.code === "42501" ? 404 : error.code === "23514" ? 409 : 503,
      "database",
    );
  }
  return data;
}
function dto(a: any): any {
  const o = a.order;
  const bank = o?.provider === "bank_transfer";
  return {
    draftId: a.request_key,
    receipt: a.id,
    application: a.current_snapshot,
    plan: a.plan,
    ...(a.created_at ? { createdAt: a.created_at } : {}),
    ...(a.updated_at ? { updatedAt: a.updated_at } : {}),
    environment: bank ? "live" : "test",
    status: bank && o.status === "pending" ? "bank-transfer-ready" : "pending-review",
    ...(bank ? {paymentMethod: "bank_transfer", bankTransfer: o.bank_transfer_details} : {}),
    state: o
      ? (o.status === "pending" ? "pending_payment" :
        o.status === "paid" && (a.refundedAmount ?? 0) > 0
        ? (a.refundedAmount >= o.amount ? "refunded" : "partially_refunded")
        : o.status)
      : a.status === "draft"
      ? "saved"
      : "submitted",
    editable: !o && !(a.service === "cinematic" && a.status === "submitted"),
    ...(a.retryOriginal ? { retryOriginal: dto(a.retryOriginal) } : {}),
    ...(o
      ? {
        orderId: o.id,
        // Bank exposes raw deposit-aware 1..4; legacy PG remains display-only 1..3.
        orderProgressStage: (bank ? [1, 2, 3, 4] : [1, 2, 3]).includes(o.order_progress_stage)
          ? o.order_progress_stage : 1,
        ...(bank ? {} : {paymentId: a.paymentId}),
        totalAmount: o.amount,
        currency: "KRW",
        refundedAmount: a.refundedAmount ?? 0,
        ...(o.paid_at ? { paidAt: o.paid_at } : {}),
        ...(o.verified_at ? { verifiedAt: o.verified_at } : {}),
      }
      : {}),
  };
}
export type Dependencies = {
  config: Config;
  auth: any;
  db: any;
};
export function createApi(d: Dependencies) {
  return async (req: Request) => {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": d.config.origin,
      "Vary": "Origin",
      "Access-Control-Allow-Headers": "authorization,apikey,content-type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    };
    const reply = (x: unknown, status = 200) =>
      new Response(JSON.stringify(x), { status, headers });
    if (
      req.headers.get("Origin") && req.headers.get("Origin") !== d.config.origin
    ) return reply({ error: "origin" }, 403);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    const token = req.headers.get("Authorization")?.match(/^Bearer (\S+)$/)
      ?.[1];
    if (new URL(req.url).pathname.endsWith("/health")) {
      return reply({
        environment: d.config.environment,
        auth: "supabase-getUser",
        paymentMethod: "bank_transfer",
        bankEnvironment: "LIVE",
        configured: /^https:\/\/[^/]+$/.test(d.config.origin) &&
          Object.values((d.config as any).presence ?? {}).every(Boolean),
        ...((d.config as any).presence
          ? { presence: (d.config as any).presence }
          : {}),
      });
    }
    if (!token) return reply({ error: "unauthorized" }, 401);
    const { data, error } = await d.auth.getUser(token);
    if (error || !data?.user?.id) return reply({ error: "unauthorized" }, 401);
    if (req.method !== "POST") return reply({ error: "method" }, 405);
    try {
      const action = new URL(req.url).pathname.split("/").pop()!;
      if (
        !/^https:\/\/[^/]+$/.test(d.config.origin) ||
        Object.entries((d.config as any).presence ?? {}).some(([key, value]) => ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SITE_ORIGIN"].includes(key) && !value)
      ) throw new Fault(503, "configuration");
      if (["submit", "revise", "open", "reopen", "retry-edit"].includes(action)) {
        throw new Fault(410, "payment_retired");
      }
      let b;
      try {
        b = await req.json();
      } catch {
        throw new Fault(400, "body");
      }
      if (!b || typeof b !== "object" || Array.isArray(b)) {
        throw new Fault(400, "body");
      }
      if (action === "new") {
        return reply({
          draftId: crypto.randomUUID(),
          editable: true,
          environment: "test",
        });
      }
      if (action === "cinematic-submit" || (action === "save" && b.service === "cinematic")) {
        if (!UUID.test(b.draftId ?? "")) throw new Fault(400, "draftId");
        const form = validateForm(b, true);
        if (form.service !== "cinematic") throw new Fault(400, "cinematic_form");
        if (!isBankTransferPolicy(b.policyEvidence)) throw new Fault(400, "policy");
        const consent = action === "save" ? validateDraftConsent(b) : b.consentBundle;
        if (action !== "save" && (consent?.version !== "cjy-cinematic-2026-10-25" || consent.termsRefund !== true || consent.privacy !== true)) throw new Fault(400, "consent");
        const { data: a, error } = await d.db.rpc("cjy_cinematic_application", {
          p_user: data.user.id, p_action: action === "save" ? "save" : "submit", p_draft: b.draftId,
          p_form: form, p_policy: b.policyEvidence, p_consent: consent,
        });
        if (error) throw new Fault(error.code === "42501" ? 404 : error.code === "23514" ? 409 : 503, "database");
        return reply(dto(a));
      }
      if (action === "bank-transfer") {
        if (!UUID.test(b.draftId ?? "")) throw new Fault(400, "draftId");
        const form = validateForm(b);
        if (!isBankTransferPolicy(b.policyEvidence)) throw new Fault(400, "policy");
        const consent = b.consentBundle;
        if (consent?.version !== BANK_TRANSFER_CONSENT_VERSION || consent.termsRefund !== true || consent.privacy !== true) throw new Fault(400, "consent");
        const {data: a, error} = await d.db.rpc("cjy_bank_transfer_order", {p_user:data.user.id,p_draft:b.draftId,p_form:form,p_policy:b.policyEvidence,p_consent:consent});
        if (error) throw new Fault(error.code === "42501" ? 404 : error.code === "23514" ? 409 : 503, "database");
        return reply(dto(a));
      }
      const writes = action === "save";
      if (
        !writes &&
        ![
          "application",
          "verify",
          "status",
          "orders",
        ].includes(action)
      ) throw new Fault(404, "route");
      if (action === "orders" || action === "status") {
        const { data: rows, error } = await d.db.rpc("cjy_list_applications", {
          p_user: data.user.id,
          p_limit: action === "status" ? 1 : 100,
        });
        if (error) throw new Fault(503, "database");
        const all = rows.map(dto);
        return reply(
          action === "orders"
            ? { orders: all, draftId: all[0]?.draftId }
            : all[0] ??
              {
                draftId: crypto.randomUUID(),
                editable: true,
                environment: "test",
              },
        );
      }
      if (!UUID.test(b.draftId ?? "")) throw new Fault(400, "draftId");
      let form = {}, consent = {}, policy = {};
      if (writes) {
        form = validateForm(b);
        if (!isBankTransferPolicy(b.policyEvidence)) throw new Fault(400, "policy");
        policy = b.policyEvidence;
        consent = validateDraftConsent(b);
      }
      const a = await command(
        d,
        data.user.id,
        writes ? action : "get",
        b.draftId,
        form,
        policy,
        consent,
        writes ? price((form as any).plan, (form as any).quantity) : 0,
      );
      if (!a) throw new Fault(404, "application");
      if (action === "verify" && a.order && a.order.provider !== "bank_transfer") {
        throw new Fault(410, "payment_retired");
      }
      return reply(dto(a)); // Owned reads preserve bank and historical PG evidence; never reconcile.
    } catch (e) {
      return reply(
        { error: e instanceof Fault ? e.message : "unavailable" },
        e instanceof Fault ? e.status : 503,
      );
    }
  };
}
