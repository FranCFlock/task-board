import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Anthropic SDK is replaced by a stub: tests never reach the network or spend credit.
const { create, clientOptions, MockAPIError, MockTimeoutError, MockAuthError } = vi.hoisted(() => {
  class MockAPIError extends Error {
    status = 500;
  }
  class MockTimeoutError extends MockAPIError {}
  class MockAuthError extends MockAPIError {
    status = 401;
  }
  return { create: vi.fn(), clientOptions: [] as unknown[], MockAPIError, MockTimeoutError, MockAuthError };
});

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    static APIError = MockAPIError;
    static APIConnectionTimeoutError = MockTimeoutError;
    static AuthenticationError = MockAuthError;
    beta = { messages: { create } };
    constructor(options: unknown) {
      clientOptions.push(options);
    }
  }
  return { default: Anthropic };
});

type RouteModule = typeof import("./route");
interface ReportBody {
  markdown: string;
  source: "ai" | "template";
  limited?: boolean;
  error?: string;
}

const aiReply = (text = "# Reporte IA\n\nContenido generado") => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text }],
});

/** Fresh module per test: the rate limiter lives at module level and reads its env vars on load. */
async function loadRoute(): Promise<RouteModule["POST"]> {
  vi.resetModules();
  return (await import("./route")).POST;
}

const request = (body?: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/report", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const call = async (POST: RouteModule["POST"], req: Request) => {
  const res = await POST(req);
  return { status: res.status, body: (await res.json()) as ReportBody };
};

const validTask = (o: Record<string, unknown> = {}) => ({
  id: "t-1",
  title: "Tarea especial",
  owner: "Moe Szyslak",
  status: "blocked",
  priority: "high",
  dueDate: "2026-01-01",
  milestoneId: "m1",
  blockedReason: "Falta la aprobación",
  ...o,
});

beforeEach(() => {
  create.mockReset();
  clientOptions.length = 0;
  for (const name of ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "REPORT_AI_LIMIT_PER_IP", "REPORT_AI_LIMIT_GLOBAL"]) {
    delete process.env[name];
  }
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/report without an API key", () => {
  it("returns the template report and never calls the AI", async () => {
    const POST = await loadRoute();
    const { status, body } = await call(POST, request({}));
    expect(status).toBe(200);
    expect(body.source).toBe("template");
    expect(body.limited).toBeUndefined();
    expect(body.markdown.startsWith("# Status report — Migración del portal de clientes")).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("works with an empty body or a body that is not JSON (demo tasks are used)", async () => {
    const POST = await loadRoute();
    for (const req of [request(), request("{no es json")]) {
      const { status, body } = await call(POST, req);
      expect(status).toBe(200);
      expect(body.markdown).toContain("Home del cliente (front)"); // a task that only exists in the demo data
    }
  });

  it("builds the report from the tasks sent by the browser", async () => {
    const POST = await loadRoute();
    const { body } = await call(POST, request({ tasks: [validTask()] }));
    expect(body.markdown).toContain("Tarea especial");
    expect(body.markdown).toContain("Falta la aprobación");
    expect(body.markdown).not.toContain("Home del cliente (front)"); // the demo tasks are replaced, not merged
  });

  it("is never rate limited, since it costs nothing", async () => {
    const POST = await loadRoute();
    for (let i = 0; i < 12; i++) {
      const { body } = await call(POST, request({}, { "x-forwarded-for": "203.0.113.9" }));
      expect(body.limited).toBeUndefined();
    }
  });
});

describe("POST /api/report with an API key", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    create.mockResolvedValue(aiReply());
  });

  it("returns the AI report", async () => {
    const POST = await loadRoute();
    const { status, body } = await call(POST, request({}));
    expect(status).toBe(200);
    expect(body).toEqual({ markdown: "# Reporte IA\n\nContenido generado", source: "ai" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("creates the client with the key, a 15 s timeout and no automatic retries", async () => {
    const POST = await loadRoute();
    await call(POST, request({}));
    expect(clientOptions).toEqual([{ apiKey: "sk-test-key", timeout: 15_000, maxRetries: 0 }]);
  });

  it("uses claude-sonnet-5-5 by default and ANTHROPIC_MODEL when set", async () => {
    let POST = await loadRoute();
    await call(POST, request({}));
    expect(create.mock.calls[0][0].model).toBe("claude-sonnet-5-5");

    vi.stubEnv("ANTHROPIC_MODEL", "claude-opus-5-5");
    POST = await loadRoute();
    await call(POST, request({}));
    expect(create.mock.calls[1][0].model).toBe("claude-opus-5-5");
  });

  it("sends the structured summary of the project, including the edited tasks", async () => {
    const POST = await loadRoute();
    await call(POST, request({ tasks: [validTask()] }));
    const args = create.mock.calls[0][0];
    expect(typeof args.system).toBe("string");
    const prompt = args.messages[0].content as string;
    expect(prompt).toContain("Migración del portal de clientes");
    expect(prompt).toContain("Tarea especial");
  });

  it.each([
    ["an authentication error", () => Promise.reject(new MockAuthError("bad key"))],
    ["a timeout", () => Promise.reject(new MockTimeoutError("timeout"))],
    ["an API error", () => Promise.reject(new MockAPIError("overloaded"))],
    ["an unexpected error", () => Promise.reject(new Error("boom"))],
    ["a refusal", () => Promise.resolve({ stop_reason: "refusal", content: [] })],
    ["a truncated answer", () => Promise.resolve({ ...aiReply(), stop_reason: "max_tokens" })],
    ["an empty answer", () => Promise.resolve(aiReply("   "))],
    ["an answer without text", () => Promise.resolve({ stop_reason: "end_turn", content: [{ type: "thinking" }] })],
  ])("falls back to the template after %s", async (_label, outcome) => {
    create.mockImplementation(outcome);
    const POST = await loadRoute();
    const { status, body } = await call(POST, request({}));
    expect(status).toBe(200);
    expect(body.source).toBe("template");
    expect(body.limited).toBeUndefined();
    expect(body.markdown).toContain("## 1. Estado general");
  });
});

describe("POST /api/report usage limit", () => {
  const FROM = (ip: string) => ({ "x-forwarded-for": ip });

  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    create.mockResolvedValue(aiReply());
  });

  it("switches to the template, flagged as limited, once an IP exceeds its quota", async () => {
    vi.stubEnv("REPORT_AI_LIMIT_PER_IP", "2");
    const POST = await loadRoute();
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await call(POST, request({}, FROM("203.0.113.1")))).body);

    expect(results.map((r) => r.source)).toEqual(["ai", "ai", "template", "template"]);
    expect(results.map((r) => r.limited)).toEqual([undefined, undefined, true, true]);
    expect(results[2].markdown).toContain("## 1. Estado general"); // still a complete report
    expect(create).toHaveBeenCalledTimes(2); // no AI calls (and no cost) past the limit
  });

  it("limits each IP separately", async () => {
    vi.stubEnv("REPORT_AI_LIMIT_PER_IP", "1");
    const POST = await loadRoute();
    expect((await call(POST, request({}, FROM("203.0.113.1")))).body.source).toBe("ai");
    expect((await call(POST, request({}, FROM("203.0.113.1")))).body.limited).toBe(true);
    expect((await call(POST, request({}, FROM("203.0.113.2")))).body.source).toBe("ai");
  });

  it("also enforces a global cap across IPs", async () => {
    vi.stubEnv("REPORT_AI_LIMIT_PER_IP", "5");
    vi.stubEnv("REPORT_AI_LIMIT_GLOBAL", "2");
    const POST = await loadRoute();
    const sources = [];
    for (const ip of ["203.0.113.1", "203.0.113.2", "203.0.113.3"]) {
      sources.push((await call(POST, request({}, FROM(ip)))).body.source);
    }
    expect(sources).toEqual(["ai", "ai", "template"]);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("defaults to 6 reports per IP when the env var is missing or invalid", async () => {
    for (const value of [undefined, "abc", "0", "-3"]) {
      create.mockClear();
      if (value !== undefined) vi.stubEnv("REPORT_AI_LIMIT_PER_IP", value);
      const POST = await loadRoute();
      const sources = [];
      for (let i = 0; i < 7; i++) sources.push((await call(POST, request({}, FROM("203.0.113.1")))).body.source);
      expect(sources, String(value)).toEqual(["ai", "ai", "ai", "ai", "ai", "ai", "template"]);
    }
  });

  it("does not spend quota on invalid requests", async () => {
    vi.stubEnv("REPORT_AI_LIMIT_PER_IP", "1");
    const POST = await loadRoute();
    expect((await call(POST, request({ tasks: "x" }, FROM("203.0.113.1")))).status).toBe(400);
    expect((await call(POST, request({}, FROM("203.0.113.1")))).body.source).toBe("ai");
  });
});

describe("POST /api/report input validation", () => {
  it("rejects an invalid task list with 400", async () => {
    const POST = await loadRoute();
    const bad: unknown[] = [
      "x",
      [validTask({ milestoneId: "nope" })],
      [validTask({ dueDate: "2026-13-40" })],
      [validTask({ status: "blocked", blockedReason: "" })],
      [validTask(), validTask()], // duplicate id
      [validTask({ completedAt: 5 })],
    ];
    for (const tasks of bad) {
      const { status, body } = await call(POST, request({ tasks }));
      expect(status, JSON.stringify(tasks)).toBe(400);
      expect(body.error).toBe("La lista de tareas no es válida.");
    }
  });

  it("accepts an empty task list", async () => {
    const POST = await loadRoute();
    const { status, body } = await call(POST, request({ tasks: [] }));
    expect(status).toBe(200);
    expect(body.markdown).toContain("Avance: 0%");
  });

  it("rejects oversized requests with 413, before doing any work", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    const POST = await loadRoute();
    const { status, body } = await call(POST, request({}, { "content-length": "200001" }));
    expect(status).toBe(413);
    expect(body.error).toBe("El pedido es demasiado grande.");
    expect(create).not.toHaveBeenCalled();
    expect((await call(POST, request({}, { "content-length": "200000" }))).status).toBe(200);
  });
});
