import defaultContent from "../../src/content.js";
import { json, requireAuth } from "../_shared/auth.js";

const CONTENT_KEY = "content";

function makeId(value = "item") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `item-${Date.now()}`;
}

function normalizeBoardItem(item, fallback = {}) {
  const source = typeof item === "string" ? { title: item, intro: item } : item || {};
  const title = source.title || fallback.title || "Untitled";
  return {
    id: source.id || makeId(title),
    title,
    date: source.date || fallback.date || "",
    intro: source.intro || source.text || fallback.intro || "",
    people: source.people || fallback.people || "",
    image: source.image || fallback.image || "",
    body: source.body || source.text || fallback.body || "",
  };
}

function normalizeWork(item = {}) {
  const title = item.title || "Untitled";
  return {
    id: item.id || makeId(title),
    title,
    date: item.date || "",
    text: item.text || item.intro || "",
    people: item.people || "",
    image: item.image || "",
    body: item.body || item.text || item.intro || "",
  };
}

function normalizePerson(item = {}) {
  if (Array.isArray(item)) {
    return {
      id: makeId(item[0]),
      photo: "",
      name: item[0] || "Untitled",
      email: "",
      interests: item[1] || "",
      history: item[1] || "",
      experience: "",
    };
  }
  const name = item.name || item.title || "Untitled";
  return {
    id: item.id || makeId(name),
    photo: item.photo || item.image || "",
    name,
    email: item.email || "",
    interests: item.interests || item.interest || item.text || "",
    history: item.history || item.bio || "",
    experience: item.experience || "",
  };
}

function safeContent(input = {}) {
  const boardInput = input.board || {};
  const legacyNews = Array.isArray(input.news) ? input.news : [];
  const legacyProjects = Array.isArray(input.projects) ? input.projects : [];
  const legacyRows = Array.isArray(input.boardRows)
    ? input.boardRows.map(([date, title, text]) => ({ date, title, intro: text, body: text }))
    : [];

  return {
    ...defaultContent,
    ...input,
    site: { ...defaultContent.site, ...(input.site || {}) },
    homeIntro: Array.isArray(input.homeIntro) ? input.homeIntro : defaultContent.homeIntro,
    about: {
      ...defaultContent.about,
      ...(input.about || {}),
      sections: Array.isArray(input.about?.sections) ? input.about.sections : defaultContent.about.sections,
    },
    board: {
      news: (Array.isArray(boardInput.news) ? boardInput.news : legacyNews.length ? legacyNews : legacyRows).map((item) =>
        normalizeBoardItem(item),
      ),
      projects: (Array.isArray(boardInput.projects) ? boardInput.projects : legacyProjects).map((item) =>
        normalizeBoardItem(item),
      ),
      research: (Array.isArray(boardInput.research) ? boardInput.research : defaultContent.board.research).map((item) =>
        normalizeBoardItem(item),
      ),
    },
    news: undefined,
    works: (Array.isArray(input.works) ? input.works : defaultContent.works).map((item) => normalizeWork(item)),
    projects: undefined,
    archive: Array.isArray(input.archive) ? input.archive : defaultContent.archive,
    people: (Array.isArray(input.people) ? input.people : defaultContent.people).map((item) => normalizePerson(item)),
    boardRows: undefined,
  };
}

function readRequestScope(request) {
  const url = new URL(request.url);
  return {
    pagePath: (url.searchParams.get("pagePath") || request.headers.get("x-act4-page-path") || "").trim(),
    moduleKey: (url.searchParams.get("module") || request.headers.get("x-act4-module") || "").trim(),
    action: (url.searchParams.get("action") || request.headers.get("x-act4-action") || "").trim(),
    columnId: (url.searchParams.get("columnId") || request.headers.get("x-act4-column-id") || "").trim(),
  };
}

function uploadKeyFromUrl(value) {
  const url = typeof value === "object" && value ? value.url : value;
  const match = String(url || "").match(/\/uploads\/([^?#]+)/);
  const key = match ? decodeURIComponent(match[1]) : "";
  return key && !/[\\/]/.test(key) ? key : "";
}

function collectUploadKeys(value, keys = new Set()) {
  if (!value) return keys;
  if (typeof value === "string") {
    const key = uploadKeyFromUrl(value);
    if (key) keys.add(key);
    return keys;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUploadKeys(item, keys));
    return keys;
  }
  if (typeof value === "object") {
    const key = uploadKeyFromUrl(value);
    if (key) keys.add(key);
    Object.values(value).forEach((item) => collectUploadKeys(item, keys));
  }
  return keys;
}

async function deleteUnreferencedUploads(env, before, after) {
  if (!env.ACT4_CONTENT) return;
  const beforeKeys = collectUploadKeys(before);
  const afterKeys = collectUploadKeys(after);
  await Promise.all([...beforeKeys].filter((key) => !afterKeys.has(key)).map((key) => env.ACT4_CONTENT.delete(`upload:${key}`)));
}

export async function onRequestGet({ request, env }) {
  const stored = await env.ACT4_CONTENT?.get(CONTENT_KEY);
  const scope = readRequestScope(request);
  const headers = scope.pagePath ? { "X-Act4-Page-Path": scope.pagePath } : {};
  if (!stored) return json(defaultContent, { headers });
  return json(safeContent(JSON.parse(stored)), { headers });
}

export async function onRequestPut({ request, env }) {
  const blocked = await requireAuth(request, env);
  if (blocked) return blocked;
  const scope = readRequestScope(request);
  if (!scope.pagePath) return json({ error: "Missing pagePath" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const previous = await env.ACT4_CONTENT?.get(CONTENT_KEY, { type: "json" }).catch(() => null);
  const content = {
    ...safeContent(body),
    updatedAt: new Date().toISOString(),
  };
  await env.ACT4_CONTENT.put(CONTENT_KEY, JSON.stringify(content));
  await deleteUnreferencedUploads(env, previous, content);
  return json({ ok: true, content, scope });
}
