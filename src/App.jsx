import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Eye, FileArchive, FileSpreadsheet, FileText, Film, GripVertical, Loader2, LogOut, Maximize2, Menu, Minimize2, Minus, Music, Paperclip, Pencil, Play, Plus, Save, Trash2, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import defaultContent from "./content.js";
import { cloneFieldSchemas, moduleFieldNativeKey } from "./fieldSchemas.js";
import { BackgroundPaths } from "@/components/ui/background-paths";

gsap.registerPlugin(ScrollTrigger);

const navItems = [
  { label: "About LAB", path: "/about-lab" },
  { label: "People", path: "/people" },
  { label: "Works", path: "/works" },
  {
    label: "Board",
    path: "/board",
    children: [
      { label: "News", path: "/board/news" },
      { label: "Project", path: "/board/project" },
      { label: "Publications", path: "/board/publications" },
    ],
  },
  { label: "Contact", path: "/contact" },
];

const boardSections = {
  news: { title: "News", dataKey: "news", path: "/board/news" },
  project: { title: "Project", dataKey: "projects", path: "/board/project" },
  publications: { title: "Publications", dataKey: "research", path: "/board/publications" },
};

const HOME_TEXT_LIMIT = 4;
const HOME_MEDIA_LIMIT = 8;
const FOOTER_TAGLINE = "CROSS-MEDIA & MULTIMODAL";

const PEOPLE_CATEGORY_DEFAULT = "members";
const peopleCategories = [
  { id: "director", title: "Director", subtitle: "", layout: "cards" },
  { id: "faculty", title: "Faculty", subtitle: "", layout: "cards" },
  { id: "members", title: "Members", subtitle: "", layout: "cards" },
  { id: "former", title: "Former Members", subtitle: "", layout: "list" },
];
const peopleCategoryIds = new Set(peopleCategories.map((category) => category.id));
const peopleCategoryOptions = peopleCategories.map((category) => ({
  value: category.id,
  label: category.title,
}));
const peopleFormCategoryOptions = [
  { value: "director", label: "Director" },
  { value: "faculty", label: "Faculty" },
  { value: "members", label: "Members" },
  { value: "former", label: "Alumni" },
];
const DEFAULT_FIELD_LABELS = {
  "people.attachments": "附件",
  "people.category": "分类",
  "people.name": "名字",
  "people.title": "职位",
  "people.email": "邮箱",
  "people.interests": "研究方向",
  "people.history": "简介",
  "people.experience": "经历",
  "works.attachments": "附件",
  "works.title": "标题",
  "works.date": "时间",
  "works.people": "人员",
  "works.text": "简介",
  "works.body": "正文",
  "board.attachments": "附件",
  "board.title": "标题",
  "board.date": "时间",
  "board.people": "人员 / 作者",
  "board.intro": "简介",
  "board.body": "正文",
  "contact.address": "地址",
  "contact.email": "邮箱",
  "contact.directions": "方向",
};
const FIELD_LABEL_GROUPS = [
  {
    title: "People",
    items: [
      ["people.attachments", DEFAULT_FIELD_LABELS["people.attachments"]],
      ["people.category", DEFAULT_FIELD_LABELS["people.category"]],
      ["people.name", DEFAULT_FIELD_LABELS["people.name"]],
      ["people.title", DEFAULT_FIELD_LABELS["people.title"]],
      ["people.email", DEFAULT_FIELD_LABELS["people.email"]],
      ["people.interests", DEFAULT_FIELD_LABELS["people.interests"]],
      ["people.history", DEFAULT_FIELD_LABELS["people.history"]],
      ["people.experience", DEFAULT_FIELD_LABELS["people.experience"]],
    ],
  },
  {
    title: "Works",
    items: [
      ["works.attachments", DEFAULT_FIELD_LABELS["works.attachments"]],
      ["works.title", DEFAULT_FIELD_LABELS["works.title"]],
      ["works.date", DEFAULT_FIELD_LABELS["works.date"]],
      ["works.people", DEFAULT_FIELD_LABELS["works.people"]],
      ["works.text", DEFAULT_FIELD_LABELS["works.text"]],
      ["works.body", DEFAULT_FIELD_LABELS["works.body"]],
    ],
  },
  {
    title: "Board",
    items: [
      ["board.attachments", DEFAULT_FIELD_LABELS["board.attachments"]],
      ["board.title", DEFAULT_FIELD_LABELS["board.title"]],
      ["board.date", DEFAULT_FIELD_LABELS["board.date"]],
      ["board.people", DEFAULT_FIELD_LABELS["board.people"]],
      ["board.intro", DEFAULT_FIELD_LABELS["board.intro"]],
      ["board.body", DEFAULT_FIELD_LABELS["board.body"]],
    ],
  },
  {
    title: "Contact",
    items: [
      ["contact.address", DEFAULT_FIELD_LABELS["contact.address"]],
      ["contact.email", DEFAULT_FIELD_LABELS["contact.email"]],
      ["contact.directions", DEFAULT_FIELD_LABELS["contact.directions"]],
    ],
  },
];
const peopleEditorFields = [
  { name: "attachments", legacyField: "photo", labelKey: "people.attachments", type: "attachments" },
  { name: "category", labelKey: "people.category", type: "select", options: peopleCategoryOptions },
  { name: "name", labelKey: "people.name" },
  { name: "title", labelKey: "people.title" },
  { name: "email", labelKey: "people.email" },
  { name: "interests", labelKey: "people.interests", type: "textarea" },
  { name: "history", labelKey: "people.history", type: "textarea" },
  { name: "experience", labelKey: "people.experience", type: "textarea" },
];
const workEditorFields = [
  { name: "attachments", legacyField: "image", labelKey: "works.attachments", type: "attachments" },
  { name: "title", labelKey: "works.title" },
  { name: "date", labelKey: "works.date" },
  { name: "people", labelKey: "works.people" },
  { name: "text", labelKey: "works.text", type: "textarea" },
  { name: "body", labelKey: "works.body", type: "textarea", rows: 8 },
];
const boardEditorFields = [
  { name: "attachments", legacyField: "image", labelKey: "board.attachments", type: "attachments" },
  { name: "title", labelKey: "board.title" },
  { name: "date", labelKey: "board.date" },
  { name: "people", labelKey: "board.people" },
  { name: "intro", labelKey: "board.intro", type: "textarea" },
  { name: "body", labelKey: "board.body", type: "textarea", rows: 8 },
];

function normalizeBoardSection(section) {
  if (section === "research" || section === "dissertation") return "publications";
  return section;
}

function normalizePeopleCategory(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (normalized === "former-members" || normalized === "past" || normalized === "alumni") return "former";
  return peopleCategoryIds.has(normalized) ? normalized : PEOPLE_CATEGORY_DEFAULT;
}

function peopleCategoryLabel(value) {
  const category = peopleCategories.find((item) => item.id === normalizePeopleCategory(value));
  return category?.title || "Members";
}

const ContentContext = createContext(defaultContent);
const ContentActionsContext = createContext({ setContentFromCms: () => {}, refreshContent: async () => {} });
const ContentStatusContext = createContext({ loading: true, loaded: false, error: null });
const AdminContext = createContext({
  authenticated: false,
  authChecked: false,
  editMode: false,
  saving: false,
  message: "",
  setAuthenticated: () => {},
  setEditMode: () => {},
  registerModeSaveHandler: () => () => {},
  saveBeforeModeChange: async () => true,
  showMessage: () => {},
  persistScopedContent: async () => {},
  uploadImage: async () => {},
  logout: async () => {},
});
const CONTENT_UPDATED_EVENT = "act4-content-updated";

function makeId(value = "item") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `item-${Date.now()}`;
}

function normalizePath(path) {
  return path.replace(/\/$/, "") || "/";
}

function decodePathSegment(value = "") {
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

function rawCurrentPath() {
  return normalizePath(window.location.pathname);
}

function isAdminRoute(path = rawCurrentPath()) {
  const normalized = normalizePath(path);
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

function stripAdminPath(path = rawCurrentPath()) {
  const normalized = normalizePath(path);
  if (normalized === "/admin") return "/";
  if (normalized.startsWith("/admin/")) return normalizePath(normalized.slice("/admin".length));
  return normalized;
}

function adminPathFor(path = "/") {
  const normalized = normalizePath(path);
  return normalized === "/" ? "/admin/" : `/admin${normalized}/`;
}

const canonicalSitePaths = new Set([
  "/about-lab",
  "/people",
  "/works",
  "/board",
  "/board/news",
  "/board/project",
  "/board/publications",
  "/contact",
]);

function canonicalSitePath(path = "/") {
  const normalized = normalizePath(path);
  return canonicalSitePaths.has(normalized) ? `${normalized}/` : normalized;
}

function siteHref(path = "/") {
  if (!path || path.startsWith("#") || /^https?:\/\//i.test(path)) return path;
  return isAdminRoute() ? adminPathFor(path) : canonicalSitePath(path);
}

function pathPartsFrom(path) {
  return normalizePath(path).split("/").filter(Boolean).map(decodePathSegment);
}

function pathParts() {
  return pathPartsFrom(stripAdminPath());
}

function useSiteContent() {
  return useContext(ContentContext);
}

function useContentActions() {
  return useContext(ContentActionsContext);
}

function useContentStatus() {
  return useContext(ContentStatusContext);
}

function useAdminSession() {
  return useContext(AdminContext);
}

function currentPagePath() {
  return stripAdminPath();
}

function getBoardItems(content, section) {
  const key = boardSections[normalizeBoardSection(section)]?.dataKey || section;
  return content.board?.[key] || [];
}

function findById(items, id, labelKey = "title") {
  const lookupId = decodePathSegment(id).trim();
  return items.find((item) => item.id === lookupId || makeId(item[labelKey]) === lookupId);
}

function findIndexById(items, id, labelKey = "title") {
  const lookupId = decodePathSegment(id).trim();
  return items.findIndex((item) => item.id === lookupId || makeId(item[labelKey]) === lookupId);
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .trim();
}

function hasText(value) {
  return stripHtml(value).length > 0;
}

const ATTACHMENT_FIELDS = new Set(["image", "photo", "logo", "attachments"]);
const DEFAULT_IMAGE_CROP = Object.freeze({ x: 0.5, y: 0.5, zoom: 1 });
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
const DEFAULT_STACK_FIELD_FONT_SIZE = 16;
const DEFAULT_STACK_TEXT_FONT_SIZE = 19;
const STACK_TEXT_ITEM_TYPE = "text";
const MIN_STACK_ITEM_RATIO = 0.02;
const MIN_FREE_ITEM_PIXEL_SIZE = 24;
const PUBLIC_FREE_CANVAS_BOTTOM_GAP = 0.05;
const PUBLIC_FILE_ATTACHMENT_HEIGHT = 0.04;
const FREE_RESIZE_HANDLES = Object.freeze(["nw", "n", "ne", "e", "se", "s", "sw", "w"]);
const ATTACHMENT_NATURAL_SIZE_TIMEOUT = 2500;
const UPLOADED_ATTACHMENT_MAX_WIDTH_RATIO = 0.65;
const FREE_COLLISION_GAP = 0.004;
const FREE_COLLISION_EPSILON = 0.0005;
const FREE_COLLISION_MAX_Y = 48;
const FREE_DRAG_AUTO_SCROLL_EDGE = 96;
const FREE_DRAG_AUTO_SCROLL_MAX_SPEED = 72;
const FREE_DRAG_WHEEL_SCROLL_MULTIPLIER = 2.5;
const CROP_DRAG_FAST_MULTIPLIER = 3;
const CROP_DRAG_FINE_MULTIPLIER = 0.5;
const CROP_ZOOM_FAST_STEP = 0.24;
const CROP_ZOOM_FINE_STEP = 0.04;
const BLOCK_DRAG_MIME = "application/x-act4-block";
const FIXED_FIELD_DRAG_MIME = "application/x-act4-fixed-field";
const PEOPLE_FIELD_DRAG_MIME = "application/x-act4-people-field";
const DETAIL_FIELD_MIN_HEIGHT_SCALE = 0.75;
const SAFE_UPLOAD_ACCEPT = ".avif,.gif,.jpg,.jpeg,.png,.webp,.avi,.m4v,.mov,.mp4,.ogv,.webm,.mp3,.ogg,.wav,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.rar,.7z";
const MAX_CLIENT_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const CHUNKED_VIDEO_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;
const CHUNKED_UPLOAD_CHUNK_BYTES = 16 * 1024 * 1024;
const VIDEO_UPLOAD_EXTENSIONS = new Set(["avi", "m4v", "mov", "mp4", "ogv", "webm"]);
const DETAIL_THUMBNAIL_QUERY_PARAMS = new Set([
  "crop",
  "fit",
  "h",
  "height",
  "size",
  "thumb",
  "thumbnail",
  "thumb_size",
  "thumbsize",
  "w",
  "width",
]);
const DETAIL_CANVAS_CONTENT_FIELD_IDS = new Set(["body"]);
const DETAIL_FIXED_INTRO_FIELD_IDS = new Set(["text", "intro", "introduction"]);

function isFixedIntroFieldId(fieldId) {
  return DETAIL_FIXED_INTRO_FIELD_IDS.has(String(fieldId || "").trim());
}

function legacyIntroFieldIdFromTextId(rawId, validFieldIds = null) {
  const match = String(rawId || "").trim().match(/^legacy-(text|intro|introduction)(?:-\d+)?$/);
  if (!match) return "";
  if (!validFieldIds) return match[1];
  if (validFieldIds.has(match[1])) return match[1];
  return ["intro", "text", "introduction"].find((fieldId) => validFieldIds.has(fieldId)) || "";
}

function legacyIntroductionTextFromLayout(contentLayout, targetFieldId = "") {
  if (!isFixedIntroFieldId(targetFieldId) || !Array.isArray(contentLayout?.items)) return "";
  const legacyItem = contentLayout.items.find((item) => (
    item?.type === STACK_TEXT_ITEM_TYPE
    && legacyIntroFieldIdFromTextId(item.id)
    && hasText(stackTextValue(item))
  ));
  return legacyItem ? stackTextValue(legacyItem) : "";
}

function legacyContentFieldIdFromTextId(rawId, validFieldIds = null) {
  const match = String(rawId || "").trim().match(/^legacy-(body)(?:-\d+)?$/);
  const fieldId = match?.[1] || "";
  if (!fieldId || !DETAIL_CANVAS_CONTENT_FIELD_IDS.has(fieldId)) return "";
  if (validFieldIds && !validFieldIds.has(fieldId)) return "";
  return fieldId;
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

function normalizeFieldSchemas(value) {
  return cloneFieldSchemas(value);
}

function moduleFieldsFor(content, moduleKey) {
  return normalizeFieldSchemas(content?.fieldSchemas)[moduleKey] || [];
}

function fieldLabelFor(content, key, fallback = DEFAULT_FIELD_LABELS[key] || key) {
  const labels = normalizeFieldLabels(content?.fieldLabels);
  return labels[key] || fallback;
}

function fieldValueFor(item = {}, moduleKey, field) {
  const nativeKey = moduleFieldNativeKey(moduleKey, field.id);
  const value = nativeKey ? item?.[nativeKey] || "" : item?.customFields?.[field.id] || "";
  if (hasText(value)) return value;
  return legacyIntroductionTextFromLayout(item?.contentLayout, field.id);
}

function withFieldValue(item = {}, moduleKey, field, value) {
  const nativeKey = moduleFieldNativeKey(moduleKey, field.id);
  if (nativeKey) return { ...item, [nativeKey]: value };
  return {
    ...item,
    customFields: {
      ...(item.customFields || {}),
      [field.id]: value,
    },
  };
}

function coverForItem(item = {}, legacyField = "image") {
  const cover = normalizeCover(item.cover, attachmentsFor(item, legacyField));
  return cover?.file || null;
}

function resolveEditorFields(content, moduleKey, item = {}) {
  return moduleFieldsFor(content, moduleKey).map((field) => ({
    ...field,
    name: field.id,
    label: field.zh,
    value: fieldValueFor(item, moduleKey, field),
  }));
}

const DETAIL_FIXED_NATIVE_FIELD_IDS = new Set(["title", "date", "people", "category"]);

function isFixedDetailInfoField(moduleKey, field) {
  if (!field?.id) return false;
  if (DETAIL_FIXED_NATIVE_FIELD_IDS.has(field.id)) return true;
  if (isFixedIntroFieldId(field.id)) return true;
  if (DETAIL_CANVAS_CONTENT_FIELD_IDS.has(field.id)) return Boolean(field.custom);
  return !moduleFieldNativeKey(moduleKey, field.id);
}

function detailFixedInfoFields(moduleKey, fields = []) {
  return fields.filter((field) => isFixedDetailInfoField(moduleKey, field));
}

function orderFixedDetailFieldsInSchema(moduleKey, fields = [], orderedFieldIds = []) {
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const orderedSet = new Set(orderedFieldIds);
  const orderedFixedFields = orderedFieldIds
    .map((fieldId) => fieldsById.get(fieldId))
    .filter((field) => field && isFixedDetailInfoField(moduleKey, field));
  const remainingFixedFields = fields.filter((field) => (
    isFixedDetailInfoField(moduleKey, field) && !orderedSet.has(field.id)
  ));
  const contentFields = fields.filter((field) => !isFixedDetailInfoField(moduleKey, field));
  return [...orderedFixedFields, ...remainingFixedFields, ...contentFields];
}

function orderFieldsInSchema(fields = [], orderedFieldIds = []) {
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const orderedSet = new Set(orderedFieldIds);
  return [
    ...orderedFieldIds.map((fieldId) => fieldsById.get(fieldId)).filter(Boolean),
    ...fields.filter((field) => !orderedSet.has(field.id)),
  ];
}

function reorderPeopleStackFieldLayout(contentLayout, orderedFieldIds = []) {
  if (contentLayout?.mode !== STACK_LAYOUT_MODE || !Array.isArray(contentLayout.items)) return contentLayout;
  const fieldItems = contentLayout.items.filter((item) => item?.type === "field");
  if (!fieldItems.length) return contentLayout;
  const slots = fieldItems
    .slice()
    .sort((left, right) => (
      stackItemRow(left) - stackItemRow(right)
      || stackItemY(left) - stackItemY(right)
      || stackItemZ(left) - stackItemZ(right)
    ));
  const itemById = new Map(fieldItems.map((item) => [item.id, item]));
  const orderedItems = [
    ...orderedFieldIds.map((fieldId) => itemById.get(fieldId)).filter(Boolean),
    ...fieldItems.filter((item) => !orderedFieldIds.includes(item.id)),
  ];
  if (orderedItems.length !== slots.length) return contentLayout;
  const nextById = new Map(orderedItems.map((item, index) => {
    const slot = slots[index];
    return [item.id, {
      ...item,
      row: stackItemRow(slot, index),
      x: stackItemX(slot),
      y: stackItemY(slot),
      w: stackItemWidth(slot, "field"),
      h: stackItemHeight({ ...slot, type: "field" }),
      z: stackItemZ(slot, index + 1),
    }];
  }));
  return {
    ...contentLayout,
    items: contentLayout.items.map((item) => (item?.type === "field" ? nextById.get(item.id) || item : item)),
  };
}

function appendFieldToSchema(moduleKey, fields = [], field) {
  if (!field) return fields;
  if (!["works", "news", "project", "publications"].includes(moduleKey)) return [...fields, field];
  const contentIndex = fields.findIndex((entry) => DETAIL_CANVAS_CONTENT_FIELD_IDS.has(entry.id));
  if (contentIndex < 0) return [...fields, field];
  return [
    ...fields.slice(0, contentIndex),
    field,
    ...fields.slice(contentIndex),
  ];
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

function normalizeMediaLayout(value, visualAttachments = []) {
  const visuals = normalizeAttachmentList(visualAttachments).filter(isVisualAttachment);
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

function normalizeCover(value, attachments = []) {
  const direct = normalizeAttachment(value?.file || value);
  const fallback = normalizeAttachmentList(attachments).find(isImageAttachment) || null;
  const file = direct || fallback;
  if (!file) return null;
  const crop = normalizeStoredCrop(value?.crop || direct?.crop);
  return {
    file: crop ? { ...file, crop } : file,
    ...(crop ? { crop } : {}),
    ...(value?.sourceAttachmentId ? { sourceAttachmentId: value.sourceAttachmentId } : {}),
  };
}

function defaultContentLayoutItem(type, id, index, total = 1) {
  const columns = type === "media" ? Math.max(1, Math.min(3, total)) : 1;
  const width = type === "media" ? (columns === 1 ? 0.54 : DEFAULT_MEDIA_ITEM_WIDTH) : 0.78;
  const height = type === "media" ? DEFAULT_MEDIA_ITEM_HEIGHT : 0.18;
  const column = type === "media" ? index % columns : 0;
  const row = type === "media" ? Math.floor(index / columns) : index;
  const gapX = type === "media" && columns > 1 ? 0.04 : 0;
  const usedWidth = columns * width + Math.max(0, columns - 1) * gapX;
  const startX = type === "media" ? (1 - usedWidth) / 2 : 0;
  return {
    id,
    type,
    x: clamp(type === "media" ? startX + column * (width + gapX) : 0, 0, 1 - width),
    y: clamp(type === "media" ? 0.08 + row * 0.18 : 0.04 + row * 0.2, 0, 1 - height),
    w: width,
    h: height,
    z: index + 1,
  };
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

function textBlockId(prefix = "text") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function editableTextFromHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");

  const blockTags = new Set([
    "ADDRESS",
    "ARTICLE",
    "ASIDE",
    "BLOCKQUOTE",
    "DIV",
    "DL",
    "FIELDSET",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "FORM",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HEADER",
    "HR",
    "LI",
    "MAIN",
    "NAV",
    "OL",
    "P",
    "PRE",
    "SECTION",
    "TABLE",
    "TBODY",
    "TD",
    "TFOOT",
    "TH",
    "THEAD",
    "TR",
    "UL",
  ]);

  const readInlineNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    if (node.tagName === "BR") return "\n";

    return blockTags.has(node.tagName)
      ? readNodes(node.childNodes)
      : Array.from(node.childNodes).map(readInlineNode).join("");
  };

  const readNodes = (nodes = []) => {
    const parts = [];
    let inlineText = "";
    const flushInlineText = () => {
      if (!inlineText) return;
      parts.push(inlineText);
      inlineText = "";
    };

    Array.from(nodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && blockTags.has(node.tagName)) {
        flushInlineText();
        parts.push(readNodes(node.childNodes));
        return;
      }
      inlineText += readInlineNode(node);
    });

    flushInlineText();
    return parts.join("\n");
  };

  return normalizeEditableText(readNodes(template.content.childNodes));
}

function insertEditableText(target, text) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) {
    target.append(document.createTextNode(text));
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function createDefaultStackItems(fields = [], attachments = []) {
  const attachmentItems = normalizeAttachmentList(attachments);
  const protectedFields = fields.filter((field) => field.protected);
  const regularFields = fields.filter((field) => !field.protected);
  const sequence = [
    ...protectedFields.map((field) => ({ type: "field", id: field.id })),
    ...attachmentItems.map((attachment) => ({ type: "attachment", id: attachment.url })),
    ...regularFields.map((field) => ({ type: "field", id: field.id })),
  ];
  let nextY = 0;
  return sequence.map((entry, index) => {
    const item = {
      ...defaultStackLayoutItem(entry.type, entry.id, index),
      x: 0,
      y: nextY,
      z: index + 1,
    };
    nextY += entry.type === "attachment" ? DEFAULT_STACK_ATTACHMENT_HEIGHT : DEFAULT_STACK_FIELD_HEIGHT;
    return item;
  });
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

function stackCollisionKey(item) {
  return `${item?.type}:${item?.id}`;
}

function stackItemRect(item) {
  const x = stackItemX(item);
  const y = stackItemY(item);
  const w = stackItemWidth(item, item?.type);
  const h = stackItemHeight(item);
  return {
    key: stackCollisionKey(item),
    x,
    y,
    w,
    h,
    right: x + w,
    bottom: y + h,
  };
}

function stackRectsOverlap(left, right) {
  return (
    left.x < right.right - FREE_COLLISION_EPSILON
    && left.right > right.x + FREE_COLLISION_EPSILON
    && left.y < right.bottom - FREE_COLLISION_EPSILON
    && left.bottom > right.y + FREE_COLLISION_EPSILON
  );
}

function rectsOverlapOnX(left, right) {
  return left.x < right.right - FREE_COLLISION_EPSILON && left.right > right.x + FREE_COLLISION_EPSILON;
}

function rectsOverlapOnY(left, right) {
  return left.y < right.bottom - FREE_COLLISION_EPSILON && left.bottom > right.y + FREE_COLLISION_EPSILON;
}

function moveRectToCandidate(item, candidate) {
  return {
    ...item,
    x: clamp(candidate.x, 0, Math.max(0, 1 - stackItemWidth(item, item?.type))),
    y: clamp(candidate.y, 0, FREE_COLLISION_MAX_Y),
  };
}

function candidateFreeRect(item, candidate) {
  return stackItemRect(moveRectToCandidate(item, candidate));
}

function placedStackRectsByKey(itemsByKey, placedKeys, targetKey) {
  return Array.from(placedKeys)
    .filter((key) => key !== targetKey)
    .map((key) => itemsByKey.get(key))
    .filter(Boolean)
    .map(stackItemRect);
}

function isStackCandidateClear(item, candidate, placedRects) {
  const rect = candidateFreeRect(item, candidate);
  return placedRects.every((placed) => !stackRectsOverlap(rect, placed));
}

function findStackCollisionCandidate(item, blocker, placedRects) {
  const itemRect = stackItemRect(item);
  const blockerRect = stackItemRect(blocker);
  const width = itemRect.w;
  const height = itemRect.h;
  const directions = [
    {
      axis: "y",
      sign: 1,
      x: itemRect.x,
      y: Math.max(itemRect.y, blockerRect.bottom + FREE_COLLISION_GAP),
      valid: (rect) => rect.y + height <= FREE_COLLISION_MAX_Y,
      adjust: (rect, placed) => (
        rectsOverlapOnX(rect, placed) && stackRectsOverlap(rect, placed)
          ? { x: rect.x, y: placed.bottom + FREE_COLLISION_GAP }
          : { x: rect.x, y: rect.y }
      ),
    },
    {
      axis: "x",
      sign: 1,
      x: blockerRect.right + FREE_COLLISION_GAP,
      y: itemRect.y,
      valid: (rect) => rect.x + width <= 1,
      adjust: (rect, placed) => (
        rectsOverlapOnY(rect, placed) && stackRectsOverlap(rect, placed)
          ? { x: placed.right + FREE_COLLISION_GAP, y: rect.y }
          : { x: rect.x, y: rect.y }
      ),
    },
    {
      axis: "x",
      sign: -1,
      x: blockerRect.x - width - FREE_COLLISION_GAP,
      y: itemRect.y,
      valid: (rect) => rect.x >= 0,
      adjust: (rect, placed) => (
        rectsOverlapOnY(rect, placed) && stackRectsOverlap(rect, placed)
          ? { x: placed.x - width - FREE_COLLISION_GAP, y: rect.y }
          : { x: rect.x, y: rect.y }
      ),
    },
    {
      axis: "y",
      sign: -1,
      x: itemRect.x,
      y: blockerRect.y - height - FREE_COLLISION_GAP,
      valid: (rect) => rect.y >= 0,
      adjust: (rect, placed) => (
        rectsOverlapOnX(rect, placed) && stackRectsOverlap(rect, placed)
          ? { x: rect.x, y: placed.y - height - FREE_COLLISION_GAP }
          : { x: rect.x, y: rect.y }
      ),
    },
  ];

  for (const direction of directions) {
    let candidate = { x: direction.x, y: direction.y };
    let changed = true;
    let guard = 0;
    while (changed && guard < placedRects.length + 2) {
      changed = false;
      guard += 1;
      const rect = candidateFreeRect(item, candidate);
      if (!direction.valid(rect)) break;
      for (const placed of placedRects) {
        const adjusted = direction.adjust(rect, placed);
        if (Math.abs(adjusted.x - candidate.x) > FREE_COLLISION_EPSILON || Math.abs(adjusted.y - candidate.y) > FREE_COLLISION_EPSILON) {
          candidate = adjusted;
          changed = true;
          break;
        }
      }
    }
    if (isStackCandidateClear(item, candidate, placedRects) && direction.valid(candidateFreeRect(item, candidate))) {
      return moveRectToCandidate(item, candidate);
    }
  }

  return moveRectToCandidate(item, { x: itemRect.x, y: Math.max(itemRect.y, blockerRect.bottom + FREE_COLLISION_GAP) });
}

function resolveStackCollisionsAfterMove(items = [], activeKey = "") {
  if (!activeKey || items.length < 2) return { items, movedKeys: [] };
  const itemsByKey = new Map(items.map((item) => [stackCollisionKey(item), item]));
  if (!itemsByKey.has(activeKey)) return { items, movedKeys: [] };
  const placedKeys = new Set([activeKey]);
  const queue = [activeKey];
  const movedKeys = new Set();
  let guard = 0;

  while (queue.length && guard < items.length * items.length * 4) {
    guard += 1;
    const blockerKey = queue.shift();
    const blocker = itemsByKey.get(blockerKey);
    if (!blocker) continue;
    const blockerRect = stackItemRect(blocker);
    const collisions = Array.from(itemsByKey.entries())
      .filter(([key]) => key !== blockerKey && !placedKeys.has(key))
      .map(([key, item]) => ({ key, item, rect: stackItemRect(item) }))
      .filter(({ rect }) => stackRectsOverlap(blockerRect, rect))
      .sort((left, right) => (
        left.rect.y - right.rect.y
        || left.rect.x - right.rect.x
        || stackItemZ(left.item) - stackItemZ(right.item)
      ));

    collisions.forEach(({ key, item }) => {
      const placedRects = placedStackRectsByKey(itemsByKey, placedKeys, key);
      const resolved = findStackCollisionCandidate(item, blocker, placedRects);
      const currentRect = stackItemRect(item);
      const nextRect = stackItemRect(resolved);
      if (Math.abs(currentRect.x - nextRect.x) > FREE_COLLISION_EPSILON || Math.abs(currentRect.y - nextRect.y) > FREE_COLLISION_EPSILON) {
        itemsByKey.set(key, resolved);
        movedKeys.add(key);
      }
      placedKeys.add(key);
      queue.push(key);
    });
  }

  return {
    items: items.map((item) => itemsByKey.get(stackCollisionKey(item)) || item),
    movedKeys: Array.from(movedKeys),
  };
}

function freeAttachmentBottom(items = []) {
  return items.reduce((bottom, item) => Math.max(bottom, stackItemY(item) + stackItemHeight(item)), 0);
}

function freeLayoutBottom(items = []) {
  return items.reduce((bottom, item) => Math.max(bottom, stackItemY(item) + stackItemHeight(item)), 0);
}

function freeAttachmentStageRatio(items = []) {
  return Math.max(0.72, freeAttachmentBottom(items) + 0.06);
}

function freeLayoutStageRatio(items = []) {
  return Math.max(0.72, freeLayoutBottom(items) + 0.08);
}

function publicStackItemHeight(item, tight = false, attachment = null) {
  if (tight && item?.type === "attachment" && attachment && !isVisualAttachment(attachment)) {
    return PUBLIC_FILE_ATTACHMENT_HEIGHT;
  }
  if (item?.type === STACK_TEXT_ITEM_TYPE) {
    return stackItemHeight(item);
  }
  if (!tight || item?.type === "attachment") return stackItemHeight(item);
  return stackItemHeight(item) * DETAIL_FIELD_MIN_HEIGHT_SCALE;
}

function publicFreeLayoutStageRatio(items = [], tight = false, itemHeight = (item) => publicStackItemHeight(item, tight)) {
  const bottom = items.reduce((currentBottom, item) => (
    Math.max(currentBottom, stackItemY(item) + itemHeight(item))
  ), 0);
  return tight ? (bottom ? bottom + PUBLIC_FREE_CANVAS_BOTTOM_GAP : 0) : Math.max(0.72, bottom + 0.08);
}

function editorFreeLayoutStageRatio(items = []) {
  return items.length ? freeLayoutBottom(items) : 0;
}

function stackItemFontSize(item) {
  const value = Number(item?.fontSize);
  return Number.isFinite(value) ? clamp(value, 10, 72) : null;
}

function stackItemHasManualSize(item) {
  return item?.manualSize === true;
}

function heightRatioMapsEqual(left = {}, right = {}) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Math.abs((left[key] || 0) - (right[key] || 0)) < 0.0005);
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

function stackRowsFromItems(items = []) {
  const rows = [];
  compactStackRows(items).forEach((item) => {
    if (!rows[item.row]) rows[item.row] = { row: item.row, items: [] };
    rows[item.row].items.push(item);
  });
  return rows.filter(Boolean);
}

function rebalanceStackRow(rowItems = []) {
  if (rowItems.length <= 1) return rowItems.map((item) => ({ ...item, w: stackItemWidth(item, item.type) }));
  const total = rowItems.reduce((sum, item) => sum + stackItemWidth(item, item.type), 0);
  if (total <= 1.001) return rowItems.map((item) => ({ ...item, w: stackItemWidth(item, item.type) }));
  const width = 1 / rowItems.length;
  return rowItems.map((item) => ({ ...item, w: width }));
}

function flattenStackRows(rows = []) {
  return rows
    .filter((rowItems) => rowItems.length)
    .flatMap((rowItems, rowIndex) => rebalanceStackRow(rowItems).map((item) => ({ ...item, row: rowIndex })));
}

function normalizeStackContentLayout(value, fields = [], attachments = []) {
  const fieldIds = new Set(fields.map((field) => field.id));
  const attachmentItems = normalizeAttachmentList(attachments);
  const attachmentIds = new Set(attachmentItems.map((attachment) => attachment.url));
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const legacyIntroTexts = new Set(
    inputItems
      .filter((item) => item?.type === STACK_TEXT_ITEM_TYPE && legacyIntroFieldIdFromTextId(item.id, fieldIds))
      .map((item) => stackTextValue(item).replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );
  const seenTextItemIds = new Set();
  const seenTextSignatures = new Set();
  const seenLegacyContentFields = new Set();
  const seenLegacyContentTexts = new Set();
  let attachmentIndex = 0;
  let fieldIndex = 0;
  const normalizedItems = inputItems
    .slice()
    .sort((left, right) => {
      if (value?.mode === STACK_LAYOUT_MODE) return 0;
      const leftY = Number(left?.y);
      const rightY = Number(right?.y);
      if (Number.isFinite(leftY) || Number.isFinite(rightY)) return (leftY || 0) - (rightY || 0);
      return (Number(left?.z) || 0) - (Number(right?.z) || 0);
    })
    .map((item, index) => {
      const type = item?.type === "attachment" || item?.type === "media"
        ? "attachment"
        : item?.type === STACK_TEXT_ITEM_TYPE
          ? STACK_TEXT_ITEM_TYPE
          : "field";
      const id = String(item?.id || item?.fieldId || item?.url || "").trim();
      if (!id) return null;
      if (type === "field" && !fieldIds.has(id)) return null;
      if (type === "attachment" && !attachmentIds.has(id)) return null;
      if (type === STACK_TEXT_ITEM_TYPE) {
        const text = stackTextValue(item);
        if (legacyIntroFieldIdFromTextId(id, fieldIds)) return null;
        if (isDuplicateTextLayoutItem(id, text, seenTextSignatures)) return null;
        const legacyFieldId = legacyContentFieldIdFromTextId(id, fieldIds);
        if (legacyFieldId) {
          const legacyText = text.replace(/\s+/g, " ").trim();
          if (legacyFieldId === "body" && legacyIntroTexts.has(legacyText)) return null;
          if (legacyText) {
            if (seenLegacyContentTexts.has(legacyText)) return null;
            seenLegacyContentTexts.add(legacyText);
          }
          if (seenLegacyContentFields.has(legacyFieldId)) return null;
          seenLegacyContentFields.add(legacyFieldId);
        }
        const textId = uniqueTextItemId(id, seenTextItemIds);
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
          ...(stackItemHasManualSize(item) ? { manualSize: true } : {}),
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

function createDefaultEditorStackItemsFrom(items = [], attachments = []) {
  const textItems = items.filter((item) => item.type === STACK_TEXT_ITEM_TYPE);
  const attachmentItems = normalizeAttachmentList(attachments);
  const sequence = [
    ...textItems.map((item) => ({ ...item, type: STACK_TEXT_ITEM_TYPE })),
    ...attachmentItems.map((attachment) => ({ type: "attachment", id: attachment.url })),
  ];
  let nextY = 0;
  return sequence.map((entry, index) => {
    const item = entry.type === "attachment"
      ? {
          ...defaultStackLayoutItem("attachment", entry.id, index),
          x: 0,
          y: nextY,
          z: index + 1,
        }
      : {
          ...defaultStackLayoutItem(STACK_TEXT_ITEM_TYPE, entry.id || textBlockId("text"), index),
          text: stackTextValue(entry),
          fontSize: stackItemFontSize(entry) || undefined,
          x: 0,
          y: nextY,
          z: index + 1,
        };
    nextY += entry.type === "attachment" ? DEFAULT_STACK_ATTACHMENT_HEIGHT : DEFAULT_STACK_TEXT_HEIGHT;
    return item;
  });
}

function normalizeEditorStackContentLayout(value, fields = [], attachments = []) {
  const fieldMap = new Map(fields.map((field) => [field.id, field]));
  const fieldIds = new Set(fields.map((field) => field.id));
  const contentFieldIds = new Set(fields.map((field) => field.id).filter((fieldId) => DETAIL_CANVAS_CONTENT_FIELD_IDS.has(fieldId)));
  const introFieldTexts = new Set(
    fields
      .filter((field) => isFixedIntroFieldId(field.id))
      .map((field) => String(field.value || "").replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );
  const duplicatesIntroFieldText = (field) => {
    const value = String(field?.value || "").replace(/\s+/g, " ").trim();
    return field?.id === "body" && value && introFieldTexts.has(value);
  };
  const attachmentItems = normalizeAttachmentList(attachments);
  const attachmentIds = new Set(attachmentItems.map((attachment) => attachment.url));
  const hasExplicitStackItems = value?.mode === STACK_LAYOUT_MODE && Array.isArray(value.items);
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const legacyIntroTexts = new Set(
    inputItems
      .filter((item) => item?.type === STACK_TEXT_ITEM_TYPE && legacyIntroFieldIdFromTextId(item.id, fieldIds))
      .map((item) => stackTextValue(item).replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );
  let fallbackIndex = 0;
  const seenTextIds = new Set();
  const seenTextSignatures = new Set();
  const seenLegacyContentFields = new Set();
  const seenLegacyContentTexts = new Set();
  const seenAttachments = new Set();
  const normalizedItems = inputItems
    .slice()
    .sort((left, right) => {
      if (value?.mode === STACK_LAYOUT_MODE) return 0;
      const leftY = Number(left?.y);
      const rightY = Number(right?.y);
      if (Number.isFinite(leftY) || Number.isFinite(rightY)) return (leftY || 0) - (rightY || 0);
      return (Number(left?.z) || 0) - (Number(right?.z) || 0);
    })
    .map((item, index) => {
      const type = item?.type === "attachment" || item?.type === "media"
        ? "attachment"
        : item?.type === STACK_TEXT_ITEM_TYPE
          ? STACK_TEXT_ITEM_TYPE
          : "field";
      const rawId = String(item?.id || item?.fieldId || item?.url || "").trim();
      if (!rawId) return null;
      if (type === "attachment") {
        if (!attachmentIds.has(rawId)) return null;
        seenAttachments.add(rawId);
        const fallbackY = fallbackIndex * DEFAULT_STACK_ATTACHMENT_HEIGHT;
        fallbackIndex += 1;
        return {
          id: rawId,
          type,
          row: stackItemRow(item, index),
          x: stackItemX(item),
          y: stackItemY(item, fallbackY),
          w: stackItemWidth(item, type),
          h: stackItemHeight(item),
          z: stackItemZ(item, index + 1),
        };
      }
      if (type === STACK_TEXT_ITEM_TYPE) {
        const text = stackTextValue(item);
        if (legacyIntroFieldIdFromTextId(rawId, fieldIds)) return null;
        if (isDuplicateTextLayoutItem(rawId, text, seenTextSignatures)) return null;
        const legacyFieldId = legacyContentFieldIdFromTextId(rawId, contentFieldIds);
        if (legacyFieldId) {
          const legacyText = text.replace(/\s+/g, " ").trim();
          if (legacyFieldId === "body" && legacyIntroTexts.has(legacyText)) return null;
          if (legacyText) {
            if (seenLegacyContentTexts.has(legacyText)) return null;
            seenLegacyContentTexts.add(legacyText);
          }
          if (seenLegacyContentFields.has(legacyFieldId)) return null;
          seenLegacyContentFields.add(legacyFieldId);
        }
        const id = uniqueTextItemId(rawId, seenTextIds);
        const fallbackY = fallbackIndex * DEFAULT_STACK_TEXT_HEIGHT;
        fallbackIndex += 1;
        const fontSize = stackItemFontSize(item);
        return {
          id,
          type,
          text,
          row: stackItemRow(item, index),
          x: stackItemX(item),
          y: stackItemY(item, fallbackY),
          w: stackItemWidth(item, type),
          h: stackItemHeight({ ...item, type }),
          z: stackItemZ(item, index + 1),
          ...(fontSize ? { fontSize } : {}),
          ...(stackItemHasManualSize(item) ? { manualSize: true } : {}),
        };
      }
      const field = fieldMap.get(rawId);
      if (!field || !DETAIL_CANVAS_CONTENT_FIELD_IDS.has(field.id) || !hasText(field.value) || duplicatesIntroFieldText(field)) return null;
      const legacyText = String(field.value || "").replace(/\s+/g, " ").trim();
      if (legacyText) {
        if (seenLegacyContentTexts.has(legacyText)) return null;
        seenLegacyContentTexts.add(legacyText);
      }
      if (seenLegacyContentFields.has(field.id)) return null;
      seenLegacyContentFields.add(field.id);
      const id = uniqueTextItemId(`legacy-${field.id}`, seenTextIds);
      const fallbackY = fallbackIndex * DEFAULT_STACK_TEXT_HEIGHT;
      fallbackIndex += 1;
      const fontSize = stackItemFontSize(item);
      return {
        id,
        type: STACK_TEXT_ITEM_TYPE,
        text: field.value,
        row: stackItemRow(item, index),
        x: stackItemX(item),
        y: stackItemY(item, fallbackY),
        w: stackItemWidth({ ...item, type: STACK_TEXT_ITEM_TYPE }, STACK_TEXT_ITEM_TYPE),
        h: stackItemHeight({ ...item, type: STACK_TEXT_ITEM_TYPE }),
        z: stackItemZ(item, index + 1),
        ...(fontSize ? { fontSize } : {}),
        ...(stackItemHasManualSize(item) ? { manualSize: true } : {}),
      };
    })
    .filter(Boolean);
  const compactedItems = compactStackRows(normalizedItems);
  let nextRow = compactedItems.reduce((maxRow, item) => Math.max(maxRow, item.row), -1) + 1;
  let nextY = freeLayoutBottom(compactedItems);
  let nextZ = compactedItems.reduce((maxZ, item) => Math.max(maxZ, stackItemZ(item, maxZ + 1)), 0) + 1;
  const missingTextItems = hasExplicitStackItems ? [] : fields
    .filter((field) => DETAIL_CANVAS_CONTENT_FIELD_IDS.has(field.id) && hasText(field.value) && !duplicatesIntroFieldText(field) && !seenLegacyContentFields.has(field.id) && !seenTextIds.has(`legacy-${field.id}`))
    .map((field, index) => {
      const item = {
        ...defaultStackLayoutItem(STACK_TEXT_ITEM_TYPE, `legacy-${field.id}`, nextRow + index),
        text: field.value,
        y: nextY,
        z: nextZ,
      };
      nextY += DEFAULT_STACK_TEXT_HEIGHT;
      nextZ += 1;
      return item;
    });
  nextRow += missingTextItems.length;
  const missingAttachments = hasExplicitStackItems ? [] : attachmentItems
    .filter((attachment) => !seenAttachments.has(attachment.url))
    .map((attachment, index) => {
      const item = {
        ...defaultStackLayoutItem("attachment", attachment.url, nextRow + index),
        x: 0,
        y: nextY,
        z: nextZ,
      };
      nextY += DEFAULT_STACK_ATTACHMENT_HEIGHT;
      nextZ += 1;
      return item;
    });
  return {
    mode: STACK_LAYOUT_MODE,
    items: compactStackRows([...compactedItems, ...missingTextItems, ...missingAttachments]),
  };
}

function normalizeContentLayout(value, fields = [], attachments = []) {
  if (value?.mode === STACK_LAYOUT_MODE) {
    return normalizeStackContentLayout(value, fields, attachments);
  }
  const fieldIds = new Set(fields.map((field) => field.id));
  const visualAttachments = normalizeAttachmentList(attachments).filter(isVisualAttachment);
  const mediaIds = new Set(visualAttachments.map((attachment) => attachment.url));
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const normalizedItems = inputItems
    .map((item, index) => {
      const type = item?.type === "media" ? "media" : "field";
      const id = String(item?.id || item?.fieldId || item?.url || "").trim();
      if (!id || (type === "field" && !fieldIds.has(id)) || (type === "media" && !mediaIds.has(id))) return null;
      const minWidth = type === "media" ? 0.12 : 0.2;
      const minHeight = type === "media" ? 0.12 : 0.14;
      const width = clamp(Number.isFinite(Number(item?.w)) ? Number(item.w) : type === "media" ? DEFAULT_MEDIA_ITEM_WIDTH : 0.78, minWidth, 1);
      const height = clamp(Number.isFinite(Number(item?.h)) ? Number(item.h) : type === "media" ? DEFAULT_MEDIA_ITEM_HEIGHT : 0.18, minHeight, 1);
      return {
        id,
        type,
        x: clamp(Number.isFinite(Number(item?.x)) ? Number(item.x) : 0, 0, 1 - width),
        y: clamp(Number.isFinite(Number(item?.y)) ? Number(item.y) : 0, 0, 1 - height),
        w: width,
        h: height,
        z: Math.max(1, Math.round(Number(item?.z) || index + 1)),
      };
    })
    .filter(Boolean);
  const seen = new Set(normalizedItems.map((item) => `${item.type}:${item.id}`));
  const missingFields = fields
    .filter((field) => !seen.has(`field:${field.id}`))
    .map((field, index) => defaultContentLayoutItem("field", field.id, normalizedItems.length + index, fields.length));
  const missingMedia = visualAttachments
    .filter((attachment) => !seen.has(`media:${attachment.url}`))
    .map((attachment, index) => defaultContentLayoutItem("media", attachment.url, normalizedItems.length + missingFields.length + index, visualAttachments.length));
  const items = [...normalizedItems, ...missingFields, ...missingMedia];
  if (!items.length) return null;
  const ratio = Number(value?.canvasRatio);
  return {
    canvasRatio: Number.isFinite(ratio) && ratio > 0 ? clamp(ratio, 0.6, 3) : DEFAULT_LAYOUT_CANVAS_RATIO,
    items,
  };
}

function cropForAttachment(value) {
  const attachment = normalizeAttachment(value);
  return attachment?.crop || DEFAULT_IMAGE_CROP;
}

function imageCropStyle(value) {
  const crop = cropForAttachment(value);
  return {
    objectPosition: `${Math.round(crop.x * 1000) / 10}% ${Math.round(crop.y * 1000) / 10}%`,
    transform: crop.zoom === 1 ? undefined : `scale(${crop.zoom})`,
    transformOrigin: `${Math.round(crop.x * 1000) / 10}% ${Math.round(crop.y * 1000) / 10}%`,
  };
}

function attachmentUrl(value) {
  if (!value) return "";
  if (Array.isArray(value)) return attachmentUrl(value.find((item) => hasText(attachmentUrl(item))));
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") return String(value.url || value.src || value.href || "").trim();
  return "";
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

function originalAttachmentUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(raw);
    const base = typeof window !== "undefined" ? window.location.origin : "https://act4.local";
    const parsed = new URL(raw, base);
    let changed = false;
    [...parsed.searchParams.keys()].forEach((key) => {
      if (!DETAIL_THUMBNAIL_QUERY_PARAMS.has(key.toLowerCase())) return;
      parsed.searchParams.delete(key);
      changed = true;
    });
    if (!changed) return raw;
    return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return raw;
  }
}

function detailAttachment(value) {
  const attachment = normalizeAttachment(value);
  if (!attachment) return null;
  const url = originalAttachmentUrl(attachment.url);
  return url && url !== attachment.url ? { ...attachment, url } : attachment;
}

function fileNameFromUrl(url) {
  const clean = String(url || "").split(/[?#]/)[0];
  const name = clean.split("/").filter(Boolean).at(-1) || "attachment";
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
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
  };
  return map[ext] || "";
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

function normalizeAttachmentList(...values) {
  const seen = new Set();
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => normalizeAttachment(value))
    .filter((attachment) => attachment && !isPlaceholderMedia(attachment))
    .filter((attachment) => {
      if (seen.has(attachment.url)) return false;
      seen.add(attachment.url);
      return true;
    });
}

function hasExplicitAttachments(value = {}) {
  return Object.prototype.hasOwnProperty.call(value, "attachments");
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

function filterAttachmentsByStackLayout(attachments = [], layout = null) {
  const attachmentIds = stackLayoutAttachmentIds(layout);
  const normalized = normalizeAttachmentList(attachments);
  if (!attachmentIds) return normalized;
  return normalized.filter((attachment) => attachmentIds.has(attachment.url));
}

function attachmentsFor(item = {}, legacyField = "image") {
  return hasExplicitAttachments(item)
    ? normalizeAttachmentList(item.attachments)
    : normalizeAttachmentList(item[legacyField]);
}

function primaryAttachmentFor(item = {}, legacyField = "image") {
  return attachmentsFor(item, legacyField)[0] || null;
}

function primaryVisualForCard(item = {}, legacyField = "image") {
  return coverForItem(item, legacyField) || primaryAttachmentFor(item, legacyField);
}

function withAttachmentCompatibility(values = {}, legacyField = "image") {
  const attachments = hasExplicitAttachments(values)
    ? normalizeAttachmentList(values.attachments)
    : normalizeAttachmentList(values.attachments, values[legacyField]);
  return {
    ...values,
    attachments,
    [legacyField]: attachments[0] || "",
  };
}

function moveArrayItem(items = [], fromIndex, toIndex) {
  const list = [...items];
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return list;
  const [item] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, item);
  return list;
}

function sortableProps(active, index, onMove) {
  if (!active || typeof onMove !== "function") return {};
  return {
    draggable: true,
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
      event.currentTarget.classList.add("is-dragging");
    },
    onDragEnd: (event) => {
      event.currentTarget.classList.remove("is-dragging");
      document.querySelectorAll(".is-drag-over").forEach((node) => node.classList.remove("is-drag-over"));
    },
    onDragOver: (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onDragEnter: (event) => {
      event.currentTarget.classList.add("is-drag-over");
    },
    onDragLeave: (event) => {
      event.currentTarget.classList.remove("is-drag-over");
    },
    onDrop: (event) => {
      event.preventDefault();
      event.currentTarget.classList.remove("is-drag-over");
      const fromIndex = Number(event.dataTransfer.getData("text/plain"));
      if (Number.isInteger(fromIndex)) onMove(fromIndex, index);
    },
  };
}

function moveControlProps(active, position, total, onMove) {
  if (!active || typeof onMove !== "function") return {};
  return {
    onMoveUp: position > 0 ? () => onMove(position, position - 1) : null,
    onMoveDown: position < total - 1 ? () => onMove(position, position + 1) : null,
  };
}

function manualSortKey(sectionKey) {
  return sectionKey ? `board.${sectionKey}` : "";
}

function hasManualSort(content, key) {
  return Boolean(key && content?.manualSort?.[key]);
}

function markManualSort(content, key) {
  if (!key) return content;
  return {
    ...content,
    manualSort: {
      ...(content.manualSort || {}),
      [key]: true,
    },
  };
}

function timestampNow() {
  return new Date().toISOString();
}

function isPlaceholderMedia(value) {
  const source = attachmentUrl(value);
  if (!source) return false;
  return /(^|\/)(placeholder|empty-media|sample-placeholder)(?:[.-][^/?#]+)?\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(source);
}

function hasMedia(value) {
  if (Array.isArray(value)) return normalizeAttachmentList(value).length > 0;
  return hasText(attachmentUrl(value)) && !isPlaceholderMedia(value);
}

function hasContentValue(item, key) {
  const value = item?.[key];
  if (Array.isArray(value)) return key === "attachments" ? hasMedia(value) : value.some(hasText);
  if (ATTACHMENT_FIELDS.has(key)) return hasMedia(value);
  return hasText(value);
}

function hasAnyText(item, keys) {
  return keys.some((key) => hasText(item?.[key]));
}

const PEOPLE_CONTENT_FIELDS = ["attachments", "photo", "name", "title", "email", "interests", "history", "experience", "academicAbility", "customFields"];
const WORK_CONTENT_FIELDS = ["attachments", "image", "title", "date", "text", "people", "body"];
const BOARD_LIST_FIELDS = ["title", "date"];
const BOARD_TEXT_FIELDS = ["title", "date", "intro", "people", "body"];
const BOARD_CONTENT_FIELDS = ["attachments", "image", ...BOARD_TEXT_FIELDS];
const ABOUT_SECTION_FIELDS = ["number", "title", "paragraphs"];
const FRONT_HIDDEN_FIELD_IDS = {
  people: new Set(["name"]),
  works: new Set(["title"]),
  news: new Set(["title"]),
  project: new Set(["title"]),
  publications: new Set(["title"]),
};

function hasAnyValue(item, keys) {
  return keys.some((key) => hasContentValue(item, key));
}

function renderableModuleFields(content, moduleKey, item = {}) {
  return moduleFieldsFor(content, moduleKey)
    .filter((field) => !FRONT_HIDDEN_FIELD_IDS[moduleKey]?.has(field.id))
    .map((field) => ({ field, value: fieldValueFor(item, moduleKey, field) }))
    .filter(({ value }) => hasText(value));
}

function isEmptyContentItem(item, keys) {
  return !hasAnyValue(item, keys);
}

function indexedRenderableItems(items = [], keys, includeEmpty = false) {
  return (items || [])
    .map((item, index) => ({ item, index, isEmpty: isEmptyContentItem(item, keys) }))
    .filter(({ isEmpty }) => includeEmpty || !isEmpty);
}

function parseDateStamp(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) return Date.UTC(Number(yearOnly[1]), 0, 1);
  const numericDate = text.match(/^(\d{4})[-./年](\d{1,2})(?:[-./月](\d{1,2}))?/);
  if (numericDate) {
    const year = Number(numericDate[1]);
    const month = Number(numericDate[2]) - 1;
    const day = Number(numericDate[3] || 1);
    const stamp = Date.UTC(year, month, day);
    return Number.isFinite(stamp) ? stamp : null;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function itemSortStamp(item = {}) {
  const createdStamp = parseDateStamp(item.createdAt);
  if (createdStamp !== null) return createdStamp;
  const dateStamp = parseDateStamp(item.date);
  if (dateStamp !== null) return dateStamp;
  const attachmentStamps = normalizeAttachmentList(item.attachments, item.image, item.photo)
    .map((attachment) => parseDateStamp(attachment.createdAt))
    .filter((stamp) => stamp !== null);
  return attachmentStamps.length ? Math.max(...attachmentStamps) : null;
}

function orderedRenderableItems(items = [], keys, includeEmpty = false, content = null, orderKey = "") {
  const entries = indexedRenderableItems(items, keys, includeEmpty);
  if (hasManualSort(content, orderKey)) return entries;
  return [...entries].sort((left, right) => {
    const leftStamp = itemSortStamp(left.item);
    const rightStamp = itemSortStamp(right.item);
    if (leftStamp !== null || rightStamp !== null) {
      if (leftStamp === null) return 1;
      if (rightStamp === null) return -1;
      if (leftStamp !== rightStamp) return rightStamp - leftStamp;
    }
    return left.index - right.index;
  });
}

function reorderItemsFromEntries(items = [], entries = [], fromPosition, toPosition) {
  const visibleIndexes = entries.map(({ index }) => index);
  const visibleIndexSet = new Set(visibleIndexes);
  const visibleItems = visibleIndexes.map((index) => items[index]).filter(Boolean);
  const movedVisibleItems = moveArrayItem(visibleItems, fromPosition, toPosition);
  const hiddenItems = items.filter((_, index) => !visibleIndexSet.has(index));
  return [...movedVisibleItems, ...hiddenItems];
}

function peopleDragProps(active, categoryId, position, onMove) {
  if (!active || typeof onMove !== "function") return {};
  return {
    draggable: true,
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify({ categoryId, position }));
      event.currentTarget.classList.add("is-dragging");
    },
    onDragEnd: (event) => {
      event.currentTarget.classList.remove("is-dragging");
      document.querySelectorAll(".is-drag-over").forEach((node) => node.classList.remove("is-drag-over"));
    },
    onDragOver: (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onDragEnter: (event) => {
      event.currentTarget.classList.add("is-drag-over");
    },
    onDragLeave: (event) => {
      event.currentTarget.classList.remove("is-drag-over");
    },
    onDrop: (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.remove("is-drag-over");
      const payload = readPeopleDragPayload(event);
      if (payload.categoryId && Number.isInteger(payload.position)) onMove(payload.categoryId, payload.position, categoryId, position);
    },
  };
}

function readPeopleDragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain") || "{}");
  } catch {
    return {};
  }
}

function peopleDropZoneProps(active, categoryId, position, onMove) {
  if (!active || typeof onMove !== "function") return {};
  return {
    onDragOver: (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onDragEnter: (event) => {
      event.currentTarget.classList.add("is-drag-over");
    },
    onDragLeave: (event) => {
      event.currentTarget.classList.remove("is-drag-over");
    },
    onDrop: (event) => {
      event.preventDefault();
      event.currentTarget.classList.remove("is-drag-over");
      const payload = readPeopleDragPayload(event);
      if (payload.categoryId && Number.isInteger(payload.position)) onMove(payload.categoryId, payload.position, categoryId, position);
    },
  };
}

function reorderPeopleByCategory(items = [], categoryGroups = [], fromCategoryId, fromPosition, toCategoryId, toPosition) {
  const buckets = new Map();
  const visibleIndexSet = new Set();
  categoryGroups.forEach((group) => {
    buckets.set(group.id, (group.entries || []).map(({ item, index }) => {
      visibleIndexSet.add(index);
      return { ...item, category: normalizePeopleCategory(item.category || group.id) };
    }));
  });
  const sourceBucket = buckets.get(normalizePeopleCategory(fromCategoryId)) || [];
  const targetCategoryId = normalizePeopleCategory(toCategoryId);
  const targetBucket = buckets.get(targetCategoryId) || [];
  const [movedItem] = sourceBucket.splice(fromPosition, 1);
  if (!movedItem) return items;
  targetBucket.splice(toPosition, 0, { ...movedItem, category: targetCategoryId });
  buckets.set(targetCategoryId, targetBucket);
  const hiddenItems = items.filter((_, index) => !visibleIndexSet.has(index));
  return [
    ...peopleCategories.flatMap((category) => buckets.get(category.id) || []),
    ...hiddenItems,
  ];
}

function visiblePeople(people = []) {
  return people.filter((person) => hasAnyValue(person, PEOPLE_CONTENT_FIELDS));
}

function visibleWorks(works = []) {
  return works.filter((work) => hasAnyValue(work, WORK_CONTENT_FIELDS));
}

function visibleBoardItems(content, section) {
  return getBoardItems(content, section).filter((item) => hasAnyValue(item, BOARD_CONTENT_FIELDS));
}

function visibleBoardTextItems(content, section) {
  return getBoardItems(content, section).filter((item) => hasAnyValue(item, BOARD_TEXT_FIELDS));
}

function EmptyEntryPlaceholder({ label = "Empty item" }) {
  return (
    <div className="admin-empty-placeholder">
      <Plus size={18} />
      <span>添加内容</span>
      <small>{label}</small>
    </div>
  );
}

function EmptyMediaPlaceholder({ label = "未上传附件" }) {
  return (
    <div className="admin-empty-media">
      <Paperclip size={18} />
      <span>{label}</span>
    </div>
  );
}

function formatFileSize(size) {
  if (!size) return "";
  const units = ["B", "KB", "MB", "GB"];
  let nextSize = Number(size);
  let unitIndex = 0;
  while (nextSize >= 1024 && unitIndex < units.length - 1) {
    nextSize /= 1024;
    unitIndex += 1;
  }
  return `${nextSize >= 10 || unitIndex === 0 ? Math.round(nextSize) : nextSize.toFixed(1)} ${units[unitIndex]}`;
}

function uploadFailureReason(data = {}, response = null) {
  if (data?.error) return data.error;
  if (!response) return "网络连接中断，文件未上传成功，请检查连接后重试。";
  if (response.status === 413) return `文件过大，当前上传上限为 ${formatFileSize(MAX_CLIENT_UPLOAD_BYTES)}。`;
  if (response.status === 415) return "不支持的文件格式，仅支持 MP4、MOV、AVI、M4V、OGV、WEBM 等视频，以及图片、文档等常见附件。";
  return "服务器未返回具体原因，请稍后重试。";
}

function uploadExtensionFromName(name = "") {
  return String(name || "").includes(".")
    ? String(name).split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
}

function isVideoUploadFile(file) {
  const extension = uploadExtensionFromName(file?.name);
  return String(file?.type || "").toLowerCase().startsWith("video/") || VIDEO_UPLOAD_EXTENSIONS.has(extension);
}

function shouldUseChunkedUpload(file) {
  return isVideoUploadFile(file) && Number(file?.size || 0) > CHUNKED_VIDEO_UPLOAD_THRESHOLD_BYTES;
}

function makeChunkedUploadKey(file) {
  const extension = uploadExtensionFromName(file?.name) || "bin";
  const randomId = globalThis.crypto?.randomUUID?.() || Math.random().toString(16).slice(2);
  return `${Date.now()}-${randomId}.${extension}`;
}

async function uploadDirectAttachments(files) {
  const body = new FormData();
  files.forEach((file) => body.append("file", file));
  const response = await fetch("/api/upload", { method: "POST", body }).catch(() => null);
  const data = response ? await response.json().catch(() => ({})) : {};
  if (!response?.ok) throw new Error(uploadFailureReason(data, response));
  const uploaded = data.attachments || [data.attachment || data].filter(Boolean);
  if (!uploaded.length) throw new Error("服务端未返回附件信息。");
  return uploaded;
}

async function uploadChunkedVideoAttachment(file) {
  const uploadId = makeChunkedUploadKey(file);
  const chunkCount = Math.ceil(file.size / CHUNKED_UPLOAD_CHUNK_BYTES);
  let attachment = null;

  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * CHUNKED_UPLOAD_CHUNK_BYTES;
    const chunk = file.slice(start, Math.min(file.size, start + CHUNKED_UPLOAD_CHUNK_BYTES), file.type || "application/octet-stream");
    const body = new FormData();
    body.append("file", chunk, file.name);
    body.append("uploadId", uploadId);
    body.append("fileName", file.name);
    body.append("fileType", file.type || "");
    body.append("fileSize", String(file.size));
    body.append("chunkIndex", String(index));
    body.append("chunkCount", String(chunkCount));
    body.append("chunkSize", String(CHUNKED_UPLOAD_CHUNK_BYTES));

    const response = await fetch("/api/upload-chunk", { method: "POST", body }).catch(() => null);
    const data = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) throw new Error(uploadFailureReason(data, response));
    if (data.attachment) attachment = data.attachment;
  }

  if (!attachment) throw new Error("服务端未完成视频分片合并。");
  return attachment;
}

async function uploadAttachmentsToServer(fileList) {
  const uploaded = [];
  let directFiles = [];

  const flushDirectFiles = async () => {
    if (!directFiles.length) return;
    uploaded.push(...await uploadDirectAttachments(directFiles));
    directFiles = [];
  };

  for (const file of fileList) {
    if (shouldUseChunkedUpload(file)) {
      await flushDirectFiles();
      uploaded.push(await uploadChunkedVideoAttachment(file));
    } else {
      directFiles.push(file);
    }
  }
  await flushDirectFiles();
  return uploaded;
}

function isImageAttachment(attachment) {
  return attachment.type?.startsWith("image/") || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(attachment.url);
}

function isVideoAttachment(attachment) {
  return attachment.type?.startsWith("video/") || /\.(avi|m4v|mov|mp4|ogv|webm)$/i.test(attachment.url);
}

function isAudioAttachment(attachment) {
  return attachment.type?.startsWith("audio/") || /\.(mp3|ogg|wav)$/i.test(attachment.url);
}

function attachmentExtension(attachment) {
  return String(attachment?.url || attachment?.name || "")
    .split(/[?#]/)[0]
    .split(".")
    .pop()
    ?.toLowerCase() || "";
}

function isSpreadsheetAttachment(attachment) {
  const type = attachment.type || "";
  const ext = attachmentExtension(attachment);
  return /spreadsheet|excel|csv/i.test(type) || ["csv", "xls", "xlsx", "numbers"].includes(ext);
}

function isArchiveAttachment(attachment) {
  const type = attachment.type || "";
  const ext = attachmentExtension(attachment);
  return /zip|rar|7z|tar|gzip|compressed|archive/i.test(type) || ["zip", "rar", "7z", "tar", "gz"].includes(ext);
}

function attachmentKind(attachment) {
  const ext = attachmentExtension(attachment);
  const type = attachment.type || "";
  if (isVideoAttachment(attachment)) return { label: "VIDEO", className: "video" };
  if (isAudioAttachment(attachment)) return { label: "AUDIO", className: "audio" };
  if (type === "application/pdf" || ext === "pdf") return { label: "PDF", className: "pdf" };
  if (/word/i.test(type) || ["doc", "docx", "pages"].includes(ext)) return { label: "DOC", className: "doc" };
  if (isSpreadsheetAttachment(attachment)) return { label: "SHEET", className: "sheet" };
  if (/presentation|powerpoint/i.test(type) || ["ppt", "pptx", "key"].includes(ext)) return { label: "SLIDE", className: "slide" };
  if (isArchiveAttachment(attachment)) return { label: "ARCHIVE", className: "archive" };
  return { label: ext ? ext.toUpperCase() : "FILE", className: "file" };
}

function isPreviewableAttachment(attachment) {
  return isImageAttachment(attachment) || isVideoAttachment(attachment) || isAudioAttachment(attachment) || attachment.type === "application/pdf" || /\.pdf$/i.test(attachment.url);
}

function isPdfAttachment(attachment) {
  return attachment.type === "application/pdf" || attachmentExtension(attachment) === "pdf";
}

function canPreviewInDetailModal(attachment) {
  return isImageAttachment(attachment) || isVideoAttachment(attachment) || isAudioAttachment(attachment) || isPdfAttachment(attachment);
}

const VIDEO_PLAYBACK_CACHE_PARAM = "act4_seek";
const VIDEO_PLAYBACK_CACHE_VALUE = "20260520";
const VIDEO_PLAYBACK_SEEK_FRAGMENT = "t=0.001";

function videoPlaybackUrl(attachment) {
  const sourceUrl = originalAttachmentUrl(attachment?.url || "");
  if (!sourceUrl || !isVideoAttachment(attachment)) return sourceUrl;
  try {
    const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(sourceUrl);
    const base = typeof window !== "undefined" ? window.location.origin : "https://act4.local";
    const parsed = new URL(sourceUrl, base);
    if (!parsed.pathname.startsWith("/uploads/")) return sourceUrl;
    parsed.searchParams.set(VIDEO_PLAYBACK_CACHE_PARAM, VIDEO_PLAYBACK_CACHE_VALUE);
    parsed.hash = VIDEO_PLAYBACK_SEEK_FRAGMENT;
    return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return sourceUrl;
  }
}

function isVisualAttachment(attachment) {
  return isImageAttachment(attachment) || isVideoAttachment(attachment);
}

function loadAttachmentNaturalSize(attachment) {
  if (typeof window === "undefined") return Promise.resolve(null);
  const sourceUrl = originalAttachmentUrl(attachment?.url || "");
  if (!sourceUrl || !isVisualAttachment(attachment)) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (size) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(size?.width > 0 && size?.height > 0 ? size : null);
    };
    const timer = window.setTimeout(() => finish(null), ATTACHMENT_NATURAL_SIZE_TIMEOUT);
    if (isImageAttachment(attachment)) {
      const image = new Image();
      image.onload = () => finish({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => finish(null);
      image.src = sourceUrl;
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => finish({ width: video.videoWidth, height: video.videoHeight });
    video.onerror = () => finish(null);
    video.src = sourceUrl;
  });
}

function attachmentStackSizeFromNaturalSize(size, stageWidth) {
  const canvasWidth = Number(stageWidth);
  if (!size?.width || !size?.height || !Number.isFinite(canvasWidth) || canvasWidth <= 0) return null;
  const maxDisplayWidth = canvasWidth * UPLOADED_ATTACHMENT_MAX_WIDTH_RATIO;
  const scale = size.width > maxDisplayWidth ? maxDisplayWidth / size.width : 1;
  return {
    w: clamp((size.width * scale) / canvasWidth, MIN_STACK_ITEM_RATIO, 1),
    h: clamp((size.height * scale) / canvasWidth, MIN_STACK_ITEM_RATIO, 3),
  };
}

async function uploadedAttachmentStackSize(attachment, stageWidth) {
  const naturalSize = await loadAttachmentNaturalSize(attachment);
  return attachmentStackSizeFromNaturalSize(naturalSize, stageWidth);
}

function triggerAttachmentDownload(attachment) {
  if (!attachment?.url) return;
  const link = document.createElement("a");
  link.href = attachment.url;
  link.download = attachment.name || fileNameFromUrl(attachment.url);
  link.rel = "noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function AttachmentIcon({ attachment, size = 28 }) {
  if (isVideoAttachment(attachment)) return <Film size={size} />;
  if (isAudioAttachment(attachment)) return <Music size={size} />;
  if (isSpreadsheetAttachment(attachment)) return <FileSpreadsheet size={size} />;
  if (isArchiveAttachment(attachment)) return <FileArchive size={size} />;
  return <FileText size={size} />;
}

function AttachmentFileCard({ attachment, showName = true }) {
  const kind = attachmentKind(attachment);
  const meta = [formatFileSize(attachment.size), attachment.type || "file"].filter(Boolean).join(" / ");
  return (
    <>
      <span className="attachment-icon">
        <AttachmentIcon attachment={attachment} />
      </span>
      <span className="attachment-type">{kind.label}</span>
      {showName ? <span className="attachment-name">{attachment.name}</span> : null}
      {showName && meta ? <small className="attachment-meta">{meta}</small> : null}
    </>
  );
}

function isGeneratedVideoPosterTooDark(context, width, height) {
  try {
    const data = context.getImageData(0, 0, width, height).data;
    const step = Math.max(1, Math.floor((width * height) / 600));
    let luminanceTotal = 0;
    let samples = 0;
    for (let pixel = 0; pixel < width * height; pixel += step) {
      const offset = pixel * 4;
      luminanceTotal += (data[offset] * 0.2126) + (data[offset + 1] * 0.7152) + (data[offset + 2] * 0.0722);
      samples += 1;
    }
    return samples > 0 && luminanceTotal / samples < 16;
  } catch {
    return true;
  }
}

function useGeneratedVideoPoster(sourceUrl, enabled) {
  const [posterUrl, setPosterUrl] = useState("");

  useEffect(() => {
    setPosterUrl("");
    if (!enabled || !sourceUrl || typeof document === "undefined") return undefined;
    let cancelled = false;
    const video = document.createElement("video");
    const finish = (nextPoster = "") => {
      if (cancelled) return;
      window.clearTimeout(timer);
      setPosterUrl(nextPoster);
    };
    const capture = () => {
      if (!video.videoWidth || !video.videoHeight) {
        finish("");
        return;
      }
      try {
        const canvas = document.createElement("canvas");
        const width = Math.min(video.videoWidth, 640);
        const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          finish("");
          return;
        }
        context.drawImage(video, 0, 0, width, height);
        if (isGeneratedVideoPosterTooDark(context, width, height)) {
          finish("");
          return;
        }
        finish(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        finish("");
      }
    };
    const seekOrCapture = () => {
      if (cancelled) return;
      const duration = Number(video.duration);
      if (Number.isFinite(duration) && duration > 0.2) {
        video.currentTime = Math.min(0.12, duration / 2);
      } else {
        capture();
      }
    };
    const timer = window.setTimeout(() => finish(""), 3600);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("loadedmetadata", seekOrCapture, { once: true });
    video.addEventListener("loadeddata", capture, { once: true });
    video.addEventListener("seeked", capture, { once: true });
    video.addEventListener("error", () => finish(""), { once: true });
    video.src = sourceUrl;
    video.load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
    };
  }, [enabled, sourceUrl]);

  return posterUrl;
}

function videoPosterForAttachment(attachment, fallbackPoster = null) {
  return normalizePosterAttachment(attachment?.poster) || normalizePosterAttachment(fallbackPoster);
}

function VideoPosterFrame({ attachment, sourceUrl, fallbackPoster = null, showName = false, playIconSize = 28 }) {
  const poster = videoPosterForAttachment(attachment, fallbackPoster);
  const explicitPosterUrl = poster ? originalAttachmentUrl(poster.url) : "";
  const generatedPosterUrl = useGeneratedVideoPoster(sourceUrl, !explicitPosterUrl);
  const posterUrl = explicitPosterUrl || generatedPosterUrl;
  return (
    <>
      <span className="attachment-video-frame">
        {posterUrl ? (
          <img className="attachment-video-poster" src={posterUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        ) : (
          <span className="attachment-video-placeholder" aria-hidden="true">
            <Film size={Math.max(24, playIconSize + 6)} />
          </span>
        )}
        <span className="attachment-video-play-indicator" aria-hidden="true">
          <Play size={playIconSize} fill="currentColor" />
        </span>
      </span>
      {showName ? <span className="attachment-name">{attachment.name}</span> : null}
    </>
  );
}

function AttachmentPreview({ value, className = "", interactive = true, showName = true, cropped = true, useOriginal = false, videoPreload = "metadata", imageLightbox = false, imageLoading = "lazy", portalLightbox = false, videoPoster = null, videoThumbnail = false }) {
  const [activeImage, setActiveImage] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const attachment = normalizeAttachment(value);
  if (!attachment || !hasMedia(attachment)) return null;
  const sourceUrl = useOriginal ? originalAttachmentUrl(attachment.url) : attachment.url;
  const displayAttachment = sourceUrl && sourceUrl !== attachment.url ? { ...attachment, url: sourceUrl } : attachment;
  const previewable = isPreviewableAttachment(attachment);
  const openProps = previewable
    ? { target: "_blank", rel: "noreferrer" }
    : { download: attachment.name };

  if (isImageAttachment(attachment)) {
    const imageStyle = cropped ? imageCropStyle(attachment) : undefined;
    if (!interactive) {
      return (
        <span className={`attachment-preview attachment-image attachment-visual ${className}`.trim()}>
          <img src={sourceUrl} alt={attachment.name} style={imageStyle} loading={imageLoading} decoding="async" />
        </span>
      );
    }
    if (imageLightbox) {
      return (
        <>
          <button
            type="button"
            className={`attachment-preview attachment-image attachment-visual attachment-image-open ${className}`.trim()}
            aria-label={`打开${attachment.name}`}
            onClick={() => setActiveImage(displayAttachment)}
          >
            <img src={sourceUrl} alt={attachment.name} style={imageStyle} loading={imageLoading} decoding="async" />
          </button>
          {activeImage ? <AttachmentLightbox attachments={[activeImage]} initialIndex={0} onClose={() => setActiveImage(null)} portal={portalLightbox || imageLightbox} /> : null}
        </>
      );
    }
    return (
      <a className={`attachment-preview attachment-image attachment-visual ${className}`.trim()} href={sourceUrl} {...openProps}>
        <img src={sourceUrl} alt={attachment.name} style={imageStyle} loading={imageLoading} decoding="async" />
      </a>
    );
  }

  if (isVideoAttachment(attachment)) {
    const videoPreview = videoThumbnail ? (
      <VideoPosterFrame attachment={attachment} sourceUrl={sourceUrl} fallbackPoster={videoPoster} showName={showName} />
    ) : (
      <>
        <video src={sourceUrl} preload={videoPreload} muted playsInline />
        {showName ? <span className="attachment-name">{attachment.name}</span> : null}
      </>
    );
    if (!interactive) {
      return (
        <span className={`attachment-preview attachment-video attachment-visual attachment-detail-preview ${className}`.trim()}>{videoPreview}</span>
      );
    }
    return (
      <>
        <button
          type="button"
          className={`attachment-preview attachment-video attachment-visual attachment-video-play ${className}`.trim()}
          aria-label={`播放 ${attachment.name}`}
          onClick={() => setActiveVideo(displayAttachment)}
        >
          {videoPreview}
        </button>
        {activeVideo ? <VideoLightbox attachment={activeVideo} onClose={() => setActiveVideo(null)} portal={portalLightbox} /> : null}
      </>
    );
  }

  const kind = attachmentKind(attachment);
  const fileClassName = `attachment-preview attachment-file attachment-kind-${kind.className} ${className}`.trim();

  if (!interactive) {
    return (
      <span className={fileClassName}>
        <AttachmentFileCard attachment={attachment} showName={showName} />
      </span>
    );
  }

  return (
    <a className={fileClassName} href={sourceUrl} {...openProps}>
      <AttachmentFileCard attachment={attachment} showName={showName} />
      {!showName ? <span className="sr-only">打开附件</span> : null}
    </a>
  );
}

function AttachmentStack({ attachments = [], className = "", interactive = true, showName = true }) {
  const items = normalizeAttachmentList(attachments);
  if (!items.length) return null;
  return (
    <div className={`attachment-stack ${className}`.trim()}>
      {items.map((attachment) => (
        <AttachmentPreview
          key={attachment.url}
          value={attachment}
          interactive={interactive}
          showName={showName}
        />
      ))}
    </div>
  );
}

function ModalWindowControls({ isMaximized = false, onMinimize, onToggleMaximize, onClose, closeLabel = "关闭弹窗" }) {
  return (
    <div className="modal-window-controls">
      <button type="button" className="modal-control-button" aria-label="最小化弹窗" onClick={onMinimize}>
        <Minus size={16} />
      </button>
      <button type="button" className="modal-control-button" aria-label={isMaximized ? "还原弹窗" : "最大化弹窗"} onClick={onToggleMaximize}>
        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <button type="button" className="modal-control-button" aria-label={closeLabel} onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
}

function ModalMinibar({ label = "弹窗已最小化", onRestore, onClose }) {
  return (
    <div className="modal-minibar" onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" onClick={onRestore}>{label}</button>
      <button type="button" aria-label="关闭最小化弹窗" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

function BodyPortal({ enabled = false, children }) {
  if (!enabled || typeof document === "undefined") return children;
  return createPortal(children, document.body);
}

function stopLightboxMediaEvent(event) {
  event.stopPropagation();
}

function lightboxSeekRect(target) {
  const host = target?.closest?.(".video-lightbox-panel, .attachment-lightbox-stage, .attachment-lightbox-panel");
  const video = target?.matches?.("video") ? target : target?.querySelector?.("video") || host?.querySelector?.("video");
  if (video) {
    const rect = video.getBoundingClientRect();
    if (rect.width && rect.height) return { video, rect };
  }
  return null;
}

function isLightboxVideoSeekPoint(target, event) {
  if (!target || event.button !== 0) return null;
  const seekTarget = lightboxSeekRect(target);
  if (!seekTarget) return null;
  const { rect } = seekTarget;
  if (!rect.width || !rect.height) return false;
  const isSeekLayer = target.classList?.contains("video-lightbox-seek-layer");
  const host = target.closest?.(".video-lightbox-panel, .attachment-lightbox-stage, .attachment-lightbox-panel") || target;
  const seekLayer = isSeekLayer ? target : host?.querySelector?.(".video-lightbox-seek-layer");
  if (seekLayer) {
    const layerRect = seekLayer.getBoundingClientRect();
    if (
      event.clientX >= layerRect.left
      && event.clientX <= layerRect.right
      && event.clientY >= layerRect.top
      && event.clientY <= layerRect.bottom
    ) return seekTarget;
  }
  if (isSeekLayer) {
    return null;
  }
  const yFromBottom = rect.bottom - event.clientY;
  const seekBand = Math.min(42, Math.max(24, rect.height * 0.08));
  if (
    event.clientX >= rect.left
    && event.clientX <= rect.right
    && yFromBottom >= 6
    && yFromBottom <= seekBand
  ) return seekTarget;
  return null;
}

const lightboxPendingSeekProgress = new WeakMap();
const lightboxExpectedSeekTime = new WeakMap();
const lightboxActiveSeekToken = new WeakMap();

function clearLightboxPlaybackFragment(video) {
  if (!video) return;
  try {
    const sourceUrl = video.currentSrc || video.src || "";
    if (!sourceUrl) return;
    const parsed = new URL(sourceUrl, window.location.href);
    if (!parsed.hash || parsed.hash.slice(1) !== VIDEO_PLAYBACK_SEEK_FRAGMENT) return;
    parsed.hash = "";
    const nextUrl = parsed.toString();
    if (video.src === nextUrl) return;
    video.autoplay = false;
    video.removeAttribute("autoplay");
    video.src = nextUrl;
    video.load();
    video.pause();
  } catch {}
}

function seekLightboxVideo(video, rect, clientX) {
  if (!video) return null;
  if (!rect.width) return null;
  const progress = clamp((clientX - rect.left) / rect.width, 0, 1);
  lightboxActiveSeekToken.delete(video);
  const duration = Number(video.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    clearLightboxPlaybackFragment(video);
    lightboxPendingSeekProgress.set(video, progress);
    setLightboxSeekProgress(video, progress);
    return null;
  }
  lightboxPendingSeekProgress.delete(video);
  const targetTime = duration * progress;
  lightboxExpectedSeekTime.set(video, targetTime);
  video.currentTime = targetTime;
  setLightboxSeekProgress(video, progress);
  return targetTime;
}

function lightboxSeekHost(video) {
  return video?.closest?.(".video-lightbox-panel, .attachment-lightbox-stage, .attachment-lightbox-panel") || null;
}

function setLightboxSeekProgress(video, progress) {
  const host = lightboxSeekHost(video);
  if (!host || !Number.isFinite(progress)) return;
  host.style.setProperty("--video-lightbox-seek-progress", `${clamp(progress, 0, 1) * 100}%`);
}

function syncLightboxSeekProgress(video) {
  const duration = Number(video?.duration);
  const currentTime = Number(video?.currentTime);
  if (!video || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) {
    setLightboxSeekProgress(video, 0);
    return;
  }
  const pendingProgress = lightboxPendingSeekProgress.get(video);
  if (Number.isFinite(pendingProgress)) {
    lightboxPendingSeekProgress.delete(video);
    const targetTime = duration * clamp(pendingProgress, 0, 1);
    lightboxExpectedSeekTime.set(video, targetTime);
    video.currentTime = targetTime;
    setLightboxSeekProgress(video, pendingProgress);
    return;
  }
  setLightboxSeekProgress(video, currentTime / duration);
}

function validLightboxScrubClientX(rect, clientX) {
  const value = Number(clientX);
  if (!rect?.width || !Number.isFinite(value)) return null;
  const tolerance = Math.min(48, Math.max(12, rect.width * 0.04));
  if (value < rect.left - tolerance || value > rect.right + tolerance) return null;
  return value;
}

const LIGHTBOX_SCRUB_EVENT_OPTIONS = { capture: true, passive: false };

function addLightboxScrubListeners(move, up) {
  const targets = [window, document].filter(Boolean);
  targets.forEach((target) => {
    target.addEventListener("pointermove", move, LIGHTBOX_SCRUB_EVENT_OPTIONS);
    target.addEventListener("pointerup", up, LIGHTBOX_SCRUB_EVENT_OPTIONS);
    target.addEventListener("pointercancel", up, LIGHTBOX_SCRUB_EVENT_OPTIONS);
    target.addEventListener("mousemove", move, LIGHTBOX_SCRUB_EVENT_OPTIONS);
    target.addEventListener("mouseup", up, LIGHTBOX_SCRUB_EVENT_OPTIONS);
  });
}

function removeLightboxScrubListeners(move, up) {
  const targets = [window, document].filter(Boolean);
  targets.forEach((target) => {
    target.removeEventListener("pointermove", move, LIGHTBOX_SCRUB_EVENT_OPTIONS);
    target.removeEventListener("pointerup", up, LIGHTBOX_SCRUB_EVENT_OPTIONS);
    target.removeEventListener("pointercancel", up, LIGHTBOX_SCRUB_EVENT_OPTIONS);
    target.removeEventListener("mousemove", move, LIGHTBOX_SCRUB_EVENT_OPTIONS);
    target.removeEventListener("mouseup", up, LIGHTBOX_SCRUB_EVENT_OPTIONS);
  });
}

function resumeLightboxVideo(video, targetTime = null, targetProgress = null) {
  if (!video) return;
  let settled = false;
  let timer = null;
  const finalTime = targetTime == null ? NaN : Number(targetTime);
  const finalProgress = targetProgress == null ? NaN : Number(targetProgress);
  const hasDuration = () => {
    const duration = Number(video.duration);
    return Number.isFinite(duration) && duration > 0;
  };
  const seekToken = {};
  lightboxActiveSeekToken.set(video, seekToken);
  const isCurrentSeek = () => lightboxActiveSeekToken.get(video) === seekToken && document.body.contains(video);
  const resolvedFinalTime = () => {
    if (Number.isFinite(finalTime)) return finalTime;
    const expectedTime = lightboxExpectedSeekTime.get(video);
    if (Number.isFinite(expectedTime)) return expectedTime;
    const duration = Number(video.duration);
    if (Number.isFinite(finalProgress) && Number.isFinite(duration) && duration > 0) {
      return duration * clamp(finalProgress, 0, 1);
    }
    return null;
  };
  const keepTarget = (onlyIfBehind = false) => {
    const nextTime = resolvedFinalTime();
    if (!Number.isFinite(nextTime)) return false;
    lightboxExpectedSeekTime.set(video, nextTime);
    const currentTime = Number(video.currentTime);
    const shouldCorrect = onlyIfBehind
      ? currentTime < nextTime - 0.35
      : Math.abs(currentTime - nextTime) >= 0.35;
    if (shouldCorrect) {
      video.currentTime = nextTime;
    }
    syncLightboxSeekProgress(video);
    return true;
  };
  const play = () => {
    if (settled || !isCurrentSeek()) return;
    settled = true;
    video.removeEventListener("seeked", play);
    video.removeEventListener("loadedmetadata", playWhenDurationReady);
    video.removeEventListener("durationchange", playWhenDurationReady);
    video.removeEventListener("loadeddata", playWhenDurationReady);
    video.removeEventListener("canplay", playWhenDurationReady);
    if (timer) window.clearTimeout(timer);
    keepTarget();
    const playPromise = video.play();
    const keepIfCurrent = (onlyIfBehind = false) => {
      if (isCurrentSeek()) keepTarget(onlyIfBehind);
    };
    [40, 180].forEach((delay) => window.setTimeout(() => keepIfCurrent(false), delay));
    [700, 1400, 2400, 4200, 6400, 8200].forEach((delay) => window.setTimeout(() => keepIfCurrent(true), delay));
    if (!Number.isFinite(finalTime) && Number.isFinite(finalProgress)) {
      const startedAt = window.performance.now();
      const guard = window.setInterval(() => {
        if (window.performance.now() - startedAt > 9000 || !isCurrentSeek()) {
          window.clearInterval(guard);
          return;
        }
        keepTarget(true);
      }, 120);
    }
    playPromise?.then?.(() => {
      window.setTimeout(() => keepIfCurrent(false), 0);
      window.setTimeout(() => keepIfCurrent(false), 120);
    }).catch(() => {});
  };
  const playAfterSeek = () => {
    if (settled || !isCurrentSeek()) return;
    keepTarget(false);
    if (video.seeking) {
      timer = window.setTimeout(play, 1200);
      video.addEventListener("seeked", play, { once: true });
      return;
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(play));
  };
  const playWhenDurationReady = () => {
    if (hasDuration()) playAfterSeek();
  };
  const shouldWaitForDuration = !Number.isFinite(finalTime) && Number.isFinite(finalProgress) && !hasDuration();
  if (shouldWaitForDuration) {
    video.addEventListener("loadedmetadata", playWhenDurationReady, { once: true });
    video.addEventListener("durationchange", playWhenDurationReady, { once: true });
    video.addEventListener("loadeddata", playWhenDurationReady, { once: true });
    video.addEventListener("canplay", playWhenDurationReady, { once: true });
    return;
  }
  timer = window.setTimeout(play, 180);
  if (video.seeking) {
    video.addEventListener("seeked", play, { once: true });
  } else {
    window.requestAnimationFrame(() => window.requestAnimationFrame(play));
  }
}

function useLightboxVideoControls() {
  const scrubRef = useRef(null);
  const touchRevealTimerRef = useRef(null);

  const showTouchSeekControls = useCallback((target) => {
    const seekTarget = lightboxSeekRect(target);
    const host = seekTarget ? lightboxSeekHost(seekTarget.video) : null;
    if (!host) return;
    host.classList.add("is-video-touch-visible");
    window.clearTimeout(touchRevealTimerRef.current);
    touchRevealTimerRef.current = window.setTimeout(() => {
      host.classList.remove("is-video-touch-visible");
    }, 2200);
  }, []);

  const stopScrub = useCallback((clientX = null) => {
    const state = scrubRef.current;
    if (!state) return;
    removeLightboxScrubListeners(state.move, state.up);
    scrubRef.current = null;
    state.host?.classList.remove("is-video-scrubbing");
    const finalClientX = validLightboxScrubClientX(state.rect, clientX) ?? state.lastClientX;
    const targetProgress = finalClientX !== null && state.rect.width
      ? clamp((finalClientX - state.rect.left) / state.rect.width, 0, 1)
      : null;
    const targetTime = finalClientX !== null ? seekLightboxVideo(state.video, state.rect, finalClientX) : null;
    if (state.shouldResume) resumeLightboxVideo(state.video, targetTime, targetProgress);
  }, []);

  const startScrub = useCallback((event) => {
    if (scrubRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const seekTarget = isLightboxVideoSeekPoint(event.currentTarget, event);
    if (!seekTarget) return;
    event.preventDefault();
    event.stopPropagation();
    const { video, rect } = seekTarget;
    const initialClientX = validLightboxScrubClientX(rect, event.clientX);
    if (initialClientX === null) return;
    const shouldResume = video.autoplay || (!video.paused && !video.ended);
    video.pause();
    const host = lightboxSeekHost(video);
    host?.classList.add("is-video-scrubbing");
    seekLightboxVideo(video, rect, initialClientX);
    const move = (moveEvent) => {
      moveEvent.preventDefault();
      const nextClientX = validLightboxScrubClientX(rect, moveEvent.clientX);
      if (nextClientX === null) return;
      const state = scrubRef.current;
      if (state) state.lastClientX = nextClientX;
      seekLightboxVideo(video, rect, nextClientX);
    };
    const up = (upEvent) => {
      upEvent.preventDefault();
      stopScrub(upEvent.clientX);
    };
    scrubRef.current = { video, rect, shouldResume, move, up, host, lastClientX: initialClientX };
    addLightboxScrubListeners(move, up);
  }, [stopScrub]);

  useEffect(() => () => {
    window.clearTimeout(touchRevealTimerRef.current);
    stopScrub();
  }, [stopScrub]);

  const updateProgress = useCallback((event) => {
    const target = event.currentTarget?.matches?.("video")
      ? event.currentTarget
      : event.currentTarget?.querySelector?.("video");
    syncLightboxSeekProgress(target);
  }, []);

  const onTouchStart = useCallback((event) => {
    stopLightboxMediaEvent(event);
    showTouchSeekControls(event.currentTarget);
  }, [showTouchSeekControls]);

  return {
    onPointerDownCapture: startScrub,
    onMouseDownCapture: startScrub,
    onPointerDown: stopLightboxMediaEvent,
    onPointerUp: stopLightboxMediaEvent,
    onPointerCancel: stopLightboxMediaEvent,
    onMouseDown: stopLightboxMediaEvent,
    onMouseUp: stopLightboxMediaEvent,
    onClick: stopLightboxMediaEvent,
    onTouchStart,
    onTouchEnd: stopLightboxMediaEvent,
    onLoadedMetadata: updateProgress,
    onDurationChange: updateProgress,
    onTimeUpdate: updateProgress,
    onSeeking: updateProgress,
    onSeeked: updateProgress,
  };
}

function AttachmentLightbox({ attachments = [], initialIndex = 0, onClose, portal = false }) {
  const items = normalizeAttachmentList(attachments);
  const [activeIndex, setActiveIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)));
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const videoControlProps = useLightboxVideoControls();
  const activeAttachment = items[activeIndex];
  const hasMultiple = items.length > 1;
  const activeVideoControlProps = isVideoAttachment(activeAttachment) ? videoControlProps : {};

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => (index - 1 + items.length) % items.length);
  }, [items.length]);

  const showNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (hasMultiple && event.key === "ArrowLeft") showPrevious();
      if (hasMultiple && event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [hasMultiple, onClose, showNext, showPrevious]);

  if (!activeAttachment) return null;

  const lightbox = (
    <div className={`attachment-lightbox ${portal ? "is-detail-portal" : ""}`.trim()} role="dialog" aria-modal="true" aria-label={activeAttachment.name || "附件预览"} onMouseDown={onClose}>
      {isMinimized ? (
        <ModalMinibar label={activeAttachment.name || "附件预览"} onRestore={() => setIsMinimized(false)} onClose={onClose} />
      ) : (
      <div className={`modal-window-shell modal-window-shell-media ${isMaximized ? "is-maximized" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-window-topbar">
          <span>{activeAttachment.name || "附件预览"}</span>
          <ModalWindowControls
            isMaximized={isMaximized}
            onMinimize={() => setIsMinimized(true)}
            onToggleMaximize={() => setIsMaximized((value) => !value)}
            onClose={onClose}
            closeLabel="关闭附件预览"
          />
        </div>
        <div className="attachment-lightbox-panel">
          <div className="attachment-lightbox-stage" {...activeVideoControlProps}>
            {isImageAttachment(activeAttachment) ? (
              <img className="attachment-lightbox-image" src={originalAttachmentUrl(activeAttachment.url)} alt={activeAttachment.name} />
            ) : isVideoAttachment(activeAttachment) ? (
              <>
                <video
                  className="attachment-lightbox-video"
                  src={videoPlaybackUrl(activeAttachment)}
                  controls
                  autoPlay
                  playsInline
                  {...videoControlProps}
                />
                <span className="video-lightbox-seek-layer" aria-hidden="true" {...videoControlProps} />
              </>
            ) : isAudioAttachment(activeAttachment) ? (
              <div className="attachment-lightbox-file">
                <audio src={originalAttachmentUrl(activeAttachment.url)} controls autoPlay />
              </div>
            ) : isPdfAttachment(activeAttachment) ? (
              <iframe className="attachment-lightbox-frame" title={activeAttachment.name || "PDF 预览"} src={originalAttachmentUrl(activeAttachment.url)} />
            ) : (
              <div className="attachment-lightbox-file">
                <p>该文件类型暂不支持浏览器内预览。</p>
              </div>
            )}
          </div>

          {hasMultiple ? (
            <>
              <button type="button" className="attachment-lightbox-nav attachment-lightbox-prev" aria-label="上一个附件" onClick={showPrevious}>
                <ChevronLeft size={30} />
              </button>
              <button type="button" className="attachment-lightbox-nav attachment-lightbox-next" aria-label="下一个附件" onClick={showNext}>
                <ChevronRight size={30} />
              </button>
            </>
          ) : null}
        </div>
      </div>
      )}
    </div>
  );

  return <BodyPortal enabled={portal}>{lightbox}</BodyPortal>;
}

function AttachmentInfoBar({ attachments = [], simpleLinks = false, modal = false }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const items = normalizeAttachmentList(attachments).filter((attachment) => (
    modal ? !isVisualAttachment(attachment) : !isImageAttachment(attachment)
  ));
  if (!items.length) return null;
  if (modal) {
    return (
      <>
        <div className="detail-file-list reveal-item" aria-label="附件">
          {items.map((attachment, index) => {
            const canPreview = canPreviewInDetailModal(attachment);
            return (
              <button
                type="button"
                className="detail-file-name"
                key={attachment.url}
                onClick={() => (canPreview ? setActiveIndex(index) : triggerAttachmentDownload(attachment))}
              >
                {attachment.name || fileNameFromUrl(attachment.url)}
              </button>
            );
          })}
        </div>
        {activeIndex !== null ? (
          <AttachmentLightbox attachments={items} initialIndex={activeIndex} onClose={() => setActiveIndex(null)} portal />
        ) : null}
      </>
    );
  }
  return (
    <>
      <div className="attachment-info-bar reveal-item" aria-label="附件">
        {items.map((attachment, index) => {
        const previewable = isPreviewableAttachment(attachment);
        const openProps = previewable
          ? { target: "_blank", rel: "noreferrer" }
          : { download: attachment.name };
        const rowContent = (
          <div>
            <strong>{attachment.name}</strong>
            <span>{[formatFileSize(attachment.size), attachmentKind(attachment).label].filter(Boolean).join(" / ")}</span>
          </div>
        );
        if (simpleLinks) {
          return (
            <a className="attachment-info-row attachment-info-row-link" href={attachment.url} {...openProps} key={attachment.url}>
              {rowContent}
            </a>
          );
        }
        return (
          <div className="attachment-info-row" key={attachment.url}>
            {rowContent}
            <p>
              {previewable ? <a href={attachment.url} target="_blank" rel="noreferrer">预览</a> : null}
              <a href={attachment.url} download={attachment.name}>下载</a>
            </p>
          </div>
        );
      })}
      </div>
    </>
  );
}

function DetailImageCarousel({ attachments = [], onOpen }) {
  const images = normalizeAttachmentList(attachments).filter(isImageAttachment);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeAttachment = images[activeIndex];
  const activeSourceUrl = originalAttachmentUrl(activeAttachment?.url);
  const hasMultiple = images.length > 1;

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }, [images.length]);

  const showNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [images.map((attachment) => attachment.url).join("|")]);

  useEffect(() => {
    if (!hasMultiple || paused) return undefined;
    const timer = window.setInterval(showNext, 4200);
    return () => window.clearInterval(timer);
  }, [hasMultiple, paused, showNext]);

  if (!activeAttachment) return null;

  return (
    <div
      className="detail-image-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button
        type="button"
        className="detail-carousel-media"
        aria-label={`打开${activeAttachment.name || "图片"}`}
        onClick={() => onOpen(activeIndex)}
      >
        <img
          key={activeAttachment.url}
          src={activeSourceUrl}
          alt={activeAttachment.name}
          loading={activeIndex === 0 ? "eager" : "lazy"}
        />
      </button>
      {hasMultiple ? (
        <>
          <button type="button" className="detail-carousel-nav detail-carousel-prev" aria-label="上一张图片" onClick={showPrevious}>
            <ChevronLeft size={28} />
          </button>
          <button type="button" className="detail-carousel-nav detail-carousel-next" aria-label="下一张图片" onClick={showNext}>
            <ChevronRight size={28} />
          </button>
          <div className="detail-carousel-dots" aria-hidden="true">
            {images.map((attachment, index) => (
              <button
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                key={attachment.url}
                tabIndex={-1}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function VideoLightbox({ attachment, onClose, portal = false }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const videoControlProps = useLightboxVideoControls();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const lightbox = (
    <div className={`video-lightbox ${portal ? "is-detail-portal" : ""}`.trim()} role="dialog" aria-modal="true" aria-label={attachment.name || "视频预览"} onMouseDown={onClose}>
      {isMinimized ? (
        <ModalMinibar label={attachment.name || "视频预览"} onRestore={() => setIsMinimized(false)} onClose={onClose} />
      ) : (
      <div className={`modal-window-shell modal-window-shell-media ${isMaximized ? "is-maximized" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-window-topbar">
          <span>{attachment.name || "视频预览"}</span>
          <ModalWindowControls
            isMaximized={isMaximized}
            onMinimize={() => setIsMinimized(true)}
            onToggleMaximize={() => setIsMaximized((value) => !value)}
            onClose={onClose}
            closeLabel="关闭视频"
          />
        </div>
        <div className="video-lightbox-panel" {...videoControlProps}>
          <video
            src={videoPlaybackUrl(attachment)}
            controls
            autoPlay
            playsInline
            {...videoControlProps}
          />
          <span className="video-lightbox-seek-layer" aria-hidden="true" {...videoControlProps} />
        </div>
      </div>
      )}
    </div>
  );

  return <BodyPortal enabled={portal}>{lightbox}</BodyPortal>;
}

function DetailMediaGallery({ attachments = [], modal = true, videoPoster = null }) {
  const [activeVideo, setActiveVideo] = useState(null);
  const [lightboxState, setLightboxState] = useState(null);
  const mediaItems = normalizeAttachmentList(attachments).filter(isVisualAttachment);
  if (!mediaItems.length) return null;

  if (modal) {
    const imageItems = mediaItems.filter(isImageAttachment);
    const videoItems = mediaItems.filter(isVideoAttachment);
    return (
      <>
        <figure className="detail-hero reveal-item">
          <div className="detail-media-stack">
            {imageItems.length ? (
              <DetailImageCarousel attachments={imageItems} onOpen={(index) => setLightboxState({ attachments: imageItems, index })} />
            ) : null}
            {videoItems.map((attachment, index) => (
              <button
                type="button"
                className="detail-media detail-media-video"
                aria-label={`播放${attachment.name || "视频"}`}
                key={attachment.url}
                onClick={() => setLightboxState({ attachments: videoItems, index })}
              >
                <VideoPosterFrame attachment={attachment} sourceUrl={originalAttachmentUrl(attachment.url)} fallbackPoster={videoPoster} playIconSize={34} />
              </button>
            ))}
          </div>
        </figure>
        {lightboxState ? (
          <AttachmentLightbox
            attachments={lightboxState.attachments}
            initialIndex={lightboxState.index}
            onClose={() => setLightboxState(null)}
            portal
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <figure className="detail-hero reveal-item">
        <div className="detail-media-stack">
          {mediaItems.map((attachment) => (
            isVideoAttachment(attachment) ? (
              <button
                type="button"
                className="detail-media detail-media-video"
                aria-label={`播放${attachment.name}`}
                key={attachment.url}
                onClick={() => setActiveVideo(attachment)}
              >
                <VideoPosterFrame attachment={attachment} sourceUrl={originalAttachmentUrl(attachment.url)} fallbackPoster={videoPoster} playIconSize={34} />
              </button>
            ) : (
              <a className="detail-media detail-media-image" href={originalAttachmentUrl(attachment.url)} target="_blank" rel="noreferrer" key={attachment.url}>
                <img src={originalAttachmentUrl(attachment.url)} alt={attachment.name} />
              </a>
            )
          ))}
        </div>
      </figure>
      {activeVideo ? <VideoLightbox attachment={activeVideo} onClose={() => setActiveVideo(null)} portal /> : null}
    </>
  );
}

function DetailMediaCanvas({ attachments = [], mediaLayout, modal = true, videoPoster = null }) {
  const [lightboxState, setLightboxState] = useState(null);
  const mediaItems = normalizeAttachmentList(attachments).filter(isVisualAttachment);
  const normalizedLayout = mediaLayout ? normalizeMediaLayout(mediaLayout, mediaItems) : null;
  if (!normalizedLayout?.items.length) return null;
  const attachmentMap = new Map(mediaItems.map((attachment) => [attachment.url, attachment]));

  return (
    <>
      <figure className="detail-hero reveal-item">
        <div className="detail-layout-canvas" style={{ aspectRatio: normalizedLayout.canvasRatio }}>
          {normalizedLayout.items
            .slice()
            .sort((left, right) => left.z - right.z)
            .map((item) => {
              const attachment = attachmentMap.get(item.url);
              if (!attachment) return null;
              const style = {
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                width: `${item.w * 100}%`,
                height: `${item.h * 100}%`,
                zIndex: item.z,
              };
              if (isVideoAttachment(attachment)) {
                return (
                  <button
                    type="button"
                    className="detail-layout-item detail-layout-video"
                    style={style}
                    key={attachment.url}
                    aria-label={`播放${attachment.name || "视频"}`}
                    onClick={() => setLightboxState({ attachments: mediaItems.filter(isVideoAttachment), index: mediaItems.filter(isVideoAttachment).findIndex((entry) => entry.url === attachment.url) })}
                  >
                    <VideoPosterFrame attachment={attachment} sourceUrl={originalAttachmentUrl(attachment.url)} fallbackPoster={videoPoster} playIconSize={28} />
                  </button>
                );
              }
              if (!modal) {
                return (
                  <a
                    className="detail-layout-item detail-layout-image"
                    style={style}
                    key={attachment.url}
                    href={originalAttachmentUrl(attachment.url)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`打开${attachment.name || "图片"}`}
                  >
                    <img src={originalAttachmentUrl(attachment.url)} alt={attachment.name} />
                  </a>
                );
              }
              return (
                <button
                  type="button"
                  className="detail-layout-item detail-layout-image"
                  style={style}
                  key={attachment.url}
                  aria-label={`打开${attachment.name || "图片"}`}
                  onClick={() => setLightboxState({ attachments: mediaItems.filter(isImageAttachment), index: mediaItems.filter(isImageAttachment).findIndex((entry) => entry.url === attachment.url) })}
                >
                  <img src={originalAttachmentUrl(attachment.url)} alt={attachment.name} />
                </button>
              );
            })}
        </div>
      </figure>
      {lightboxState ? (
        modal ? (
          <AttachmentLightbox attachments={lightboxState.attachments} initialIndex={lightboxState.index} onClose={() => setLightboxState(null)} portal />
        ) : isVideoAttachment(lightboxState.attachments[lightboxState.index]) ? (
          <VideoLightbox attachment={lightboxState.attachments[lightboxState.index]} onClose={() => setLightboxState(null)} portal />
        ) : null
      ) : null}
    </>
  );
}

function notifyContentUpdated() {
  window.dispatchEvent(new Event(CONTENT_UPDATED_EVENT));
  try {
    const channel = new BroadcastChannel(CONTENT_UPDATED_EVENT);
    channel.postMessage(Date.now());
    channel.close();
  } catch {
    localStorage.setItem(CONTENT_UPDATED_EVENT, String(Date.now()));
  }
}

function PlusMark({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 49 49" aria-hidden="true">
      <path d="M18.0793 48.2436H30.1643V30.1643H48.2436V18.0793H30.1643V0H18.0793V18.0793H0V30.1643H18.0793V48.2436Z" />
    </svg>
  );
}

function WebGLVisual() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    let cleanupScene = () => {};

    import("three").then((THREE) => {
      if (disposed || !host.isConnected) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.z = 5.7;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      host.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);
      const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xf4f4f4, wireframe: true, transparent: true, opacity: 0.28 });
      const shellMaterial = new THREE.MeshBasicMaterial({ color: 0xb8b8b8, wireframe: true, transparent: true, opacity: 0.14 });
      const core = new THREE.Mesh(new THREE.TorusKnotGeometry(1.15, 0.28, 220, 24), coreMaterial);
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(2.05, 3), shellMaterial);
      group.add(core, shell);

      const count = 1200;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const radius = 1.8 + Math.random() * 2.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
      }
      const pointGeometry = new THREE.BufferGeometry();
      pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(pointGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.012, transparent: true, opacity: 0.32 }));
      scene.add(points);

      const resize = () => {
        const width = host.clientWidth || 1;
        const height = host.clientHeight || 1;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      let frameId = 0;
      let t = 0;
      const animate = () => {
        if (disposed) return;
        t += 0.008;
        group.rotation.x = Math.sin(t * 0.7) * 0.16;
        group.rotation.y += 0.006;
        core.rotation.z -= 0.01;
        shell.rotation.y -= 0.003;
        points.rotation.y += 0.0018;
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      };
      animate();

      cleanupScene = () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(frameId);
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
        renderer.dispose();
        pointGeometry.dispose();
        coreMaterial.dispose();
        shellMaterial.dispose();
      };
    }).catch(() => {});

    return () => {
      disposed = true;
      cleanupScene();
    };
  }, []);

  return <div className="visual-canvas" ref={hostRef} aria-hidden="true" />;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState("");
  const [mobileDropdown, setMobileDropdown] = useState("");
  const headerRef = useRef(null);
  const content = useSiteContent();
  const adminRoute = isAdminRoute();
  const path = stripAdminPath();
  const topLine = content.site.topLine.replace(/^ACT IV\s*/i, "");
  const logoAttachment = normalizeAttachment(content.site.logo);
  const logoSrc = logoAttachment && hasMedia(logoAttachment) && isImageAttachment(logoAttachment) ? logoAttachment.url : "/logo2.png";
  const menuHref = (itemPath) => (adminRoute ? adminPathFor(itemPath) : canonicalSitePath(itemPath));
  const closeDropdown = () => setActiveDropdown("");
  const handleNavClick = (event, item) => {
    if (!item.children?.length) return;
    const isTouchLike = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (!isTouchLike) return;
    event.preventDefault();
    setActiveDropdown((current) => {
      const next = current === item.label ? "" : item.label;
      if (!next) event.currentTarget.blur();
      return next;
    });
  };
  const handleNavBlur = (event, item) => {
    if (!item.children?.length || event.currentTarget.contains(event.relatedTarget)) return;
    closeDropdown();
  };

  useEffect(() => {
    if (!activeDropdown && !mobileDropdown) return undefined;
    const handleOutsidePointer = (event) => {
      if (headerRef.current?.contains(event.target)) return;
      closeDropdown();
      setMobileDropdown("");
    };
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      closeDropdown();
      setMobileDropdown("");
      setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeDropdown, mobileDropdown]);

  return (
    <header className="header" ref={headerRef}>
      <div className="head-top">
        <span>ACT IV</span> {topLine}
      </div>
      <div className="container head-wrap">
        <a href={adminRoute ? "/admin" : "/"} className="logo" aria-label="ACT IV 首页">
          <img src={logoSrc} alt="ACT IV Future Visual Lab" />
        </a>
        <nav className="nav" aria-label="主导航">
          {navItems.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const isActive = path === item.path || path.startsWith(`${item.path}/`);
            const dropdownId = `nav-dropdown-${makeId(item.label)}`;
            const isDropdownOpen = activeDropdown === item.label;
            return (
              <div
                className={`nav-item ${hasChildren ? "has-dropdown" : ""} ${isDropdownOpen ? "is-open" : ""}`.trim()}
                key={item.label}
                onMouseEnter={() => hasChildren && setActiveDropdown(item.label)}
                onMouseLeave={() => hasChildren && closeDropdown()}
                onBlur={(event) => handleNavBlur(event, item)}
              >
                <a
                  className={isActive ? "active" : ""}
                  href={menuHref(item.path)}
                  aria-haspopup={hasChildren ? "true" : undefined}
                  aria-expanded={hasChildren ? isDropdownOpen : undefined}
                  aria-controls={hasChildren ? dropdownId : undefined}
                  onClick={(event) => handleNavClick(event, item)}
                  onFocus={() => hasChildren && setActiveDropdown(item.label)}
                >
                  {item.label}
                </a>
                {hasChildren ? (
                  <div className="nav-dropdown" id={dropdownId} role="menu" aria-label={`${item.label} 页面`}>
                    {item.children.map((child) => (
                      <a key={child.label} href={menuHref(child.path)} role="menuitem">
                        {child.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <button className="menu-btn" aria-label="打开菜单" type="button" onClick={() => { setMobileDropdown(""); setOpen(true); }}>
          <Menu size={34} />
        </button>
        <button className="sitemap-btn" aria-label="打开站点地图" type="button" onClick={() => { setMobileDropdown(""); setOpen(true); }}>
          <i />
          <i />
        </button>
      </div>
      {open ? (
        <div className="mobile-panel" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileDropdown(""); }}>
          <button className="mobile-close" type="button" aria-label="关闭菜单" onClick={() => { setMobileDropdown(""); setOpen(false); }}>
            <X size={28} />
          </button>
          {navItems.map((item, index) => {
            const hasChildren = Boolean(item.children?.length);
            const mobileDropdownId = `mobile-dropdown-${makeId(item.label)}`;
            const isMobileDropdownOpen = mobileDropdown === item.label;
            return (
            <div className={`mobile-panel-item ${isMobileDropdownOpen ? "is-open" : ""}`.trim()} key={item.label}>
              {hasChildren ? (
                <button
                  className="mobile-panel-main mobile-panel-toggle"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={isMobileDropdownOpen}
                  aria-controls={mobileDropdownId}
                  onClick={() => setMobileDropdown((current) => (current === item.label ? "" : item.label))}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </button>
              ) : (
                <a className="mobile-panel-main" href={menuHref(item.path)} onClick={() => setOpen(false)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </a>
              )}
              {hasChildren ? (
                <div className="mobile-panel-sub" id={mobileDropdownId}>
                  {item.children.map((child) => (
                    <a key={child.label} href={menuHref(child.path)} onClick={() => setOpen(false)}>
                      {child.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}

function AdminAddButton({ onClick, label = "新增" }) {
  if (!onClick) return null;
  return (
    <button type="button" className="admin-add-button" onClick={onClick}>
      <Plus size={16} />
      <span>{label}</span>
    </button>
  );
}

function MainTitle({ children, href = "#", onAdd = null, addLabel = "新增" }) {
  return (
    <div className="main-title">
      <h2>{children}</h2>
      <div className="main-title-actions">
        <AdminAddButton onClick={onAdd} label={addLabel} />
        <a href={siteHref(href)} aria-label={`查看更多 ${children}`}>
          <ArrowRight size={28} />
        </a>
      </div>
    </div>
  );
}

function HomeMoreLink({ href, label = "查看更多" }) {
  return (
    <a className="home-more-btn" href={siteHref(href)}>
      {label} <ArrowRight size={18} />
    </a>
  );
}

function HomeTextListItem({ item, href }) {
  return (
    <a className="home-text-row" href={href}>
      {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
      {hasText(item.date) ? <span className="date">{item.date}</span> : null}
    </a>
  );
}

function HomeVisualCard({ item, href, summary, showEmptyMedia = false, className = "" }) {
  const attachment = primaryVisualForCard(item, "image");
  const hasVisual = attachment && isVisualAttachment(attachment);
  const hasMeta = hasText(item.title) || hasText(item.date);
  return (
    <a className={`home-media-card ${className}`.trim()} href={href}>
      {hasVisual ? (
        <span className="thumb">
          <AttachmentPreview value={attachment} interactive={false} showName={false} />
        </span>
      ) : showEmptyMedia ? (
        <span className="thumb admin-media-shell">
          <EmptyMediaPlaceholder />
        </span>
      ) : (
        <span className="home-text-card">
          <span className="home-text-card-body">
            {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
            {hasText(summary) ? <span className="cont">{summary}</span> : null}
          </span>
        </span>
      )}
      {hasMeta ? (
        <span className="home-media-overlay">
          {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
          {hasText(item.date) ? <span className="date">{item.date}</span> : null}
        </span>
      ) : null}
    </a>
  );
}

function homeLatestItems(items = [], keys, includeEmpty = false, content = null, orderKey = "") {
  return orderedRenderableItems(items, keys, includeEmpty, content, orderKey);
}

function HomeCarousel({ className, itemCount = 0, resetKey = "", children }) {
  const trackRef = useRef(null);
  const canScroll = itemCount > 4;
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const reset = () => {
      track.scrollLeft = 0;
      track.scrollTo({ left: 0, behavior: "auto" });
    };
    reset();
    const frame = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(frame);
  }, [className, itemCount, resetKey]);
  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className={`home-carousel ${canScroll ? "" : "is-static"}`.trim()}>
      <ul className={`${className} home-carousel-track`.trim()} ref={trackRef}>
        {children}
      </ul>
      {canScroll ? (
        <div className="home-carousel-controls" aria-label={`${className} 切换控制`}>
          <button type="button" className="prev" onClick={() => scroll(-1)} aria-label="上一组内容">
            <ArrowRight size={20} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="下一组内容">
            <ArrowRight size={20} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function useReveal() {
  const content = useSiteContent();
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const sections = gsap.utils.toArray(".reveal-section");
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const keepContentVisible = prefersReducedMotion || window.matchMedia("(max-width: 640px)").matches;
      sections.forEach((section) => {
        const items = section.querySelectorAll(".reveal-item");
        if (!items.length) return;
        gsap.set(items, { autoAlpha: keepContentVisible ? 1 : 0, y: keepContentVisible ? 0 : 32 });
        if (keepContentVisible) return;
        gsap.to(items, {
          autoAlpha: 1,
          y: 0,
          duration: 0.62,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: section, start: "top 82%", once: true },
          clearProps: "transform",
        });
      });
      window.requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => context.revert();
  }, [content]);
}

function PageShell({ title, children, tightFooter = false }) {
  useReveal();
  return (
    <main id="site-content" className={`sub-page ${tightFooter ? "is-tight-footer" : ""}`.trim()} role="main">
      <div className={`container cont-wrap ${tightFooter ? "is-tight-footer" : ""}`.trim()}>
        <h1 className="sub-title">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function ContentLoadingPage() {
  return (
    <PageShell title="Loading">
      <div className="content-loading" aria-live="polite">
        <Loader2 className="spin" size={28} />
        <p>Loading content</p>
      </div>
    </PageShell>
  );
}

function AppBootShell() {
  return (
    <main className="app-boot" role="status" aria-live="polite">
      <div className="app-boot-inner">
        <span>ACT IV</span>
      </div>
    </main>
  );
}

function HomePage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const news = homeLatestItems(getBoardItems(content, "news"), BOARD_LIST_FIELDS, editor.isEditing, content, manualSortKey("news")).slice(0, HOME_TEXT_LIMIT);
  const works = homeLatestItems(content.works || [], WORK_CONTENT_FIELDS, editor.isEditing, content, "works").slice(0, HOME_MEDIA_LIMIT);
  const projects = homeLatestItems(getBoardItems(content, "project"), BOARD_CONTENT_FIELDS, editor.isEditing, content, manualSortKey("projects")).slice(0, HOME_MEDIA_LIMIT);
  const publications = homeLatestItems(getBoardItems(content, "publications"), BOARD_LIST_FIELDS, editor.isEditing, content, manualSortKey("research")).slice(0, HOME_TEXT_LIMIT);
  useReveal();
  return (
    <main id="top" className="main">
      <h1 className="sub-title main-title-hidden">main</h1>
      <section className="home-background-paths dark" aria-label="ACT IV 动态介绍">
        <BackgroundPaths title={"BREAKING\nBOUNDARIES"} />
      </section>
      <section className="visual container" id="about-lab">
        <div className="slogan">
          <div className="left">
            <p>FUTURE VISUAL</p>
            <p>
              <PlusMark className="plus-svg" />
            </p>
          </div>
          <div className="right">
            <p>ACT IV</p>
          </div>
        </div>
      </section>

      <section className="lab-intro container reveal-section">
        {editor.isEditing ? (
          <InlineHomeIntroEditor value={content.homeIntro} onSave={editor.saveHomeIntro} onClear={editor.clearHomeIntro} />
        ) : content.homeIntro.filter(hasText).length ? (
          content.homeIntro.filter(hasText).map((paragraph) => (
            <p className="reveal-item" key={paragraph}>
              {paragraph}
            </p>
          ))
        ) : null}
      </section>

      <div className="mb-latest container">
        <section className="news reveal-section">
          <MainTitle href="/board/news" onAdd={editor.isEditing ? () => editor.createBoardItem("news") : null}>News</MainTitle>
          <ul className="home-text-list">
            {news.map(({ item, index, isEmpty }, position) => (
              <AdminEditable
                as="li"
                className="reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `news-${index}`}
                onEdit={() => { window.location.href = siteHref(`/board/news/${item.id || makeId(item.title)}`); }}
                onAdd={() => editor.createBoardItem("news")}
                onDelete={() => editor.removeBoardItem("news", index)}
                {...sortableProps(editor.isEditing, position, (fromPosition, toPosition) => editor.moveBoardItem("news", news, fromPosition, toPosition))}
                {...moveControlProps(editor.isEditing, position, news.length, (fromPosition, toPosition) => editor.moveBoardItem("news", news, fromPosition, toPosition))}
              >
                {isEmpty ? <EmptyEntryPlaceholder label="空 News 条目" /> : (
                  <HomeTextListItem
                    item={item}
                    href={siteHref(`/board/news/${item.id || makeId(item.title)}`)}
                  />
                )}
              </AdminEditable>
            ))}
          </ul>
          <HomeMoreLink href="/board/news" />
        </section>

        <section className="exhibition reveal-section">
          <MainTitle href="/works" onAdd={editor.isEditing ? () => editor.createWork() : null}>Works</MainTitle>
          <ul className="home-media-grid">
            {works.map(({ item, index, isEmpty }, position) => (
              <AdminEditable
                as="li"
                className="reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `work-${index}`}
                onEdit={() => { window.location.href = siteHref(`/works/${item.id || makeId(item.title)}`); }}
                onAdd={() => editor.createWork()}
                onDelete={() => editor.removeWork(index)}
                {...sortableProps(editor.isEditing, position, (fromPosition, toPosition) => editor.moveWork(works, fromPosition, toPosition))}
                {...moveControlProps(editor.isEditing, position, works.length, (fromPosition, toPosition) => editor.moveWork(works, fromPosition, toPosition))}
              >
                {isEmpty ? <EmptyEntryPlaceholder label="空 Works 条目" /> : (
                  <HomeVisualCard
                    item={item}
                    href={siteHref(`/works/${item.id || makeId(item.title)}`)}
                    summary={item.text || item.body}
                    showEmptyMedia={editor.isEditing}
                  />
                )}
              </AdminEditable>
            ))}
          </ul>
          <HomeMoreLink href="/works" />
        </section>

        <section className="project reveal-section">
          <MainTitle href="/board/project" onAdd={editor.isEditing ? () => editor.createBoardItem("projects") : null}>Project</MainTitle>
          <ul className="home-media-grid">
            {projects.map(({ item, index, isEmpty }, position) => (
              <AdminEditable
                as="li"
                className="reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `project-${index}`}
                onEdit={() => { window.location.href = siteHref(`/board/project/${item.id || makeId(item.title)}`); }}
                onAdd={() => editor.createBoardItem("projects")}
                onDelete={() => editor.removeBoardItem("projects", index)}
                {...sortableProps(editor.isEditing, position, (fromPosition, toPosition) => editor.moveBoardItem("projects", projects, fromPosition, toPosition))}
                {...moveControlProps(editor.isEditing, position, projects.length, (fromPosition, toPosition) => editor.moveBoardItem("projects", projects, fromPosition, toPosition))}
              >
                {isEmpty ? <EmptyEntryPlaceholder label="空 Project 条目" /> : (
                  <HomeVisualCard
                    item={item}
                    href={siteHref(`/board/project/${item.id || makeId(item.title)}`)}
                    summary={item.intro || item.body}
                    showEmptyMedia={editor.isEditing}
                  />
                )}
              </AdminEditable>
            ))}
          </ul>
          <HomeMoreLink href="/board/project" />
        </section>

        <section className="project reveal-section">
          <MainTitle href="/board/publications" onAdd={editor.isEditing ? () => editor.createBoardItem("research") : null}>Publications</MainTitle>
          <ul className="home-text-list">
            {publications.map(({ item, index, isEmpty }, position) => (
              <AdminEditable
                as="li"
                className="reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `publication-${index}`}
                onEdit={() => { window.location.href = siteHref(`/board/publications/${item.id || makeId(item.title)}`); }}
                onAdd={() => editor.createBoardItem("research")}
                onDelete={() => editor.removeBoardItem("research", index)}
                {...sortableProps(editor.isEditing, position, (fromPosition, toPosition) => editor.moveBoardItem("research", publications, fromPosition, toPosition))}
                {...moveControlProps(editor.isEditing, position, publications.length, (fromPosition, toPosition) => editor.moveBoardItem("research", publications, fromPosition, toPosition))}
              >
                {isEmpty ? <EmptyEntryPlaceholder label="Empty Publications item" /> : (
                  <HomeTextListItem
                    item={item}
                    href={siteHref(`/board/publications/${item.id || makeId(item.title)}`)}
                  />
                )}
              </AdminEditable>
            ))}
          </ul>
          <HomeMoreLink href="/board/publications" />
        </section>
      </div>
    </main>
  );
}

function AboutPage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const sections = indexedRenderableItems(content.about.sections || [], ABOUT_SECTION_FIELDS, editor.isEditing)
    .map(({ item, index, isEmpty }) => ({ section: { ...item, paragraphs: (item.paragraphs || []).filter(hasText) }, index, isEmpty }));
  return (
    <PageShell title="About LAB">
      <div className="about-lab">
        {editor.isEditing ? (
          <>
            <InlineAboutHeadingEditor value={content.about} onSave={editor.saveAboutHeading} />
            <div className="admin-list-tools">
              <AdminAddButton onClick={() => editor.saveAboutSection({}, null, { number: "", title: "新内容", paragraphs: "" })} />
            </div>
            {sections.map(({ section, index }) => (
              <InlineAboutSectionEditor
                key={`${section.number || "about"}-${index}`}
                section={section}
                index={index}
                onSave={editor.saveAboutSection}
                onDelete={editor.removeAboutSection}
              />
            ))}
          </>
        ) : (
          <>
            <div className="sub-slogan">
              {hasText(content.about.label) ? <p>{content.about.label}</p> : null}
              {hasText(content.about.title) ? <p>{content.about.title}</p> : null}
            </div>
            {sections.map(({ section, index, isEmpty }) => (
              <section className="cont-group reveal-section" key={`${section.number || "about"}-${index}`}>
                {isEmpty ? <EmptyEntryPlaceholder label="空 About 内容模块" /> : (
                  <>
                    {hasText(section.number) ? <p className="num reveal-item">{section.number}</p> : null}
                    {hasText(section.title) ? <p className="subj reveal-item">{section.title}</p> : null}
                    <div className="reveal-item">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ))}
          </>
        )}
        <div className="object-band" aria-hidden="true">
          <span data-index="ACT I">
            <b>凝视/秩序</b>
          </span>
          <span data-index="ACT II">
            <b>流动/叙事</b>
          </span>
          <span data-index="ACT III">
            <b>对话/共生</b>
          </span>
          <span data-index="ACT IV">
            <b>破壁/融合</b>
          </span>
        </div>
        {editor.isEditing ? (
          <InlineArchiveEditor value={content.archive.at(-1)} onSave={editor.saveArchive} onClear={editor.clearArchive} />
        ) : hasText(content.archive.at(-1)?.[1]) ? (
          <p className="about-note reveal-section reveal-item">{content.archive.at(-1)?.[1]}</p>
        ) : null}
      </div>
    </PageShell>
  );
}

function PeoplePage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const people = orderedRenderableItems(content.people || [], PEOPLE_CONTENT_FIELDS, editor.isEditing, content, "people");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const peopleByCategory = peopleCategories.map((category) => ({
    ...category,
    entries: people.filter(({ item }) => normalizePeopleCategory(item.category) === category.id),
  }));
  const movePerson = (fromCategoryId, fromPosition, toCategoryId, toPosition) => {
    editor.movePerson(peopleByCategory, fromCategoryId, fromPosition, toCategoryId, toPosition);
  };
  const renderPersonCard = (person, isEmpty) => (
    <>
      {isEmpty ? <EmptyEntryPlaceholder label="空 People 条目" /> : null}
      {!isEmpty && primaryVisualForCard(person, "photo") ? (
        <figure>
          <AttachmentPreview value={primaryVisualForCard(person, "photo")} interactive={false} />
        </figure>
      ) : !isEmpty && editor.isEditing ? (
        <figure className="admin-media-shell">
          <EmptyMediaPlaceholder />
        </figure>
      ) : null}
      {!isEmpty && hasText(person.name) ? <h2>{person.name}</h2> : null}
      {!isEmpty && hasText(person.title || person.interests) ? <h3>{person.title || person.interests}</h3> : null}
    </>
  );
  const renderFormerPerson = (person, isEmpty) => (
    <>
      {isEmpty ? <EmptyEntryPlaceholder label="空 People 条目" /> : null}
      {!isEmpty ? (
        <>
          <strong>{person.name || "People"}</strong>
          {hasText(person.title || person.interests) ? <span>{person.title || person.interests}</span> : null}
        </>
      ) : null}
    </>
  );
  return (
    <PageShell title="People">
      <div className="people-page reveal-section">
        <span className="professor-label">PEOPLE</span>
        <div className="people-sections">
          {peopleByCategory.filter((category) => editor.isEditing || category.entries.length).map((category) => (
            <section
              className={`people-section people-section-${category.id}`}
              key={category.id}
              {...peopleDropZoneProps(editor.isEditing, category.id, category.entries.length, movePerson)}
            >
              <header className="people-section-head">
                <div>
                  <h2>{category.title}</h2>
                  {hasText(category.subtitle) ? <span>{category.subtitle}</span> : null}
                </div>
                {editor.isEditing ? (
                  <button type="button" className="people-section-add" onClick={() => editor.createPerson(category.id)}>
                    <Plus size={15} />新增
                  </button>
                ) : null}
              </header>
              {category.layout === "list" ? (
                <div className="former-people-list">
                  {category.entries.map(({ item: person, index, isEmpty }, position) => (
                    editor.isEditing ? (
                      <AdminEditable
                        as="article"
                        className="former-person-row"
                        empty={isEmpty}
                        key={person.id || person.name || `person-${index}`}
                        onEdit={() => { window.location.href = siteHref(`/people/${person.id || makeId(person.name)}`); }}
                        onAdd={() => editor.createPerson(category.id)}
                        onDelete={() => editor.removePerson(index)}
                        {...peopleDragProps(editor.isEditing, category.id, position, movePerson)}
                        {...moveControlProps(editor.isEditing, position, category.entries.length, (fromPosition, toPosition) => movePerson(category.id, fromPosition, category.id, toPosition))}
                      >
                        {renderFormerPerson(person, isEmpty)}
                      </AdminEditable>
                    ) : (
                      <button className="former-person-row" type="button" onClick={() => setSelectedPerson(person)} key={person.id || person.name}>
                        {renderFormerPerson(person, isEmpty)}
                      </button>
                    )
                  ))}
                  {editor.isEditing && !category.entries.length ? <div className="people-drop-empty">拖拽人员到这里，或点击新增</div> : null}
                </div>
              ) : (
                <div className="people-grid-page">
                  {category.entries.map(({ item: person, index, isEmpty }, position) => (
                    editor.isEditing ? (
                      <AdminEditable
                        as="article"
                        className="people-card"
                        empty={isEmpty}
                        key={person.id || person.name || `person-${index}`}
                        onEdit={() => { window.location.href = siteHref(`/people/${person.id || makeId(person.name)}`); }}
                        onAdd={() => editor.createPerson(category.id)}
                        onDelete={() => editor.removePerson(index)}
                        {...peopleDragProps(editor.isEditing, category.id, position, movePerson)}
                        {...moveControlProps(editor.isEditing, position, category.entries.length, (fromPosition, toPosition) => movePerson(category.id, fromPosition, category.id, toPosition))}
                      >
                        {renderPersonCard(person, isEmpty)}
                      </AdminEditable>
                    ) : (
                      <button className="people-card" type="button" onClick={() => setSelectedPerson(person)} key={person.id || person.name}>
                        {renderPersonCard(person, isEmpty)}
                      </button>
                    )
                  ))}
                  {editor.isEditing && !category.entries.length ? <div className="people-drop-empty">拖拽人员到这里，或点击新增</div> : null}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
      {selectedPerson ? <PeopleModal person={selectedPerson} onClose={() => setSelectedPerson(null)} /> : null}
    </PageShell>
  );
}

function PeopleModal({ person, onClose }) {
  const content = useSiteContent();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const fields = renderableModuleFields(content, "people", person).map(({ field, value }) => [
    field.en,
    field.id === "category" ? peopleCategoryLabel(value) : value,
  ]);

  return (
    <div className="people-modal" role="dialog" aria-modal="true" aria-label={person.name || "人员详情"} onMouseDown={onClose}>
      {isMinimized ? (
        <ModalMinibar label={person.name || "人员详情"} onRestore={() => setIsMinimized(false)} onClose={onClose} />
      ) : (
      <article className={`people-modal-panel ${isMaximized ? "is-maximized" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="people-modal-head">
          <strong>{person.name || "People"}</strong>
          <ModalWindowControls
            isMaximized={isMaximized}
            onMinimize={() => setIsMinimized(true)}
            onToggleMaximize={() => setIsMaximized((value) => !value)}
            onClose={onClose}
            closeLabel="Close people detail"
          />
        </header>
        {attachmentsFor(person, "photo").length ? (
          <figure className="people-modal-photo">
            <AttachmentStack attachments={attachmentsFor(person, "photo")} />
          </figure>
        ) : null}
        {fields.length ? (
          <div className="people-modal-fields">
            {fields.map(([label, value]) => (
              <section className="people-modal-field" key={label}>
                <span>{label}</span>
                <p>{value}</p>
              </section>
            ))}
          </div>
        ) : null}
      </article>
      )}
    </div>
  );
}

function defaultFieldSpan(field) {
  return field.type === "attachments" || field.type === "textarea" ? "full" : "half";
}

function normalizeEditorLayout(layout, fields = []) {
  const validNames = fields.map((field) => field.name);
  const requestedOrder = Array.isArray(layout?.order) ? layout.order : [];
  const order = [...new Set([...requestedOrder.filter((name) => validNames.includes(name)), ...validNames])];
  const spans = fields.reduce((result, field) => {
    const requestedSpan = layout?.spans?.[field.name];
    result[field.name] = requestedSpan === "full" || requestedSpan === "half" ? requestedSpan : defaultFieldSpan(field);
    return result;
  }, {});
  return { order, spans };
}

function initialEditorValues(item = {}, fields = []) {
  return fields.reduce((values, field) => {
    if (field.type === "attachments") values[field.name] = attachmentsFor(item, field.legacyField);
    else values[field.name] = item[field.name] || "";
    return values;
  }, {});
}

function EditableFieldLabel({ field, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.label);

  useEffect(() => {
    setDraft(field.label);
  }, [field.label]);

  const commit = () => {
    const nextLabel = draft.trim();
    setEditing(false);
    if (nextLabel && nextLabel !== field.label) onRename?.(field.id, { zh: nextLabel, en: field.en });
    else setDraft(field.label);
  };

  if (editing) {
    return (
      <input
        className="admin-inline-label-input"
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setDraft(field.label);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <strong
      title="双击修改字段标签"
      onDoubleClick={() => {
        if (field.id && onRename) setEditing(true);
      }}
    >
      {field.label}
    </strong>
  );
}

function EditableBilingualFieldLabel({ field, onRename }) {
  return (
    <strong
      title="双击修改字段标签"
      onDoubleClick={() => {
        if (!field.id || !onRename) return;
        const zh = window.prompt("中文标签", field.zh || field.label || "");
        if (zh === null) return;
        const en = window.prompt("英文标签", field.en || "");
        if (en === null) return;
        onRename(field.id, { zh, en });
      }}
    >
      {field.zh || field.label}
    </strong>
  );
}

function FieldSchemaManager({ moduleKey, fields = [], onAddField, onRemoveField, onRenameField }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ zh: "", en: "", type: "text" });
  const submit = () => {
    if (!draft.zh.trim() || !draft.en.trim()) return;
    onAddField?.(moduleKey, draft);
    setDraft({ zh: "", en: "", type: "text" });
    setAdding(false);
  };
  return (
    <section className="field-schema-manager">
      <header className="admin-section-head">
        <h2>字段</h2>
        <button type="button" onClick={() => setAdding((value) => !value)}><Plus size={16} />添加字段</button>
      </header>
      <div className="field-schema-list">
        {fields.map((field) => (
          <span className="field-schema-chip" key={field.id}>
            <button
              type="button"
              className="field-schema-label"
              onDoubleClick={() => {
                const zh = window.prompt("中文标签", field.zh);
                if (zh === null) return;
                const en = window.prompt("英文标签", field.en);
                if (en === null) return;
                onRenameField?.(moduleKey, field.id, { zh, en });
              }}
            >
              {field.zh} / {field.en}
            </button>
            {!field.protected ? (
              <button type="button" aria-label={`删除${field.zh}`} onClick={() => onRemoveField?.(moduleKey, field.id)}>
                <X size={13} />
              </button>
            ) : null}
          </span>
        ))}
      </div>
      {adding ? (
        <div className="field-schema-add">
          <TextInput label="中文标签" value={draft.zh} onChange={(zh) => setDraft((current) => ({ ...current, zh }))} />
          <TextInput label="英文标签" value={draft.en} onChange={(en) => setDraft((current) => ({ ...current, en }))} />
          <SelectInput
            label="字段类型"
            value={draft.type}
            options={[
              { value: "text", label: "单行" },
              { value: "textarea", label: "多行" },
            ]}
            onChange={(type) => setDraft((current) => ({ ...current, type }))}
          />
          <button type="button" onClick={submit}>确认添加</button>
        </div>
      ) : null}
    </section>
  );
}

function CoverEditor({ cover, attachments = [], onChange, uploadImage }) {
  const imageAttachments = normalizeAttachmentList(attachments).filter(isImageAttachment);
  const normalizedCover = normalizeCover(cover, imageAttachments);
  return (
    <section className="cover-editor">
      <header className="admin-section-head">
        <h2>封面缩略图</h2>
      </header>
      {normalizedCover?.file ? (
        <>
          <div className="admin-attachment-previews">
            <figure>
              <figcaption>当前封面</figcaption>
              <AttachmentPreview value={normalizedCover.file} interactive={false} />
            </figure>
          </div>
          <ThumbnailCropEditor attachment={normalizedCover.file} onChange={(file) => onChange({ ...normalizedCover, file, crop: file.crop })} />
        </>
      ) : <div className="admin-empty-image">未设置封面</div>}
      <div className="admin-row-actions">
        <UploadBox multiple={false} onUpload={(file) => uploadImage((uploaded) => onChange({ file: Array.isArray(uploaded) ? uploaded[0] : uploaded }), file)} />
        {imageAttachments.map((attachment) => (
          <button type="button" className="admin-muted-button" key={attachment.url} onClick={() => onChange({ file: attachment, sourceAttachmentId: attachment.url })}>
            设为封面
          </button>
        ))}
      </div>
    </section>
  );
}

function InlineFieldValueEditor({ field, value, onChange, editable = true, onActivate }) {
  if (field.type === "select") {
    return (
      <SelectInput
        label={field.zh}
        value={value}
        options={field.options || []}
        onChange={onChange}
      />
    );
  }
  return (
    <InlineEditableText
      as={field.type === "textarea" ? "p" : "div"}
      className={`admin-block-value ${field.type === "textarea" ? "is-multiline" : ""}`.trim()}
      value={value}
      onChange={onChange}
      editable={editable}
      onActivate={onActivate}
      placeholder="双击输入内容"
    />
  );
}

function CoverCropModal({ cover, attachments = [], uploadImage, onClose, onSave }) {
  const imageAttachments = normalizeAttachmentList(attachments).filter(isImageAttachment);
  const [draft, setDraft] = useState(() => normalizeCover(cover, imageAttachments));
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    setDraft(normalizeCover(cover, imageAttachments));
  }, [cover, attachments]);

  const handleUploaded = (uploaded) => {
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (!file) return;
    setDraft({ file });
  };
  const confirmSave = async () => {
    setSavingDraft(true);
    const saved = await onSave(draft || null);
    setSavingDraft(false);
    if (saved !== false && saved !== null) onClose();
  };

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label="封面缩略图">
      <section className="admin-modal-panel cover-crop-modal">
        <header className="admin-modal-head">
          <strong>封面缩略图</strong>
          <button type="button" aria-label="关闭" onClick={onClose}><X size={22} /></button>
        </header>
        <div className="admin-modal-body cover-crop-modal-body">
          <div className="cover-crop-actions">
            <UploadBox multiple={false} onUpload={(file) => uploadImage(handleUploaded, file)} />
            {imageAttachments.map((attachment) => (
              <button type="button" className="admin-muted-button" key={attachment.url} onClick={() => setDraft({ file: attachment, sourceAttachmentId: attachment.url })}>
                选用附件图片
              </button>
            ))}
          </div>
          {draft?.file ? (
            <ThumbnailCropEditor attachment={draft.file} onChange={(file) => setDraft((current) => ({ ...(current || {}), file, crop: file.crop }))} />
          ) : (
            <div className="cover-empty-hint">点击上传封面</div>
          )}
        </div>
        <footer className="admin-modal-actions">
          <button type="button" className="admin-muted-button" onClick={onClose}>取消</button>
          <button type="button" className="cover-crop-save-button" onClick={confirmSave} disabled={savingDraft}>
            {savingDraft ? <Loader2 className="spin" size={16} /> : <Save size={16} />}确认保存
          </button>
        </footer>
      </section>
    </div>
  );
}

function CoverTopRegion({ cover, attachments = [], uploadImage, onChange }) {
  const [open, setOpen] = useState(false);
  const normalizedCover = normalizeCover(cover, normalizeAttachmentList(attachments).filter(isImageAttachment));
  return (
    <>
      <button type="button" className="cover-top-region" onClick={() => setOpen(true)}>
        {normalizedCover?.file ? (
          <>
            <span>封面缩略图</span>
            <AttachmentPreview value={normalizedCover.file} interactive={false} showName={false} />
          </>
        ) : (
          <span>点击上传封面</span>
        )}
      </button>
      {open ? (
        <CoverCropModal
          cover={cover}
          attachments={attachments}
          uploadImage={uploadImage}
          onClose={() => setOpen(false)}
          onSave={onChange}
        />
      ) : null}
    </>
  );
}

function PeopleAvatarCropModal({ attachment, uploadImage, onClose, onSave }) {
  const [draft, setDraft] = useState(() => normalizeAttachment(attachment));

  useEffect(() => {
    setDraft(normalizeAttachment(attachment));
  }, [attachment]);

  const handleUploaded = (uploaded) => {
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (file) setDraft(file);
  };

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label="裁剪头像">
      <section className="admin-modal-panel cover-crop-modal">
        <header className="admin-modal-head">
          <strong>裁剪头像</strong>
          <button type="button" aria-label="关闭" onClick={onClose}><X size={22} /></button>
        </header>
        <div className="admin-modal-body cover-crop-modal-body">
          <div className="cover-crop-actions">
            <UploadBox multiple={false} accept="image/*" label="上传头像" onUpload={(file) => uploadImage(handleUploaded, file)} />
          </div>
          {draft && isImageAttachment(draft) ? (
            <ThumbnailCropEditor attachment={draft} onChange={setDraft} />
          ) : draft ? (
            <AttachmentPreview value={draft} interactive={false} cropped={false} />
          ) : (
            <div className="cover-empty-hint">点击上传头像</div>
          )}
        </div>
        <footer className="admin-modal-actions">
          <button type="button" className="admin-muted-button" onClick={onClose}>取消</button>
          <button type="button" onClick={() => { onSave(draft || null); onClose(); }}>
            <Save size={16} />确认保存
          </button>
        </footer>
      </section>
    </div>
  );
}

function FieldAdder({ moduleKey, onAddField }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ zh: "", en: "", type: "text" });
  const submit = () => {
    if (!draft.zh.trim() || !draft.en.trim()) return;
    onAddField?.(moduleKey, draft);
    setDraft({ zh: "", en: "", type: "text" });
    setAdding(false);
  };
  return (
    <div className="block-editor-add-field">
      <button type="button" onClick={() => setAdding((value) => !value)}>
        <Plus size={16} />添加字段
      </button>
      {adding ? (
        <div className="field-schema-add">
          <TextInput label="中文标签" value={draft.zh} onChange={(zh) => setDraft((current) => ({ ...current, zh }))} />
          <TextInput label="英文标签" value={draft.en} onChange={(en) => setDraft((current) => ({ ...current, en }))} />
          <SelectInput
            label="字段类型"
            value={draft.type}
            options={[
              { value: "text", label: "单行" },
              { value: "textarea", label: "多行" },
            ]}
            onChange={(type) => setDraft((current) => ({ ...current, type }))}
          />
          <button type="button" onClick={submit}>确认添加</button>
        </div>
      ) : null}
    </div>
  );
}

function attachmentBlockLabel(attachment) {
  if (isVideoAttachment(attachment)) return "视频附件";
  if (isImageAttachment(attachment)) return "图片附件";
  return "附件";
}

function BlockEditorCanvas({
  moduleKey,
  fields = [],
  values = {},
  attachments = [],
  layout,
  onLayoutChange,
  onFieldChange,
  onRenameLabel,
  onRemoveField,
  onAttachmentsChange,
  onAddField,
  uploadImage,
}) {
  const [draggingKey, setDraggingKey] = useState("");
  const [dropState, setDropState] = useState({ key: "", placement: "" });
  const [fileDragging, setFileDragging] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [activeTextKey, setActiveTextKey] = useState("");
  const [guideLines, setGuideLines] = useState([]);
  const [textAutoHeights, setTextAutoHeights] = useState({});
  const [nudgingKeys, setNudgingKeys] = useState(() => new Set());
  const freeStageRef = useRef(null);
  const freeInteractionRef = useRef(null);
  const autoScrollRef = useRef({ frame: 0, velocity: 0 });
  const nudgeTimeoutRef = useRef(0);
  const lastTextPointerRef = useRef({ key: "", time: 0 });
  const pendingTextFocusRef = useRef("");
  const normalizedAttachments = normalizeAttachmentList(attachments);
  const attachmentMap = new Map(normalizedAttachments.map((attachment) => [attachment.url, attachment]));
  const layoutFields = fields.map((field) => ({
    ...field,
    value: Object.hasOwn(values, field.id) ? values[field.id] : field.value,
  }));
  const workingLayout = normalizeEditorStackContentLayout(layout, layoutFields, normalizedAttachments);
  const itemKey = (item) => `${item.type}:${item.id}`;
  const items = workingLayout.items.map((item) => {
    if (item.type !== STACK_TEXT_ITEM_TYPE || stackItemHasManualSize(item)) return item;
    const measuredHeight = Number(textAutoHeights[itemKey(item)]);
    if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) return item;
    return { ...item, h: Math.max(stackItemHeight(item), measuredHeight) };
  });
  const commitItems = (nextItems) => onLayoutChange({ mode: STACK_LAYOUT_MODE, items: nextItems });
  const legacyTextFieldId = (id) => {
    const validFieldIds = new Set(layoutFields.map((field) => field.id));
    return legacyContentFieldIdFromTextId(id, validFieldIds);
  };
  const freeStageRatio = editorFreeLayoutStageRatio(items);
  const maxFreeZ = items.reduce((maxZ, item) => Math.max(maxZ, stackItemZ(item, maxZ + 1)), 0);
  const showNudgingForKeys = (keys = []) => {
    if (nudgeTimeoutRef.current) window.clearTimeout(nudgeTimeoutRef.current);
    if (!keys.length) {
      setNudgingKeys(new Set());
      nudgeTimeoutRef.current = 0;
      return;
    }
    setNudgingKeys(new Set(keys));
    nudgeTimeoutRef.current = window.setTimeout(() => {
      setNudgingKeys(new Set());
      nudgeTimeoutRef.current = 0;
    }, 260);
  };
  const dropPlacementFromEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
    const y = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
    if (x < 0.28) return "left";
    if (x > 0.72) return "right";
    return y < 0.5 ? "before" : "after";
  };
  const moveItem = (fromKey, toKey, placement = "after") => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    const rows = stackRowsFromItems(items).map((row) => row.items.slice());
    let dragged = null;
    rows.forEach((rowItems) => {
      const index = rowItems.findIndex((item) => itemKey(item) === fromKey);
      if (index >= 0) [dragged] = rowItems.splice(index, 1);
    });
    if (!dragged) return;
    const nextRows = rows.filter((rowItems) => rowItems.length);
    const targetRowIndex = nextRows.findIndex((rowItems) => rowItems.some((item) => itemKey(item) === toKey));
    if (targetRowIndex < 0) return;
    const targetIndex = nextRows[targetRowIndex].findIndex((item) => itemKey(item) === toKey);
    if (placement === "left" || placement === "right") {
      nextRows[targetRowIndex].splice(targetIndex + (placement === "right" ? 1 : 0), 0, dragged);
      commitItems(flattenStackRows(nextRows));
      return;
    }
    nextRows.splice(targetRowIndex + (placement === "after" ? 1 : 0), 0, [dragged]);
    commitItems(flattenStackRows(nextRows));
  };
  const removeAttachment = (url) => {
    const nextAttachments = normalizedAttachments.filter((attachment) => attachment.url !== url);
    const nextItems = items.filter((item) => !(item.type === "attachment" && item.id === url));
    onAttachmentsChange(nextAttachments);
    commitItems(nextItems);
  };
  const addTextBlock = () => {
    const nextRow = items.reduce((maxRow, item) => Math.max(maxRow, stackItemRow(item, maxRow + 1)), -1) + 1;
    const id = textBlockId();
    const key = `${STACK_TEXT_ITEM_TYPE}:${id}`;
    pendingTextFocusRef.current = key;
    setActiveTextKey(key);
    commitItems([
      ...items,
      {
        ...defaultStackLayoutItem(STACK_TEXT_ITEM_TYPE, id, nextRow),
        text: "",
        fontSize: DEFAULT_STACK_TEXT_FONT_SIZE,
        x: 0,
        y: freeLayoutBottom(items),
        z: maxFreeZ + 1,
      },
    ]);
  };
  useEffect(() => {
    const pendingKey = pendingTextFocusRef.current;
    if (!pendingKey) return;
    pendingTextFocusRef.current = "";
    window.requestAnimationFrame(() => {
      const target = Array.from(freeStageRef.current?.querySelectorAll("[data-block-key]") || [])
        .find((node) => node.dataset.blockKey === pendingKey);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      const valueTarget = target?.querySelector(".admin-block-value");
      valueTarget?.focus();
    });
  }, [items]);
  useLayoutEffect(() => {
    const stage = freeStageRef.current;
    if (!stage) {
      setTextAutoHeights((current) => (Object.keys(current).length ? {} : current));
      return undefined;
    }
    let frame = 0;
    const manualTextKeys = new Set(
      items
        .filter((item) => item.type === STACK_TEXT_ITEM_TYPE && stackItemHasManualSize(item))
        .map(itemKey),
    );
    const measure = () => {
      const stageWidth = stage.getBoundingClientRect().width;
      if (!stageWidth) return;
      const nextHeights = {};
      stage.querySelectorAll(".block-editor-free-item.is-text[data-block-key]").forEach((node) => {
        const key = node.getAttribute("data-block-key") || "";
        if (!key || manualTextKeys.has(key)) return;
        const valueNode = node.querySelector(".admin-block-value");
        const style = window.getComputedStyle(node);
        const paddingY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
        const contentHeight = Math.max(
          valueNode?.scrollHeight || 0,
          valueNode?.getBoundingClientRect().height || 0,
        );
        const measuredHeight = Math.ceil(contentHeight + paddingY);
        if (measuredHeight > 0) {
          nextHeights[key] = clamp(measuredHeight / stageWidth, MIN_STACK_ITEM_RATIO, 3);
        }
      });
      setTextAutoHeights((current) => (heightRatioMapsEqual(current, nextHeights) ? current : nextHeights));
    };
    const scheduleMeasure = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    scheduleMeasure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleMeasure) : null;
    observer?.observe(stage);
    stage.querySelectorAll(".block-editor-free-item.is-text .admin-block-value").forEach((node) => observer?.observe(node));
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [items, freeStageRatio]);
  const updateTextBlock = (item, text) => {
    const nextText = normalizeEditableText(text);
    const fieldId = legacyTextFieldId(item.id);
    if (fieldId) onFieldChange?.(fieldId, nextText);
    const key = itemKey(item);
    commitItems(items.map((item) => (
      itemKey(item) === key ? { ...item, text: nextText } : item
    )));
  };
  const removeTextBlock = (targetItem) => {
    const fieldId = legacyTextFieldId(targetItem.id);
    if (fieldId) onFieldChange?.(fieldId, "");
    const key = itemKey(targetItem);
    if (activeTextKey === key) setActiveTextKey("");
    commitItems(items.filter((item) => itemKey(item) !== key));
  };
  const addUploaded = async (uploaded) => {
    const nextAttachments = normalizeAttachmentList(normalizedAttachments, uploaded);
    const nextUrls = new Set(normalizedAttachments.map((attachment) => attachment.url));
    const nextRow = items.reduce((maxRow, item) => Math.max(maxRow, stackItemRow(item, maxRow + 1)), -1) + 1;
    const nextY = freeLayoutBottom(items);
    const stageWidth = freeStageRef.current?.getBoundingClientRect().width || 0;
    const appended = [];
    let uploadY = nextY;
    const addedAttachments = nextAttachments.filter((attachment) => !nextUrls.has(attachment.url));
    for (const [index, attachment] of addedAttachments.entries()) {
      const measuredSize = await uploadedAttachmentStackSize(attachment, stageWidth);
      const nextItem = {
        ...defaultStackLayoutItem("attachment", attachment.url, nextRow + index),
        ...(measuredSize || {}),
        x: 0,
        y: uploadY,
        z: maxFreeZ + index + 1,
      };
      appended.push(nextItem);
      uploadY += stackItemHeight(nextItem);
    }
    onAttachmentsChange(nextAttachments);
    commitItems([...items, ...appended]);
  };
  const uploadFiles = async (files) => {
    setFileUploading(true);
    try {
      return await uploadImage(addUploaded, files);
    } finally {
      setFileUploading(false);
    }
  };
  const guideKey = (guide) => `${guide.axis}:${guide.kind}:${guide.position.toFixed(4)}`;
  const uniqueGuides = (guides = []) => {
    const seen = new Set();
    return guides.filter((guide) => {
      const key = guideKey(guide);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const snapFreeMove = (state, nextX, nextY) => {
    const threshold = 5 / state.stageWidth;
    const others = state.baseItems.filter((entry) => itemKey(entry) !== itemKey(state.item));
    let snappedX = nextX;
    let snappedY = nextY;
    let bestX = threshold + 1;
    let bestY = threshold + 1;
    const guides = [];
    const xCandidates = (x, width) => [
      { value: x, offset: 0 },
      { value: x + (width / 2), offset: width / 2 },
      { value: x + width, offset: width },
    ];
    const yCandidates = (y, height) => [
      { value: y, offset: 0 },
      { value: y + (height / 2), offset: height / 2 },
      { value: y + height, offset: height },
    ];
    const currentWidth = state.startW;
    const currentHeight = state.startH;

    others.forEach((entry) => {
      const otherX = stackItemX(entry);
      const otherY = stackItemY(entry);
      const otherWidth = stackItemWidth(entry, entry.type);
      const otherHeight = stackItemHeight(entry);
      xCandidates(snappedX, currentWidth).forEach((current) => {
        xCandidates(otherX, otherWidth).forEach((target) => {
          const distance = Math.abs(current.value - target.value);
          if (distance <= threshold && distance < bestX) {
            bestX = distance;
            snappedX = clamp(target.value - current.offset, 0, Math.max(0, 1 - currentWidth));
            guides.push({ axis: "x", kind: "align", position: target.value });
          }
        });
      });
      yCandidates(snappedY, currentHeight).forEach((current) => {
        yCandidates(otherY, otherHeight).forEach((target) => {
          const distance = Math.abs(current.value - target.value);
          if (distance <= threshold && distance < bestY) {
            bestY = distance;
            snappedY = clamp(target.value - current.offset, 0, 48);
            guides.push({ axis: "y", kind: "align", position: target.value });
          }
        });
      });
    });

    const leftItems = others
      .map((entry) => ({ left: stackItemX(entry), right: stackItemX(entry) + stackItemWidth(entry, entry.type) }))
      .filter((entry) => entry.right <= snappedX)
      .sort((left, right) => right.right - left.right);
    const rightItems = others
      .map((entry) => ({ left: stackItemX(entry), right: stackItemX(entry) + stackItemWidth(entry, entry.type) }))
      .filter((entry) => entry.left >= snappedX + currentWidth)
      .sort((left, right) => left.left - right.left);
    if (leftItems[0] && rightItems[0]) {
      const targetLeft = (leftItems[0].right + rightItems[0].left - currentWidth) / 2;
      if (Math.abs(targetLeft - snappedX) <= threshold) {
        snappedX = clamp(targetLeft, 0, Math.max(0, 1 - currentWidth));
        guides.push(
          { axis: "x", kind: "spacing", position: leftItems[0].right },
          { axis: "x", kind: "spacing", position: rightItems[0].left },
        );
      }
    }

    const upperItems = others
      .map((entry) => ({ top: stackItemY(entry), bottom: stackItemY(entry) + stackItemHeight(entry) }))
      .filter((entry) => entry.bottom <= snappedY)
      .sort((left, right) => right.bottom - left.bottom);
    const lowerItems = others
      .map((entry) => ({ top: stackItemY(entry), bottom: stackItemY(entry) + stackItemHeight(entry) }))
      .filter((entry) => entry.top >= snappedY + currentHeight)
      .sort((left, right) => left.top - right.top);
    if (upperItems[0] && lowerItems[0]) {
      const targetTop = (upperItems[0].bottom + lowerItems[0].top - currentHeight) / 2;
      if (Math.abs(targetTop - snappedY) <= threshold) {
        snappedY = clamp(targetTop, 0, 48);
        guides.push(
          { axis: "y", kind: "spacing", position: upperItems[0].bottom },
          { axis: "y", kind: "spacing", position: lowerItems[0].top },
        );
      }
    }

    return { x: snappedX, y: snappedY, guides: uniqueGuides(guides) };
  };
  const freeResizeMinRatio = (item, stageWidth = 0) => {
    if (item.type !== STACK_TEXT_ITEM_TYPE && item.type !== "attachment") return stackItemMinRatio(item.type);
    const pixelRatio = stageWidth > 0 ? MIN_FREE_ITEM_PIXEL_SIZE / stageWidth : MIN_STACK_ITEM_RATIO;
    return Math.max(MIN_STACK_ITEM_RATIO, pixelRatio);
  };
  const freeResizeBounds = (item, stageWidth = 0) => ({
    minWidth: freeResizeMinRatio(item, stageWidth),
    minHeight: freeResizeMinRatio(item, stageWidth),
    maxWidth: 1,
    maxHeight: 3,
  });
  const smoothSnapValue = (currentValue, targetValue, distance, threshold) => {
    if (threshold <= 0) return targetValue;
    const progress = clamp(1 - (distance / threshold), 0, 1);
    const eased = progress * progress * (3 - (2 * progress));
    const maxStep = threshold;
    return currentValue + clamp((targetValue - currentValue) * eased, -maxStep, maxStep);
  };
  const normalizedResizeHandle = (handle = "se") => (FREE_RESIZE_HANDLES.includes(handle) ? handle : "se");
  const resizeEdgesForHandle = (handle = "se") => {
    const normalized = normalizedResizeHandle(handle);
    return {
      left: normalized.includes("w"),
      right: normalized.includes("e"),
      top: normalized.includes("n"),
      bottom: normalized.includes("s"),
    };
  };
  const constrainFreeResizeBox = (state, box) => {
    const { minWidth, minHeight, maxWidth, maxHeight } = freeResizeBounds(state.item, state.stageWidth);
    const edges = state.resizeEdges || resizeEdgesForHandle(state.resizeHandle);
    let { left, top, right, bottom } = box;
    if (edges.left && !edges.right) {
      left = clamp(left, Math.max(0, right - maxWidth), right - minWidth);
    } else if (edges.right && !edges.left) {
      right = clamp(right, left + minWidth, Math.min(1, left + maxWidth));
    } else {
      const width = clamp(right - left, minWidth, maxWidth);
      const center = (left + right) / 2;
      left = clamp(center - (width / 2), 0, Math.max(0, 1 - width));
      right = left + width;
    }
    if (edges.top && !edges.bottom) {
      top = clamp(top, Math.max(0, bottom - maxHeight), bottom - minHeight);
    } else if (edges.bottom && !edges.top) {
      bottom = clamp(bottom, top + minHeight, top + maxHeight);
    } else {
      const height = clamp(bottom - top, minHeight, maxHeight);
      const center = (top + bottom) / 2;
      top = Math.max(0, center - (height / 2));
      bottom = top + height;
    }
    top = clamp(top, 0, 48);
    bottom = Math.max(top + minHeight, Math.min(top + maxHeight, bottom));
    return {
      x: left,
      y: top,
      w: right - left,
      h: bottom - top,
    };
  };
  const freeResizeBoxFromRect = (rect) => ({
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.w,
    bottom: rect.y + rect.h,
  });
  const freeResizeRectFromDelta = (state, deltaX, deltaY) => {
    const edges = state.resizeEdges || resizeEdgesForHandle(state.resizeHandle);
    const startRight = state.startItemX + state.startW;
    const startBottom = state.startItemY + state.startH;
    return constrainFreeResizeBox(state, {
      left: state.startItemX + (edges.left ? deltaX : 0),
      right: startRight + (edges.right ? deltaX : 0),
      top: state.startItemY + (edges.top ? deltaY : 0),
      bottom: startBottom + (edges.bottom ? deltaY : 0),
    });
  };
  const freeResizeRectFromAnchoredSize = (state, nextW, nextH) => {
    const edges = state.resizeEdges || resizeEdgesForHandle(state.resizeHandle);
    const startRight = state.startItemX + state.startW;
    const startBottom = state.startItemY + state.startH;
    const centerX = state.startItemX + (state.startW / 2);
    const centerY = state.startItemY + (state.startH / 2);
    return constrainFreeResizeBox(state, {
      left: edges.left ? startRight - nextW : edges.right ? state.startItemX : centerX - (nextW / 2),
      right: edges.left ? startRight : edges.right ? state.startItemX + nextW : centerX + (nextW / 2),
      top: edges.top ? startBottom - nextH : edges.bottom ? state.startItemY : centerY - (nextH / 2),
      bottom: edges.top ? startBottom : edges.bottom ? state.startItemY + nextH : centerY + (nextH / 2),
    });
  };
  const lockFreeResizeAspectRect = (state, rect) => {
    if (!state.shiftKey || !state.resizeAspectRatio) return rect;
    const { minWidth, minHeight, maxWidth, maxHeight } = freeResizeBounds(state.item, state.stageWidth);
    const edges = state.resizeEdges || resizeEdgesForHandle(state.resizeHandle);
    const ratio = state.resizeAspectRatio;
    const horizontal = edges.left || edges.right;
    const vertical = edges.top || edges.bottom;
    let lockedW = rect.w;
    let lockedH = rect.h;
    if (horizontal && !vertical) {
      lockedH = lockedW / ratio;
    } else if (!horizontal && vertical) {
      lockedW = lockedH * ratio;
    } else {
      const deltaW = rect.w - state.startW;
      const deltaH = rect.h - state.startH;
      const projectedDeltaH = ((deltaW * ratio) + deltaH) / ((ratio * ratio) + 1);
      lockedH = state.startH + projectedDeltaH;
      lockedW = state.startW + (projectedDeltaH * ratio);
    }
    if (lockedW > maxWidth) {
      lockedW = maxWidth;
      lockedH = lockedW / ratio;
    }
    if (lockedH > maxHeight) {
      lockedH = maxHeight;
      lockedW = lockedH * ratio;
    }
    if (lockedW < minWidth) {
      lockedW = minWidth;
      lockedH = lockedW / ratio;
    }
    if (lockedH < minHeight) {
      lockedH = minHeight;
      lockedW = lockedH * ratio;
    }
    return freeResizeRectFromAnchoredSize(state, clamp(lockedW, minWidth, maxWidth), clamp(lockedH, minHeight, maxHeight));
  };
  const snapFreeResizeRect = (state, rect) => {
    const threshold = 5 / state.stageWidth;
    const edges = state.resizeEdges || resizeEdgesForHandle(state.resizeHandle);
    const others = state.baseItems.filter((entry) => itemKey(entry) !== itemKey(state.item));
    const xTargets = [{ value: 0 }, { value: 1 }];
    const yTargets = [{ value: 0 }];
    let snapped = rect;
    let bestX = threshold + 1;
    let bestY = threshold + 1;
    const guides = [];
    others.forEach((entry) => {
      const otherX = stackItemX(entry);
      const otherY = stackItemY(entry);
      const otherWidth = stackItemWidth(entry, entry.type);
      const otherHeight = stackItemHeight(entry);
      xTargets.push({ value: otherX }, { value: otherX + (otherWidth / 2) }, { value: otherX + otherWidth });
      yTargets.push({ value: otherY }, { value: otherY + (otherHeight / 2) }, { value: otherY + otherHeight });
    });
    const snapXEdge = (edge) => {
      const edgeValue = edge === "left" ? snapped.x : snapped.x + snapped.w;
      xTargets.forEach((target) => {
        const distance = Math.abs(edgeValue - target.value);
        if (distance > threshold || distance >= bestX) return;
        const box = freeResizeBoxFromRect(snapped);
        box[edge] = smoothSnapValue(edgeValue, target.value, distance, threshold);
        snapped = constrainFreeResizeBox(state, box);
        bestX = distance;
        guides.push({ axis: "x", kind: "align", position: target.value });
      });
    };
    const snapYEdge = (edge) => {
      const edgeValue = edge === "top" ? snapped.y : snapped.y + snapped.h;
      yTargets.forEach((target) => {
        const distance = Math.abs(edgeValue - target.value);
        if (distance > threshold || distance >= bestY) return;
        const box = freeResizeBoxFromRect(snapped);
        box[edge] = smoothSnapValue(edgeValue, target.value, distance, threshold);
        snapped = constrainFreeResizeBox(state, box);
        bestY = distance;
        guides.push({ axis: "y", kind: "align", position: target.value });
      });
    };
    if (edges.left) snapXEdge("left");
    if (edges.right) snapXEdge("right");
    if (edges.top) snapYEdge("top");
    if (edges.bottom) snapYEdge("bottom");
    return { ...snapped, guides: uniqueGuides(guides) };
  };
  const applyFreeInteraction = (clientX = null, clientY = null) => {
    const state = freeInteractionRef.current;
    if (!state) return;
    const nextClientX = Number.isFinite(clientX) ? clientX : state.lastX;
    const nextClientY = Number.isFinite(clientY) ? clientY : state.lastY;
    state.lastX = nextClientX;
    state.lastY = nextClientY;
    const pixelDelta = Math.hypot(nextClientX - state.startX, nextClientY - state.startY);
    if (state.mode === "move" && !state.moved && pixelDelta < 3) return;
    state.moved = true;
    const deltaX = (nextClientX - state.startX + (window.scrollX - state.startScrollX)) / state.stageWidth;
    const deltaY = (nextClientY - state.startY + (window.scrollY - state.startScrollY)) / state.stageWidth;
    const key = itemKey(state.item);
    const nextPatch = state.mode === "resize"
      ? (() => {
          const rawRect = freeResizeRectFromDelta(state, deltaX, deltaY);
          const lockedRect = lockFreeResizeAspectRect(state, rawRect);
          const snapped = snapFreeResizeRect(state, lockedRect);
          const finalRect = lockFreeResizeAspectRect(state, snapped);
          setGuideLines(snapped.guides);
          return {
            x: finalRect.x,
            y: finalRect.y,
            w: finalRect.w,
            h: finalRect.h,
            ...(state.item.type === STACK_TEXT_ITEM_TYPE ? { manualSize: true } : {}),
          };
        })()
      : (() => {
          const snapped = snapFreeMove(
            state,
            clamp(state.startItemX + deltaX, 0, Math.max(0, 1 - state.startW)),
            clamp(state.startItemY + deltaY, 0, 48),
          );
          setGuideLines(snapped.guides);
          return {
            x: snapped.x,
            y: snapped.y,
            z: stackItemZ(state.item),
          };
        })();
    commitItems(state.baseItems.map((entry) => (
      itemKey(entry) === key
        ? { ...entry, ...nextPatch }
        : entry
    )));
  };
  const stopAutoScroll = () => {
    if (autoScrollRef.current.frame) cancelAnimationFrame(autoScrollRef.current.frame);
    autoScrollRef.current = { frame: 0, velocity: 0 };
  };
  const runAutoScroll = () => {
    const state = autoScrollRef.current;
    if (!state.velocity || !freeInteractionRef.current) {
      stopAutoScroll();
      return;
    }
    window.scrollBy(0, state.velocity);
    applyFreeInteraction();
    autoScrollRef.current.frame = requestAnimationFrame(runAutoScroll);
  };
  const updateAutoScroll = (clientY) => {
    const viewportHeight = window.innerHeight || 0;
    let velocity = 0;
    if (clientY < FREE_DRAG_AUTO_SCROLL_EDGE) {
      const intensity = clamp((FREE_DRAG_AUTO_SCROLL_EDGE - clientY) / FREE_DRAG_AUTO_SCROLL_EDGE, 0, 1);
      velocity = -FREE_DRAG_AUTO_SCROLL_MAX_SPEED * (intensity ** 1.35);
    }
    if (clientY > viewportHeight - FREE_DRAG_AUTO_SCROLL_EDGE) {
      const intensity = clamp((clientY - (viewportHeight - FREE_DRAG_AUTO_SCROLL_EDGE)) / FREE_DRAG_AUTO_SCROLL_EDGE, 0, 1);
      velocity = FREE_DRAG_AUTO_SCROLL_MAX_SPEED * (intensity ** 1.35);
    }
    velocity = clamp(velocity, -FREE_DRAG_AUTO_SCROLL_MAX_SPEED, FREE_DRAG_AUTO_SCROLL_MAX_SPEED);
    autoScrollRef.current.velocity = velocity;
    if (velocity && !autoScrollRef.current.frame) {
      autoScrollRef.current.frame = requestAnimationFrame(runAutoScroll);
    }
    if (!velocity && autoScrollRef.current.frame) stopAutoScroll();
  };
  useEffect(() => () => {
    stopAutoScroll();
    if (nudgeTimeoutRef.current) window.clearTimeout(nudgeTimeoutRef.current);
  }, []);
  const beginResize = (event, item, handle = "se") => {
    event.preventDefault();
    event.stopPropagation();
    const rect = freeStageRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const key = itemKey(item);
    const resizeHandle = normalizedResizeHandle(handle);
    const nextZ = Math.max(maxFreeZ + 1, stackItemZ(item));
    const baseItems = items.map((entry) => (itemKey(entry) === key ? { ...entry, z: nextZ } : entry));
    if (nextZ !== stackItemZ(item)) commitItems(baseItems);
    const startW = stackItemWidth(item, item.type);
    const startH = stackItemHeight(item);
    setGuideLines([]);
    freeInteractionRef.current = {
      pointerId: event.pointerId,
      mode: "resize",
      resizeHandle,
      resizeEdges: resizeEdgesForHandle(resizeHandle),
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      item: { ...item, z: nextZ },
      baseItems,
      startItemX: stackItemX(item),
      startItemY: stackItemY(item),
      startW,
      startH,
      resizeAspectRatio: startH ? startW / startH : null,
      shiftKey: event.shiftKey,
      stageWidth: rect.width,
      startScrollX: window.scrollX,
      startScrollY: window.scrollY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const beginFreeMove = (event, item) => {
    if (event.target.closest("button, input, textarea, select, [contenteditable='true']")) return;
    const key = itemKey(item);
    const textTarget = item.type === STACK_TEXT_ITEM_TYPE ? event.target.closest(".admin-block-value") : null;
    const now = Date.now();
    const isRepeatedTextPress = textTarget && lastTextPointerRef.current.key === key && now - lastTextPointerRef.current.time < 1000;
    if (textTarget) lastTextPointerRef.current = { key, time: now };
    if (item.type === STACK_TEXT_ITEM_TYPE && textTarget && (event.detail >= 2 || isRepeatedTextPress)) {
      const currentTarget = event.currentTarget;
      setActiveTextKey(key);
      requestAnimationFrame(() => {
        const target = currentTarget?.querySelector(".admin-block-value");
        target?.focus();
        if (target) document.getSelection()?.selectAllChildren(target);
      });
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = freeStageRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const nextZ = Math.max(maxFreeZ + 1, stackItemZ(item));
    const baseItems = items.map((entry) => (itemKey(entry) === key ? { ...entry, z: nextZ } : entry));
    if (nextZ !== stackItemZ(item)) commitItems(baseItems);
    setGuideLines([]);
    freeInteractionRef.current = {
      pointerId: event.pointerId,
      mode: "move",
      item: { ...item, z: nextZ },
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      baseItems,
      startItemX: stackItemX(item),
      startItemY: stackItemY(item),
      startW: stackItemWidth(item, item.type),
      startH: stackItemHeight(item),
      stageWidth: rect.width,
      startScrollX: window.scrollX,
      startScrollY: window.scrollY,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleFreePointerMove = (event) => {
    const state = freeInteractionRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    state.shiftKey = event.shiftKey;
    applyFreeInteraction(event.clientX, event.clientY);
    updateAutoScroll(event.clientY);
  };
  const stopFreeInteraction = (event) => {
    const state = freeInteractionRef.current;
    if (state?.pointerId === event.pointerId) {
      if (event.type === "pointerup" && state.mode === "move" && state.moved) {
        const deltaX = (event.clientX - state.startX + (window.scrollX - state.startScrollX)) / state.stageWidth;
        const deltaY = (event.clientY - state.startY + (window.scrollY - state.startScrollY)) / state.stageWidth;
        const snapped = snapFreeMove(
          state,
          clamp(state.startItemX + deltaX, 0, Math.max(0, 1 - state.startW)),
          clamp(state.startItemY + deltaY, 0, 48),
        );
        const key = itemKey(state.item);
        const releasedItems = state.baseItems.map((entry) => (
          itemKey(entry) === key
            ? {
                ...entry,
                x: snapped.x,
                y: snapped.y,
                z: stackItemZ(state.item),
              }
            : entry
        ));
        const resolved = resolveStackCollisionsAfterMove(releasedItems, key);
        commitItems(resolved.items);
        showNudgingForKeys(resolved.movedKeys);
      }
      freeInteractionRef.current = null;
      setGuideLines([]);
      stopAutoScroll();
    }
  };
  const handleFreeWheel = (event) => {
    if (!freeInteractionRef.current) return;
    event.preventDefault();
    window.scrollBy(0, event.deltaY * FREE_DRAG_WHEEL_SCROLL_MULTIPLIER);
    requestAnimationFrame(() => applyFreeInteraction());
  };
  const moveFreeItemLayer = (item, direction) => {
    const sorted = items.slice().sort((left, right) => stackItemZ(left) - stackItemZ(right));
    const index = sorted.findIndex((entry) => itemKey(entry) === itemKey(item));
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;
    const currentZ = stackItemZ(sorted[index]);
    const nextZ = stackItemZ(sorted[swapIndex]);
    commitItems(items.map((entry) => {
      if (itemKey(entry) === itemKey(sorted[index])) return { ...entry, z: nextZ };
      if (itemKey(entry) === itemKey(sorted[swapIndex])) return { ...entry, z: currentZ };
      return entry;
    }));
  };
  const setFieldFontSize = (item, value) => {
    const nextSize = clamp(Number(value) || DEFAULT_STACK_FIELD_FONT_SIZE, 10, 72);
    const key = itemKey(item);
    commitItems(items.map((entry) => (itemKey(entry) === key ? { ...entry, fontSize: nextSize } : entry)));
  };
  const resetLayout = () => {
    if (!window.confirm("确定要重置当前详情页布局吗？")) return;
    commitItems(createDefaultEditorStackItemsFrom(items, normalizedAttachments));
  };
  const renderResizeHandles = (item, label) => (
    FREE_RESIZE_HANDLES.map((handle) => (
      <button
        type="button"
        className={`block-resize-handle is-${handle}`}
        aria-label={`${label} ${handle}`}
        key={handle}
        onPointerDown={(event) => beginResize(event, item, handle)}
      />
    ))
  );

  return (
    <section
      className={`block-editor-canvas ${fileDragging ? "is-file-dragging" : ""} ${fileUploading ? "is-file-uploading" : ""}`.trim()}
      onDragEnter={(event) => {
        const types = Array.from(event.dataTransfer.types || []);
        if (types.includes(BLOCK_DRAG_MIME) || !types.includes("Files")) return;
        event.preventDefault();
        setFileDragging(true);
      }}
      onDragOver={(event) => {
        const types = Array.from(event.dataTransfer.types || []);
        if (types.includes(BLOCK_DRAG_MIME) || !types.includes("Files")) return;
        event.preventDefault();
        setFileDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFileDragging(false);
      }}
      onDrop={(event) => {
        const types = Array.from(event.dataTransfer.types || []);
        if (types.includes(BLOCK_DRAG_MIME) || !event.dataTransfer.files?.length) return;
        event.preventDefault();
        setFileDragging(false);
        void uploadFiles(Array.from(event.dataTransfer.files));
      }}
      onPointerMove={handleFreePointerMove}
      onPointerUp={stopFreeInteraction}
      onPointerCancel={stopFreeInteraction}
      onWheel={handleFreeWheel}
    >
      <div className="block-editor-toolbar">
        <button type="button" className="block-editor-add-text" onClick={addTextBlock}>
          <Plus size={16} />添加文本框
        </button>
        <UploadBox onUpload={uploadFiles} accept={SAFE_UPLOAD_ACCEPT} label="上传附件" />
        <button type="button" onClick={resetLayout}>重置布局</button>
      </div>
      <div
        className="block-editor-free-stage"
        ref={freeStageRef}
        style={freeStageRatio ? { aspectRatio: `1 / ${freeStageRatio}` } : { height: 0 }}
      >
        {guideLines.map((guide) => (
          <span
            className={`block-editor-guide is-${guide.axis} is-${guide.kind}`}
            key={guideKey(guide)}
            style={guide.axis === "x"
              ? { left: `${guide.position * 100}%` }
              : { top: `${(guide.position / freeStageRatio) * 100}%` }}
          />
        ))}
        {items.slice().sort((left, right) => stackItemZ(left) - stackItemZ(right)).map((item) => {
          const key = itemKey(item);
          const sharedStyle = {
            left: `${stackItemX(item) * 100}%`,
            top: `${(stackItemY(item) / freeStageRatio) * 100}%`,
            width: `${stackItemWidth(item, item.type) * 100}%`,
            zIndex: stackItemZ(item),
          };
          if (item.type === STACK_TEXT_ITEM_TYPE) {
            const fontSize = stackItemFontSize(item);
            const hasManualSize = stackItemHasManualSize(item);
            return (
              <section
                className={`block-editor-free-item is-field is-text ${hasManualSize ? "has-manual-size" : ""} ${activeTextKey === key ? "is-active" : ""} ${nudgingKeys.has(key) ? "is-nudging" : ""}`.trim()}
                key={key}
                data-block-key={key}
                onPointerDown={(event) => beginFreeMove(event, item)}
                style={{
                  ...sharedStyle,
                  ...(hasManualSize
                    ? { height: `${(stackItemHeight(item) / freeStageRatio) * 100}%` }
                    : { minHeight: `${(stackItemHeight(item) / freeStageRatio) * 100}%` }),
                  "--block-font-size": fontSize ? `${fontSize}px` : undefined,
                }}
              >
                <div className="block-editor-controls">
                  <span className="block-drag-handle" title="拖动文字块"><Menu size={16} /></span>
                  <button type="button" aria-label="下移层级" onClick={() => moveFreeItemLayer(item, -1)}><ArrowDown size={14} /></button>
                  <button type="button" aria-label="上移层级" onClick={() => moveFreeItemLayer(item, 1)}><ArrowUp size={14} /></button>
                  <button type="button" aria-label="减小字号" onClick={() => setFieldFontSize(item, (fontSize || DEFAULT_STACK_FIELD_FONT_SIZE) - 1)}><Minus size={14} /></button>
                  <input
                    className="block-font-size-input"
                    type="number"
                    min="10"
                    max="72"
                    value={Math.round(fontSize || DEFAULT_STACK_FIELD_FONT_SIZE)}
                    aria-label="字号"
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => setFieldFontSize(item, event.target.value)}
                  />
                  <button type="button" aria-label="增大字号" onClick={() => setFieldFontSize(item, (fontSize || DEFAULT_STACK_FIELD_FONT_SIZE) + 1)}><Plus size={14} /></button>
                  <button type="button" aria-label="删除文本框" onClick={() => removeTextBlock(item)}>
                    <X size={14} />
                  </button>
                </div>
                <InlineEditableText
                  as="p"
                  className="admin-block-value is-multiline"
                  value={stackTextValue(item)}
                  editable={activeTextKey === key}
                  onActivate={() => setActiveTextKey(key)}
                  onChange={(value) => updateTextBlock(item, value)}
                  placeholder="输入文本..."
                />
                {renderResizeHandles(item, "Resize text block")}
              </section>
            );
          }
          const attachment = attachmentMap.get(item.id);
          if (!attachment) return null;
          return (
            <section
              className={`block-editor-free-item is-attachment ${nudgingKeys.has(key) ? "is-nudging" : ""}`.trim()}
              key={key}
              data-block-key={key}
              onPointerDown={(event) => beginFreeMove(event, item)}
              style={{
                ...sharedStyle,
                height: `${(stackItemHeight(item) / freeStageRatio) * 100}%`,
              }}
            >
              <div className="block-editor-controls">
                <span className="block-drag-handle" title="拖动附件"><Menu size={16} /></span>
                <strong>{attachmentBlockLabel(attachment)}</strong>
                <button type="button" aria-label="下移层级" onClick={() => moveFreeItemLayer(item, -1)}><ArrowDown size={14} /></button>
                <button type="button" aria-label="上移层级" onClick={() => moveFreeItemLayer(item, 1)}><ArrowUp size={14} /></button>
                <button type="button" aria-label={`删除${attachment.name}`} onClick={() => removeAttachment(attachment.url)}>
                  <X size={14} />
                </button>
              </div>
              <AttachmentPreview value={attachment} interactive={false} showName={!isVisualAttachment(attachment)} cropped={false} />
              {renderResizeHandles(item, "Resize attachment")}
            </section>
          );
        })}
      </div>
      <div className="block-editor-actions">
        <button type="button" className="block-editor-add-text" onClick={addTextBlock}>
          <Plus size={16} />添加文本框
        </button>
        <UploadBox onUpload={uploadFiles} accept={SAFE_UPLOAD_ACCEPT} />
        {fileUploading ? <span className="block-editor-uploading"><Loader2 className="spin" size={14} />上传中</span> : null}
      </div>
    </section>
  );
}

function UnifiedLayoutCanvas({ fields = [], values = {}, attachments = [], layout, onLayoutChange, onFieldChange, onRenameLabel }) {
  const stageRef = useRef(null);
  const interactionRef = useRef(null);
  const visualItems = normalizeAttachmentList(attachments).filter(isVisualAttachment);
  const workingLayout = normalizeContentLayout(layout, fields, visualItems);
  const attachmentMap = new Map(visualItems.map((attachment) => [attachment.url, attachment]));
  if (!workingLayout) return null;

  const commit = (items) => onLayoutChange({ canvasRatio: workingLayout.canvasRatio, items });
  const handlePointerDown = (event, item, mode = "move") => {
    if (mode === "move" && item.type === "field" && event.target.closest?.("input, textarea, select, button")) return;
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointerCapture?.(event.pointerId);
    const rect = stage.getBoundingClientRect();
    const maxZ = Math.max(...workingLayout.items.map((entry) => entry.z), 0) + 1;
    const nextItems = workingLayout.items.map((entry) => (entry.type === item.type && entry.id === item.id ? { ...entry, z: maxZ } : entry));
    commit(nextItems);
    interactionRef.current = { pointerId: event.pointerId, mode, startX: event.clientX, startY: event.clientY, rect, item: { ...item, z: maxZ }, items: nextItems };
  };
  const handlePointerMove = (event) => {
    const state = interactionRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const deltaX = state.rect.width ? (event.clientX - state.startX) / state.rect.width : 0;
    const deltaY = state.rect.height ? (event.clientY - state.startY) / state.rect.height : 0;
    commit(state.items.map((entry) => {
      if (entry.type !== state.item.type || entry.id !== state.item.id) return entry;
      if (state.mode === "resize") {
        const minWidth = entry.type === "media" ? 0.12 : 0.2;
        const minHeight = entry.type === "media" ? 0.12 : 0.14;
        return {
          ...entry,
          w: clamp(state.item.w + deltaX, minWidth, 1 - state.item.x),
          h: clamp(state.item.h + deltaY, minHeight, 1 - state.item.y),
        };
      }
      return {
        ...entry,
        x: clamp(state.item.x + deltaX, 0, 1 - state.item.w),
        y: clamp(state.item.y + deltaY, 0, 1 - state.item.h),
      };
    }));
  };
  const stopInteraction = (event) => {
    stageRef.current?.releasePointerCapture?.(event.pointerId);
    interactionRef.current = null;
  };
  const fieldMap = new Map(fields.map((field) => [field.id, field]));

  return (
    <section className="unified-layout-editor">
      <header className="admin-section-head">
        <h2>页面排版</h2>
        <button type="button" onClick={() => onLayoutChange(null)}>重置布局</button>
      </header>
      <div
        className="unified-layout-canvas"
        ref={stageRef}
        style={{ aspectRatio: workingLayout.canvasRatio }}
        onPointerMove={handlePointerMove}
        onPointerUp={stopInteraction}
        onPointerCancel={stopInteraction}
      >
        {workingLayout.items.slice().sort((left, right) => left.z - right.z).map((item) => {
          if (item.type === "media") {
            const attachment = attachmentMap.get(item.id);
            if (!attachment) return null;
            return (
              <div className="unified-layout-item is-media" key={`media-${item.id}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.w * 100}%`, height: `${item.h * 100}%`, zIndex: item.z }} onPointerDown={(event) => handlePointerDown(event, item)}>
                <AttachmentPreview value={attachment} interactive={false} showName={false} cropped={false} />
                <button type="button" className="admin-media-layout-resize" aria-label="调整大小" onPointerDown={(event) => { event.stopPropagation(); handlePointerDown(event, item, "resize"); }} />
              </div>
            );
          }
          const field = fieldMap.get(item.id);
          if (!field) return null;
          return (
            <section className="unified-layout-item is-field" key={`field-${item.id}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.w * 100}%`, minHeight: `${item.h * 100}%`, zIndex: item.z }} onPointerDown={(event) => handlePointerDown(event, item)}>
              <div className="admin-detail-field-head">
                <span className="admin-drag-handle" title="拖拽移动"><Menu size={16} /></span>
                <EditableFieldLabel field={{ ...field, label: field.zh }} onRename={onRenameLabel} />
              </div>
              {field.type === "select" ? (
                <SelectInput label={field.zh} value={values[field.id]} options={field.options || []} onChange={(value) => onFieldChange(field.id, value)} />
              ) : (
                <TextInput label={field.zh} value={values[field.id]} multiline={field.type === "textarea"} rows={field.type === "textarea" ? 5 : 1} onChange={(value) => onFieldChange(field.id, value)} />
              )}
              <button type="button" className="admin-media-layout-resize" aria-label="调整大小" onPointerDown={(event) => { event.stopPropagation(); handlePointerDown(event, item, "resize"); }} />
            </section>
          );
        })}
      </div>
    </section>
  );
}

function PeopleAvatarField({ label, value = [], onChange, uploadImage }) {
  const [cropOpen, setCropOpen] = useState(false);
  const attachments = normalizeAttachmentList(value);
  const primary = attachments[0] || null;
  const commitPrimary = (attachment) => {
    const next = attachment ? [attachment, ...attachments.slice(1)] : attachments.slice(1);
    onChange(next);
  };
  const addUploaded = (uploaded) => {
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (file) commitPrimary(file);
  };
  const removeAt = (index) => {
    onChange(attachments.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <section className="people-form-avatar-field">
      <div className="people-form-field-label">
        <span>{label}</span>
      </div>
      <div className="people-avatar-control">
        {primary ? (
          <figure className="people-avatar-preview">
            <AttachmentPreview value={primary} interactive={false} showName={false} />
          </figure>
        ) : (
          <div className="admin-empty-image people-avatar-empty">未上传头像</div>
        )}
        <div className="admin-row-actions">
          <UploadBox multiple={false} accept="image/*" label={primary ? "更换头像" : "上传头像"} onUpload={(file) => uploadImage(addUploaded, file)} />
          {primary && isImageAttachment(primary) ? (
            <button type="button" className="admin-muted-button" onClick={() => setCropOpen(true)}>裁剪头像</button>
          ) : null}
          {primary ? (
            <button type="button" className="admin-muted-button" onClick={() => commitPrimary(null)}>删除头像</button>
          ) : null}
        </div>
        {attachments.slice(1).length ? (
          <div className="people-avatar-extra-list">
            {attachments.slice(1).map((attachment, index) => (
              <div className="people-avatar-extra-item" key={attachment.url || index}>
                <AttachmentPreview value={attachment} interactive={false} showName={false} />
                <button type="button" className="admin-muted-button" onClick={() => removeAt(index + 1)}>删除</button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {cropOpen && primary ? (
        <PeopleAvatarCropModal
          attachment={primary}
          uploadImage={uploadImage}
          onClose={() => setCropOpen(false)}
          onSave={(attachment) => commitPrimary(attachment)}
        />
      ) : null}
    </section>
  );
}

function PeopleFormEditor({ title, item, content, fields, onSave, onDelete, onRenameLabel, onAddField, onRemoveField, onReorderFields }) {
  const { saving, uploadImage, registerModeSaveHandler } = useAdminSession();
  const valuesFromFields = (sourceFields = fields) => Object.fromEntries(
    sourceFields.map((field) => [
      field.id,
      field.id === "category" ? normalizePeopleCategory(field.value) : field.value || "",
    ]),
  );
  const [values, setValues] = useState(() => valuesFromFields());
  const [attachments, setAttachments] = useState(() => attachmentsFor(item, "photo"));
  const [cover, setCover] = useState(() => item.cover || null);
  const itemKey = item.id || item.name || "";

  useEffect(() => {
    setValues(valuesFromFields());
    setAttachments(attachmentsFor(item, "photo"));
    setCover(item.cover || null);
  }, [itemKey]);

  useEffect(() => {
    setValues((current) => Object.fromEntries(
      fields.map((field) => [
        field.id,
        Object.prototype.hasOwnProperty.call(current, field.id)
          ? current[field.id]
          : field.id === "category"
            ? normalizePeopleCategory(field.value)
            : field.value || "",
      ]),
    ));
  }, [fields]);

  const updateAvatar = (nextAttachments) => {
    setAttachments(normalizeAttachmentList(nextAttachments));
    setCover(null);
  };

  const saveCurrent = useCallback(async () => {
    const saved = await onSave({ values, attachments, cover, contentLayout: item.contentLayout });
    if (saved) window.location.href = siteHref("/people");
    return saved;
  }, [attachments, cover, item.contentLayout, onSave, values]);
  const moveField = (fromIndex, toIndex) => {
    const orderedIds = moveArrayItem(fields, fromIndex, toIndex).map((field) => field.id);
    onReorderFields?.("people", orderedIds);
  };
  const fieldDropProps = (index) => {
    if (!onReorderFields) return {};
    return {
      onDragOver: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDragEnter: (event) => {
        event.currentTarget.classList.add("is-drag-over");
      },
      onDragLeave: (event) => {
        event.currentTarget.classList.remove("is-drag-over");
      },
      onDrop: (event) => {
        event.preventDefault();
        event.currentTarget.classList.remove("is-drag-over");
        const fromIndex = Number(event.dataTransfer.getData(PEOPLE_FIELD_DRAG_MIME) || event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(fromIndex)) moveField(fromIndex, index);
      },
    };
  };
  const fieldHandleDragProps = (index) => {
    if (!onReorderFields) return {};
    return {
      draggable: true,
      onDragStart: (event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(PEOPLE_FIELD_DRAG_MIME, String(index));
        event.dataTransfer.setData("text/plain", String(index));
        event.currentTarget.closest(".people-form-field")?.classList.add("is-dragging");
      },
      onDragEnd: (event) => {
        event.currentTarget.closest(".people-form-field")?.classList.remove("is-dragging");
        document.querySelectorAll(".people-form-field.is-drag-over").forEach((node) => node.classList.remove("is-drag-over"));
      },
    };
  };

  useEffect(() => registerModeSaveHandler(saveCurrent), [registerModeSaveHandler, saveCurrent]);

  const submit = (event) => {
    event.preventDefault();
    void saveCurrent();
  };

  return (
    <form className="people-form-editor admin-detail-editor reveal-section" onSubmit={submit}>
      <header className="admin-detail-editor-head people-form-editor-head">
        <strong>{title}</strong>
      </header>
      <div className="people-form-grid">
        <PeopleAvatarField
          label={fieldLabelFor(content, "people.attachments", "头像")}
          value={attachments}
          uploadImage={uploadImage}
          onChange={updateAvatar}
        />
        {fields.map((field, index) => (
          <div className={`people-form-field ${field.type === "textarea" ? "is-full" : ""}`.trim()} key={field.id} {...fieldDropProps(index)}>
            {field.id === "category" ? (
              <SelectInput
                label={field.zh}
                value={values[field.id]}
                options={peopleFormCategoryOptions}
                onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
                labelPrefix={(
                  <button type="button" className="admin-drag-handle people-field-drag-handle" title="拖拽调整字段顺序" aria-label="拖拽调整字段顺序" {...fieldHandleDragProps(index)}>
                    <GripVertical size={16} />
                  </button>
                )}
              />
            ) : field.type === "select" ? (
              <SelectInput
                label={field.zh}
                value={values[field.id]}
                options={field.options || []}
                onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
                labelPrefix={(
                  <button type="button" className="admin-drag-handle people-field-drag-handle" title="拖拽调整字段顺序" aria-label="拖拽调整字段顺序" {...fieldHandleDragProps(index)}>
                    <GripVertical size={16} />
                  </button>
                )}
              />
            ) : (
              <TextInput
                label={field.zh}
                value={values[field.id]}
                multiline={field.type === "textarea"}
                rows={field.type === "textarea" ? 6 : 1}
                onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
                labelPrefix={(
                  <button type="button" className="admin-drag-handle people-field-drag-handle" title="拖拽调整字段顺序" aria-label="拖拽调整字段顺序" {...fieldHandleDragProps(index)}>
                    <GripVertical size={16} />
                  </button>
                )}
              />
            )}
          </div>
        ))}
      </div>
      <FieldSchemaManager
        moduleKey="people"
        fields={fields}
        onAddField={onAddField}
        onRemoveField={onRemoveField}
        onRenameField={(_, fieldId, labels) => onRenameLabel?.(fieldId, labels)}
      />
      <footer className="admin-detail-savebar">
        {onDelete ? <button type="button" className="admin-danger" onClick={onDelete}>删除</button> : null}
        <button type="submit" disabled={saving}>
          {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
          {saving ? "保存中" : "保存上线"}
        </button>
      </footer>
    </form>
  );
}

function DetailFixedInfoField({ moduleKey, field, value, onChange, onRenameLabel, onRemoveField, dropProps = {}, handleDragProps = {} }) {
  const inputId = `detail-fixed-${moduleKey}-${field.id}`;
  const className = `admin-field detail-fixed-field-row ${field.id === "title" ? "is-title-field" : ""}`.trim();
  if (field.type === "select") {
    const options = field.id === "category" ? peopleFormCategoryOptions : field.options || [];
    return (
      <div className={className} {...dropProps}>
        <div className="detail-fixed-field-label">
          <button type="button" className="admin-drag-handle detail-fixed-drag-handle" title="拖拽调整字段顺序" aria-label="拖拽调整字段顺序" {...handleDragProps}>
            <Menu size={16} />
          </button>
          <EditableBilingualFieldLabel field={field} onRename={onRenameLabel} />
          {!field.protected ? (
            <button type="button" aria-label={`删除${field.zh}`} onClick={() => onRemoveField?.(moduleKey, field.id)}>
              <X size={14} />
            </button>
          ) : null}
        </div>
        <select id={inputId} value={value || ""} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className={className} {...dropProps}>
      <div className="detail-fixed-field-label">
        <button type="button" className="admin-drag-handle detail-fixed-drag-handle" title="拖拽调整字段顺序" aria-label="拖拽调整字段顺序" {...handleDragProps}>
          <Menu size={16} />
        </button>
        <EditableBilingualFieldLabel field={field} onRename={onRenameLabel} />
        {!field.protected ? (
          <button type="button" aria-label={`删除${field.zh}`} onClick={() => onRemoveField?.(moduleKey, field.id)}>
            <X size={14} />
          </button>
        ) : null}
      </div>
      {field.type === "textarea" ? (
        <textarea id={inputId} value={value || ""} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <input id={inputId} type="text" value={value || ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function DetailFixedInfoEditor({
  moduleKey,
  title,
  fields = [],
  values = {},
  cover,
  attachments = [],
  uploadImage,
  onCoverChange,
  onFieldChange,
  onRenameLabel,
  onAddField,
  onRemoveField,
  onReorderFields,
}) {
  const fixedFields = detailFixedInfoFields(moduleKey, fields);
  const moveFixedField = (fromIndex, toIndex) => {
    const orderedIds = moveArrayItem(fixedFields, fromIndex, toIndex).map((field) => field.id);
    onReorderFields?.(moduleKey, orderedIds);
  };
  const fixedFieldDropProps = (index) => {
    if (!onReorderFields) return {};
    return {
      onDragOver: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDragEnter: (event) => {
        event.currentTarget.classList.add("is-drag-over");
      },
      onDragLeave: (event) => {
        event.currentTarget.classList.remove("is-drag-over");
      },
      onDrop: (event) => {
        event.preventDefault();
        event.currentTarget.classList.remove("is-drag-over");
        const fromIndex = Number(event.dataTransfer.getData(FIXED_FIELD_DRAG_MIME) || event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(fromIndex)) moveFixedField(fromIndex, index);
      },
    };
  };
  const fixedFieldHandleDragProps = (index) => {
    if (!onReorderFields) return {};
    return {
      draggable: true,
      onDragStart: (event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(FIXED_FIELD_DRAG_MIME, String(index));
        event.dataTransfer.setData("text/plain", String(index));
        event.currentTarget.closest(".detail-fixed-field-row")?.classList.add("is-dragging");
      },
      onDragEnd: (event) => {
        event.currentTarget.closest(".detail-fixed-field-row")?.classList.remove("is-dragging");
        document.querySelectorAll(".detail-fixed-field-row.is-drag-over").forEach((node) => node.classList.remove("is-drag-over"));
      },
    };
  };
  return (
    <section className="detail-fixed-info-editor">
      <header className="detail-fixed-info-head">
        <span>固定信息</span>
        <strong>{title}</strong>
      </header>
      <div className="detail-fixed-cover-row">
        <span>封面图</span>
        <div>
          <CoverTopRegion cover={cover} attachments={attachments} onChange={onCoverChange} uploadImage={uploadImage} />
          <small>仅用于主页卡片和列表页，详情页画布内不会因封面重复插入。</small>
        </div>
      </div>
      <div className="detail-fixed-info-grid">
        {fixedFields.map((field, index) => (
          <DetailFixedInfoField
            key={field.id}
            moduleKey={moduleKey}
            field={field}
            value={values[field.id]}
            onChange={(nextValue) => onFieldChange(field.id, nextValue)}
            onRenameLabel={onRenameLabel}
            onRemoveField={onRemoveField}
            dropProps={fixedFieldDropProps(index)}
            handleDragProps={fixedFieldHandleDragProps(index)}
          />
        ))}
      </div>
      <div className="detail-fixed-info-actions">
        <FieldAdder moduleKey={moduleKey} onAddField={onAddField} />
      </div>
    </section>
  );
}

function InlineDetailEditor({ moduleKey, title, item, fields, onSave, onDelete, onRenameLabel, onAddField, onRemoveField, onReorderFields }) {
  const { saving, uploadImage, registerModeSaveHandler } = useAdminSession();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.id, field.value || ""])));
  const [attachments, setAttachments] = useState(() => attachmentsFor(item, moduleKey === "people" ? "photo" : "image"));
  const [cover, setCover] = useState(() => item.cover || null);
  const [contentLayout, setContentLayout] = useState(() => normalizeEditorStackContentLayout(
    item.contentLayout,
    fields,
    attachmentsFor(item, moduleKey === "people" ? "photo" : "image"),
  ));

  useEffect(() => {
    setValues(Object.fromEntries(fields.map((field) => [field.id, field.value || ""])));
    const nextAttachments = attachmentsFor(item, moduleKey === "people" ? "photo" : "image");
    setAttachments(nextAttachments);
    setCover(item.cover || null);
    setContentLayout(normalizeEditorStackContentLayout(item.contentLayout, fields, nextAttachments));
  }, [item, fields, moduleKey]);

  const saveWithOverrides = useCallback(
    (overrides = {}) => {
      const nextContentLayout = Object.prototype.hasOwnProperty.call(overrides, "contentLayout") ? overrides.contentLayout : contentLayout;
      const nextAttachments = Object.prototype.hasOwnProperty.call(overrides, "attachments") ? overrides.attachments : attachments;
      return onSave({
        values: Object.prototype.hasOwnProperty.call(overrides, "values") ? overrides.values : values,
        attachments: moduleKey === "people" ? nextAttachments : filterAttachmentsByStackLayout(nextAttachments, nextContentLayout),
        cover: Object.prototype.hasOwnProperty.call(overrides, "cover") ? overrides.cover : cover,
        contentLayout: nextContentLayout,
      });
    },
    [attachments, contentLayout, cover, moduleKey, onSave, values],
  );
  const saveCurrent = useCallback(() => saveWithOverrides(), [saveWithOverrides]);
  const saveCover = useCallback(async (nextCover) => {
    setCover(nextCover);
    return saveWithOverrides({ cover: nextCover });
  }, [saveWithOverrides]);

  useEffect(() => registerModeSaveHandler(saveCurrent), [registerModeSaveHandler, saveCurrent]);

  const submit = (event) => {
    event.preventDefault();
    saveCurrent();
  };

  return (
    <form className="admin-detail-editor split-detail-editor reveal-section" onSubmit={submit}>
      <header className="admin-detail-editor-head">
        <strong>{title}</strong>
      </header>
      <DetailFixedInfoEditor
        moduleKey={moduleKey}
        title={title}
        fields={fields}
        values={values}
        cover={cover}
        attachments={attachments}
        uploadImage={uploadImage}
        onCoverChange={saveCover}
        onFieldChange={(fieldId, value) => setValues((current) => ({ ...current, [fieldId]: value }))}
        onRenameLabel={onRenameLabel}
        onAddField={onAddField}
        onRemoveField={onRemoveField}
        onReorderFields={onReorderFields}
      />
      <BlockEditorCanvas
        moduleKey={moduleKey}
        fields={fields}
        values={values}
        attachments={attachments}
        layout={contentLayout}
        onLayoutChange={setContentLayout}
        onFieldChange={(fieldId, value) => setValues((current) => ({ ...current, [fieldId]: value }))}
        onRenameLabel={onRenameLabel}
        onRemoveField={onRemoveField}
        onAttachmentsChange={(nextValue) => setAttachments(normalizeAttachmentList(nextValue))}
        onAddField={onAddField}
        uploadImage={uploadImage}
      />
      <footer className="admin-detail-savebar">
        {onDelete ? <button type="button" className="admin-danger" onClick={onDelete}>删除</button> : null}
        <button type="submit" disabled={saving}>
          {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
          {saving ? "保存中" : "保存上线"}
        </button>
      </footer>
    </form>
  );
}

function InlineEditableText({ as: Component = "p", className = "", value = "", onChange, placeholder = "", editable = true, onActivate }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const nextValue = normalizeEditableText(value);
    if (ref.current.innerText !== nextValue) ref.current.innerText = nextValue;
  }, [value]);

  return (
    <Component
      ref={ref}
      className={`admin-live-editable ${className}`.trim()}
      contentEditable={editable}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      data-editable={editable ? "true" : "false"}
      onDoubleClick={(event) => {
        onActivate?.();
        requestAnimationFrame(() => {
          if (!ref.current) return;
          ref.current.focus();
          document.getSelection()?.selectAllChildren(ref.current);
        });
        event.stopPropagation();
      }}
      onPaste={(event) => {
        event.preventDefault();
        const clipboardText = event.clipboardData.getData("text/plain");
        const nextText = clipboardText
          ? normalizeEditableText(clipboardText)
          : editableTextFromHtml(event.clipboardData.getData("text/html"));
        insertEditableText(event.currentTarget, nextText);
        onChange(normalizeEditableText(event.currentTarget.innerText));
      }}
      onInput={(event) => onChange(normalizeEditableText(event.currentTarget.innerText))}
    />
  );
}

function InlineHomeIntroEditor({ value = [], onSave, onClear }) {
  const { saving } = useAdminSession();
  const [draft, setDraft] = useState(() => (value?.length ? value : [""]));

  useEffect(() => {
    setDraft(value?.length ? value : [""]);
  }, [value]);

  return (
    <form className="admin-live-editor-stack" onSubmit={(event) => { event.preventDefault(); onSave(draft.join("\n\n")); }}>
      {draft.map((paragraph, index) => (
        <InlineEditableText
          className="reveal-item"
          key={`home-intro-${index}`}
          value={paragraph}
          placeholder="点击输入首页简介"
          onChange={(nextValue) => setDraft((current) => current.map((entry, itemIndex) => (itemIndex === index ? nextValue : entry)))}
        />
      ))}
      <div className="admin-list-tools">
        <AdminAddButton onClick={() => setDraft((current) => [...current, ""])} label="添加段落" />
      </div>
      <footer className="admin-detail-savebar">
        <button type="button" className="admin-danger" onClick={onClear}>清空</button>
        <button type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}保存上线</button>
      </footer>
    </form>
  );
}

function InlineAboutHeadingEditor({ value = {}, onSave }) {
  const { saving } = useAdminSession();
  const [draft, setDraft] = useState({ label: value.label || "", title: value.title || "" });

  useEffect(() => {
    setDraft({ label: value.label || "", title: value.title || "" });
  }, [value.label, value.title]);

  return (
    <form className="admin-live-editor-stack" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <div className="sub-slogan admin-live-block">
        <InlineEditableText value={draft.label} placeholder="点击输入标签" onChange={(label) => setDraft((current) => ({ ...current, label }))} />
        <InlineEditableText value={draft.title} placeholder="点击输入标题" onChange={(title) => setDraft((current) => ({ ...current, title }))} />
      </div>
      <footer className="admin-detail-savebar">
        <button type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}保存上线</button>
      </footer>
    </form>
  );
}

function InlineAboutSectionEditor({ section = {}, index, onSave, onDelete }) {
  const { saving } = useAdminSession();
  const [draft, setDraft] = useState({
    number: section.number || "",
    title: section.title || "",
    paragraphs: section.paragraphs?.length ? section.paragraphs : [""],
  });

  useEffect(() => {
    setDraft({
      number: section.number || "",
      title: section.title || "",
      paragraphs: section.paragraphs?.length ? section.paragraphs : [""],
    });
  }, [section]);

  return (
    <form className="admin-live-editor-stack" onSubmit={(event) => { event.preventDefault(); onSave(section, index, { ...draft, paragraphs: draft.paragraphs.join("\n\n") }); }}>
      <section className="cont-group reveal-section admin-live-block">
        <InlineEditableText as="p" className="num reveal-item" value={draft.number} placeholder="编号" onChange={(number) => setDraft((current) => ({ ...current, number }))} />
        <InlineEditableText as="p" className="subj reveal-item" value={draft.title} placeholder="标题" onChange={(title) => setDraft((current) => ({ ...current, title }))} />
        <div className="reveal-item">
          {draft.paragraphs.map((paragraph, paragraphIndex) => (
            <InlineEditableText
              key={`about-paragraph-${paragraphIndex}`}
              value={paragraph}
              placeholder="点击输入正文"
              onChange={(nextValue) => setDraft((current) => ({
                ...current,
                paragraphs: current.paragraphs.map((entry, itemIndex) => (itemIndex === paragraphIndex ? nextValue : entry)),
              }))}
            />
          ))}
        </div>
      </section>
      <div className="admin-list-tools">
        <AdminAddButton onClick={() => setDraft((current) => ({ ...current, paragraphs: [...current.paragraphs, ""] }))} label="添加段落" />
      </div>
      <footer className="admin-detail-savebar">
        {typeof index === "number" ? <button type="button" className="admin-danger" onClick={() => onDelete(index)}>删除</button> : null}
        <button type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}保存上线</button>
      </footer>
    </form>
  );
}

function InlineArchiveEditor({ value = ["Archive", ""], onSave, onClear }) {
  const { saving } = useAdminSession();
  const [draft, setDraft] = useState({ label: value[0] || "", text: value[1] || "" });

  useEffect(() => {
    setDraft({ label: value[0] || "", text: value[1] || "" });
  }, [value]);

  return (
    <form className="admin-live-editor-stack" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <InlineEditableText className="about-note reveal-section reveal-item" value={draft.text} placeholder="点击输入理念文案" onChange={(text) => setDraft((current) => ({ ...current, text }))} />
      <footer className="admin-detail-savebar">
        <button type="button" className="admin-danger" onClick={onClear}>清空</button>
        <button type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}保存上线</button>
      </footer>
    </form>
  );
}

function InlineSiteEditor({ value = {}, onSave, content, fields = [], onRenameLabel, onAddField, onRemoveField }) {
  const { saving, uploadImage } = useAdminSession();
  const [draft, setDraft] = useState({
    topLine: value.topLine || "",
    logo: value.logo || "",
    contactAddress: value.contactAddress || "",
    contactEmail: value.contactEmail || "",
    contactDirections: value.contactDirections || "",
    footerTagline: value.footerTagline || "",
    attachments: normalizeAttachmentList(value.attachments),
    contentLayout: value.contentLayout || null,
    customFields: value.customFields || {},
  });

  useEffect(() => {
    setDraft({
      topLine: value.topLine || "",
      logo: value.logo || "",
      contactAddress: value.contactAddress || "",
      contactEmail: value.contactEmail || "",
      contactDirections: value.contactDirections || "",
      footerTagline: value.footerTagline || "",
      attachments: normalizeAttachmentList(value.attachments),
      contentLayout: value.contentLayout || null,
      customFields: value.customFields || {},
    });
  }, [value]);

  const fieldValues = Object.fromEntries(fields.map((field) => [field.id, fieldValueFor({ ...draft, contactAddress: draft.contactAddress, contactEmail: draft.contactEmail, contactDirections: draft.contactDirections }, "contact", field)]));
  const updateContactField = (fieldId, nextValue) => {
    const field = fields.find((entry) => entry.id === fieldId);
    if (!field) return;
    const nativeKey = moduleFieldNativeKey("contact", fieldId);
    if (nativeKey) {
      setDraft((current) => ({ ...current, [nativeKey]: nextValue }));
    } else {
      setDraft((current) => ({ ...current, customFields: { ...(current.customFields || {}), [fieldId]: nextValue } }));
    }
  };

  return (
    <form className="admin-inline-section-editor" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <div className="site-meta-blocks">
        <InlineEditableText
          as="div"
          className="admin-block-value"
          value={draft.topLine}
          placeholder="点击输入顶部文案"
          onChange={(topLine) => setDraft((current) => ({ ...current, topLine }))}
        />
        <InlineEditableText
          as="div"
          className="admin-block-value"
          value={draft.footerTagline}
          placeholder="点击输入页脚说明"
          onChange={(footerTagline) => setDraft((current) => ({ ...current, footerTagline }))}
        />
      </div>
      <div className="site-logo-inline-upload">
        {hasMedia(draft.logo) ? <AttachmentPreview value={draft.logo} interactive={false} showName={false} cropped={false} /> : null}
        <UploadBox multiple={false} onUpload={(file) => uploadImage((uploaded) => setDraft((current) => ({ ...current, logo: Array.isArray(uploaded) ? uploaded[0] || "" : uploaded || "" })), file)} />
      </div>
      <BlockEditorCanvas
        moduleKey="contact"
        fields={fields}
        values={fieldValues}
        attachments={draft.attachments}
        layout={draft.contentLayout}
        onLayoutChange={(contentLayout) => setDraft((current) => ({ ...current, contentLayout }))}
        onFieldChange={updateContactField}
        onRenameLabel={onRenameLabel}
        onRemoveField={onRemoveField}
        onAttachmentsChange={(attachments) => setDraft((current) => ({ ...current, attachments: normalizeAttachmentList(attachments) }))}
        onAddField={onAddField}
        uploadImage={uploadImage}
      />
      <footer className="admin-detail-savebar">
        <button type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}保存上线</button>
      </footer>
    </form>
  );
}

function PeopleDetailPage({ id }) {
  const content = useSiteContent();
  const contentStatus = useContentStatus();
  const editor = useScopedContentEditor();
  const person = findById(content.people || [], id, "name");
  if (!person && contentStatus.loading && !contentStatus.loaded) return <ContentLoadingPage />;
  if (!person || (!editor.isEditing && isEmptyContentItem(person, PEOPLE_CONTENT_FIELDS))) return <NotFoundPage />;
  const personIndex = findIndexById(content.people || [], id, "name");
  const resolvedPeopleFields = useMemo(() => resolveEditorFields(content, "people", person).map((field) => (
    field.id === "category" ? { ...field, type: "select", options: peopleFormCategoryOptions } : field
  )), [content, person]);
  const fields = renderableModuleFields(content, "people", person).map(({ field, value }) => ({
    id: field.id,
    label: field.en,
    value: field.id === "category" ? peopleCategoryLabel(value) : value,
  }));
  return (
    <PageShell title={person.name || "People"}>
      {editor.isEditing ? (
        <PeopleFormEditor
          title={person.name || "People"}
          item={person}
          content={content}
          fields={resolvedPeopleFields}
          onRenameLabel={(fieldId, labels) => editor.renameField("people", fieldId, labels)}
          onAddField={editor.addField}
          onRemoveField={editor.removeField}
          onReorderFields={editor.reorderFields}
          onSave={(values) => editor.savePerson(person, personIndex, values)}
          onDelete={() => editor.removePerson(personIndex, () => { window.location.href = siteHref("/people"); })}
        />
      ) : (
        <DetailArticle
          image={person.photo}
          attachments={attachmentsFor(person, "photo")}
          mediaLayout={person.mediaLayout}
          cover={person.cover}
          contentLayout={person.contentLayout}
          fields={fields}
          className="detail-page people-detail reveal-section"
          modalAttachments={false}
        />
      )}
    </PageShell>
  );
}

function WorksPage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const works = orderedRenderableItems(content.works || [], WORK_CONTENT_FIELDS, editor.isEditing, content, "works");
  const renderWorkRow = (item, isEmpty) => (
    <>
      {isEmpty ? <EmptyEntryPlaceholder label="空 Works 条目" /> : null}
      {!isEmpty && primaryVisualForCard(item, "image") && isVisualAttachment(primaryVisualForCard(item, "image")) ? (
        <figure>
          <AttachmentPreview value={primaryVisualForCard(item, "image")} interactive={false} showName={false} />
        </figure>
      ) : !isEmpty && editor.isEditing ? (
        <figure className="admin-media-shell">
          <EmptyMediaPlaceholder />
        </figure>
      ) : null}
      {!isEmpty && (hasText(item.date) || hasText(item.title) || hasText(item.text)) ? <div>
        {hasText(item.date) ? <span>{item.date}</span> : null}
        {hasText(item.title) ? <h2>{item.title}</h2> : null}
        {hasText(item.text) ? <p>{item.text}</p> : null}
      </div> : null}
    </>
  );
  return (
    <PageShell title="Works">
      {editor.isEditing ? (
        <div className="admin-list-tools">
          <AdminAddButton onClick={() => editor.createWork()} />
        </div>
      ) : null}
      <div className="works-page reveal-section">
        {works.map(({ item, index, isEmpty }, position) => (
          editor.isEditing ? (
            <AdminEditable
              as="article"
              className="work-row reveal-item"
              empty={isEmpty}
              key={item.id || item.title || `work-${index}`}
              onEdit={() => { window.location.href = siteHref(`/works/${item.id || makeId(item.title)}`); }}
              onAdd={() => editor.createWork()}
              onDelete={() => editor.removeWork(index)}
              {...sortableProps(editor.isEditing, position, (fromPosition, toPosition) => editor.moveWork(works, fromPosition, toPosition))}
              {...moveControlProps(editor.isEditing, position, works.length, (fromPosition, toPosition) => editor.moveWork(works, fromPosition, toPosition))}
            >
              {renderWorkRow(item, isEmpty)}
            </AdminEditable>
          ) : (
            <a className="work-row reveal-item" href={siteHref(`/works/${item.id || makeId(item.title)}`)} key={item.id || item.title}>
              {renderWorkRow(item, isEmpty)}
            </a>
          )
        ))}
      </div>
    </PageShell>
  );
}

function WorksDetailPage({ id }) {
  const content = useSiteContent();
  const contentStatus = useContentStatus();
  const editor = useScopedContentEditor();
  const work = findById(content.works || [], id);
  if (!work && contentStatus.loading && !contentStatus.loaded) return <ContentLoadingPage />;
  if (!work || (!editor.isEditing && isEmptyContentItem(work, WORK_CONTENT_FIELDS))) return <NotFoundPage />;
  const workIndex = findIndexById(content.works || [], id);
  const resolvedWorkFields = useMemo(() => resolveEditorFields(content, "works", work), [content, work]);
  const tightFooter = !editor.isEditing && work.contentLayout?.mode === STACK_LAYOUT_MODE;
  return (
    <PageShell title={work.title || "Works"} tightFooter={tightFooter}>
      {editor.isEditing ? (
        <InlineDetailEditor
          moduleKey="works"
          title={work.title || "Works"}
          item={work}
          fields={resolvedWorkFields}
          onRenameLabel={(fieldId, labels) => editor.renameField("works", fieldId, labels)}
          onAddField={editor.addField}
          onRemoveField={editor.removeField}
          onReorderFields={editor.reorderFields}
          onSave={(values) => editor.saveWork(work, workIndex, values)}
          onDelete={() => editor.removeWork(workIndex, () => { window.location.href = siteHref("/works"); })}
        />
      ) : (
        <DetailArticle image={work.image} attachments={attachmentsFor(work, "image")} cover={work.cover} mediaLayout={work.mediaLayout} contentLayout={work.contentLayout} fields={renderableModuleFields(content, "works", work).map(({ field, value }) => ({ id: field.id, label: field.en, value }))} showAttachmentNames={false} listFieldsAfterContent />
      )}
    </PageShell>
  );
}

function BoardPage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const renderBoardHub = (key, section, index) => (
    <>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <strong>{section.title}</strong>
      <p>{visibleBoardTextItems(content, key).length} ITEMS</p>
    </>
  );
  return (
    <PageShell title="Board">
      <div className="board-hub reveal-section">
        {Object.entries(boardSections).map(([key, section], index) => (
          editor.isEditing ? (
            <AdminEditable
              as="article"
              className="board-hub-card reveal-item"
              key={key}
              onEdit={() => { window.location.href = siteHref(section.path); }}
              onAdd={() => editor.createBoardItem(section.dataKey)}
              onDelete={editor.denyDelete}
              deleteDisabledMessage={editor.fixedModuleMessage}
            >
              {renderBoardHub(key, section, index)}
            </AdminEditable>
          ) : (
            <a className="board-hub-card reveal-item" href={siteHref(section.path)} key={key}>
              {renderBoardHub(key, section, index)}
            </a>
          )
        ))}
      </div>
    </PageShell>
  );
}

function BoardListPage({ section }) {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const canonicalSection = normalizeBoardSection(section);
  const meta = boardSections[canonicalSection];
  if (!meta) return <NotFoundPage />;
  const isProjectSection = canonicalSection === "project";
  const items = orderedRenderableItems(
    getBoardItems(content, canonicalSection),
    isProjectSection ? BOARD_CONTENT_FIELDS : BOARD_LIST_FIELDS,
    editor.isEditing,
    content,
    manualSortKey(meta.dataKey),
  );
  const renderBoardRow = (item, isEmpty) => (
    <>
      {isEmpty ? <EmptyEntryPlaceholder label={`空 ${meta.title} 条目`} /> : (
        <>
          {hasText(item.date) ? <span>{item.date}</span> : null}
          {hasText(item.title) ? <strong>{item.title}</strong> : null}
        </>
      )}
    </>
  );
  const renderProjectCard = (item, isEmpty) => (
    <>
      {isEmpty ? <EmptyEntryPlaceholder label={`空 ${meta.title} 条目`} /> : null}
      {!isEmpty && primaryVisualForCard(item, "image") && isVisualAttachment(primaryVisualForCard(item, "image")) ? (
        <figure>
          <AttachmentPreview value={primaryVisualForCard(item, "image")} interactive={false} showName={false} />
        </figure>
      ) : !isEmpty && editor.isEditing ? (
        <figure className="admin-media-shell">
          <EmptyMediaPlaceholder />
        </figure>
      ) : null}
      {!isEmpty && (hasText(item.date) || hasText(item.title) || hasText(item.intro)) ? (
        <div>
          {hasText(item.date) ? <span>{item.date}</span> : null}
          {hasText(item.title) ? <h2>{item.title}</h2> : null}
          {hasText(item.intro) ? <p>{item.intro}</p> : null}
        </div>
      ) : null}
    </>
  );
  const itemHref = (item) => siteHref(`${meta.path}/${item.id || makeId(item.title)}`);
  if (isProjectSection) {
    return (
      <PageShell title={meta.title}>
        {editor.isEditing ? (
          <div className="admin-list-tools">
            <AdminAddButton onClick={() => editor.createBoardItem(meta.dataKey)} />
          </div>
        ) : null}
        <div className="works-page project-board-page reveal-section">
          {items.map(({ item, index, isEmpty }, position) => (
            editor.isEditing ? (
              <AdminEditable
                as="article"
                className="work-row reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `${section}-${index}`}
                onEdit={() => { window.location.href = itemHref(item); }}
                onAdd={() => editor.createBoardItem(meta.dataKey)}
                onDelete={() => editor.removeBoardItem(meta.dataKey, index)}
                {...sortableProps(editor.isEditing, position, (fromPosition, toPosition) => editor.moveBoardItem(meta.dataKey, items, fromPosition, toPosition))}
                {...moveControlProps(editor.isEditing, position, items.length, (fromPosition, toPosition) => editor.moveBoardItem(meta.dataKey, items, fromPosition, toPosition))}
              >
                {renderProjectCard(item, isEmpty)}
              </AdminEditable>
            ) : (
              <a className="work-row reveal-item" href={itemHref(item)} key={item.id || item.title}>
                {renderProjectCard(item, isEmpty)}
              </a>
            )
          ))}
        </div>
      </PageShell>
    );
  }
  return (
    <PageShell title={meta.title}>
      {editor.isEditing ? (
        <div className="admin-list-tools">
          <AdminAddButton onClick={() => editor.createBoardItem(meta.dataKey)} />
        </div>
      ) : null}
      <div className="board-page reveal-section">
        <div className="board-head reveal-item">
          <span>DATE</span>
          <span>TITLE</span>
        </div>
        {items.map(({ item, index, isEmpty }, position) => (
          editor.isEditing ? (
            <AdminEditable
              as="article"
              className="board-row reveal-item"
              empty={isEmpty}
              key={item.id || item.title || `${section}-${index}`}
              onEdit={() => { window.location.href = itemHref(item); }}
              onAdd={() => editor.createBoardItem(meta.dataKey)}
              onDelete={() => editor.removeBoardItem(meta.dataKey, index)}
              {...sortableProps(editor.isEditing, position, (fromPosition, toPosition) => editor.moveBoardItem(meta.dataKey, items, fromPosition, toPosition))}
              {...moveControlProps(editor.isEditing, position, items.length, (fromPosition, toPosition) => editor.moveBoardItem(meta.dataKey, items, fromPosition, toPosition))}
            >
              {renderBoardRow(item, isEmpty)}
            </AdminEditable>
          ) : (
            <a className="board-row reveal-item" href={itemHref(item)} key={item.id || item.title}>
              {isEmpty ? <EmptyEntryPlaceholder label={`空 ${meta.title} 条目`} /> : (
                <>
                  {hasText(item.date) ? <span>{item.date}</span> : null}
                  {hasText(item.title) ? (
                    <strong className="board-row-title">
                      {item.title}
                    </strong>
                  ) : null}
                </>
              )}
            </a>
          )
        ))}
      </div>
    </PageShell>
  );
}

function BoardDetailPage({ section, id }) {
  const content = useSiteContent();
  const contentStatus = useContentStatus();
  const editor = useScopedContentEditor();
  const canonicalSection = normalizeBoardSection(section);
  const meta = boardSections[canonicalSection];
  if (!meta) return <NotFoundPage />;
  const list = getBoardItems(content, canonicalSection);
  const item = findById(list, id);
  if (!item && contentStatus.loading && !contentStatus.loaded) return <ContentLoadingPage />;
  if (!item || (!editor.isEditing && isEmptyContentItem(item, BOARD_CONTENT_FIELDS))) return <NotFoundPage />;
  const itemIndex = findIndexById(list, id);
  const moduleKey = canonicalSection;
  const resolvedBoardFields = useMemo(() => resolveEditorFields(content, moduleKey, item), [content, moduleKey, item]);
  const tightFooter = !editor.isEditing && item.contentLayout?.mode === STACK_LAYOUT_MODE;
  return (
    <PageShell title={item.title || meta.title} tightFooter={tightFooter}>
      {editor.isEditing ? (
        <InlineDetailEditor
          moduleKey={moduleKey}
          title={item.title || meta.title}
          item={item}
          fields={resolvedBoardFields}
          onRenameLabel={(fieldId, labels) => editor.renameField(moduleKey, fieldId, labels)}
          onAddField={editor.addField}
          onRemoveField={editor.removeField}
          onReorderFields={editor.reorderFields}
          onSave={(values) => editor.saveBoardItem(meta.dataKey, item, itemIndex, values)}
          onDelete={() => editor.removeBoardItem(meta.dataKey, itemIndex, () => { window.location.href = siteHref(meta.path); })}
        />
      ) : (
        <DetailArticle image={item.image} attachments={attachmentsFor(item, "image")} cover={item.cover} mediaLayout={item.mediaLayout} contentLayout={item.contentLayout} fields={renderableModuleFields(content, moduleKey, item).map(({ field, value }) => ({ id: field.id, label: field.en, value }))} simpleAttachmentLinks={canonicalSection === "publications"} listFieldsAfterContent />
      )}
    </PageShell>
  );
}

function normalizeDetailFields(fields = []) {
  return fields.map((field) => {
    if (Array.isArray(field)) return { id: field[0], label: field[0], value: field[1] };
    return field;
  });
}

function PublicContentLayout({ fields = [], attachments = [], contentLayout, modalAttachments = true, renderFieldItems = true, tightStage = false, videoPoster = null }) {
  const [activeStackAttachment, setActiveStackAttachment] = useState(null);
  const publicStackStageRef = useRef(null);
  const [measuredPublicStageRatio, setMeasuredPublicStageRatio] = useState(0);
  const attachmentItems = normalizeAttachmentList(attachments);
  const visualItems = attachmentItems.filter(isVisualAttachment);
  const layoutFields = normalizeDetailFields(fields);
  const normalized = normalizeContentLayout(
    contentLayout,
    layoutFields.map((field) => ({ id: field.id })),
    contentLayout?.mode === STACK_LAYOUT_MODE ? attachmentItems : visualItems,
  );
  useLayoutEffect(() => {
    const stage = publicStackStageRef.current;
    if (!stage || normalized?.mode !== STACK_LAYOUT_MODE) {
      setMeasuredPublicStageRatio((current) => (current ? 0 : current));
      return undefined;
    }
    let frame = 0;
    const measure = () => {
      const stageRect = stage.getBoundingClientRect();
      if (!stageRect.width) return;
      let bottom = 0;
      stage.querySelectorAll(".public-free-item").forEach((node) => {
        const rect = node.getBoundingClientRect();
        bottom = Math.max(bottom, rect.bottom - stageRect.top);
      });
      const gap = bottom ? stageRect.width * (tightStage ? PUBLIC_FREE_CANVAS_BOTTOM_GAP : 0.08) : 0;
      const nextRatio = bottom ? (bottom + gap) / stageRect.width : 0;
      setMeasuredPublicStageRatio((current) => (Math.abs(current - nextRatio) < 0.0005 ? current : nextRatio));
    };
    const scheduleMeasure = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    scheduleMeasure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleMeasure) : null;
    observer?.observe(stage);
    stage.querySelectorAll(".public-free-item").forEach((node) => observer?.observe(node));
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  });
  if (!normalized) return null;
  if (normalized.mode === STACK_LAYOUT_MODE) {
    const attachmentMap = new Map(attachmentItems.map((attachment) => [attachment.url, attachment]));
    const fieldMap = new Map(layoutFields.map((field) => [field.id, field]));
    const renderItems = renderFieldItems ? normalized.items : normalized.items.filter((item) => item.type !== "field");
    const canRenderItem = (item) => {
      if (item.type === STACK_TEXT_ITEM_TYPE) return hasText(stackTextValue(item));
      if (item.type === "field") {
        const field = fieldMap.get(item.id);
        return Boolean(field && hasText(field.value));
      }
      return item.type === "attachment" && attachmentMap.has(item.id);
    };
    const stageItems = tightStage ? renderItems.filter(canRenderItem) : renderItems;
    if (!stageItems.length) return null;
    const publicItemHeight = (item) => (
      publicStackItemHeight(item, tightStage, item.type === "attachment" ? attachmentMap.get(item.id) : null)
    );
    const baseStageRatio = publicFreeLayoutStageRatio(stageItems, tightStage, publicItemHeight);
    const stageRatio = Math.max(baseStageRatio, measuredPublicStageRatio);
    const displayedItems = tightStage ? stageItems : renderItems;
    return (
      <>
      <div className={`public-stack-layout ${tightStage ? "is-tight" : ""}`.trim()}>
        <div className="public-free-stage" ref={publicStackStageRef} style={{ aspectRatio: `1 / ${stageRatio}` }}>
          {displayedItems.slice().sort((left, right) => stackItemZ(left) - stackItemZ(right)).map((item) => {
            const sharedStyle = {
              left: `${stackItemX(item) * 100}%`,
              top: `${(stackItemY(item) / stageRatio) * 100}%`,
              width: `${stackItemWidth(item, item.type) * 100}%`,
              zIndex: stackItemZ(item),
            };
            if (item.type === STACK_TEXT_ITEM_TYPE) {
              if (!hasText(stackTextValue(item))) return null;
              const fontSize = stackItemFontSize(item);
              const itemHeight = publicItemHeight(item);
              return (
                <section
                  className="public-free-item is-field is-text reveal-item"
                  key={`text-${item.id}`}
                  style={{
                    ...sharedStyle,
                    minHeight: `${(itemHeight / stageRatio) * 100}%`,
                    fontSize: fontSize ? `${fontSize}px` : undefined,
                  }}
                >
                  <p>{stackTextValue(item)}</p>
                </section>
              );
            }
            if (item.type === "field") {
              const field = fieldMap.get(item.id);
              if (!field || !hasText(field.value)) return null;
              const fontSize = stackItemFontSize(item);
              const itemHeight = publicItemHeight(item);
              return (
                <section
                  className="public-free-item is-field detail-field reveal-item"
                  key={`field-${item.id}`}
                  style={{
                    ...sharedStyle,
                    minHeight: `${(itemHeight / stageRatio) * 100}%`,
                    fontSize: fontSize ? `${fontSize}px` : undefined,
                  }}
                >
                  <span>{field.label}</span>
                  <p>{field.value}</p>
                </section>
              );
            }
              const attachment = attachmentMap.get(item.id);
              if (!attachment) return null;
              const itemHeight = publicItemHeight(item);
              const visualAttachment = isVisualAttachment(attachment);
              if (tightStage && !visualAttachment) {
                const canPreview = modalAttachments && canPreviewInDetailModal(attachment);
                return (
                  <div
                    className="public-free-item is-attachment is-file-name-only reveal-item"
                    key={`attachment-${item.id}`}
                    style={{
                      ...sharedStyle,
                      minHeight: `${(itemHeight / stageRatio) * 100}%`,
                    }}
                  >
                    {canPreview ? (
                      <button type="button" className="detail-file-name public-free-file-name" onClick={() => setActiveStackAttachment(attachment)}>
                        {attachment.name || fileNameFromUrl(attachment.url)}
                      </button>
                    ) : (
                      <a className="detail-file-name public-free-file-name" href={originalAttachmentUrl(attachment.url)} download={attachment.name || fileNameFromUrl(attachment.url)}>
                        {attachment.name || fileNameFromUrl(attachment.url)}
                      </a>
                    )}
                  </div>
                );
              }
              return (
                <div
                  className="public-free-item is-attachment reveal-item"
                  key={`attachment-${item.id}`}
                  style={{
                    ...sharedStyle,
                    height: `${(itemHeight / stageRatio) * 100}%`,
                  }}
                >
                  <AttachmentPreview value={detailAttachment(attachment)} interactive={modalAttachments} showName={!visualAttachment} cropped={false} useOriginal videoPreload="auto" imageLightbox={visualAttachment && modalAttachments} portalLightbox={modalAttachments} videoPoster={videoPoster} videoThumbnail={isVideoAttachment(attachment)} />
                </div>
              );
            })}
        </div>
      </div>
      {activeStackAttachment ? (
        <AttachmentLightbox attachments={[activeStackAttachment]} initialIndex={0} onClose={() => setActiveStackAttachment(null)} portal />
      ) : null}
      </>
    );
  }
  const attachmentMap = new Map(visualItems.map((attachment) => [attachment.url, attachment]));
  const fieldMap = new Map(layoutFields.map((field) => [field.id, field]));
  const renderItems = renderFieldItems ? normalized.items : normalized.items.filter((item) => item.type !== "field");
  return (
    <div className="public-content-layout" style={{ aspectRatio: normalized.canvasRatio }}>
      {renderItems.slice().sort((left, right) => left.z - right.z).map((item) => {
        if (item.type === "media") {
          const attachment = attachmentMap.get(item.id);
          if (!attachment) return null;
          return (
            <div className="public-layout-item is-media" key={`media-${item.id}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.w * 100}%`, height: `${item.h * 100}%`, zIndex: item.z }}>
              <AttachmentPreview value={detailAttachment(attachment)} interactive={modalAttachments} showName={false} cropped={false} useOriginal videoPreload="auto" imageLightbox={modalAttachments} portalLightbox={modalAttachments} videoPoster={videoPoster} videoThumbnail={isVideoAttachment(attachment)} />
            </div>
          );
        }
        const field = fieldMap.get(item.id);
        if (!field || !hasText(field.value)) return null;
        return (
          <section className="public-layout-item is-field detail-field reveal-item" key={`field-${item.id}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.w * 100}%`, minHeight: `${item.h * DETAIL_FIELD_MIN_HEIGHT_SCALE * 100}%`, zIndex: item.z }}>
            <span>{field.label}</span>
            <p>{field.value}</p>
          </section>
        );
      })}
    </div>
  );
}

function DetailArticle({ image, attachments = null, cover = null, mediaLayout = null, contentLayout = null, fields, className = "detail-page reveal-section", editableProps = {}, simpleAttachmentLinks = false, modalAttachments = true, listFieldsAfterContent = false }) {
  const { authenticated, editMode } = useAdminSession();
  const showEmptyPlaceholders = authenticated && editMode && isAdminRoute();
  const visibleFields = normalizeDetailFields(fields).filter(({ value }) => hasText(value));
  const mediaItems = attachments ? normalizeAttachmentList(attachments) : normalizeAttachmentList(image);
  const visualItems = mediaItems.filter(isVisualAttachment);
  const videoPoster = normalizePosterAttachment(cover);
  const usesStackLayout = contentLayout?.mode === STACK_LAYOUT_MODE;
  const listedFields = usesStackLayout && listFieldsAfterContent
    ? visibleFields.filter(({ id }) => !DETAIL_CANVAS_CONTENT_FIELD_IDS.has(id))
    : visibleFields;
  return (
    <AdminEditable as="article" className={className} {...editableProps}>
      {contentLayout ? (
        <PublicContentLayout
          fields={visibleFields}
          attachments={usesStackLayout ? mediaItems : visualItems}
          contentLayout={contentLayout}
          modalAttachments={modalAttachments}
          renderFieldItems={!listFieldsAfterContent}
          tightStage={listFieldsAfterContent}
          videoPoster={videoPoster}
        />
      ) : visualItems.length ? (
        mediaLayout ? (
          <DetailMediaCanvas attachments={visualItems} mediaLayout={mediaLayout} modal={modalAttachments} videoPoster={videoPoster} />
        ) : (
          <DetailMediaGallery attachments={visualItems} modal={modalAttachments} videoPoster={videoPoster} />
        )
      ) : showEmptyPlaceholders ? (
        <figure className="detail-hero reveal-item admin-media-shell">
          <EmptyMediaPlaceholder />
        </figure>
      ) : null}
      {!usesStackLayout ? <AttachmentInfoBar attachments={mediaItems} simpleLinks={simpleAttachmentLinks} modal={modalAttachments} /> : null}
      {((!contentLayout || listFieldsAfterContent) && listedFields.length) ? (
        <div className="detail-fields">
          {listedFields.map(({ id, label, value }) => (
            <section className="detail-field reveal-item" key={id || label}>
              <span>{label}</span>
              <p>{value}</p>
            </section>
          ))}
        </div>
      ) : showEmptyPlaceholders ? (
        <EmptyEntryPlaceholder label="详情内容为空" />
      ) : null}
    </AdminEditable>
  );
}

function ContactPage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const contactItem = {
    contactAddress: content.site.contactAddress,
    contactEmail: content.site.contactEmail,
    contactDirections: content.site.contactDirections,
    customFields: content.site.customFields || {},
  };
  const fields = renderableModuleFields(content, "contact", contactItem).map(({ field, value }) => [field.en, value]);
  return (
    <PageShell title="Contact">
      {editor.isEditing ? (
        <InlineSiteEditor
          value={content.site}
          onSave={editor.saveSite}
          content={content}
          fields={resolveEditorFields(content, "contact", contactItem)}
          onRenameLabel={(fieldId, labels) => editor.renameField("contact", fieldId, labels)}
          onAddField={editor.addField}
          onRemoveField={editor.removeField}
        />
      ) : (
        <div className="contact-container reveal-section">
          {fields.length ? fields.map(([label, value]) => (
            <div className="item reveal-item" key={label}>
              <span className="label">{label}</span>
              <p className="address">{value}</p>
            </div>
          )) : null}
        </div>
      )}
    </PageShell>
  );
}

function NotFoundPage() {
  return (
    <PageShell title="Not Found">
      <div className="contact-container">
        <div className="item">
          <span className="label">404</span>
          <p className="address">页面不存在，返回首页继续浏览。</p>
        </div>
      </div>
    </PageShell>
  );
}

function TextInput({ label, labelPrefix = null, value, onChange, multiline = false, type = "text", rows = 4, autoComplete, className = "" }) {
  return (
    <label className={`admin-field ${className}`.trim()}>
      <span className={labelPrefix ? "admin-field-label-with-prefix" : ""}>
        {labelPrefix}
        {label}
      </span>
      {multiline ? (
        <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={rows} autoComplete={autoComplete} />
      ) : (
        <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} />
      )}
    </label>
  );
}

function SelectInput({ label, labelPrefix = null, value, options = [], onChange }) {
  return (
    <label className="admin-field">
      <span className={labelPrefix ? "admin-field-label-with-prefix" : ""}>
        {labelPrefix}
        {label}
      </span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function UploadBox({ onUpload, multiple = true, accept = SAFE_UPLOAD_ACCEPT, label = "上传附件" }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const acceptFiles = async (files = []) => {
    const nextFiles = Array.from(files || []).filter(Boolean);
    if (!nextFiles.length || uploading) return false;
    const invalid = nextFiles.find((file) => {
      const extension = String(file.name || "").split(".").pop()?.toLowerCase() || "";
      return extension === "svg" || file.type === "image/svg+xml";
    });
    if (invalid) {
      setError("出于安全考虑，暂不支持上传 SVG 文件。");
      setDragging(false);
      return false;
    }
    const oversized = nextFiles.find((file) => file.size > MAX_CLIENT_UPLOAD_BYTES);
    if (oversized) {
      setError(`文件过大，当前上传上限为 ${formatFileSize(MAX_CLIENT_UPLOAD_BYTES)}。`);
      setDragging(false);
      return false;
    }
    setError("");
    setDragging(false);
    setUploading(true);
    try {
      return await onUpload(multiple ? nextFiles : nextFiles[0]);
    } finally {
      setUploading(false);
    }
  };
  return (
    <label
      className={`upload-box ${dragging ? "is-drag-active" : ""} ${uploading ? "is-uploading" : ""}`.trim()}
      aria-busy={uploading}
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(false);
        void acceptFiles(event.dataTransfer.files);
      }}
    >
      {uploading ? <Loader2 className="spin" size={18} /> : <Paperclip size={18} />}
      <span>{uploading ? "上传中..." : label}</span>
      {error ? <small>{error}</small> : null}
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={uploading}
        onChange={(event) => {
          void acceptFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function AdminSessionProvider({ children }) {
  const content = useSiteContent();
  const { setContentFromCms } = useContentActions();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [editMode, setEditModeState] = useState(() => localStorage.getItem("act4-edit-mode") === "true");
  const [message, setMessage] = useState("");
  const modeSaveHandlersRef = useRef(new Set());
  const [saving, setSaving] = useState(false);
  const messageTimer = useRef(null);

  const showMessage = useCallback((nextMessage) => {
    setMessage(nextMessage || "");
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    if (nextMessage) {
      messageTimer.current = window.setTimeout(() => setMessage(""), 3600);
    }
  }, []);

  const setEditMode = useCallback((nextValue) => {
    setEditModeState((current) => {
      const value = typeof nextValue === "function" ? nextValue(current) : Boolean(nextValue);
      if (value) localStorage.setItem("act4-edit-mode", "true");
      else localStorage.removeItem("act4-edit-mode");
      return value;
    });
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setAuthenticated(Boolean(data.authenticated));
        setAuthChecked(true);
      })
      .catch(() => active && setAuthChecked(true));
    return () => {
      active = false;
      if (messageTimer.current) window.clearTimeout(messageTimer.current);
    };
  }, []);

  useEffect(() => {
    if (authChecked && !authenticated) setEditMode(false);
  }, [authChecked, authenticated, setEditMode]);

  const persistScopedContent = useCallback(
    async (updater, scope = {}) => {
      const pagePath = normalizePath(scope.pagePath || window.location.pathname);
      const moduleKey = scope.moduleKey || "content";
      const action = scope.action || "update";
      const nextContent = typeof updater === "function" ? updater(content) : updater;
      const params = new URLSearchParams({ pagePath, module: moduleKey, action });
      if (scope.columnId) params.set("columnId", scope.columnId);

      setSaving(true);
      const response = await fetch(`/api/content?${params.toString()}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Act4-Page-Path": pagePath,
          "X-Act4-Module": moduleKey,
          "X-Act4-Action": action,
          ...(scope.columnId ? { "X-Act4-Column-Id": scope.columnId } : {}),
        },
        body: JSON.stringify(nextContent),
      }).catch(() => null);
      const data = response ? await response.json().catch(() => ({})) : {};
      setSaving(false);

      if (!response?.ok) {
        showMessage(data.error ? `保存失败：${data.error}` : "保存失败，请检查登录状态或服务端。");
        return null;
      }

      const savedContent = data.content || nextContent;
      setContentFromCms(savedContent);
      notifyContentUpdated();
      showMessage("已保存，当前页面模块已更新。");
      return savedContent;
    },
    [content, setContentFromCms, showMessage],
  );

  const uploadImage = useCallback(
    async (callback, files) => {
      const fileList = Array.isArray(files) ? files.filter(Boolean) : files ? [files] : [];
      if (!fileList.length) return false;
      try {
        const uploaded = await uploadAttachmentsToServer(fileList);
        callback(uploaded.length === 1 ? uploaded[0] : uploaded);
        showMessage("附件已上传，保存后生效。");
        return true;
      } catch (error) {
        showMessage(`附件上传失败：${error?.message || "服务器未返回具体原因，请稍后重试。"}`);
        return false;
      }
    },
    [showMessage],
  );

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    setAuthenticated(false);
    setEditMode(false);
    showMessage("");
  }, [showMessage]);

  const registerModeSaveHandler = useCallback((handler) => {
    if (typeof handler !== "function") return () => {};
    modeSaveHandlersRef.current.add(handler);
    return () => modeSaveHandlersRef.current.delete(handler);
  }, []);

  const saveBeforeModeChange = useCallback(async () => {
    const handlers = [...modeSaveHandlersRef.current];
    for (const handler of handlers) {
      const saved = await handler();
      if (!saved) return false;
    }
    return true;
  }, []);

  const value = useMemo(
    () => ({
      authenticated,
      authChecked,
      editMode,
      saving,
      message,
      setAuthenticated,
      setEditMode,
      registerModeSaveHandler,
      saveBeforeModeChange,
      showMessage,
      persistScopedContent,
      uploadImage,
      logout,
    }),
    [authChecked, authenticated, editMode, logout, message, persistScopedContent, registerModeSaveHandler, saveBeforeModeChange, saving, showMessage, uploadImage],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      {authenticated && isAdminRoute() ? <AdminModeToggle /> : null}
    </AdminContext.Provider>
  );
}

function AdminModeToggle() {
  const { editMode, setEditMode, saveBeforeModeChange, saving, message, logout, showMessage } = useAdminSession();
  const [switchingMode, setSwitchingMode] = useState(false);
  const toggleMode = async () => {
    if (saving || switchingMode) return;
    if (editMode) {
      setSwitchingMode(true);
      const saved = await saveBeforeModeChange();
      setSwitchingMode(false);
      if (!saved) {
        showMessage("自动保存失败，仍停留在编辑模式。");
        return;
      }
    }
    setEditMode(!editMode);
  };
  return (
    <aside className="front-admin-toolbar" aria-label="前台管理控制">
      <button type="button" className={editMode ? "active" : ""} onClick={toggleMode} disabled={saving || switchingMode}>
        {editMode ? <Pencil size={15} /> : <Eye size={15} />}
        {editMode ? "编辑模式" : "预览模式"}
      </button>
      <button type="button" onClick={logout}>
        <LogOut size={15} />
        退出
      </button>
      {saving || switchingMode ? <span><Loader2 className="spin" size={14} />保存中</span> : null}
      {message ? <span>{message}</span> : null}
    </aside>
  );
}

function AdminEditable({
  as: Component = "div",
  className = "",
  children,
  empty = false,
  onEdit,
  onAdd,
  onDelete,
  onMoveUp,
  onMoveDown,
  addDisabledMessage,
  deleteDisabledMessage,
  ...props
}) {
  const { authenticated, editMode } = useAdminSession();
  const hasControls = Boolean(onEdit || onAdd || onDelete || onMoveUp || onMoveDown || addDisabledMessage || deleteDisabledMessage);
  const active = authenticated && editMode && isAdminRoute() && hasControls;
  const combinedClassName = [className, active ? "admin-editable front-admin-editable" : "", active && empty ? "admin-empty-entry" : ""].filter(Boolean).join(" ");

  return (
    <Component {...props} className={combinedClassName}>
      {active ? (
        <AdminInlineControls
          onEdit={onEdit}
          onAdd={onAdd}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          addDisabledMessage={addDisabledMessage}
          deleteDisabledMessage={deleteDisabledMessage}
        />
      ) : null}
      {children}
    </Component>
  );
}

function useScopedContentEditor() {
  const content = useSiteContent();
  const admin = useAdminSession();
  const pagePath = currentPagePath();
  const singleItemMessage = "该模块仅限一条";
  const fixedModuleMessage = "该模块不能删除";

  const commit = (updater, scope = {}) => admin.persistScopedContent(updater, { pagePath, ...scope });
  const addSingle = () => admin.showMessage(singleItemMessage);
  const denyDelete = () => admin.showMessage(fixedModuleMessage);
  const confirmDelete = (question, updater, scope = {}, afterSave) => {
    if (!window.confirm(question)) return;
    commit(updater, { ...scope, action: "delete" }).then((saved) => {
      if (saved && afterSave) afterSave();
    });
  };

  const saveSite = (values) =>
    commit((current) => ({ ...current, site: { ...current.site, ...values } }), {
      moduleKey: "site",
      action: "update",
    });

  const saveHomeIntro = (value) =>
    commit((current) => ({ ...current, homeIntro: splitAdminParagraphs(value) }), {
      moduleKey: "homeIntro",
      action: "update",
    });

  const clearHomeIntro = () =>
    confirmDelete(
      "确认清空首页简介？",
      (current) => ({ ...current, homeIntro: [] }),
      { moduleKey: "homeIntro" },
    );

  const saveAboutHeading = (values) =>
    commit((current) => ({ ...current, about: { ...current.about, ...values } }), {
      moduleKey: "about.heading",
      action: "update",
    });

  const saveAboutSection = (section = {}, index = null, values = {}) =>
    commit(
      (current) => {
        const nextSection = {
          ...section,
          number: values.number,
          title: values.title,
          paragraphs: splitAdminParagraphs(values.paragraphs),
        };
        const sections = current.about?.sections || [];
        return {
          ...current,
          about: {
            ...current.about,
            sections:
              index === null
                ? [...sections, nextSection]
                : sections.map((item, itemIndex) => (itemIndex === index ? nextSection : item)),
          },
        };
      },
      { moduleKey: "about.sections", action: index === null ? "create" : "update" },
    );

  const removeAboutSection = (index) =>
    confirmDelete(
      "确认删除这个 About 内容模块？",
      (current) => ({
        ...current,
        about: {
          ...current.about,
          sections: (current.about?.sections || []).filter((_, itemIndex) => itemIndex !== index),
        },
      }),
      { moduleKey: "about.sections" },
    );

  const saveArchive = (values) =>
    commit((current) => ({ ...current, archive: [[values.label || "Archive", values.text || ""]] }), {
      moduleKey: "archive",
      action: "update",
    });

  const clearArchive = () =>
    confirmDelete(
      "确认清空这段理念文案？",
      (current) => ({ ...current, archive: [["Archive", ""]] }),
      { moduleKey: "archive" },
    );

  const updateItemsForModule = (current, moduleKey, updater) => {
    if (moduleKey === "contact") return { ...current, site: updater(current.site || {}) };
    if (moduleKey === "people") return { ...current, people: (current.people || []).map(updater) };
    if (moduleKey === "works") return { ...current, works: (current.works || []).map(updater) };
    const boardKey = boardSections[moduleKey]?.dataKey;
    if (boardKey) {
      return {
        ...current,
        board: {
          ...current.board,
          [boardKey]: (current.board?.[boardKey] || []).map(updater),
        },
      };
    }
    return current;
  };

  const addField = (moduleKey, draft = {}) => {
    const zh = String(draft.zh || "").trim();
    const en = String(draft.en || "").trim().toUpperCase();
    if (!moduleKey || !zh || !en) return Promise.resolve(null);
    const id = makeId(en).replace(/-/g, "_");
    return commit(
      (current) => {
        const schemas = normalizeFieldSchemas(current.fieldSchemas);
        if ((schemas[moduleKey] || []).some((field) => field.id === id)) return current;
        const nextField = { id, zh, en, type: draft.type === "textarea" ? "textarea" : "text", protected: false, custom: true };
        const nextSchemas = {
          ...schemas,
          [moduleKey]: appendFieldToSchema(moduleKey, schemas[moduleKey] || [], nextField),
        };
        const withSchema = { ...current, fieldSchemas: nextSchemas };
        return updateItemsForModule(withSchema, moduleKey, (item) => ({
          ...item,
          customFields: {
            ...(item.customFields || {}),
            [id]: "",
          },
        }));
      },
      { moduleKey: `fieldSchemas.${moduleKey}`, action: "create" },
    );
  };

  const removeField = (moduleKey, fieldId) => {
    const field = moduleFieldsFor(content, moduleKey).find((entry) => entry.id === fieldId);
    if (!field || field.protected) return Promise.resolve(null);
    return confirmDelete(
      `确认删除字段“${field.zh}”？该模块所有条目中的值也会一并删除。`,
      (current) => {
        const schemas = normalizeFieldSchemas(current.fieldSchemas);
        const nextSchemas = {
          ...schemas,
          [moduleKey]: (schemas[moduleKey] || []).filter((entry) => entry.id !== fieldId),
        };
        const withSchema = { ...current, fieldSchemas: nextSchemas };
        return updateItemsForModule(withSchema, moduleKey, (item) => {
          const nextCustomFields = { ...(item.customFields || {}) };
          delete nextCustomFields[fieldId];
          const nativeKey = moduleFieldNativeKey(moduleKey, fieldId);
          return {
            ...item,
            ...(nativeKey ? { [nativeKey]: "" } : {}),
            customFields: nextCustomFields,
            contentLayout: item.contentLayout
              ? { ...item.contentLayout, items: (item.contentLayout.items || []).filter((entry) => !(entry.type === "field" && entry.id === fieldId)) }
              : item.contentLayout,
          };
        });
      },
      { moduleKey: `fieldSchemas.${moduleKey}` },
    );
  };

  const renameField = (moduleKey, fieldId, labels = {}) => {
    const zh = String(labels.zh || "").trim();
    const en = String(labels.en || "").trim().toUpperCase();
    if (!moduleKey || !fieldId || !zh) return Promise.resolve(null);
    return commit(
      (current) => {
        const schemas = normalizeFieldSchemas(current.fieldSchemas);
        return {
          ...current,
          fieldSchemas: {
            ...schemas,
            [moduleKey]: (schemas[moduleKey] || []).map((field) => (field.id === fieldId ? { ...field, zh, en: en || field.en } : field)),
          },
        };
      },
      { moduleKey: `fieldSchemas.${moduleKey}`, action: "update" },
    );
  };

  const reorderFields = (moduleKey, orderedFieldIds = []) => {
    if (!moduleKey || !Array.isArray(orderedFieldIds) || !orderedFieldIds.length) return Promise.resolve(null);
    return commit(
      (current) => {
        const schemas = normalizeFieldSchemas(current.fieldSchemas);
        const nextSchemas = {
          ...schemas,
          [moduleKey]: moduleKey === "people"
            ? orderFieldsInSchema(schemas[moduleKey] || [], orderedFieldIds)
            : orderFixedDetailFieldsInSchema(moduleKey, schemas[moduleKey] || [], orderedFieldIds),
        };
        const nextContent = {
          ...current,
          fieldSchemas: nextSchemas,
        };
        if (moduleKey !== "people") return nextContent;
        return {
          ...nextContent,
          people: (current.people || []).map((person) => ({
            ...person,
            contentLayout: reorderPeopleStackFieldLayout(person.contentLayout, orderedFieldIds),
          })),
        };
      },
      { moduleKey: `fieldSchemas.${moduleKey}`, action: "sort" },
    );
  };

  const savePerson = (person = {}, index, payload = {}) =>
    commit(
      (current) => {
        let nextItem = withAttachmentCompatibility({
          ...person,
          id: person.id || makeId(payload.values?.name || `person-${Date.now()}`),
          attachments: payload.attachments,
          cover: payload.cover,
          contentLayout: payload.contentLayout,
          createdAt: person.createdAt || timestampNow(),
        }, "photo");
        moduleFieldsFor(current, "people").forEach((field) => {
          nextItem = withFieldValue(nextItem, "people", field, payload.values?.[field.id] || "");
        });
        nextItem.category = normalizePeopleCategory(nextItem.category);
        return {
          ...current,
          people: (current.people || []).map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
        };
      },
      { moduleKey: "people", action: "update" },
    );

  const createPerson = (category = PEOPLE_CATEGORY_DEFAULT) => {
    const nextItem = {
      id: `person-${Date.now()}`,
      photo: "",
      attachments: [],
      category: normalizePeopleCategory(category),
      name: "新成员",
      title: "",
      email: "",
      interests: "",
      history: "",
      experience: "",
      academicAbility: "",
      customFields: Object.fromEntries(moduleFieldsFor(content, "people").filter((field) => !moduleFieldNativeKey("people", field.id)).map((field) => [field.id, ""])),
      createdAt: timestampNow(),
    };
    commit(
      (current) => ({ ...current, people: [nextItem, ...(current.people || [])] }),
      { moduleKey: "people", action: "create" },
    ).then((saved) => {
      if (saved) window.location.href = siteHref(`/people/${nextItem.id}`);
    });
  };

  const removePerson = (index, afterSave) =>
    confirmDelete(
      "确认删除这个 People 条目？",
      (current) => ({ ...current, people: (current.people || []).filter((_, itemIndex) => itemIndex !== index) }),
      { moduleKey: "people" },
      afterSave,
    );

  const saveWork = (work = {}, index, payload = {}) =>
    commit(
      (current) => {
        let nextItem = withAttachmentCompatibility({
          ...work,
          id: work.id || makeId(payload.values?.title || `work-${Date.now()}`),
          attachments: payload.attachments,
          cover: payload.cover,
          contentLayout: payload.contentLayout,
          createdAt: work.createdAt || timestampNow(),
        }, "image");
        moduleFieldsFor(current, "works").forEach((field) => {
          nextItem = withFieldValue(nextItem, "works", field, payload.values?.[field.id] || "");
        });
        return {
          ...current,
          works: (current.works || []).map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
        };
      },
      { moduleKey: "works", action: "update" },
    );

  const createWork = () => {
    const nextItem = {
      id: `work-${Date.now()}`,
      title: "新作品",
      date: "",
      people: "",
      text: "",
      body: "",
      image: "",
      attachments: [],
      customFields: Object.fromEntries(moduleFieldsFor(content, "works").filter((field) => !moduleFieldNativeKey("works", field.id)).map((field) => [field.id, ""])),
      createdAt: timestampNow(),
    };
    commit(
      (current) => ({ ...current, works: [nextItem, ...(current.works || [])] }),
      { moduleKey: "works", action: "create" },
    ).then((saved) => {
      if (saved) window.location.href = siteHref(`/works/${nextItem.id}`);
    });
  };

  const removeWork = (index, afterSave) =>
    confirmDelete(
      "确认删除这个 Works 条目？",
      (current) => ({ ...current, works: (current.works || []).filter((_, itemIndex) => itemIndex !== index) }),
      { moduleKey: "works" },
      afterSave,
    );

  const saveBoardItem = (sectionKey, item = {}, index, payload = {}) =>
    commit(
      (current) => {
        const moduleKey = Object.entries(boardSections).find(([, section]) => section.dataKey === sectionKey)?.[0] || "news";
        let nextItem = withAttachmentCompatibility({
          ...item,
          id: item.id || makeId(payload.values?.title || `item-${Date.now()}`),
          attachments: payload.attachments,
          cover: payload.cover,
          contentLayout: payload.contentLayout,
          createdAt: item.createdAt || timestampNow(),
        }, "image");
        moduleFieldsFor(current, moduleKey).forEach((field) => {
          nextItem = withFieldValue(nextItem, moduleKey, field, payload.values?.[field.id] || "");
        });
        return {
          ...current,
          board: {
            ...current.board,
            [sectionKey]: (current.board?.[sectionKey] || []).map((entry, itemIndex) => (itemIndex === index ? nextItem : entry)),
          },
        };
      },
      { moduleKey: `board.${sectionKey}`, columnId: sectionKey, action: "update" },
    );

  const createBoardItem = (sectionKey) => {
    const nextItem = {
      id: `item-${Date.now()}`,
      title: "新条目",
      date: "",
      people: "",
      intro: "",
      body: "",
      image: "",
      attachments: [],
      customFields: Object.fromEntries(moduleFieldsFor(content, Object.entries(boardSections).find(([, section]) => section.dataKey === sectionKey)?.[0] || "news").filter((field) => !moduleFieldNativeKey(Object.entries(boardSections).find(([, section]) => section.dataKey === sectionKey)?.[0] || "news", field.id)).map((field) => [field.id, ""])),
      createdAt: timestampNow(),
    };
    commit(
      (current) => ({
        ...current,
        board: {
          ...current.board,
          [sectionKey]: [nextItem, ...(current.board?.[sectionKey] || [])],
        },
      }),
      { moduleKey: `board.${sectionKey}`, columnId: sectionKey, action: "create" },
    ).then((saved) => {
      const sectionPath = Object.values(boardSections).find((section) => section.dataKey === sectionKey)?.path || "/board";
      if (saved) window.location.href = siteHref(`${sectionPath}/${nextItem.id}`);
    });
  };

  const removeBoardItem = (sectionKey, index, afterSave) =>
    confirmDelete(
      "确认删除这个 Board 条目？",
      (current) => ({
        ...current,
        board: {
          ...current.board,
          [sectionKey]: (current.board?.[sectionKey] || []).filter((_, itemIndex) => itemIndex !== index),
        },
      }),
      { moduleKey: `board.${sectionKey}`, columnId: sectionKey },
      afterSave,
    );

  const movePerson = (categoryGroups, fromCategoryId, fromPosition, toCategoryId, toPosition) =>
    commit(
      (current) => markManualSort({
        ...current,
        people: reorderPeopleByCategory(current.people || [], categoryGroups, fromCategoryId, fromPosition, toCategoryId, toPosition),
      }, "people"),
      { moduleKey: "people", action: "sort" },
    );

  const moveWork = (entries, fromPosition, toPosition) =>
    commit(
      (current) => markManualSort({
        ...current,
        works: reorderItemsFromEntries(current.works || [], entries, fromPosition, toPosition),
      }, "works"),
      { moduleKey: "works", action: "sort" },
    );

  const moveBoardItem = (sectionKey, entries, fromPosition, toPosition) =>
    commit(
      (current) => markManualSort({
        ...current,
        board: {
          ...current.board,
          [sectionKey]: reorderItemsFromEntries(current.board?.[sectionKey] || [], entries, fromPosition, toPosition),
        },
      }, manualSortKey(sectionKey)),
      { moduleKey: `board.${sectionKey}`, columnId: sectionKey, action: "sort" },
    );

  return {
    isEditing: admin.authenticated && admin.editMode && isAdminRoute(),
    addSingle,
    denyDelete,
    singleItemMessage,
    fixedModuleMessage,
    saveSite,
    saveHomeIntro,
    clearHomeIntro,
    saveAboutHeading,
    saveAboutSection,
    removeAboutSection,
    saveArchive,
    clearArchive,
    addField,
    removeField,
    renameField,
    reorderFields,
    createPerson,
    savePerson,
    removePerson,
    createWork,
    saveWork,
    removeWork,
    createBoardItem,
    saveBoardItem,
    removeBoardItem,
    movePerson,
    moveWork,
    moveBoardItem,
  };
}

function AdminPage() {
  const adminSession = useAdminSession();
  const publicContent = useSiteContent();
  const { setContentFromCms } = useContentActions();
  const adminUsernameHint = import.meta.env.DEV ? "act4lab" : "";
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [form, setForm] = useState({ username: adminUsernameHint, password: "" });
  const [draft, setDraft] = useState(publicContent);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((response) => response.json())
      .then((data) => {
        setLoggedIn(Boolean(data.authenticated));
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const params = new URLSearchParams({ t: String(Date.now()), pagePath: "/admin" });
    fetch(`/api/content?${params.toString()}`, { cache: "no-store", headers: { "X-Act4-Page-Path": "/admin" } })
      .then((response) => response.json())
      .then((data) => setDraft(data))
      .catch(() => setDraft(publicContent));
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) return;
    adminSession.setAuthenticated(true);
    adminSession.setEditMode(true);
  }, [loggedIn]);

  const persistContent = async (contentToSave = draft) => {
    setSaving(true);
    setMessage("");
    const params = new URLSearchParams({ pagePath: "/admin", module: "all", action: "update" });
    const response = await fetch(`/api/content?${params.toString()}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Act4-Page-Path": "/admin",
        "X-Act4-Module": "all",
        "X-Act4-Action": "update",
      },
      body: JSON.stringify(contentToSave),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => ({})) : {};
    if (response?.ok) {
      const savedContent = data.content || contentToSave;
      setDraft(savedContent);
      setContentFromCms(savedContent);
      notifyContentUpdated();
    }
    setSaving(false);
    setMessage(response?.ok ? "已保存，前台已同步更新。" : data.error ? `保存失败：${data.error}` : "保存失败，请检查服务器。");
  };

  const save = () => persistContent(draft);

  const login = async (event) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setLoggedIn(true);
      adminSession.setAuthenticated(true);
      adminSession.setEditMode(true);
      setForm({ username: adminUsernameHint, password: "" });
    } else {
      setMessage("用户名或密码不正确。");
    }
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setLoggedIn(false);
    adminSession.setAuthenticated(false);
    adminSession.setEditMode(false);
  };

  const uploadImage = async (callback, files) => {
    const fileList = Array.isArray(files) ? files.filter(Boolean) : files ? [files] : [];
    if (!fileList.length) return false;
    try {
      const uploaded = await uploadAttachmentsToServer(fileList);
      callback(uploaded.length === 1 ? uploaded[0] : uploaded);
      setMessage("附件已上传，点击保存后前台生效。");
      return true;
    } catch (error) {
      setMessage(`上传失败：${error?.message || "服务器未返回具体原因，请稍后重试。"}`);
      return false;
    }
  };

  const updateWork = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      works: current.works.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const updatePerson = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      people: current.people.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const updateBoardItem = (sectionKey, index, key, value) => {
    setDraft((current) => ({
      ...current,
      board: {
        ...current.board,
        [sectionKey]: current.board[sectionKey].map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  };

  const addListItem = (key, item) => setDraft((current) => ({ ...current, [key]: [item, ...current[key]] }));
  const removeListItem = (key, index) => setDraft((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }));
  const addBoardItem = (sectionKey) =>
    setDraft((current) => ({
      ...current,
      board: {
        ...current.board,
        [sectionKey]: [{ id: `item-${Date.now()}`, title: "新条目", date: "", intro: "", people: "", image: "", attachments: [], body: "" }, ...current.board[sectionKey]],
      },
    }));
  const removeBoardItem = (sectionKey, index) =>
    setDraft((current) => ({
      ...current,
      board: { ...current.board, [sectionKey]: current.board[sectionKey].filter((_, itemIndex) => itemIndex !== index) },
    }));

  if (!authChecked) return <main className="admin-screen"><Loader2 className="spin" /></main>;
  if (!loggedIn) {
    return (
      <main className="admin-screen admin-login">
        <form onSubmit={login} className="admin-login-box">
          <span className="admin-kicker">ACT IV ADMIN</span>
          <h1>后台登录</h1>
          <TextInput label="用户名" value={form.username} autoComplete="username" onChange={(value) => setForm({ ...form, username: value })} />
          <TextInput label="密码" value={form.password} type="password" autoComplete="current-password" onChange={(value) => setForm({ ...form, password: value })} />
          <button type="submit">登录</button>
          {message ? <p className="admin-message">{message}</p> : null}
        </form>
      </main>
    );
  }

  return <main className="admin-screen"><Loader2 className="spin" /></main>;
}

function splitAdminParagraphs(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function AdminVisualEditor({ draft, setDraft, save, persistContent, saving, logout, message, uploadImage }) {
  const [modal, setModal] = useState(null);
  const site = draft.site || {};
  const about = draft.about || {};

  const commitDraft = (updater) => {
    const nextDraft = typeof updater === "function" ? updater(draft) : updater;
    setDraft(nextDraft);
    persistContent(nextDraft);
  };

  const openSiteEditor = () => {
    setModal({
      title: "编辑基础信息",
      initial: {
        topLine: site.topLine || "",
        logo: site.logo || "",
        contactAddress: site.contactAddress || "",
        contactEmail: site.contactEmail || "",
        contactDirections: site.contactDirections || "",
        footerTagline: site.footerTagline || "",
      },
      fields: [
        { name: "topLine", label: "顶部细条文案" },
        { name: "logo", label: "Logo 附件地址", type: "image" },
        { name: "contactAddress", label: "地址", type: "textarea" },
        { name: "contactEmail", label: "邮箱" },
        { name: "contactDirections", label: "方向", type: "textarea" },
        { name: "footerTagline", label: "页脚说明", type: "textarea" },
      ],
      onSubmit: (values) =>
        commitDraft((current) => ({
          ...current,
          site: { ...current.site, ...values },
        })),
    });
  };

  const openHomeEditor = () => {
    setModal({
      title: "编辑首页介绍",
      initial: { homeIntro: (draft.homeIntro || []).join("\n\n") },
      fields: [{ name: "homeIntro", label: "首页介绍", type: "textarea", rows: 8 }],
      onSubmit: (values) =>
        commitDraft((current) => ({
          ...current,
          homeIntro: splitAdminParagraphs(values.homeIntro),
        })),
    });
  };

  const openAboutHeadingEditor = () => {
    setModal({
      title: "编辑 About LAB 标题",
      initial: { label: about.label || "", title: about.title || "" },
      fields: [
        { name: "label", label: "标签" },
        { name: "title", label: "标题" },
      ],
      onSubmit: (values) =>
        commitDraft((current) => ({
          ...current,
          about: { ...current.about, ...values },
        })),
    });
  };

  const openAboutSectionEditor = (section, index) => {
    setModal({
      title: "编辑 About LAB 内容",
      initial: {
        number: section.number || "",
        title: section.title || "",
        paragraphs: (section.paragraphs || []).join("\n\n"),
      },
      fields: [
        { name: "number", label: "编号" },
        { name: "title", label: "标题" },
        { name: "paragraphs", label: "正文", type: "textarea", rows: 8 },
      ],
      onSubmit: (values) =>
        commitDraft((current) => ({
          ...current,
          about: {
            ...current.about,
            sections: (current.about?.sections || []).map((item, itemIndex) =>
              itemIndex === index
                ? { ...item, number: values.number, title: values.title, paragraphs: splitAdminParagraphs(values.paragraphs) }
                : item,
            ),
          },
        })),
    });
  };
  const openArchiveEditor = () => {
    const latest = draft.archive?.at(-1) || ["研究室精神", ""];
    setModal({
      title: "编辑底部理念语",
      initial: { label: latest[0] || "", text: latest[1] || "" },
      fields: [
        { name: "label", label: "内部标签" },
        { name: "text", label: "显示文案", type: "textarea" },
      ],
      onSubmit: (values) =>
        commitDraft((current) => ({
          ...current,
          archive: [[values.label || "研究室精神", values.text || ""]],
        })),
    });
  };

  const peopleFields = [
    { name: "attachments", legacyField: "photo", label: "附件", type: "attachments" },
    { name: "category", label: "所属分类", type: "select", options: peopleCategoryOptions },
    { name: "name", label: "姓名" },
    { name: "title", label: "头衔" },
    { name: "email", label: "邮箱" },
    { name: "interests", label: "兴趣方向", type: "textarea" },
    { name: "history", label: "经历", type: "textarea" },
    { name: "experience", label: "经验", type: "textarea" },
  ];
  const workFields = [
    { name: "attachments", legacyField: "image", label: "附件", type: "attachments" },
    { name: "title", label: "标题" },
    { name: "date", label: "时间" },
    { name: "people", label: "人员" },
    { name: "text", label: "介绍", type: "textarea" },
    { name: "body", label: "正文", type: "textarea", rows: 8 },
  ];
  const boardFields = [
    { name: "attachments", legacyField: "image", label: "附件", type: "attachments" },
    { name: "title", label: "标题" },
    { name: "date", label: "时间" },
    { name: "people", label: "人员 / 作者" },
    { name: "intro", label: "介绍", type: "textarea" },
    { name: "body", label: "正文", type: "textarea", rows: 8 },
  ];

  const openPersonEditor = (person = {}, index = null) => {
    setModal({
      title: index === null ? "增加 People 条目" : "编辑 People 条目",
      initial: {
        photo: person.photo || "",
        attachments: attachmentsFor(person, "photo"),
        category: normalizePeopleCategory(person.category),
        name: person.name || "",
        title: person.title || "",
        email: person.email || "",
        interests: person.interests || "",
        history: person.history || "",
        experience: person.experience || "",
      },
      fields: peopleFields,
      onSubmit: (values) =>
        commitDraft((current) => {
          const nextItem = withAttachmentCompatibility({
            ...person,
            ...values,
            id: person.id || makeId(values.name || `person-${Date.now()}`),
            category: normalizePeopleCategory(values.category),
            createdAt: person.createdAt || timestampNow(),
          }, "photo");
          return {
            ...current,
            people:
              index === null
                ? [nextItem, ...(current.people || [])]
                : (current.people || []).map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
          };
        }),
    });
  };

  const removePerson = (index) => {
    if (!window.confirm("确认删除这个 People 条目？")) return;
    commitDraft((current) => ({
      ...current,
      people: (current.people || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const openWorkEditor = (work = {}, index = null) => {
    setModal({
      title: index === null ? "增加 Works 条目" : "编辑 Works 条目",
      initial: {
        image: work.image || "",
        attachments: attachmentsFor(work, "image"),
        title: work.title || "",
        date: work.date || "",
        people: work.people || "",
        text: work.text || "",
        body: work.body || "",
      },
      fields: workFields,
      onSubmit: (values) =>
        commitDraft((current) => {
          const nextItem = withAttachmentCompatibility({
            ...work,
            ...values,
            id: work.id || makeId(values.title || `work-${Date.now()}`),
          }, "image");
          return {
            ...current,
            works:
              index === null
                ? [nextItem, ...(current.works || [])]
                : (current.works || []).map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
          };
        }),
    });
  };

  const removeWork = (index) => {
    if (!window.confirm("确认删除这个 Works 条目？")) return;
    commitDraft((current) => ({
      ...current,
      works: (current.works || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const moveWork = (entries, fromPosition, toPosition) => {
    commitDraft((current) => markManualSort({
      ...current,
      works: reorderItemsFromEntries(current.works || [], entries, fromPosition, toPosition),
    }, "works"));
  };

  const openBoardEditor = (sectionKey, item = {}, index = null) => {
    setModal({
      title: `${index === null ? "增加" : "编辑"} Board 条目`,
      initial: {
        image: item.image || "",
        attachments: attachmentsFor(item, "image"),
        title: item.title || "",
        date: item.date || "",
        people: item.people || "",
        intro: item.intro || "",
        body: item.body || "",
      },
      fields: boardFields,
      onSubmit: (values) =>
        commitDraft((current) => {
          const nextItem = withAttachmentCompatibility({
            ...item,
            ...values,
            id: item.id || makeId(values.title || `item-${Date.now()}`),
          }, "image");
          const list = current.board?.[sectionKey] || [];
          return {
            ...current,
            board: {
              ...current.board,
              [sectionKey]: index === null ? [nextItem, ...list] : list.map((entry, itemIndex) => (itemIndex === index ? nextItem : entry)),
            },
          };
        }),
    });
  };

  const removeBoardItem = (sectionKey, index) => {
    if (!window.confirm("确认删除这个 Board 条目？")) return;
    commitDraft((current) => ({
      ...current,
      board: {
        ...current.board,
        [sectionKey]: (current.board?.[sectionKey] || []).filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const indexedPeople = (draft.people || [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => hasAnyValue(item, PEOPLE_CONTENT_FIELDS));
  const indexedWorks = (draft.works || [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => hasAnyValue(item, WORK_CONTENT_FIELDS));
  const contactFields = [
    ["地址", site.contactAddress],
    ["邮箱", site.contactEmail],
    ["方向", site.contactDirections],
  ].filter(([, value]) => hasText(value));

  return (
    <ContentContext.Provider value={draft}>
      <main className="admin-preview-screen">
        <div className="admin-floating-toolbar">
          <div>
            <span className="admin-kicker">ACT IV CMS</span>
            <strong>可视化后台管理</strong>
          </div>
          <nav aria-label="后台页面导航">
            <a href="#admin-home">首页</a>
            <a href="#admin-about">关于</a>
            <a href="#admin-people">人员</a>
            <a href="#admin-works">作品</a>
            <a href="#admin-board-content">栏目</a>
            <a href="#admin-contact">联系</a>
          </nav>
          <div className="admin-actions">
            <button type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}保存上线</button>
            <button type="button" onClick={logout}><LogOut size={18} />退出</button>
          </div>
        </div>

        <Header />

        <section className="sub-page admin-page-section" id="admin-home">
          <div className="container cont-wrap">
            <div className="sub-title admin-editable">
              <AdminInlineControls onEdit={openHomeEditor} />
              <p>HOME</p>
              <h1>FUTURE VISUAL</h1>
            </div>
            <div className="home-admin-copy admin-editable reveal-section">
              <AdminInlineControls onEdit={openHomeEditor} />
              {(draft.homeIntro || []).filter(hasText).map((paragraph, index) => (
                <p className="reveal-item" key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="sub-page admin-page-section" id="admin-about">
          <div className="container cont-wrap">
            <div className="sub-title admin-editable">
              <AdminInlineControls onEdit={openAboutHeadingEditor} />
              <p>{about.label || "ACT IV LAB."}</p>
              <h1>{about.title || "About LAB"}</h1>
            </div>
            <div className="about-lab reveal-section">
              {(about.sections || []).map((section, index) => (
                <section className="cont-group reveal-item admin-editable" key={`${section.number}-${index}`}>
                  <AdminInlineControls onEdit={() => openAboutSectionEditor(section, index)} />
                  {hasText(section.number) ? <span className="number">{section.number}</span> : null}
                  {hasText(section.title) ? <h2>{section.title}</h2> : null}
                  {(section.paragraphs || []).filter(hasText).map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}
                </section>
              ))}
              <div className="object-band reveal-item admin-editable">
                <AdminInlineControls onEdit={openArchiveEditor} />
                <span data-index="ACT I"><b>凝视/秩序</b></span>
                <span data-index="ACT II"><b>流动/叙事</b></span>
                <span data-index="ACT III"><b>对话/共生</b></span>
                <span data-index="ACT IV"><b>破壁/融合</b></span>
              </div>
              {hasText(draft.archive?.at(-1)?.[1]) ? <p className="about-note reveal-item admin-editable"><AdminInlineControls onEdit={openArchiveEditor} />{draft.archive.at(-1)?.[1]}</p> : null}
            </div>
          </div>
        </section>

        <section className="sub-page admin-page-section" id="admin-people">
          <div className="container cont-wrap">
            <div className="sub-title">
              <p>PEOPLE</p>
              <h1>PEOPLE</h1>
            </div>
            <div className="admin-section-tools">
              <span className="professor-label">PEOPLE</span>
              <button type="button" onClick={() => openPersonEditor()}><Plus size={16} />增加</button>
            </div>
            <div className="people-grid-page">
              {indexedPeople.map(({ item, index }) => (
                <article className="people-card admin-editable" key={item.id || index}>
                  <AdminInlineControls onEdit={() => openPersonEditor(item, index)} onAdd={() => openPersonEditor()} onDelete={() => removePerson(index)} />
                  {hasMedia(item.photo) ? (
                    <figure>
                      <AttachmentPreview value={item.photo} />
                    </figure>
                  ) : null}
                  {hasText(item.name) ? <h2>{item.name}</h2> : null}
                  {hasText(item.interests) ? <h3>{item.interests}</h3> : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sub-page admin-page-section" id="admin-works">
          <div className="container cont-wrap">
            <div className="sub-title">
              <p>WORKS</p>
              <h1>WORKS</h1>
            </div>
            <div className="admin-section-tools">
              <span className="professor-label">WORKS</span>
              <button type="button" onClick={() => openWorkEditor()}><Plus size={16} />增加</button>
            </div>
            <div className="works-page reveal-section">
              {indexedWorks.map(({ item, index }, position) => (
                <article
                  className="work-row reveal-item admin-editable"
                  key={item.id || index}
                  {...sortableProps(true, position, (fromPosition, toPosition) => moveWork(indexedWorks, fromPosition, toPosition))}
                >
                  <AdminInlineControls
                    onEdit={() => openWorkEditor(item, index)}
                    onAdd={() => openWorkEditor()}
                    onDelete={() => removeWork(index)}
                    {...moveControlProps(true, position, indexedWorks.length, (fromPosition, toPosition) => moveWork(indexedWorks, fromPosition, toPosition))}
                  />
                  {hasMedia(item.image) ? (
                    <figure>
                      <AttachmentPreview value={item.image} />
                    </figure>
                  ) : null}
                  {hasText(item.date) || hasText(item.title) || hasText(item.text) ? (
                    <div>
                      {hasText(item.date) ? <span>{item.date}</span> : null}
                      {hasText(item.title) ? <h2>{item.title}</h2> : null}
                      {hasText(item.text) ? <p>{item.text}</p> : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sub-page admin-page-section" id="admin-board-content">
          <div className="container cont-wrap">
            <div className="sub-title">
              <p>BOARD</p>
              <h1>BOARD</h1>
            </div>
            {Object.entries(boardSections).map(([sectionKey, meta]) => {
              const listKey = meta.dataKey;
              const indexedItems = (draft.board?.[listKey] || [])
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => hasAnyValue(item, BOARD_CONTENT_FIELDS));
              return (
                <div className="board-page admin-board-preview" key={sectionKey}>
                  <div className="main-title">
                    <h2>{meta.title}</h2>
                    <button type="button" onClick={() => openBoardEditor(listKey)}><Plus size={16} />增加</button>
                  </div>
                  <div className="board-head reveal-item">
                    <span>DATE</span>
                    <span>TITLE</span>
                  </div>
                  {indexedItems.map(({ item, index }) => (
                    <article className="board-row reveal-item admin-editable" key={item.id || index}>
                      <AdminInlineControls onEdit={() => openBoardEditor(listKey, item, index)} onAdd={() => openBoardEditor(listKey)} onDelete={() => removeBoardItem(listKey, index)} />
                      {hasText(item.date) ? <span>{item.date}</span> : null}
                      {hasText(item.title) ? <strong>{item.title}</strong> : null}
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <section className="sub-page admin-page-section" id="admin-contact">
          <div className="container cont-wrap">
            <div className="sub-title admin-editable">
              <AdminInlineControls onEdit={openSiteEditor} />
              <p>CONTACT</p>
              <h1>CONTACT</h1>
            </div>
            <div className="contact-container reveal-section admin-editable">
              <AdminInlineControls onEdit={openSiteEditor} />
              {contactFields.map(([label, value]) => (
                <div className="item reveal-item" key={label}>
                  <span className="label">{label}</span>
                  <p className="address">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {message ? <p className="admin-message sticky-message">{message}</p> : null}
        {modal ? <AdminEditModal modal={modal} onClose={() => setModal(null)} uploadImage={uploadImage} /> : null}
      </main>
    </ContentContext.Provider>
  );
}

function AdminInlineControls({ onEdit, onAdd, onDelete, onMoveUp, onMoveDown, addDisabledMessage, deleteDisabledMessage }) {
  const { showMessage } = useAdminSession();
  const handleClick = (event, action, disabledMessage) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabledMessage) {
      showMessage(disabledMessage);
      return;
    }
    action?.();
  };

  return (
    <div className="admin-inline-controls" aria-label="内容管理按钮">
      {onEdit ? <button type="button" title="编辑" onClick={(event) => handleClick(event, onEdit)}><Pencil size={13} />编辑</button> : null}
      {onAdd || addDisabledMessage ? (
        <button
          type="button"
          title={addDisabledMessage || "增加"}
          aria-disabled={addDisabledMessage ? "true" : undefined}
          className={addDisabledMessage ? "is-disabled" : ""}
          onClick={(event) => handleClick(event, onAdd, addDisabledMessage)}
        >
          <Plus size={13} />增加
        </button>
      ) : null}
      {onMoveUp ? (
        <button type="button" title="上移" onClick={(event) => handleClick(event, onMoveUp)}>
          <ArrowUp size={13} />上移
        </button>
      ) : null}
      {onMoveDown ? (
        <button type="button" title="下移" onClick={(event) => handleClick(event, onMoveDown)}>
          <ArrowDown size={13} />下移
        </button>
      ) : null}
      {onDelete || deleteDisabledMessage ? (
        <button
          type="button"
          title={deleteDisabledMessage || "删除"}
          aria-disabled={deleteDisabledMessage ? "true" : undefined}
          className={deleteDisabledMessage ? "is-disabled" : ""}
          onClick={(event) => handleClick(event, onDelete, deleteDisabledMessage)}
        >
          <X size={13} />删除
        </button>
      ) : null}
    </div>
  );
}

function MediaLayoutEditor({ attachments = [], value, onChange }) {
  const stageRef = useRef(null);
  const interactionRef = useRef(null);
  const visualItems = normalizeAttachmentList(attachments).filter(isVisualAttachment);
  const layout = normalizeMediaLayout(value, visualItems);
  if (!visualItems.length) return null;
  const workingLayout = layout || normalizeMediaLayout({ items: [] }, visualItems);
  const attachmentMap = new Map(visualItems.map((attachment) => [attachment.url, attachment]));

  const commit = (items) => {
    onChange({
      canvasRatio: workingLayout.canvasRatio,
      items,
    });
  };

  const handlePointerDown = (event, item, mode = "move") => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointerCapture?.(event.pointerId);
    const rect = stage.getBoundingClientRect();
    const maxZ = Math.max(...workingLayout.items.map((entry) => entry.z), 0) + 1;
    const nextItems = workingLayout.items.map((entry) => (entry.url === item.url ? { ...entry, z: maxZ } : entry));
    commit(nextItems);
    interactionRef.current = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      item: { ...item, z: maxZ },
      items: nextItems,
    };
  };

  const handlePointerMove = (event) => {
    const state = interactionRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const deltaX = state.rect.width ? (event.clientX - state.startX) / state.rect.width : 0;
    const deltaY = state.rect.height ? (event.clientY - state.startY) / state.rect.height : 0;
    const nextItems = state.items.map((entry) => {
      if (entry.url !== state.item.url) return entry;
      if (state.mode === "resize") {
        const nextWidth = clamp(state.item.w + deltaX, 0.12, 1 - state.item.x);
        const nextHeight = clamp(state.item.h + deltaY, 0.12, 1 - state.item.y);
        return { ...entry, w: nextWidth, h: nextHeight };
      }
      return {
        ...entry,
        x: clamp(state.item.x + deltaX, 0, 1 - state.item.w),
        y: clamp(state.item.y + deltaY, 0, 1 - state.item.h),
      };
    });
    commit(nextItems);
  };

  const stopInteraction = (event) => {
    stageRef.current?.releasePointerCapture?.(event.pointerId);
    interactionRef.current = null;
  };

  return (
    <section className="admin-media-layout-editor">
      <header className="admin-section-head">
        <h2>附件摆位</h2>
        <button type="button" onClick={() => onChange(null)}>重置布局</button>
      </header>
      <div
        className="admin-media-layout-canvas"
        ref={stageRef}
        style={{ aspectRatio: workingLayout.canvasRatio }}
        onPointerMove={handlePointerMove}
        onPointerUp={stopInteraction}
        onPointerCancel={stopInteraction}
      >
        {workingLayout.items
          .slice()
          .sort((left, right) => left.z - right.z)
          .map((item) => {
            const attachment = attachmentMap.get(item.url);
            if (!attachment) return null;
            return (
              <div
                className="admin-media-layout-item"
                key={item.url}
                style={{
                  left: `${item.x * 100}%`,
                  top: `${item.y * 100}%`,
                  width: `${item.w * 100}%`,
                  height: `${item.h * 100}%`,
                  zIndex: item.z,
                }}
                onPointerDown={(event) => handlePointerDown(event, item)}
              >
                <AttachmentPreview value={attachment} interactive={false} showName={false} />
                <button
                  type="button"
                  className="admin-media-layout-resize"
                  aria-label="调整大小"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    handlePointerDown(event, item, "resize");
                  }}
                />
              </div>
            );
          })}
      </div>
    </section>
  );
}

function ThumbnailCropEditor({ attachment, onChange }) {
  const normalized = normalizeAttachment(attachment);
  const stageRef = useRef(null);
  const dragStateRef = useRef(null);
  const pointersRef = useRef(new Map());
  const crop = normalized?.crop || DEFAULT_IMAGE_CROP;

  const commitCrop = (nextCrop) => {
    onChange({
      ...normalized,
      crop: normalizeStoredCrop(nextCrop) || DEFAULT_IMAGE_CROP,
    });
  };

  const resetCrop = () => {
    const { crop: _crop, ...rest } = normalized;
    onChange(rest);
  };

  const handlePointerDown = (event) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 2) {
      dragStateRef.current = {
        mode: "pinch",
        distance: Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y),
        crop,
      };
      return;
    }
    dragStateRef.current = { mode: "drag", x: event.clientX, y: event.clientY, crop };
  };

  const handlePointerMove = (event) => {
    const stage = stageRef.current;
    const dragState = dragStateRef.current;
    if (!stage || !dragState) return;
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    const pointers = [...pointersRef.current.values()];
    if (dragState.mode === "pinch" && pointers.length === 2) {
      const distance = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
      if (!dragState.distance) return;
      const zoomMultiplier = event.shiftKey ? 1 : CROP_DRAG_FAST_MULTIPLIER;
      commitCrop({
        ...dragState.crop,
        zoom: clamp(dragState.crop.zoom * ((distance / dragState.distance) ** zoomMultiplier), 1, 2.5),
      });
      return;
    }
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const deltaX = (event.clientX - dragState.x) / rect.width;
    const deltaY = (event.clientY - dragState.y) / rect.height;
    const dragMultiplier = event.shiftKey ? CROP_DRAG_FINE_MULTIPLIER : CROP_DRAG_FAST_MULTIPLIER;
    commitCrop({
      ...dragState.crop,
      x: clamp(dragState.crop.x - ((deltaX * dragMultiplier) / dragState.crop.zoom), 0, 1),
      y: clamp(dragState.crop.y - ((deltaY * dragMultiplier) / dragState.crop.zoom), 0, 1),
    });
  };

  const stopDragging = (event) => {
    stageRef.current?.releasePointerCapture?.(event.pointerId);
    pointersRef.current.delete(event.pointerId);
    const [remainingPointer] = [...pointersRef.current.values()];
    dragStateRef.current = remainingPointer
      ? { mode: "drag", x: remainingPointer.x, y: remainingPointer.y, crop }
      : null;
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !normalized || !isImageAttachment(normalized)) return undefined;
    const handleWheel = (event) => {
      event.preventDefault();
      const zoomStep = event.shiftKey ? CROP_ZOOM_FINE_STEP : CROP_ZOOM_FAST_STEP;
      commitCrop({
        ...crop,
        zoom: clamp(crop.zoom + (event.deltaY > 0 ? -zoomStep : zoomStep), 1, 2.5),
      });
    };
    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [crop, normalized]);

  if (!normalized || !isImageAttachment(normalized)) return null;

  return (
    <div className="admin-crop-editor">
      <div
        className="admin-crop-stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <img src={normalized.url} alt="" draggable="false" style={imageCropStyle(normalized)} />
        <span aria-hidden="true" />
      </div>
      <div className="admin-crop-controls">
        <div className="admin-crop-preview">
          <img src={normalized.url} alt="" style={imageCropStyle(normalized)} />
        </div>
        <button type="button" className="admin-muted-button" onClick={resetCrop}>重置</button>
      </div>
    </div>
  );
}

function AttachmentEditor({ label, value, multiple = true, onChange, uploadImage }) {
  const attachments = normalizeAttachmentList(value);
  const update = (nextItems) => onChange(multiple ? normalizeAttachmentList(nextItems) : normalizeAttachmentList(nextItems)[0] || "");
  const addUploaded = (uploaded) => update(normalizeAttachmentList(attachments, uploaded));
  const removeAt = (index) => update(attachments.filter((_, itemIndex) => itemIndex !== index));
  const move = (fromIndex, toIndex) => {
    if (!multiple) return;
    update(moveArrayItem(attachments, fromIndex, toIndex));
  };
  const attachmentRole = (attachment) => {
    if (isVideoAttachment(attachment)) return ["视频", "附件"];
    if (isImageAttachment(attachment)) return ["图片", "附件"];
    return ["附件"];
  };

  return (
    <div className="admin-image-editor">
      <span className="admin-field-title">{label}</span>
      {attachments.length ? (
        <div className="admin-attachment-list">
          {attachments.map((attachment, index) => (
            <div
              className="admin-attachment-item"
              draggable={multiple}
              key={attachment.url}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                move(Number(event.dataTransfer.getData("text/plain")), index);
              }}
            >
              <span className="admin-drag-handle" title="拖拽排序"><Menu size={16} /></span>
              <div className="admin-attachment-main">
                <div className="admin-attachment-badges">
                  {attachmentRole(attachment).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="admin-attachment-previews">
                  <figure>
                    <figcaption>原始附件</figcaption>
                    <AttachmentPreview value={attachment} cropped={false} />
                  </figure>
                </div>
              </div>
              <button type="button" className="admin-muted-button" onClick={() => removeAt(index)}>删除附件</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-empty-image">未上传附件</div>
      )}
      <div className="admin-row-actions">
        <UploadBox multiple={multiple} onUpload={(files) => uploadImage(addUploaded, files)} />
      </div>
    </div>
  );
}

function AdminEditModal({ modal, onClose, uploadImage }) {
  const [formData, setFormData] = useState(modal.initial || {});
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setFormData(modal.initial || {});
  }, [modal]);

  const updateField = (name, value) => setFormData((current) => ({ ...current, [name]: value }));
  const submit = (event) => {
    event.preventDefault();
    modal.onSubmit(formData);
    onClose();
  };

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={modal.title} onMouseDown={onClose}>
      {isMinimized ? (
        <ModalMinibar label={modal.title || "编辑弹窗"} onRestore={() => setIsMinimized(false)} onClose={onClose} />
      ) : (
      <form className={`admin-modal-panel ${isMaximized ? "is-maximized" : ""}`} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header className="admin-modal-head">
          <strong>{modal.title}</strong>
          <ModalWindowControls
            isMaximized={isMaximized}
            onMinimize={() => setIsMinimized(true)}
            onToggleMaximize={() => setIsMaximized((value) => !value)}
            onClose={onClose}
            closeLabel="关闭编辑器"
          />
        </header>
        <div className="admin-modal-body">
          {modal.fields.map((field) => (
            field.type === "image" || field.type === "attachments" ? (
              <AttachmentEditor
                key={`${field.name}-${field.legacyField || ""}`}
                label={field.label}
                multiple={field.multiple !== false}
                value={field.legacyField ? normalizeAttachmentList(formData[field.name], formData[field.legacyField]) : formData[field.name]}
                uploadImage={uploadImage}
                onChange={(nextValue) => {
                  const nextAttachments = normalizeAttachmentList(nextValue);
                  if (field.legacyField) {
                    updateField(field.name, nextAttachments);
                    updateField(field.legacyField, nextAttachments[0] || "");
                  } else {
                    updateField(field.name, field.multiple === false ? nextAttachments[0] || "" : nextAttachments);
                  }
                }}
              />
            ) : field.type === "select" ? (
              <SelectInput
                key={field.name}
                label={field.label}
                value={formData[field.name]}
                options={field.options || []}
                onChange={(value) => updateField(field.name, value)}
              />
            ) : (
              <TextInput
                key={field.name}
                label={field.label}
                value={formData[field.name]}
                multiline={field.type === "textarea"}
                rows={field.rows || 4}
                onChange={(value) => updateField(field.name, value)}
              />
            )
          ))}
        </div>
        <footer className="admin-modal-actions">
          <button type="button" className="admin-muted-button" onClick={onClose}>取消</button>
          <button type="submit"><Save size={16} />保存上线</button>
        </footer>
      </form>
      )}
    </div>
  );
}

function BoardEditor({ draft, addBoardItem, removeBoardItem, updateBoardItem, uploadImage }) {
  return (
    <section className="admin-panel" id="admin-board-content">
      <h2>栏目内容 / 新闻 / 项目 / 出版</h2>
      {Object.entries(boardSections).map(([section, meta]) => {
        const key = meta.dataKey;
        return (
          <div className="admin-section-block" key={section}>
            <div className="admin-section-head">
              <h3>{meta.title}</h3>
              <button type="button" onClick={() => addBoardItem(key)}><Plus size={16} />新增</button>
            </div>
            <div className="admin-work-list">
              {(draft.board?.[key] || []).map((item, index) => (
                <article className="admin-work-card" key={item.id || index}>
                  <figure>{hasMedia(item.image) ? <AttachmentPreview value={item.image} /> : null}</figure>
                  <div className="admin-work-form">
                    <TextInput label="标题" value={item.title} onChange={(value) => updateBoardItem(key, index, "title", value)} />
                    <TextInput label="时间" value={item.date} onChange={(value) => updateBoardItem(key, index, "date", value)} />
                    <TextInput label="人员 / 作者" value={item.people} onChange={(value) => updateBoardItem(key, index, "people", value)} />
                    <TextInput label="介绍" value={item.intro} multiline onChange={(value) => updateBoardItem(key, index, "intro", value)} />
                    <TextInput label="正文" value={item.body} multiline onChange={(value) => updateBoardItem(key, index, "body", value)} />
                    <TextInput label="附件地址" value={attachmentUrl(item.image)} onChange={(value) => updateBoardItem(key, index, "image", value)} />
                    <div className="admin-row-actions">
                      <UploadBox onUpload={(file) => uploadImage((url) => updateBoardItem(key, index, "image", url), file)} />
                      <button type="button" className="admin-danger" onClick={() => removeBoardItem(key, index)}><Trash2 size={16} />删除</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function PeopleEditor({ draft, updatePerson, removePerson, addPerson, uploadImage }) {
  return (
    <section className="admin-panel" id="admin-people">
      <div className="admin-section-head">
        <h2>人员</h2>
        <button type="button" onClick={addPerson}><Plus size={16} />新增</button>
      </div>
      <div className="admin-work-list">
        {draft.people.map((person, index) => (
          <article className="admin-work-card" key={person.id || index}>
            <figure>{hasMedia(person.photo) ? <AttachmentPreview value={person.photo} /> : null}</figure>
            <div className="admin-work-form">
              <TextInput label="姓名" value={person.name} onChange={(value) => updatePerson(index, "name", value)} />
              <TextInput label="邮箱" value={person.email} onChange={(value) => updatePerson(index, "email", value)} />
              <TextInput label="兴趣方向" value={person.interests} multiline onChange={(value) => updatePerson(index, "interests", value)} />
              <TextInput label="经历" value={person.history} multiline onChange={(value) => updatePerson(index, "history", value)} />
              <TextInput label="经验" value={person.experience} multiline onChange={(value) => updatePerson(index, "experience", value)} />
              <TextInput label="附件地址" value={attachmentUrl(person.photo)} onChange={(value) => updatePerson(index, "photo", value)} />
              <div className="admin-row-actions">
                <UploadBox onUpload={(file) => uploadImage((url) => updatePerson(index, "photo", url), file)} />
                <button type="button" className="admin-danger" onClick={() => removePerson(index)}><Trash2 size={16} />删除</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorksEditor({ draft, updateWork, removeWork, addWork, uploadImage }) {
  return (
    <section className="admin-panel" id="admin-works">
      <div className="admin-section-head">
        <h2>作品</h2>
        <button type="button" onClick={addWork}><Plus size={16} />新增</button>
      </div>
      <div className="admin-work-list">
        {draft.works.map((work, index) => (
          <article className="admin-work-card" key={work.id || index}>
            <figure>{hasMedia(work.image) ? <AttachmentPreview value={work.image} /> : null}</figure>
            <div className="admin-work-form">
              <TextInput label="标题" value={work.title} onChange={(value) => updateWork(index, "title", value)} />
              <TextInput label="时间" value={work.date} onChange={(value) => updateWork(index, "date", value)} />
              <TextInput label="人员" value={work.people} onChange={(value) => updateWork(index, "people", value)} />
              <TextInput label="介绍" value={work.text} multiline onChange={(value) => updateWork(index, "text", value)} />
              <TextInput label="正文" value={work.body} multiline onChange={(value) => updateWork(index, "body", value)} />
              <TextInput label="附件地址" value={attachmentUrl(work.image)} onChange={(value) => updateWork(index, "image", value)} />
              <div className="admin-row-actions">
                <UploadBox onUpload={(file) => uploadImage((url) => updateWork(index, "image", url), file)} />
                <button type="button" className="admin-danger" onClick={() => removeWork(index)}><Trash2 size={16} />删除</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CurrentPage({ pathOverride = null }) {
  const path = normalizePath(pathOverride || stripAdminPath());
  const parts = pathPartsFrom(path);
  if (path === "/") return <HomePage />;
  if (path === "/about-lab") return <AboutPage />;
  if (path === "/people") return <PeoplePage />;
  if (parts[0] === "people" && parts[1]) return <PeopleDetailPage id={parts[1]} />;
  if (path === "/works") return <WorksPage />;
  if (parts[0] === "works" && parts[1]) return <WorksDetailPage id={parts[1]} />;
  if (path === "/board") return <BoardPage />;
  if (parts[0] === "board" && parts[1] && !parts[2]) return <BoardListPage section={parts[1]} />;
  if (parts[0] === "board" && parts[1] && parts[2]) return <BoardDetailPage section={parts[1]} id={parts[2]} />;
  if (path === "/contact") return <ContactPage />;
  return <NotFoundPage />;
}

function AppContentProvider({ children }) {
  const [content, setContent] = useState(defaultContent);
  const [status, setStatus] = useState({ loading: true, loaded: false, error: null });
  const contentSignatureRef = useRef(JSON.stringify(defaultContent));
  const setContentFromCms = useCallback((nextContent) => {
    const mergedContent = { ...defaultContent, ...nextContent };
    const signature = JSON.stringify(mergedContent);
    if (contentSignatureRef.current !== signature) {
      contentSignatureRef.current = signature;
      setContent(mergedContent);
    }
    setStatus({ loading: false, loaded: true, error: null });
  }, []);
  const refreshContent = useCallback(async () => {
    setStatus((current) => ({ loading: !current.loaded, loaded: current.loaded, error: null }));
    const params = new URLSearchParams({ t: String(Date.now()), pagePath: currentPagePath() });
    const response = await fetch(`/api/content?${params.toString()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        "X-Act4-Page-Path": currentPagePath(),
      },
    });
    if (!response.ok) throw new Error("No dynamic content");
    const data = await response.json();
    setContentFromCms(data);
    return data;
  }, [setContentFromCms]);

  useEffect(() => {
    let active = true;
    const load = () => {
      refreshContent()
        .catch((error) => {
          if (!active) return;
          setContent(defaultContent);
          setStatus({ loading: false, loaded: true, error });
        });
    };
    load();
    const onFocus = () => load();
    const onUpdated = () => load();
    const onStorage = (event) => event.key === CONTENT_UPDATED_EVENT && load();
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CONTENT_UPDATED_EVENT) : null;
    if (channel) channel.onmessage = onUpdated;
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);
    window.addEventListener(CONTENT_UPDATED_EVENT, onUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
      window.removeEventListener(CONTENT_UPDATED_EVENT, onUpdated);
      window.removeEventListener("storage", onStorage);
      if (channel) channel.close();
    };
  }, [refreshContent, setContentFromCms]);

  const actions = useMemo(() => ({ refreshContent, setContentFromCms }), [refreshContent, setContentFromCms]);
  return (
    <ContentActionsContext.Provider value={actions}>
      <ContentStatusContext.Provider value={status}>
        <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
      </ContentStatusContext.Provider>
    </ContentActionsContext.Provider>
  );
}

function getAdminCrumbs(path, content) {
  const parts = pathPartsFrom(path);
  const staticLabels = {
    "about-lab": "关于",
    people: "人员",
    works: "作品",
    board: "栏目",
    contact: "联系",
    news: "新闻",
    project: "项目",
    publications: "出版",
    dissertation: "出版",
    research: "出版",
  };
  const crumbs = [{ label: "后台", href: "/admin" }];
  if (!parts.length) return [...crumbs, { label: "首页", href: "/admin" }];

  let current = "";
  parts.forEach((part, index) => {
    current = `${current}/${part}`;
    let label = staticLabels[part] || part;
    if (parts[0] === "people" && index === 1) {
      label = findById(content.people || [], part, "name")?.name || label;
    }
    if (parts[0] === "works" && index === 1) {
      label = findById(content.works || [], part)?.title || label;
    }
    if (parts[0] === "board" && index === 2) {
      label = findById(getBoardItems(content, parts[1]), part)?.title || label;
    }
    crumbs.push({ label, href: adminPathFor(current) });
  });
  return crumbs;
}

function AdminBreadcrumb({ path }) {
  const content = useSiteContent();
  const crumbs = getAdminCrumbs(path, content);
  return (
    <nav className="admin-breadcrumb" aria-label="后台当前位置">
      <div className="container">
        {crumbs.map((crumb, index) => (
          <a href={crumb.href} aria-current={index === crumbs.length - 1 ? "page" : undefined} key={`${crumb.href}-${index}`}>
            {crumb.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function AdminRouteFrame() {
  const { authChecked, authenticated } = useAdminSession();
  const content = useSiteContent();
  const frontPath = stripAdminPath();

  if (!authChecked) return <main className="admin-screen"><Loader2 className="spin" /></main>;
  if (!authenticated) return <AdminPage />;

  return (
    <>
      <Header />
      <AdminBreadcrumb path={frontPath} />
      <CurrentPage pathOverride={frontPath} />
      <footer className="footer">
        <div className="container">
          <p>COPYRIGHT © 2026 ACT IV FUTURE VISUAL LAB</p>
          <p>{FOOTER_TAGLINE}</p>
          <a href="/admin"><ArrowUp size={18} />top</a>
        </div>
      </footer>
    </>
  );
}

function SiteFrame() {
  const path = rawCurrentPath();
  const content = useSiteContent();
  const contentStatus = useContentStatus();
  if (!contentStatus.loaded && contentStatus.loading) return <AppBootShell />;
  if (isAdminRoute(path)) return <AdminRouteFrame />;
  return (
    <>
      <Header />
      <CurrentPage />
      <footer className="footer">
        <div className="container">
          <p>COPYRIGHT © 2026 ACT IV FUTURE VISUAL LAB</p>
          <p>{FOOTER_TAGLINE}</p>
          <a href="/"><ArrowUp size={18} />top</a>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <AppContentProvider>
      <AdminSessionProvider>
        <SiteFrame />
      </AdminSessionProvider>
    </AppContentProvider>
  );
}
