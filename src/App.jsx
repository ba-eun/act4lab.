import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Eye, FileText, Film, Loader2, LogOut, Menu, Music, Paperclip, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import defaultContent from "./content.js";

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

function normalizeBoardSection(section) {
  if (section === "research" || section === "dissertation") return "publications";
  return section;
}

const ContentContext = createContext(defaultContent);
const ContentActionsContext = createContext({ setContentFromCms: () => {}, refreshContent: async () => {} });
const AdminContext = createContext({
  authenticated: false,
  authChecked: false,
  editMode: false,
  saving: false,
  message: "",
  setAuthenticated: () => {},
  setEditMode: () => {},
  openModal: () => {},
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
  return normalized === "/" ? "/admin" : `/admin${normalized}`;
}

function siteHref(path = "/") {
  if (!path || path.startsWith("#") || /^https?:\/\//i.test(path)) return path;
  return isAdminRoute() ? adminPathFor(path) : path;
}

function pathPartsFrom(path) {
  return normalizePath(path).split("/").filter(Boolean);
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
  return items.find((item) => item.id === id || makeId(item[labelKey]) === id);
}

function findIndexById(items, id, labelKey = "title") {
  return items.findIndex((item) => item.id === id || makeId(item[labelKey]) === id);
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

const ATTACHMENT_FIELDS = new Set(["image", "photo", "logo", "attachments"]);

function attachmentUrl(value) {
  if (!value) return "";
  if (Array.isArray(value)) return attachmentUrl(value.find((item) => hasText(attachmentUrl(item))));
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") return String(value.url || value.src || value.href || "").trim();
  return "";
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
  return {
    url,
    name: metadata.name || metadata.originalName || fileNameFromUrl(url),
    size: Number(metadata.size || 0),
    type: metadata.type || metadata.mime || metadata.contentType || inferMimeType(url),
    createdAt: metadata.createdAt || "",
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

function attachmentsFor(item = {}, legacyField = "image") {
  return normalizeAttachmentList(item.attachments, item[legacyField]);
}

function primaryAttachmentFor(item = {}, legacyField = "image") {
  return attachmentsFor(item, legacyField)[0] || null;
}

function withAttachmentCompatibility(values = {}, legacyField = "image") {
  const attachments = normalizeAttachmentList(values.attachments, values[legacyField]);
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

function isPlaceholderMedia(value) {
  const source = attachmentUrl(value);
  if (!source) return false;
  return /(^|\/)work-\d+\.svg(?:[?#].*)?$/i.test(source);
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

const PEOPLE_CONTENT_FIELDS = ["attachments", "photo", "name", "email", "interests", "history", "experience"];
const WORK_CONTENT_FIELDS = ["attachments", "image", "title", "date", "text", "people", "body"];
const BOARD_LIST_FIELDS = ["title", "date"];
const BOARD_TEXT_FIELDS = ["title", "date", "intro", "people", "body"];
const BOARD_CONTENT_FIELDS = ["attachments", "image", ...BOARD_TEXT_FIELDS];
const ABOUT_SECTION_FIELDS = ["number", "title", "paragraphs"];

function hasAnyValue(item, keys) {
  return keys.some((key) => hasContentValue(item, key));
}

function isEmptyContentItem(item, keys) {
  return !hasAnyValue(item, keys);
}

function indexedRenderableItems(items = [], keys, includeEmpty = false) {
  return (items || [])
    .map((item, index) => ({ item, index, isEmpty: isEmptyContentItem(item, keys) }))
    .filter(({ isEmpty }) => includeEmpty || !isEmpty);
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

function EmptyMediaPlaceholder({ label = "点击上传附件" }) {
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

function isImageAttachment(attachment) {
  return attachment.type?.startsWith("image/") || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(attachment.url);
}

function isVideoAttachment(attachment) {
  return attachment.type?.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(attachment.url);
}

function isAudioAttachment(attachment) {
  return attachment.type?.startsWith("audio/") || /\.(mp3|ogg|wav)$/i.test(attachment.url);
}

function isPreviewableAttachment(attachment) {
  return isImageAttachment(attachment) || isVideoAttachment(attachment) || isAudioAttachment(attachment) || attachment.type === "application/pdf" || /\.pdf$/i.test(attachment.url);
}

function AttachmentIcon({ attachment, size = 28 }) {
  if (isVideoAttachment(attachment)) return <Film size={size} />;
  if (isAudioAttachment(attachment)) return <Music size={size} />;
  return <FileText size={size} />;
}

function AttachmentPreview({ value, className = "", interactive = true, showName = true }) {
  const attachment = normalizeAttachment(value);
  if (!attachment || !hasMedia(attachment)) return null;
  const previewable = isPreviewableAttachment(attachment);
  const openProps = previewable
    ? { target: "_blank", rel: "noreferrer" }
    : { download: attachment.name };

  if (isImageAttachment(attachment)) {
    if (!interactive) {
      return (
        <span className={`attachment-preview attachment-image ${className}`.trim()}>
          <img src={attachment.url} alt={attachment.name} />
        </span>
      );
    }
    return (
      <a className={`attachment-preview attachment-image ${className}`.trim()} href={attachment.url} {...openProps}>
        <img src={attachment.url} alt={attachment.name} />
      </a>
    );
  }

  if (isVideoAttachment(attachment)) {
    if (!interactive) {
      return (
        <div className={`attachment-preview attachment-video ${className}`.trim()}>
          <video src={attachment.url} preload="metadata" muted playsInline />
          {showName ? <span>{attachment.name}</span> : null}
        </div>
      );
    }
    return (
      <div className={`attachment-preview attachment-video ${className}`.trim()}>
        <video src={attachment.url} controls preload="metadata" />
        {showName ? <a href={attachment.url} {...openProps}>{attachment.name}</a> : null}
      </div>
    );
  }

  if (isAudioAttachment(attachment)) {
    if (!interactive) {
      return (
        <div className={`attachment-preview attachment-audio ${className}`.trim()}>
          <Music size={24} />
          {showName ? <span>{attachment.name}</span> : null}
        </div>
      );
    }
    return (
      <div className={`attachment-preview attachment-audio ${className}`.trim()}>
        <Music size={24} />
        <audio src={attachment.url} controls preload="metadata" />
        {showName ? <a href={attachment.url} {...openProps}>{attachment.name}</a> : null}
      </div>
    );
  }

  if (!interactive) {
    return (
      <span className={`attachment-preview attachment-file ${className}`.trim()}>
        <AttachmentIcon attachment={attachment} />
        {showName ? <span>{attachment.name}</span> : null}
        {showName ? <small>{[formatFileSize(attachment.size), attachment.type || "file"].filter(Boolean).join(" / ")}</small> : null}
      </span>
    );
  }

  return (
    <a className={`attachment-preview attachment-file ${className}`.trim()} href={attachment.url} {...openProps}>
      <AttachmentIcon attachment={attachment} />
      {showName ? <span>{attachment.name}</span> : <span className="sr-only">Open attachment</span>}
      {showName ? <small>{[formatFileSize(attachment.size), attachment.type || "file"].filter(Boolean).join(" / ")}</small> : null}
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

    let active = true;
    let t = 0;
    const animate = () => {
      if (!active) return;
      t += 0.008;
      group.rotation.x = Math.sin(t * 0.7) * 0.16;
      group.rotation.y += 0.006;
      core.rotation.z -= 0.01;
      shell.rotation.y -= 0.003;
      points.rotation.y += 0.0018;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      active = false;
      window.removeEventListener("resize", resize);
      host.removeChild(renderer.domElement);
      renderer.dispose();
      pointGeometry.dispose();
      coreMaterial.dispose();
      shellMaterial.dispose();
    };
  }, []);

  return <div className="visual-canvas" ref={hostRef} aria-hidden="true" />;
}

function Header() {
  const [open, setOpen] = useState(false);
  const content = useSiteContent();
  const adminRoute = isAdminRoute();
  const path = stripAdminPath();
  const topLine = content.site.topLine.replace(/^ACT IV\s*/i, "");
  const logoAttachment = normalizeAttachment(content.site.logo);
  const logoSrc = logoAttachment && hasMedia(logoAttachment) && isImageAttachment(logoAttachment) ? logoAttachment.url : "/logo2.png";

  return (
    <header className="header">
      <div className="head-top">
        <span>ACT IV</span> {topLine}
      </div>
      <div className="container head-wrap">
        <a href={adminRoute ? "/admin" : "/"} className="logo" aria-label="ACT IV home">
          <img src={logoSrc} alt="ACT IV Future Visual Lab" />
        </a>
        <nav className="nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a className={path === item.path || path.startsWith(`${item.path}/`) ? "active" : ""} key={item.label} href={adminRoute ? adminPathFor(item.path) : item.path}>
              {item.label}
            </a>
          ))}
        </nav>
        <button className="menu-btn" aria-label="Menu" type="button" onClick={() => setOpen(true)}>
          <Menu size={34} />
        </button>
        <button className="sitemap-btn" aria-label="Sitemap" type="button" onClick={() => setOpen(true)}>
          <i />
          <i />
        </button>
      </div>
      {open ? (
        <div className="mobile-panel">
          <button className="mobile-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X size={28} />
          </button>
          {navItems.map((item, index) => (
            <div className="mobile-panel-item" key={item.label}>
              <a className="mobile-panel-main" href={adminRoute ? adminPathFor(item.path) : item.path}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </a>
              {item.children ? (
                <div className="mobile-panel-sub">
                  {item.children.map((child) => (
                    <a key={child.label} href={adminRoute ? adminPathFor(child.path) : child.path}>
                      {child.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function MainTitle({ children, href = "#" }) {
  return (
    <div className="main-title">
      <h2>{children}</h2>
      <a href={siteHref(href)} aria-label={`${children} more`}>
        <ArrowRight size={28} />
      </a>
    </div>
  );
}

function useReveal() {
  const content = useSiteContent();
  useEffect(() => {
    const context = gsap.context(() => {
      const sections = gsap.utils.toArray(".reveal-section");
      sections.forEach((section) => {
        const items = section.querySelectorAll(".reveal-item");
        if (!items.length) return;
        gsap.from(items, {
          autoAlpha: 0,
          y: 50,
          duration: 0.72,
          ease: "power3.out",
          stagger: 0.16,
          immediateRender: false,
          scrollTrigger: { trigger: section, start: "top 78%", once: true },
        });
      });
      ScrollTrigger.refresh();
    });
    return () => context.revert();
  }, [content]);
}

function PageShell({ title, children }) {
  useReveal();
  return (
    <main id="site-content" className="sub-page" role="main">
      <div className="container cont-wrap">
        <h1 className="sub-title">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function HomePage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const news = indexedRenderableItems(getBoardItems(content, "news"), BOARD_LIST_FIELDS, editor.isEditing);
  const works = indexedRenderableItems(content.works || [], WORK_CONTENT_FIELDS, editor.isEditing);
  const projects = indexedRenderableItems(getBoardItems(content, "project"), BOARD_LIST_FIELDS, editor.isEditing);
  const publications = indexedRenderableItems(getBoardItems(content, "publications"), BOARD_LIST_FIELDS, editor.isEditing);
  useReveal();
  return (
    <main id="top" className="main">
      <h1 className="sub-title main-title-hidden">main</h1>
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
            <p>BREAKING BOUNDARIES</p>
          </div>
        </div>
        <figure className="visual-frame">
          <WebGLVisual />
          <div className="visual-wordmark">
            <span>ACT IV</span>
            <b>Future Visual Lab.</b>
          </div>
        </figure>
      </section>

      <AdminEditable
        className="lab-intro container reveal-section"
        onEdit={editor.openHomeEditor}
        onAdd={editor.addSingle}
        onDelete={editor.clearHomeIntro}
        addDisabledMessage={editor.singleItemMessage}
      >
        {content.homeIntro.filter(hasText).length ? (
          content.homeIntro.filter(hasText).map((paragraph) => (
            <p className="reveal-item" key={paragraph}>
              {paragraph}
            </p>
          ))
        ) : editor.isEditing ? <EmptyEntryPlaceholder label="首页简介为空" /> : null}
      </AdminEditable>

      <div className="mb-latest container">
        <section className="news reveal-section">
          <MainTitle href="/board/news">News</MainTitle>
          <ul className="news-list">
            {news.map(({ item, index, isEmpty }) => (
              <AdminEditable
                as="li"
                className="reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `news-${index}`}
                onEdit={() => editor.openBoardEditor("news", item, index)}
                onAdd={() => editor.openBoardEditor("news")}
                onDelete={() => editor.removeBoardItem("news", index)}
              >
                {isEmpty ? <EmptyEntryPlaceholder label="空 News 条目" /> : <a href={siteHref(`/board/news/${item.id || makeId(item.title)}`)}>
                  {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
                  {hasText(item.intro || item.body) ? <span className="cont">{item.intro || item.body}</span> : null}
                  {hasText(item.date) ? <span className="date">{item.date}</span> : null}
                </a>}
              </AdminEditable>
            ))}
          </ul>
        </section>

        <section className="exhibition reveal-section">
          <MainTitle href="/works">Works</MainTitle>
          <ul className="exhibition-list">
            {works.map(({ item, index, isEmpty }) => (
              <AdminEditable
                as="li"
                className="reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `work-${index}`}
                onEdit={() => editor.openWorkEditor(item, index)}
                onAdd={() => editor.openWorkEditor()}
                onDelete={() => editor.removeWork(index)}
              >
                {isEmpty ? <EmptyEntryPlaceholder label="空 Works 条目" /> : <a href={siteHref(`/works/${item.id || makeId(item.title)}`)}>
                  {hasText(item.title) || hasText(item.date) ? (
                    <div className="item">
                      {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
                      {hasText(item.date) ? <span className="date">{item.date}</span> : null}
                    </div>
                  ) : null}
                  {primaryAttachmentFor(item, "image") ? (
                    <span className="thumb">
                      <AttachmentPreview value={primaryAttachmentFor(item, "image")} interactive={false} />
                    </span>
                  ) : editor.isEditing ? (
                    <span className="thumb admin-media-shell">
                      <EmptyMediaPlaceholder />
                    </span>
                  ) : null}
                </a>}
              </AdminEditable>
            ))}
          </ul>
          <a className="more-btn" href={siteHref("/works")}>
            查看全部作品 <ArrowRight size={22} />
          </a>
        </section>

        <section className="project reveal-section">
          <MainTitle href="/board/project">Project</MainTitle>
          <ul className="project-list">
            {projects.map(({ item, index, isEmpty }) => (
              <AdminEditable
                as="li"
                className="reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `project-${index}`}
                onEdit={() => editor.openBoardEditor("projects", item, index)}
                onAdd={() => editor.openBoardEditor("projects")}
                onDelete={() => editor.removeBoardItem("projects", index)}
              >
                {isEmpty ? <EmptyEntryPlaceholder label="空 Project 条目" /> : <a href={siteHref(`/board/project/${item.id || makeId(item.title)}`)}>
                  {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
                </a>}
              </AdminEditable>
            ))}
          </ul>
        </section>

        <section className="project reveal-section">
          <MainTitle href="/board/publications">Publications</MainTitle>
          <ul className="project-list">
            {publications.map(({ item, index, isEmpty }) => (
              <AdminEditable
                as="li"
                className="reveal-item"
                empty={isEmpty}
                key={item.id || item.title || `publication-${index}`}
                onEdit={() => editor.openBoardEditor("research", item, index)}
                onAdd={() => editor.openBoardEditor("research")}
                onDelete={() => editor.removeBoardItem("research", index)}
              >
                {isEmpty ? <EmptyEntryPlaceholder label="Empty Publications item" /> : <a href={siteHref(`/board/publications/${item.id || makeId(item.title)}`)}>
                  {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
                </a>}
              </AdminEditable>
            ))}
          </ul>
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
        <AdminEditable
          className="sub-slogan"
          onEdit={editor.openAboutHeadingEditor}
          onAdd={editor.addSingle}
          onDelete={editor.denyDelete}
          addDisabledMessage={editor.singleItemMessage}
          deleteDisabledMessage={editor.fixedModuleMessage}
        >
          {hasText(content.about.label) ? <p>{content.about.label}</p> : null}
          {hasText(content.about.title) ? <p>{content.about.title}</p> : null}
        </AdminEditable>
        {sections.map(({ section, index, isEmpty }) => (
          <AdminEditable
            as="section"
            className="cont-group reveal-section"
            empty={isEmpty}
            key={`${section.number || "about"}-${index}`}
            onEdit={() => editor.openAboutSectionEditor(section, index)}
            onAdd={() => editor.openAboutSectionEditor()}
            onDelete={() => editor.removeAboutSection(index)}
          >
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
          </AdminEditable>
        ))}
        <div className="object-band" aria-hidden="true">
          <span data-index="01">
            <b>凝视/秩序</b>
            <small>ACT I</small>
          </span>
          <span data-index="02">
            <b>流动/叙事</b>
            <small>ACT II</small>
          </span>
          <span data-index="03">
            <b>对话/共生</b>
            <small>ACT III</small>
          </span>
          <span data-index="04">
            <b>破壁/融合</b>
            <small>ACT IV</small>
          </span>
        </div>
        {hasText(content.archive.at(-1)?.[1]) || editor.isEditing ? (
          <AdminEditable
            className="about-note reveal-section reveal-item"
            empty={!hasText(content.archive.at(-1)?.[1])}
            onEdit={editor.openArchiveEditor}
            onAdd={editor.addSingle}
            onDelete={editor.clearArchive}
            addDisabledMessage={editor.singleItemMessage}
          >
            {hasText(content.archive.at(-1)?.[1]) ? content.archive.at(-1)?.[1] : <EmptyEntryPlaceholder label="理念文案为空" />}
          </AdminEditable>
        ) : null}
      </div>
    </PageShell>
  );
}

function PeoplePage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const people = indexedRenderableItems(content.people || [], PEOPLE_CONTENT_FIELDS, editor.isEditing);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const renderPersonCard = (person, isEmpty) => (
    <>
      {isEmpty ? <EmptyEntryPlaceholder label="空 People 条目" /> : null}
      {!isEmpty && primaryAttachmentFor(person, "photo") ? (
        <figure>
          <AttachmentPreview value={primaryAttachmentFor(person, "photo")} interactive={false} />
        </figure>
      ) : !isEmpty && editor.isEditing ? (
        <figure className="admin-media-shell">
          <EmptyMediaPlaceholder />
        </figure>
      ) : null}
      {!isEmpty && hasText(person.name) ? <h2>{person.name}</h2> : null}
      {!isEmpty && person.interests ? <h3>{person.interests}</h3> : null}
    </>
  );
  return (
    <PageShell title="People">
      <div className="people-page reveal-section">
        <span className="professor-label">PEOPLE</span>
        <div className="people-grid-page">
          {people.map(({ item: person, index, isEmpty }) => (
            editor.isEditing ? (
              <AdminEditable
                as="article"
                className="people-card"
                empty={isEmpty}
                key={person.id || person.name || `person-${index}`}
                onEdit={() => editor.openPersonEditor(person, index)}
                onAdd={() => editor.openPersonEditor()}
                onDelete={() => editor.removePerson(index)}
                {...sortableProps(editor.isEditing, index, editor.movePerson)}
              >
                {renderPersonCard(person, isEmpty)}
              </AdminEditable>
            ) : (
              <button className="people-card" type="button" onClick={() => setSelectedPerson(person)} key={person.id || person.name}>
                {renderPersonCard(person, isEmpty)}
              </button>
            )
          ))}
        </div>
      </div>
      {selectedPerson ? <PeopleModal person={selectedPerson} onClose={() => setSelectedPerson(null)} /> : null}
    </PageShell>
  );
}

function PeopleModal({ person, onClose }) {
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

  const fields = [
    ["Name", person.name],
    ["E-mail", person.email],
    ["Interests", person.interests],
    ["Academic ability", person.history],
    ["Major career", person.experience],
  ].filter(([, value]) => hasText(value));

  return (
    <div className="people-modal" role="dialog" aria-modal="true" aria-label={person.name || "People detail"} onMouseDown={onClose}>
      <article className="people-modal-panel" onMouseDown={(event) => event.stopPropagation()}>
        <header className="people-modal-head">
          <strong>{person.name || "People"}</strong>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={24} />
          </button>
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
    </div>
  );
}

function PeopleDetailPage({ id }) {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const person = findById(content.people || [], id, "name");
  if (!person || (!editor.isEditing && isEmptyContentItem(person, PEOPLE_CONTENT_FIELDS))) return <NotFoundPage />;
  const personIndex = findIndexById(content.people || [], id, "name");
  const fields = [
    ["Email", person.email],
    ["兴趣方向", person.interests],
    ["经历", person.history],
    ["经验", person.experience],
  ].filter(([, value]) => hasText(value));
  return (
    <PageShell title={person.name || "People"}>
      <DetailArticle
        image={person.photo}
        attachments={attachmentsFor(person, "photo")}
        fields={fields}
        className="detail-page people-detail reveal-section"
        editableProps={{
          onEdit: () => editor.openPersonEditor(person, personIndex),
          onAdd: () => editor.openPersonEditor(),
          onDelete: () => editor.removePerson(personIndex, () => { window.location.href = siteHref("/people"); }),
        }}
      />
    </PageShell>
  );
}

function WorksPage() {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const works = indexedRenderableItems(content.works || [], WORK_CONTENT_FIELDS, editor.isEditing);
  const renderWorkRow = (item, isEmpty) => (
    <>
      {isEmpty ? <EmptyEntryPlaceholder label="空 Works 条目" /> : null}
      {!isEmpty && primaryAttachmentFor(item, "image") ? (
        <figure>
          <AttachmentPreview value={primaryAttachmentFor(item, "image")} interactive={false} showName={false} />
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
      <div className="works-page reveal-section">
        {works.map(({ item, index, isEmpty }) => (
          editor.isEditing ? (
            <AdminEditable
              as="article"
              className="work-row reveal-item"
              empty={isEmpty}
              key={item.id || item.title || `work-${index}`}
              onEdit={() => editor.openWorkEditor(item, index)}
              onAdd={() => editor.openWorkEditor()}
              onDelete={() => editor.removeWork(index)}
              {...sortableProps(editor.isEditing, index, editor.moveWork)}
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
  const editor = useScopedContentEditor();
  const work = findById(content.works || [], id);
  if (!work || (!editor.isEditing && isEmptyContentItem(work, WORK_CONTENT_FIELDS))) return <NotFoundPage />;
  const workIndex = findIndexById(content.works || [], id);
  return (
    <PageShell title={work.title || "Works"}>
      <DetailArticle image={work.image} attachments={attachmentsFor(work, "image")} fields={[
        ["DATE", work.date],
        ["PEOPLE", work.people],
        ["INTRO", work.text],
        ["TEXT", work.body],
      ]} showAttachmentNames={false} editableProps={{
        onEdit: () => editor.openWorkEditor(work, workIndex),
        onAdd: () => editor.openWorkEditor(),
        onDelete: () => editor.removeWork(workIndex, () => { window.location.href = siteHref("/works"); }),
      }} />
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
              onAdd={() => editor.openBoardEditor(section.dataKey)}
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
  const items = indexedRenderableItems(getBoardItems(content, canonicalSection), BOARD_LIST_FIELDS, editor.isEditing);
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
  const itemHref = (item) => siteHref(`${meta.path}/${item.id || makeId(item.title)}`);
  return (
    <PageShell title={meta.title}>
      <div className="board-page reveal-section">
        <div className="board-head reveal-item">
          <span>DATE</span>
          <span>TITLE</span>
        </div>
        {items.map(({ item, index, isEmpty }) => (
          editor.isEditing ? (
            <AdminEditable
              as="article"
              className="board-row reveal-item"
              empty={isEmpty}
              key={item.id || item.title || `${section}-${index}`}
              onEdit={() => editor.openBoardEditor(meta.dataKey, item, index)}
              onAdd={() => editor.openBoardEditor(meta.dataKey)}
              onDelete={() => editor.removeBoardItem(meta.dataKey, index)}
              {...sortableProps(editor.isEditing, index, (fromIndex, toIndex) => editor.moveBoardItem(meta.dataKey, fromIndex, toIndex))}
            >
              {renderBoardRow(item, isEmpty)}
            </AdminEditable>
          ) : (
            <article className="board-row reveal-item" key={item.id || item.title}>
              {isEmpty ? <EmptyEntryPlaceholder label={`空 ${meta.title} 条目`} /> : (
                <>
                  {hasText(item.date) ? <span>{item.date}</span> : null}
                  {hasText(item.title) ? (
                    <a className="board-row-title" href={itemHref(item)} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  ) : null}
                </>
              )}
            </article>
          )
        ))}
      </div>
    </PageShell>
  );
}

function BoardDetailPage({ section, id }) {
  const content = useSiteContent();
  const editor = useScopedContentEditor();
  const canonicalSection = normalizeBoardSection(section);
  const meta = boardSections[canonicalSection];
  const list = getBoardItems(content, canonicalSection);
  const item = findById(list, id);
  if (!meta || !item || (!editor.isEditing && isEmptyContentItem(item, BOARD_CONTENT_FIELDS))) return <NotFoundPage />;
  const itemIndex = findIndexById(list, id);
  return (
    <PageShell title={item.title || meta.title}>
      <DetailArticle image={item.image} attachments={attachmentsFor(item, "image")} fields={[
        ["DATE", item.date],
        ["PEOPLE", item.people],
        ["INTRO", item.intro],
        ["TEXT", item.body],
      ]} editableProps={{
        onEdit: () => editor.openBoardEditor(meta.dataKey, item, itemIndex),
        onAdd: () => editor.openBoardEditor(meta.dataKey),
        onDelete: () => editor.removeBoardItem(meta.dataKey, itemIndex, () => { window.location.href = siteHref(meta.path); }),
      }} />
    </PageShell>
  );
}

function DetailArticle({ image, attachments = null, fields, className = "detail-page reveal-section", editableProps = {}, showAttachmentNames = true }) {
  const { authenticated, editMode } = useAdminSession();
  const showEmptyPlaceholders = authenticated && editMode && isAdminRoute();
  const visibleFields = fields.filter(([, value]) => hasText(value));
  const mediaItems = attachments ? normalizeAttachmentList(attachments) : normalizeAttachmentList(image);
  return (
    <AdminEditable as="article" className={className} {...editableProps}>
      {mediaItems.length ? (
        <figure className="detail-hero reveal-item">
          <AttachmentStack attachments={mediaItems} showName={showAttachmentNames} />
        </figure>
      ) : showEmptyPlaceholders ? (
        <figure className="detail-hero reveal-item admin-media-shell">
          <EmptyMediaPlaceholder />
        </figure>
      ) : null}
      {visibleFields.length ? (
        <div className="detail-fields">
          {visibleFields.map(([label, value]) => (
            <section className="detail-field reveal-item" key={label}>
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
  const fields = [
    ["地址", content.site.contactAddress],
    ["邮箱", content.site.contactEmail],
    ["方向", content.site.contactDirections],
  ].filter(([, value]) => hasText(value));
  return (
    <PageShell title="Contact">
      <AdminEditable
        className="contact-container reveal-section"
        onEdit={editor.openSiteEditor}
        onAdd={editor.addSingle}
        onDelete={editor.denyDelete}
        addDisabledMessage={editor.singleItemMessage}
        deleteDisabledMessage={editor.fixedModuleMessage}
      >
        {fields.length ? fields.map(([label, value]) => (
          <div className="item reveal-item" key={label}>
            <span className="label">{label}</span>
            <p className="address">{value}</p>
          </div>
        )) : editor.isEditing ? <EmptyEntryPlaceholder label="联系信息为空" /> : null}
      </AdminEditable>
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

function TextInput({ label, value, onChange, multiline = false, type = "text", rows = 4 }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={rows} />
      ) : (
        <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function UploadBox({ onUpload, multiple = true }) {
  return (
    <label className="upload-box">
      <Paperclip size={18} />
      <span>上传附件</span>
      <input
        type="file"
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          onUpload(multiple ? files : files[0]);
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
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState("");
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
        showMessage("保存失败，请检查登录状态或服务端。");
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
      if (!fileList.length) return;
      const body = new FormData();
      fileList.forEach((file) => body.append("file", file));
      const response = await fetch("/api/upload", { method: "POST", body }).catch(() => null);
      if (!response?.ok) {
        showMessage("附件上传失败，请检查文件大小、网络或登录状态。");
        return;
      }
      const data = await response.json();
      const uploaded = data.attachments || [data.attachment || data].filter(Boolean);
      callback(uploaded.length === 1 ? uploaded[0] : uploaded);
      showMessage("附件已上传，保存后生效。");
    },
    [showMessage],
  );

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    setAuthenticated(false);
    setEditMode(false);
    showMessage("");
  }, [showMessage]);

  const value = useMemo(
    () => ({
      authenticated,
      authChecked,
      editMode,
      saving,
      message,
      setAuthenticated,
      setEditMode,
      openModal: setModal,
      showMessage,
      persistScopedContent,
      uploadImage,
      logout,
    }),
    [authChecked, authenticated, editMode, logout, message, persistScopedContent, saving, showMessage, uploadImage],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      {authenticated && isAdminRoute() ? <AdminModeToggle /> : null}
      {modal ? <AdminEditModal modal={modal} onClose={() => setModal(null)} uploadImage={uploadImage} /> : null}
    </AdminContext.Provider>
  );
}

function AdminModeToggle() {
  const { editMode, setEditMode, saving, message, logout } = useAdminSession();
  return (
    <aside className="front-admin-toolbar" aria-label="Front admin controls">
      <button type="button" className={editMode ? "active" : ""} onClick={() => setEditMode(!editMode)}>
        {editMode ? <Pencil size={15} /> : <Eye size={15} />}
        {editMode ? "编辑模式" : "预览模式"}
      </button>
      <button type="button" onClick={logout}>
        <LogOut size={15} />
        退出
      </button>
      {saving ? <span><Loader2 className="spin" size={14} />保存中</span> : null}
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
  addDisabledMessage,
  deleteDisabledMessage,
  ...props
}) {
  const { authenticated, editMode } = useAdminSession();
  const hasControls = Boolean(onEdit || onAdd || onDelete || addDisabledMessage || deleteDisabledMessage);
  const active = authenticated && editMode && isAdminRoute() && hasControls;
  const combinedClassName = [className, active ? "admin-editable front-admin-editable" : "", active && empty ? "admin-empty-entry" : ""].filter(Boolean).join(" ");

  return (
    <Component {...props} className={combinedClassName}>
      {active ? (
        <AdminInlineControls
          onEdit={onEdit}
          onAdd={onAdd}
          onDelete={onDelete}
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

  const openSiteEditor = () => {
    const site = content.site || {};
    admin.openModal({
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
        { name: "topLine", label: "顶部文案" },
        { name: "logo", label: "Logo 附件", type: "image" },
        { name: "contactAddress", label: "地址", type: "textarea" },
        { name: "contactEmail", label: "邮箱" },
        { name: "contactDirections", label: "方向", type: "textarea" },
        { name: "footerTagline", label: "页脚说明", type: "textarea" },
      ],
      onSubmit: (values) =>
        commit((current) => ({ ...current, site: { ...current.site, ...values } }), {
          moduleKey: "site",
          action: "update",
        }),
    });
  };

  const openHomeEditor = () => {
    admin.openModal({
      title: "编辑首页简介",
      initial: { homeIntro: (content.homeIntro || []).join("\n\n") },
      fields: [{ name: "homeIntro", label: "首页简介", type: "textarea", rows: 8 }],
      onSubmit: (values) =>
        commit((current) => ({ ...current, homeIntro: splitAdminParagraphs(values.homeIntro) }), {
          moduleKey: "homeIntro",
          action: "update",
        }),
    });
  };

  const clearHomeIntro = () =>
    confirmDelete(
      "确认清空首页简介？",
      (current) => ({ ...current, homeIntro: [] }),
      { moduleKey: "homeIntro" },
    );

  const openAboutHeadingEditor = () => {
    const about = content.about || {};
    admin.openModal({
      title: "编辑 About 标题",
      initial: { label: about.label || "", title: about.title || "" },
      fields: [
        { name: "label", label: "标签" },
        { name: "title", label: "标题" },
      ],
      onSubmit: (values) =>
        commit((current) => ({ ...current, about: { ...current.about, ...values } }), {
          moduleKey: "about.heading",
          action: "update",
        }),
    });
  };

  const openAboutSectionEditor = (section = {}, index = null) => {
    admin.openModal({
      title: index === null ? "增加 About 内容" : "编辑 About 内容",
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
        ),
    });
  };

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

  const openArchiveEditor = () => {
    const latest = content.archive?.at(-1) || ["Archive", ""];
    admin.openModal({
      title: "编辑理念文案",
      initial: { label: latest[0] || "", text: latest[1] || "" },
      fields: [
        { name: "label", label: "内部标签" },
        { name: "text", label: "显示文案", type: "textarea" },
      ],
      onSubmit: (values) =>
        commit((current) => ({ ...current, archive: [[values.label || "Archive", values.text || ""]] }), {
          moduleKey: "archive",
          action: "update",
        }),
    });
  };

  const clearArchive = () =>
    confirmDelete(
      "确认清空这段理念文案？",
      (current) => ({ ...current, archive: [["Archive", ""]] }),
      { moduleKey: "archive" },
    );

  const peopleFields = [
    { name: "attachments", legacyField: "photo", label: "附件", type: "attachments" },
    { name: "name", label: "姓名" },
    { name: "email", label: "邮箱" },
    { name: "interests", label: "研究方向", type: "textarea" },
    { name: "history", label: "经历", type: "textarea" },
    { name: "experience", label: "经验", type: "textarea" },
  ];

  const openPersonEditor = (person = {}, index = null) => {
    admin.openModal({
      title: index === null ? "增加 People 条目" : "编辑 People 条目",
      initial: {
        photo: person.photo || "",
        attachments: attachmentsFor(person, "photo"),
        name: person.name || "",
        email: person.email || "",
        interests: person.interests || "",
        history: person.history || "",
        experience: person.experience || "",
      },
      fields: peopleFields,
      onSubmit: (values) =>
        commit(
          (current) => {
            const nextItem = withAttachmentCompatibility({ ...person, ...values, id: person.id || makeId(values.name || `person-${Date.now()}`) }, "photo");
            const people = current.people || [];
            return {
              ...current,
              people: index === null ? [nextItem, ...people] : people.map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
            };
          },
          { moduleKey: "people", action: index === null ? "create" : "update" },
        ),
    });
  };

  const removePerson = (index, afterSave) =>
    confirmDelete(
      "确认删除这个 People 条目？",
      (current) => ({ ...current, people: (current.people || []).filter((_, itemIndex) => itemIndex !== index) }),
      { moduleKey: "people" },
      afterSave,
    );

  const workFields = [
    { name: "attachments", legacyField: "image", label: "附件", type: "attachments" },
    { name: "title", label: "标题" },
    { name: "date", label: "时间" },
    { name: "people", label: "人员" },
    { name: "text", label: "简介", type: "textarea" },
    { name: "body", label: "正文", type: "textarea", rows: 8 },
  ];

  const openWorkEditor = (work = {}, index = null) => {
    admin.openModal({
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
        commit(
          (current) => {
            const nextItem = withAttachmentCompatibility({ ...work, ...values, id: work.id || makeId(values.title || `work-${Date.now()}`) }, "image");
            const works = current.works || [];
            return {
              ...current,
              works: index === null ? [nextItem, ...works] : works.map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
            };
          },
          { moduleKey: "works", action: index === null ? "create" : "update" },
        ),
    });
  };

  const removeWork = (index, afterSave) =>
    confirmDelete(
      "确认删除这个 Works 条目？",
      (current) => ({ ...current, works: (current.works || []).filter((_, itemIndex) => itemIndex !== index) }),
      { moduleKey: "works" },
      afterSave,
    );

  const boardFields = [
    { name: "attachments", legacyField: "image", label: "附件", type: "attachments" },
    { name: "title", label: "标题" },
    { name: "date", label: "时间" },
    { name: "people", label: "人员 / 作者" },
    { name: "intro", label: "简介", type: "textarea" },
    { name: "body", label: "正文", type: "textarea", rows: 8 },
  ];

  const openBoardEditor = (sectionKey, item = {}, index = null) => {
    admin.openModal({
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
        commit(
          (current) => {
            const nextItem = withAttachmentCompatibility({ ...item, ...values, id: item.id || makeId(values.title || `item-${Date.now()}`) }, "image");
            const list = current.board?.[sectionKey] || [];
            return {
              ...current,
              board: {
                ...current.board,
                [sectionKey]: index === null ? [nextItem, ...list] : list.map((entry, itemIndex) => (itemIndex === index ? nextItem : entry)),
              },
            };
          },
          { moduleKey: `board.${sectionKey}`, columnId: sectionKey, action: index === null ? "create" : "update" },
        ),
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

  const movePerson = (fromIndex, toIndex) =>
    commit(
      (current) => ({ ...current, people: moveArrayItem(current.people || [], fromIndex, toIndex) }),
      { moduleKey: "people", action: "sort" },
    );

  const moveWork = (fromIndex, toIndex) =>
    commit(
      (current) => ({ ...current, works: moveArrayItem(current.works || [], fromIndex, toIndex) }),
      { moduleKey: "works", action: "sort" },
    );

  const moveBoardItem = (sectionKey, fromIndex, toIndex) =>
    commit(
      (current) => ({
        ...current,
        board: {
          ...current.board,
          [sectionKey]: moveArrayItem(current.board?.[sectionKey] || [], fromIndex, toIndex),
        },
      }),
      { moduleKey: `board.${sectionKey}`, columnId: sectionKey, action: "sort" },
    );

  return {
    isEditing: admin.authenticated && admin.editMode && isAdminRoute(),
    addSingle,
    denyDelete,
    singleItemMessage,
    fixedModuleMessage,
    openSiteEditor,
    openHomeEditor,
    clearHomeIntro,
    openAboutHeadingEditor,
    openAboutSectionEditor,
    removeAboutSection,
    openArchiveEditor,
    clearArchive,
    openPersonEditor,
    removePerson,
    openWorkEditor,
    removeWork,
    openBoardEditor,
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
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [form, setForm] = useState({ username: "admin", password: "" });
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
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const savedContent = data.content || contentToSave;
      setDraft(savedContent);
      setContentFromCms(savedContent);
      notifyContentUpdated();
    }
    setSaving(false);
    setMessage(response.ok ? "已保存，前台已同步更新。" : "保存失败，请检查服务器。");
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
      setForm({ username: "admin", password: "" });
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
    if (!fileList.length) return;
    const body = new FormData();
    fileList.forEach((file) => body.append("file", file));
    const response = await fetch("/api/upload", { method: "POST", body });
    if (!response.ok) {
      setMessage("上传失败，请检查文件大小、网络或登录状态。");
      return;
    }
    const data = await response.json();
    const uploaded = data.attachments || [data.attachment || data].filter(Boolean);
    callback(uploaded.length === 1 ? uploaded[0] : uploaded);
    setMessage("附件已上传，点击保存后前台生效。");
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
          <TextInput label="用户名" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
          <TextInput label="密码" value={form.password} type="password" onChange={(value) => setForm({ ...form, password: value })} />
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
    { name: "name", label: "姓名" },
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
        name: person.name || "",
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
            <a href="#admin-home">Home</a>
            <a href="#admin-about">About</a>
            <a href="#admin-people">People</a>
            <a href="#admin-works">Works</a>
            <a href="#admin-board-content">Board</a>
            <a href="#admin-contact">Contact</a>
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
                <span data-index="01"><b>凝视/秩序</b><small>ACT I</small></span>
                <span data-index="02"><b>流动/叙事</b><small>ACT II</small></span>
                <span data-index="03"><b>对话/共生</b><small>ACT III</small></span>
                <span data-index="04"><b>破壁/融合</b><small>ACT IV</small></span>
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
              {indexedWorks.map(({ item, index }) => (
                <article className="work-row reveal-item admin-editable" key={item.id || index}>
                  <AdminInlineControls onEdit={() => openWorkEditor(item, index)} onAdd={() => openWorkEditor()} onDelete={() => removeWork(index)} />
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

function AdminInlineControls({ onEdit, onAdd, onDelete, addDisabledMessage, deleteDisabledMessage }) {
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

function AttachmentEditor({ label, value, multiple = true, onChange, uploadImage }) {
  const attachments = normalizeAttachmentList(value);
  const update = (nextItems) => onChange(multiple ? normalizeAttachmentList(nextItems) : normalizeAttachmentList(nextItems)[0] || "");
  const addUploaded = (uploaded) => update(normalizeAttachmentList(attachments, uploaded));
  const removeAt = (index) => update(attachments.filter((_, itemIndex) => itemIndex !== index));
  const move = (fromIndex, toIndex) => update(moveArrayItem(attachments, fromIndex, toIndex));

  return (
    <div className="admin-image-editor">
      <span className="admin-field-title">{label}</span>
      {attachments.length ? (
        <div className="admin-attachment-list">
          {attachments.map((attachment, index) => (
            <div
              className="admin-attachment-item"
              draggable
              key={attachment.url}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                move(Number(event.dataTransfer.getData("text/plain")), index);
              }}
            >
              <span className="admin-drag-handle" title="拖拽排序"><Menu size={16} /></span>
              <AttachmentPreview value={attachment} />
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
      <form className="admin-modal-panel" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header className="admin-modal-head">
          <strong>{modal.title}</strong>
          <button type="button" aria-label="关闭" onClick={onClose}><X size={22} /></button>
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
    </div>
  );
}

function BoardEditor({ draft, addBoardItem, removeBoardItem, updateBoardItem, uploadImage }) {
  return (
    <section className="admin-panel" id="admin-board-content">
      <h2>Board / News / Project / Publications</h2>
      {Object.entries(boardSections).map(([section, meta]) => {
        const key = meta.dataKey;
        return (
          <div className="admin-section-block" key={section}>
            <div className="admin-section-head">
              <h3>{meta.title}</h3>
              <button type="button" onClick={() => addBoardItem(key)}><Plus size={16} />鏂板</button>
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
        <h2>People</h2>
        <button type="button" onClick={addPerson}><Plus size={16} />鏂板</button>
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
        <h2>Works</h2>
        <button type="button" onClick={addWork}><Plus size={16} />鏂板</button>
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
  const setContentFromCms = useCallback((nextContent) => setContent({ ...defaultContent, ...nextContent }), []);
  const refreshContent = useCallback(async () => {
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
        .then((data) => active && setContentFromCms(data))
        .catch(() => active && setContent(defaultContent));
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
      <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
    </ContentActionsContext.Provider>
  );
}

function getAdminCrumbs(path, content) {
  const parts = pathPartsFrom(path);
  const staticLabels = {
    "about-lab": "About LAB",
    people: "People",
    works: "Works",
    board: "Board",
    contact: "Contact",
    news: "News",
    project: "Project",
    publications: "Publications",
    dissertation: "Publications",
    research: "Publications",
  };
  const crumbs = [{ label: "Admin", href: "/admin" }];
  if (!parts.length) return [...crumbs, { label: "Home", href: "/admin" }];

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
          <p>{content.site.footerTagline}</p>
          <a href="/admin"><ArrowUp size={18} />top</a>
        </div>
      </footer>
    </>
  );
}

function SiteFrame() {
  const path = rawCurrentPath();
  const content = useSiteContent();
  if (isAdminRoute(path)) return <AdminRouteFrame />;
  return (
    <>
      <Header />
      <CurrentPage />
      <footer className="footer">
        <div className="container">
          <p>COPYRIGHT © 2026 ACT IV FUTURE VISUAL LAB</p>
          <p>{content.site.footerTagline}</p>
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
