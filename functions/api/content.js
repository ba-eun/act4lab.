import defaultContent from "../../src/content.js";
import { json, requireAuth } from "../_shared/auth.js";

const CONTENT_KEY = "content";

function safeContent(input = {}) {
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
    news: Array.isArray(input.news) ? input.news : defaultContent.news,
    works: Array.isArray(input.works) ? input.works : defaultContent.works,
    projects: Array.isArray(input.projects) ? input.projects : defaultContent.projects,
    archive: Array.isArray(input.archive) ? input.archive : defaultContent.archive,
    people: Array.isArray(input.people) ? input.people : defaultContent.people,
    boardRows: Array.isArray(input.boardRows) ? input.boardRows : defaultContent.boardRows,
  };
}

export async function onRequestGet({ env }) {
  const stored = await env.ACT4_CONTENT?.get(CONTENT_KEY);
  if (!stored) return json(defaultContent);
  return json(safeContent(JSON.parse(stored)));
}

export async function onRequestPut({ request, env }) {
  const blocked = await requireAuth(request, env);
  if (blocked) return blocked;
  const body = await request.json().catch(() => ({}));
  const content = {
    ...safeContent(body),
    updatedAt: new Date().toISOString(),
  };
  await env.ACT4_CONTENT.put(CONTENT_KEY, JSON.stringify(content));
  return json({ ok: true, content });
}
