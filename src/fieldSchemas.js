export const FIELD_MODULES = Object.freeze({
  contact: {
    title: "Contact",
    itemKind: "singleton",
    nativeKeys: {
      address: "contactAddress",
      email: "contactEmail",
      directions: "contactDirections",
    },
    fields: [
      { id: "address", zh: "地址", en: "ADDRESS", type: "textarea", protected: false },
      { id: "email", zh: "邮箱", en: "EMAIL", type: "text", protected: false },
      { id: "directions", zh: "方向", en: "INTERESTS", type: "textarea", protected: false },
    ],
  },
  people: {
    title: "People",
    itemKind: "collection",
    nativeKeys: {
      name: "name",
      category: "category",
      title: "title",
      email: "email",
      interests: "interests",
      history: "history",
      experience: "experience",
      academicAbility: "academicAbility",
    },
    fields: [
      { id: "name", zh: "名字", en: "NAME", type: "text", protected: true },
      { id: "category", zh: "分类", en: "CATEGORIES", type: "select", protected: true },
      { id: "title", zh: "职位", en: "APPOINTMENT", type: "text", protected: false },
      { id: "email", zh: "邮箱", en: "EMAIL", type: "text", protected: false },
      { id: "interests", zh: "研究方向", en: "INTERESTS", type: "textarea", protected: false },
      { id: "history", zh: "简介", en: "INTRODUCTION", type: "textarea", protected: false },
      { id: "experience", zh: "经历", en: "EXPERIENCE", type: "textarea", protected: false },
      { id: "academicAbility", zh: "学术能力", en: "ACADEMIC ABILITY", type: "textarea", protected: false },
    ],
  },
  works: {
    title: "Works",
    itemKind: "collection",
    nativeKeys: {
      title: "title",
      date: "date",
      people: "people",
      text: "text",
      body: "body",
    },
    fields: [
      { id: "title", zh: "标题", en: "TITLE", type: "text", protected: true },
      { id: "date", zh: "时间", en: "DATE", type: "text", protected: false },
      { id: "people", zh: "人员", en: "PEOPLE", type: "text", protected: false },
      { id: "text", zh: "简介", en: "INTRODUCTION", type: "textarea", protected: false },
      { id: "body", zh: "正文", en: "CONTENT", type: "textarea", protected: false },
    ],
  },
  news: {
    title: "News",
    itemKind: "collection",
    nativeKeys: {
      title: "title",
      date: "date",
      people: "people",
      intro: "intro",
      body: "body",
    },
    fields: [
      { id: "title", zh: "标题", en: "TITLE", type: "text", protected: true },
      { id: "date", zh: "时间", en: "DATE", type: "text", protected: false },
      { id: "people", zh: "人员", en: "PEOPLE", type: "text", protected: false },
      { id: "intro", zh: "简介", en: "INTRODUCTION", type: "textarea", protected: false },
      { id: "body", zh: "正文", en: "CONTENT", type: "textarea", protected: false },
    ],
  },
  project: {
    title: "Project",
    itemKind: "collection",
    nativeKeys: {
      title: "title",
      date: "date",
      people: "people",
      intro: "intro",
      body: "body",
    },
    fields: [
      { id: "title", zh: "标题", en: "TITLE", type: "text", protected: true },
      { id: "date", zh: "时间", en: "DATE", type: "text", protected: false },
      { id: "people", zh: "人员", en: "PEOPLE", type: "text", protected: false },
      { id: "intro", zh: "简介", en: "INTRODUCTION", type: "textarea", protected: false },
      { id: "body", zh: "正文", en: "CONTENT", type: "textarea", protected: false },
    ],
  },
  publications: {
    title: "Publications",
    itemKind: "collection",
    nativeKeys: {
      title: "title",
      date: "date",
      people: "people",
      intro: "intro",
      body: "body",
    },
    fields: [
      { id: "title", zh: "标题", en: "TITLE", type: "text", protected: true },
      { id: "date", zh: "时间", en: "DATE", type: "text", protected: false },
      { id: "people", zh: "作者", en: "PEOPLE", type: "text", protected: false },
      { id: "intro", zh: "简介", en: "INTRODUCTION", type: "textarea", protected: false },
      { id: "body", zh: "正文", en: "CONTENT", type: "textarea", protected: false },
    ],
  },
});

export const FIELD_MODULE_KEYS = Object.freeze(Object.keys(FIELD_MODULES));

export function cloneFieldSchemas(value = null) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    FIELD_MODULE_KEYS.map((moduleKey) => {
      const defaults = FIELD_MODULES[moduleKey].fields;
      const hasIncomingSchema = Array.isArray(source[moduleKey]);
      const incoming = hasIncomingSchema ? source[moduleKey] : defaults;
      const fallbackMap = new Map(defaults.map((field) => [field.id, field]));
      const normalized = incoming
        .map((field) => {
          const id = String(field?.id || "").trim();
          if (!id) return null;
          const fallback = fallbackMap.get(id) || {};
          return {
            id,
            zh: String(field.zh || fallback.zh || id).trim(),
            en: String(field.en || fallback.en || id).trim().toUpperCase(),
            type: field.type === "textarea" || field.type === "select" ? field.type : fallback.type || "text",
            protected: Boolean(field.protected ?? fallback.protected),
            custom: Boolean(field.custom ?? !fallbackMap.has(id)),
          };
        })
        .filter(Boolean);
      const seen = new Set(normalized.map((field) => field.id));
      const merged = [
        ...normalized,
        ...defaults
          .filter((field) => !seen.has(field.id) && (!hasIncomingSchema || field.protected))
          .map((field) => ({ ...field, custom: false })),
      ];
      return [moduleKey, merged];
    }),
  );
}

export function defaultFieldSchemas() {
  return cloneFieldSchemas();
}

export function moduleFieldNativeKey(moduleKey, fieldId) {
  return FIELD_MODULES[moduleKey]?.nativeKeys?.[fieldId] || "";
}

export function moduleTitle(moduleKey) {
  return FIELD_MODULES[moduleKey]?.title || moduleKey;
}
