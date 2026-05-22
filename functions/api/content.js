import defaultContent from "../../src/content.js";
import { json, requireAuth } from "../_shared/auth.js";
import { cloneFieldSchemas } from "../../src/fieldSchemas.js";

const CONTENT_KEY = "content";
const PEOPLE_CATEGORY_DEFAULT = "members";
const PEOPLE_CATEGORY_IDS = new Set(["director", "faculty", "members", "former"]);
const DEFAULT_MEDIA_CANVAS_RATIO = 1.6;
const DEFAULT_MEDIA_ITEM_WIDTH = 0.32;
const DEFAULT_MEDIA_ITEM_HEIGHT = 0.42;
const DEFAULT_LAYOUT_CANVAS_RATIO = 1.6;
const STACK_LAYOUT_MODE = "stack";
const DEFAULT_STACK_FIELD_WIDTH = 0.28;
const DEFAULT_STACK_FIELD_HEIGHT = 0.18;
const DEFAULT_STACK_TEXT_WIDTH = DEFAULT_STACK_FIELD_WIDTH;
const DEFAULT_STACK_TEXT_HEIGHT = 0.04;
const DEFAULT_STACK_ATTACHMENT_WIDTH = 0.78;
const DEFAULT_STACK_ATTACHMENT_HEIGHT = 0.5;
const STACK_TEXT_ITEM_TYPE = "text";
const MIN_STACK_ITEM_RATIO = 0.02;
const DETAIL_CANVAS_CONTENT_FIELD_IDS = new Set(["text", "intro", "body", "introduction"]);

function legacyContentFieldIdFromTextId(rawId, validFieldIds = null) {
  const match = String(rawId || "").trim().match(/^legacy-(text|intro|body|introduction)(?:-\d+)?$/);
  const fieldId = match?.[1] || "";
  if (!fieldId || !DETAIL_CANVAS_CONTENT_FIELD_IDS.has(fieldId)) return "";
  if (validFieldIds && !validFieldIds.has(fieldId)) return "";
  return fieldId;
}

function normalizePeopleCategory(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (normalized === "former-members" || normalized === "past" || normalized === "alumni") return "former";
  return PEOPLE_CATEGORY_IDS.has(normalized) ? normalized : PEOPLE_CATEGORY_DEFAULT;
}

function makeId(value = "item") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `item-${Date.now()}`;
}

function attachmentUrl(value) {
  if (!value) return "";
  if (Array.isArray(value)) return attachmentUrl(value.find((item) => attachmentUrl(item)));
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") return String(value.url || value.src || value.href || "").trim();
  return "";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function normalizeStoredCrop(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const zoom = Number(value.zoom);
  if (![x, y, zoom].every(Number.isFinite)) return null;
  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    zoom: clamp(zoom, 1, 2.5),
  };
}

function normalizeFieldLabels(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, label]) => [String(key || "").trim(), String(label || "").trim()])
      .filter(([key, label]) => key && label),
  );
}

function fileNameFromUrl(url = "") {
  const name = String(url).split(/[?#]/)[0].split("/").filter(Boolean).at(-1) || "attachment";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function inferMimeType(url = "") {
  const ext = String(url).split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
  const map = {
    avif: "image/avif",
    gif: "image/gif",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
  };
  return map[ext] || "";
}

function normalizePosterAttachment(value) {
  const source = value?.file || value;
  const url = attachmentUrl(source);
  if (!url) return null;
  const metadata = typeof source === "object" && source ? source : {};
  const type = metadata.type || metadata.mime || metadata.contentType || inferMimeType(url);
  if (!(type?.startsWith("image/") || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url))) return null;
  const crop = normalizeStoredCrop(value?.crop || metadata.crop);
  return {
    url,
    name: metadata.name || metadata.originalName || fileNameFromUrl(url),
    size: Number(metadata.size || 0),
    type,
    createdAt: metadata.createdAt || "",
    ...(crop ? { crop } : {}),
  };
}

function normalizeVideoPoster(value = {}) {
  if (!value || typeof value !== "object") return null;
  return [
    value.poster,
    value.posterUrl,
    value.thumbnail,
    value.thumbnailUrl,
    value.thumb,
    value.preview,
    value.previewImage,
    value.coverImage,
    value.coverUrl,
    value.cover,
  ].map((candidate) => normalizePosterAttachment(candidate)).find(Boolean) || null;
}

function normalizeAttachment(value) {
  const url = attachmentUrl(value);
  if (!url) return null;
  const metadata = typeof value === "object" && value ? value : {};
  const crop = normalizeStoredCrop(metadata.crop);
  const poster = normalizeVideoPoster(metadata);
  return {
    url,
    name: metadata.name || metadata.originalName || fileNameFromUrl(url),
    size: Number(metadata.size || 0),
    type: metadata.type || metadata.mime || metadata.contentType || inferMimeType(url),
    createdAt: metadata.createdAt || "",
    ...(crop ? { crop } : {}),
    ...(poster ? { poster } : {}),
  };
}

function normalizeCover(value, attachments = []) {
  const direct = normalizeAttachment(value?.file || value);
  const sourceAttachmentId = String(value?.sourceAttachmentId || "").trim();
  const fallback = normalizeAttachmentList(attachments).find((attachment) => attachment.type.startsWith("image/")) || null;
  const file = direct || fallback;
  if (!file) return null;
  const crop = normalizeStoredCrop(value?.crop || direct?.crop);
  return {
    file: crop ? { ...file, crop } : file,
    ...(crop ? { crop } : {}),
    ...(sourceAttachmentId ? { sourceAttachmentId } : {}),
  };
}

function normalizeCustomFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [String(key || "").trim(), typeof fieldValue === "string" ? fieldValue : String(fieldValue ?? "")]).filter(([key]) => key),
  );
}

function defaultStackLayoutItem(type, id, row = 0) {
  return type === "attachment"
    ? {
        id,
        type,
        row,
        x: 0,
        y: row * DEFAULT_STACK_ATTACHMENT_HEIGHT,
        w: DEFAULT_STACK_ATTACHMENT_WIDTH,
        h: DEFAULT_STACK_ATTACHMENT_HEIGHT,
        z: row + 1,
      }
    : {
        id,
        type: type === STACK_TEXT_ITEM_TYPE ? STACK_TEXT_ITEM_TYPE : "field",
        row,
        x: 0,
        y: row * (type === STACK_TEXT_ITEM_TYPE ? DEFAULT_STACK_TEXT_HEIGHT : DEFAULT_STACK_FIELD_HEIGHT),
        w: type === STACK_TEXT_ITEM_TYPE ? DEFAULT_STACK_TEXT_WIDTH : DEFAULT_STACK_FIELD_WIDTH,
        h: type === STACK_TEXT_ITEM_TYPE ? DEFAULT_STACK_TEXT_HEIGHT : DEFAULT_STACK_FIELD_HEIGHT,
        z: row + 1,
      };
}

function uniqueTextItemId(rawId, seenTextIds) {
  const baseId = String(rawId || "").trim();
  if (!seenTextIds.has(baseId)) {
    seenTextIds.add(baseId);
    return baseId;
  }
  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;
  while (seenTextIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
  seenTextIds.add(candidate);
  return candidate;
}

function isDuplicateTextLayoutItem(rawId, text, seenTextSignatures) {
  const id = String(rawId || "").trim();
  const normalizedText = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!id || !normalizedText) return false;
  const signature = `${id}\n${normalizedText}`;
  if (seenTextSignatures.has(signature)) return true;
  seenTextSignatures.add(signature);
  return false;
}

function stackTextValue(item = {}) {
  return normalizeEditableText(item.text ?? item.value ?? "");
}

function normalizeEditableText(value = "") {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

function stackItemRow(item, fallback = 0) {
  const row = Number(item?.row);
  return Number.isFinite(row) ? Math.max(0, Math.round(row)) : fallback;
}

function stackItemMinRatio(type) {
  return type === STACK_TEXT_ITEM_TYPE || type === "attachment" ? MIN_STACK_ITEM_RATIO : 0.06;
}

function stackItemWidth(item, type) {
  const fallback = type === "attachment"
    ? DEFAULT_STACK_ATTACHMENT_WIDTH
    : type === STACK_TEXT_ITEM_TYPE
      ? DEFAULT_STACK_TEXT_WIDTH
      : DEFAULT_STACK_FIELD_WIDTH;
  const minWidth = stackItemMinRatio(type);
  return clamp(Number.isFinite(Number(item?.w)) ? Number(item.w) : fallback, minWidth, 1);
}

function stackItemHeight(item) {
  const fallback = item?.type === "attachment"
    ? DEFAULT_STACK_ATTACHMENT_HEIGHT
    : item?.type === STACK_TEXT_ITEM_TYPE
      ? DEFAULT_STACK_TEXT_HEIGHT
      : DEFAULT_STACK_FIELD_HEIGHT;
  const minHeight = stackItemMinRatio(item?.type);
  return clamp(Number.isFinite(Number(item?.h)) ? Number(item.h) : fallback, minHeight, 3);
}

function stackItemX(item) {
  const width = stackItemWidth(item, item?.type);
  return clamp(Number.isFinite(Number(item?.x)) ? Number(item.x) : 0, 0, Math.max(0, 1 - width));
}

function stackItemY(item, fallback = 0) {
  return clamp(Number.isFinite(Number(item?.y)) ? Number(item.y) : fallback, 0, 48);
}

function stackItemZ(item, fallback = 1) {
  const z = Math.round(Number(item?.z));
  return Number.isFinite(z) ? Math.max(1, z) : fallback;
}

function freeAttachmentBottom(items = []) {
  return items.reduce((bottom, item) => Math.max(bottom, stackItemY(item) + stackItemHeight(item)), 0);
}

function freeLayoutBottom(items = []) {
  return items.reduce((bottom, item) => Math.max(bottom, stackItemY(item) + stackItemHeight(item)), 0);
}

function stackItemFontSize(item) {
  const value = Number(item?.fontSize);
  return Number.isFinite(value) ? clamp(value, 10, 72) : null;
}

function compactStackRows(items = []) {
  const groups = [];
  items.forEach((item, index) => {
    const row = stackItemRow(item, index);
    if (!groups[row]) groups[row] = [];
    groups[row].push(item);
  });
  return groups
    .filter(Boolean)
    .flatMap((rowItems, rowIndex) => rowItems.map((item) => ({ ...item, row: rowIndex })));
}

function normalizeStackContentLayout(value, fieldIds = [], attachments = []) {
  const validFieldIds = new Set(fieldIds);
  const attachmentItems = normalizeAttachmentList(attachments);
  const validAttachmentUrls = new Set(attachmentItems.map((attachment) => attachment.url));
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const seenTextIds = new Set();
  const seenTextSignatures = new Set();
  const seenLegacyContentFields = new Set();
  const seenLegacyContentTexts = new Set();
  let attachmentIndex = 0;
  let fieldIndex = 0;
  const normalizedItems = inputItems
    .map((item, index) => {
      const type = item?.type === "attachment" || item?.type === "media"
        ? "attachment"
        : item?.type === STACK_TEXT_ITEM_TYPE
          ? STACK_TEXT_ITEM_TYPE
          : "field";
      const id = String(item?.id || item?.fieldId || item?.url || "").trim();
      if (!id) return null;
      if (type === "field" && !validFieldIds.has(id)) return null;
      if (type === "attachment" && !validAttachmentUrls.has(id)) return null;
      if (type === STACK_TEXT_ITEM_TYPE) {
        const text = stackTextValue(item);
        if (isDuplicateTextLayoutItem(id, text, seenTextSignatures)) return null;
        const legacyFieldId = legacyContentFieldIdFromTextId(id, validFieldIds);
        if (legacyFieldId) {
          const legacyText = text.replace(/\s+/g, " ").trim();
          if (legacyText) {
            if (seenLegacyContentTexts.has(legacyText)) return null;
            seenLegacyContentTexts.add(legacyText);
          }
          if (seenLegacyContentFields.has(legacyFieldId)) return null;
          seenLegacyContentFields.add(legacyFieldId);
        }
        const textId = uniqueTextItemId(id, seenTextIds);
        const fallbackY = fieldIndex * DEFAULT_STACK_TEXT_HEIGHT;
        const fallbackZ = fieldIndex + 1;
        fieldIndex += 1;
        const fontSize = stackItemFontSize(item);
        return {
          id: textId,
          type,
          text,
          row: stackItemRow(item, index),
          x: stackItemX(item),
          y: stackItemY(item, fallbackY),
          w: stackItemWidth(item, type),
          h: stackItemHeight({ ...item, type }),
          z: stackItemZ(item, fallbackZ),
          ...(fontSize ? { fontSize } : {}),
        };
      }
      if (type === "field") {
        const fallbackY = fieldIndex * DEFAULT_STACK_FIELD_HEIGHT;
        const fallbackZ = fieldIndex + 1;
        fieldIndex += 1;
        const fontSize = stackItemFontSize(item);
        return {
          id,
          type,
          row: stackItemRow(item, index),
          x: stackItemX(item),
          y: stackItemY(item, fallbackY),
          w: stackItemWidth(item, type),
          h: stackItemHeight({ ...item, type }),
          z: stackItemZ(item, fallbackZ),
          ...(fontSize ? { fontSize } : {}),
        };
      }
      const fallbackY = attachmentIndex * DEFAULT_STACK_ATTACHMENT_HEIGHT;
      const fallbackZ = attachmentIndex + 1;
      attachmentIndex += 1;
      return {
        id,
        type,
        row: stackItemRow(item, index),
        x: stackItemX(item),
        y: stackItemY(item, fallbackY),
        w: stackItemWidth(item, type),
        h: stackItemHeight(item),
        z: stackItemZ(item, fallbackZ),
      };
    })
    .filter(Boolean);
  const compactedItems = compactStackRows(normalizedItems);
  return {
    mode: STACK_LAYOUT_MODE,
    items: compactedItems,
  };
}

function normalizeContentLayout(value, fieldIds = [], attachments = []) {
  if (value?.mode === STACK_LAYOUT_MODE) {
    return normalizeStackContentLayout(value, fieldIds, attachments);
  }
  const validFieldIds = new Set(fieldIds);
  const validAttachmentUrls = new Set(normalizeAttachmentList(attachments).map((attachment) => attachment.url));
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const items = inputItems
    .map((item, index) => {
      const type = item?.type === "media" ? "media" : "field";
      const id = String(item?.id || item?.fieldId || item?.url || "").trim();
      if (!id) return null;
      if (type === "field" && !validFieldIds.has(id)) return null;
      if (type === "media" && !validAttachmentUrls.has(id)) return null;
      const width = Number(item?.w);
      const height = Number(item?.h);
      const minWidth = type === "media" ? 0.12 : 0.2;
      const minHeight = type === "media" ? 0.12 : 0.14;
      const normalized = {
        id,
        type,
        x: clamp(Number.isFinite(Number(item?.x)) ? Number(item.x) : 0, 0, 1),
        y: clamp(Number.isFinite(Number(item?.y)) ? Number(item.y) : 0, 0, 1),
        w: clamp(Number.isFinite(width) ? width : type === "media" ? DEFAULT_MEDIA_ITEM_WIDTH : 0.42, minWidth, 1),
        h: clamp(Number.isFinite(height) ? height : type === "media" ? DEFAULT_MEDIA_ITEM_HEIGHT : 0.18, minHeight, 1),
        z: Math.max(1, Math.round(Number(item?.z) || index + 1)),
      };
      return {
        ...normalized,
        x: clamp(normalized.x, 0, 1 - normalized.w),
        y: clamp(normalized.y, 0, 1 - normalized.h),
      };
    })
    .filter(Boolean);
  if (!items.length) return null;
  const ratio = Number(value?.canvasRatio);
  return {
    canvasRatio: Number.isFinite(ratio) && ratio > 0 ? clamp(ratio, 0.6, 3) : DEFAULT_LAYOUT_CANVAS_RATIO,
    items,
  };
}

function normalizeAttachmentList(...values) {
  const seen = new Set();
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => normalizeAttachment(value))
    .filter(Boolean)
    .filter((attachment) => {
      if (seen.has(attachment.url)) return false;
      seen.add(attachment.url);
      return true;
    });
}

function hasExplicitAttachments(source = {}) {
  return Object.prototype.hasOwnProperty.call(source, "attachments");
}

function stackLayoutAttachmentIds(layout) {
  if (layout?.mode !== STACK_LAYOUT_MODE || !Array.isArray(layout.items)) return null;
  return new Set(
    layout.items
      .filter((item) => item?.type === "attachment" || item?.type === "media")
      .map((item) => String(item.id || item.url || "").trim())
      .filter(Boolean),
  );
}

function pruneAttachmentsToStackLayout(source = {}, legacyKey = "image") {
  const attachmentIds = stackLayoutAttachmentIds(source.contentLayout);
  if (!attachmentIds) return source;
  const sourceAttachments = hasExplicitAttachments(source)
    ? normalizeAttachmentList(source.attachments)
    : normalizeAttachmentList(source.attachments, source[legacyKey]);
  const attachments = sourceAttachments.filter((attachment) => attachmentIds.has(attachment.url));
  return {
    ...source,
    attachments,
    [legacyKey]: attachments[0] || "",
  };
}

function withAttachmentFields(source, legacyKey) {
  const attachments = hasExplicitAttachments(source)
    ? normalizeAttachmentList(source.attachments)
    : normalizeAttachmentList(source.attachments, source[legacyKey]);
  return {
    attachments,
    [legacyKey]: attachments[0] || "",
  };
}

function normalizeBoardItem(item, fallback = {}, moduleKey = "news", fieldIds = [], options = {}) {
  const rawSource = typeof item === "string" ? { title: item, intro: item } : item || {};
  const source = options.pruneStackAttachments ? pruneAttachmentsToStackLayout(rawSource, "image") : rawSource;
  const title = source.title || fallback.title || "Untitled";
  const attachmentFields = withAttachmentFields({ ...fallback, ...source }, "image");
  const storedMediaLayout = Object.hasOwn(source, "mediaLayout") ? source.mediaLayout : fallback.mediaLayout;
  const mediaLayout = storedMediaLayout ? normalizeMediaLayout(storedMediaLayout, attachmentFields.attachments) : null;
  const contentLayout = normalizeContentLayout(source.contentLayout || fallback.contentLayout, fieldIds, attachmentFields.attachments);
  return {
    id: source.id || makeId(title),
    title,
    date: source.date || fallback.date || "",
    createdAt: source.createdAt || fallback.createdAt || "",
    intro: source.intro || source.text || fallback.intro || "",
    people: source.people || fallback.people || "",
    ...attachmentFields,
    cover: normalizeCover(source.cover || fallback.cover, attachmentFields.attachments),
    customFields: normalizeCustomFields(source.customFields || fallback.customFields),
    body: source.body || source.text || fallback.body || "",
    ...(source.editorLayout || fallback.editorLayout ? { editorLayout: source.editorLayout || fallback.editorLayout } : {}),
    ...(mediaLayout ? { mediaLayout } : {}),
    ...(contentLayout ? { contentLayout } : {}),
  };
}

function defaultMediaLayoutItem(index, url, total = 1) {
  const columns = Math.max(1, Math.min(3, total));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const gapX = columns === 1 ? 0 : 0.04;
  const width = columns === 1 ? 0.54 : DEFAULT_MEDIA_ITEM_WIDTH;
  const height = DEFAULT_MEDIA_ITEM_HEIGHT;
  const usedWidth = columns * width + Math.max(0, columns - 1) * gapX;
  const startX = (1 - usedWidth) / 2;
  const x = clamp(startX + column * (width + gapX), 0, 1 - width);
  const y = clamp(0.08 + row * 0.18, 0, 1 - height);
  return { url, x, y, w: width, h: height, z: index + 1 };
}

function isVisualAttachment(attachment) {
  return attachment?.type?.startsWith("image/") || attachment?.type?.startsWith("video/");
}

function normalizeMediaLayout(value, attachments = []) {
  const visuals = normalizeAttachmentList(attachments).filter(isVisualAttachment);
  if (!visuals.length) return null;
  const urlSet = new Set(visuals.map((attachment) => attachment.url));
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const normalizedItems = inputItems
    .map((item, index) => {
      const url = attachmentUrl(item?.url || item);
      if (!url || !urlSet.has(url)) return null;
      const width = Number(item?.w);
      const height = Number(item?.h);
      return {
        url,
        x: clamp(Number.isFinite(Number(item?.x)) ? Number(item.x) : 0, 0, 1),
        y: clamp(Number.isFinite(Number(item?.y)) ? Number(item.y) : 0, 0, 1),
        w: clamp(Number.isFinite(width) ? width : DEFAULT_MEDIA_ITEM_WIDTH, 0.12, 1),
        h: clamp(Number.isFinite(height) ? height : DEFAULT_MEDIA_ITEM_HEIGHT, 0.12, 1),
        z: Math.max(1, Math.round(Number(item?.z) || index + 1)),
      };
    })
    .filter(Boolean)
    .map((item) => ({
      ...item,
      x: clamp(item.x, 0, 1 - item.w),
      y: clamp(item.y, 0, 1 - item.h),
    }));
  const seen = new Set(normalizedItems.map((item) => item.url));
  const missing = visuals
    .filter((attachment) => !seen.has(attachment.url))
    .map((attachment, index) => defaultMediaLayoutItem(normalizedItems.length + index, attachment.url, visuals.length));
  const items = [...normalizedItems, ...missing];
  if (!items.length) return null;
  const ratio = Number(value?.canvasRatio);
  return {
    canvasRatio: Number.isFinite(ratio) && ratio > 0 ? clamp(ratio, 0.6, 3) : DEFAULT_MEDIA_CANVAS_RATIO,
    items,
  };
}

function normalizeWork(item = {}, fieldIds = [], options = {}) {
  const source = options.pruneStackAttachments ? pruneAttachmentsToStackLayout(item, "image") : item;
  const title = source.title || "Untitled";
  const attachmentFields = withAttachmentFields(source, "image");
  const mediaLayout = source.mediaLayout ? normalizeMediaLayout(source.mediaLayout, attachmentFields.attachments) : null;
  const contentLayout = normalizeContentLayout(source.contentLayout, fieldIds, attachmentFields.attachments);
  return {
    id: source.id || makeId(title),
    title,
    date: source.date || "",
    createdAt: source.createdAt || "",
    text: source.text || source.intro || "",
    people: source.people || "",
    ...attachmentFields,
    cover: normalizeCover(source.cover, attachmentFields.attachments),
    customFields: normalizeCustomFields(source.customFields),
    body: source.body || source.text || source.intro || "",
    ...(source.editorLayout ? { editorLayout: source.editorLayout } : {}),
    ...(mediaLayout ? { mediaLayout } : {}),
    ...(contentLayout ? { contentLayout } : {}),
  };
}

function normalizePerson(item = {}, fieldIds = []) {
  if (Array.isArray(item)) {
    return {
      id: makeId(item[0]),
      photo: "",
      attachments: [],
      name: item[0] || "Untitled",
      category: PEOPLE_CATEGORY_DEFAULT,
      title: "",
      email: "",
      interests: item[1] || "",
      history: item[1] || "",
      experience: "",
      academicAbility: "",
      customFields: {},
    };
  }
  const name = item.name || item.title || "Untitled";
  const attachmentFields = withAttachmentFields({ ...item, photo: item.photo || item.image || "" }, "photo");
  const mediaLayout = item.mediaLayout ? normalizeMediaLayout(item.mediaLayout, attachmentFields.attachments) : null;
  const contentLayout = normalizeContentLayout(item.contentLayout, fieldIds, attachmentFields.attachments);
  return {
    id: item.id || makeId(name),
    ...attachmentFields,
    name,
    category: normalizePeopleCategory(item.category),
    title: item.title || item.role || "",
    createdAt: item.createdAt || "",
    email: item.email || "",
    interests: item.interests || item.interest || item.text || "",
    history: item.history || item.bio || "",
    experience: item.experience || "",
    academicAbility: item.academicAbility || "",
    cover: normalizeCover(item.cover, attachmentFields.attachments),
    customFields: normalizeCustomFields(item.customFields),
    ...(item.editorLayout ? { editorLayout: item.editorLayout } : {}),
    ...(mediaLayout ? { mediaLayout } : {}),
    ...(contentLayout ? { contentLayout } : {}),
  };
}

function safeContent(input = {}, options = {}) {
  const boardInput = input.board || {};
  const legacyNews = Array.isArray(input.news) ? input.news : [];
  const legacyProjects = Array.isArray(input.projects) ? input.projects : [];
  const legacyRows = Array.isArray(input.boardRows)
    ? input.boardRows.map(([date, title, text]) => ({ date, title, intro: text, body: text }))
    : [];

  const fieldSchemas = cloneFieldSchemas(input.fieldSchemas);
  const fieldIds = Object.fromEntries(Object.entries(fieldSchemas).map(([moduleKey, fields]) => [moduleKey, fields.map((field) => field.id)]));
  return {
    ...defaultContent,
    ...input,
    site: { ...defaultContent.site, ...(input.site || {}) },
    fieldLabels: normalizeFieldLabels(input.fieldLabels),
    fieldSchemas,
    homeIntro: Array.isArray(input.homeIntro) ? input.homeIntro : defaultContent.homeIntro,
    about: {
      ...defaultContent.about,
      ...(input.about || {}),
      sections: Array.isArray(input.about?.sections) ? input.about.sections : defaultContent.about.sections,
    },
    manualSort: input.manualSort && typeof input.manualSort === "object" ? input.manualSort : {},
    board: {
      news: (Array.isArray(boardInput.news) ? boardInput.news : legacyNews.length ? legacyNews : legacyRows).map((item) =>
        normalizeBoardItem(item, {}, "news", fieldIds.news, options),
      ),
      projects: (Array.isArray(boardInput.projects) ? boardInput.projects : legacyProjects).map((item) =>
        normalizeBoardItem(item, {}, "project", fieldIds.project, options),
      ),
      research: (Array.isArray(boardInput.research) ? boardInput.research : defaultContent.board.research).map((item) =>
        normalizeBoardItem(item, {}, "publications", fieldIds.publications, options),
      ),
    },
    news: undefined,
    works: (Array.isArray(input.works) ? input.works : defaultContent.works).map((item) => normalizeWork(item, fieldIds.works, options)),
    projects: undefined,
    archive: Array.isArray(input.archive) ? input.archive : defaultContent.archive,
    people: (Array.isArray(input.people) ? input.people : defaultContent.people).map((item) => normalizePerson(item, fieldIds.people)),
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
  const beforeKeys = collectUploadKeys(before);
  const afterKeys = collectUploadKeys(after);
  await Promise.all(
    [...beforeKeys]
      .filter((key) => !afterKeys.has(key))
      .map(async (key) => {
        const stored = await env.ACT4_CONTENT?.getWithMetadata(`upload:${key}`, { type: "text" }).catch(() => null);
        const chunkCount = Number(stored?.metadata?.chunks || 0);
        if (stored?.metadata?.chunked === "true" && chunkCount > 0) {
          await Promise.all(
            Array.from({ length: chunkCount }, (_, index) => (
              env.ACT4_CONTENT?.delete(`upload:${key}:part:${index}`).catch(() => null)
            )),
          );
        }
        await env.ACT4_ASSETS?.delete(key).catch(() => null);
        await env.ACT4_CONTENT?.delete(`upload:${key}`).catch(() => null);
      }),
  );
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
    ...safeContent(body, { pruneStackAttachments: true }),
    updatedAt: new Date().toISOString(),
  };
  await env.ACT4_CONTENT.put(CONTENT_KEY, JSON.stringify(content));
  await deleteUnreferencedUploads(env, previous, content);
  return json({ ok: true, content, scope });
}
