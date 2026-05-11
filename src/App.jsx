import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUp, ImagePlus, Loader2, LogOut, Menu, Plus, Save, Trash2, X } from "lucide-react";
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
      { label: "Research", path: "/board/research" },
    ],
  },
  { label: "Contact", path: "/contact" },
];

const boardSections = {
  news: { title: "News", dataKey: "news", path: "/board/news" },
  project: { title: "Project", dataKey: "projects", path: "/board/project" },
  research: { title: "Research", dataKey: "research", path: "/board/research" },
};

const ContentContext = createContext(defaultContent);
const ContentActionsContext = createContext({ setContentFromCms: () => {}, refreshContent: async () => {} });
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

function pathParts() {
  return normalizePath(window.location.pathname).split("/").filter(Boolean);
}

function useSiteContent() {
  return useContext(ContentContext);
}

function useContentActions() {
  return useContext(ContentActionsContext);
}

function getBoardItems(content, section) {
  const key = boardSections[section]?.dataKey || section;
  return content.board?.[key] || [];
}

function findById(items, id, labelKey = "title") {
  return items.find((item) => item.id === id || makeId(item[labelKey]) === id);
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function hasAnyText(item, keys) {
  return keys.some((key) => hasText(item?.[key]));
}

function visiblePeople(people = []) {
  return people.filter((person) => hasAnyText(person, ["photo", "name", "email", "interests", "history", "experience"]));
}

function visibleWorks(works = []) {
  return works.filter((work) => hasAnyText(work, ["image", "title", "date", "text", "people", "body"]));
}

function visibleBoardItems(content, section) {
  return getBoardItems(content, section).filter((item) => hasAnyText(item, ["image", "title", "date", "intro", "people", "body"]));
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
  const path = normalizePath(window.location.pathname);
  const topLine = content.site.topLine.replace(/^ACT IV\s*/i, "");

  return (
    <header className="header">
      <div className="head-top">
        <span>ACT IV</span> {topLine}
      </div>
      <div className="container head-wrap">
        <a href="/" className="logo" aria-label="ACT IV home">
          <img src={content.site.logo || "/logo2.png"} alt="ACT IV Future Visual Lab" />
        </a>
        <nav className="nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a className={path === item.path || path.startsWith(`${item.path}/`) ? "active" : ""} key={item.label} href={item.path}>
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
              <a className="mobile-panel-main" href={item.path}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </a>
              {item.children ? (
                <div className="mobile-panel-sub">
                  {item.children.map((child) => (
                    <a key={child.label} href={child.path}>
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
      <a href={href} aria-label={`${children} more`}>
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
  const news = visibleBoardItems(content, "news");
  const works = visibleWorks(content.works);
  const projects = visibleBoardItems(content, "project");
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

      <div className="lab-intro container reveal-section">
        {content.homeIntro.filter(hasText).map((paragraph) => (
          <p className="reveal-item" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mb-latest container">
        <section className="news reveal-section">
          <MainTitle href="/board/news">News</MainTitle>
          <ul className="news-list">
            {news.map((item) => (
              <li className="reveal-item" key={item.id || item.title}>
                <a href={`/board/news/${item.id || makeId(item.title)}`}>
                  {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
                  {hasText(item.intro || item.body) ? <span className="cont">{item.intro || item.body}</span> : null}
                  {hasText(item.date) ? <span className="date">{item.date}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="exhibition reveal-section">
          <MainTitle href="/works">Works</MainTitle>
          <ul className="exhibition-list">
            {works.map((item) => (
              <li className="reveal-item" key={item.id || item.title}>
                <a href={`/works/${item.id || makeId(item.title)}`}>
                  <div className="item">
                    {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
                    {hasText(item.date) ? <span className="date">{item.date}</span> : null}
                  </div>
                  {hasText(item.image) ? (
                    <span className="thumb">
                      <img src={item.image} alt="" />
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
          <a className="more-btn" href="/works">
            查看全部作品 <ArrowRight size={22} />
          </a>
        </section>

        <section className="project reveal-section">
          <MainTitle href="/board/project">Project</MainTitle>
          <ul className="project-list">
            {projects.map((item) => (
              <li className="reveal-item" key={item.id || item.title}>
                <a href={`/board/project/${item.id || makeId(item.title)}`}>
                  {hasText(item.title) ? <span className="subj">{item.title}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function AboutPage() {
  const content = useSiteContent();
  const sections = content.about.sections
    .map((section) => ({ ...section, paragraphs: (section.paragraphs || []).filter(hasText) }))
    .filter((section) => hasText(section.title) || section.paragraphs.length);
  return (
    <PageShell title="About LAB">
      <div className="about-lab">
        <div className="sub-slogan">
          {hasText(content.about.label) ? <p>{content.about.label}</p> : null}
          {hasText(content.about.title) ? <p>{content.about.title}</p> : null}
        </div>
        {sections.map((section) => (
          <section className="cont-group reveal-section" key={section.number}>
            {hasText(section.number) ? <p className="num reveal-item">{section.number}</p> : null}
            {hasText(section.title) ? <p className="subj reveal-item">{section.title}</p> : null}
            <div className="reveal-item">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
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
        <p className="about-note reveal-section reveal-item">{content.archive.at(-1)?.[1]}</p>
      </div>
    </PageShell>
  );
}

function PeoplePage() {
  const content = useSiteContent();
  const people = visiblePeople(content.people);
  const [selectedPerson, setSelectedPerson] = useState(null);
  return (
    <PageShell title="People">
      <div className="people-page reveal-section">
        <span className="professor-label">PEOPLE</span>
        <div className="people-grid-page">
          {people.map((person) => (
            <button className="people-card" type="button" onClick={() => setSelectedPerson(person)} key={person.id || person.name}>
              {person.photo ? (
                <figure>
                  <img src={person.photo} alt="" />
                </figure>
              ) : null}
              {hasText(person.name) ? <h2>{person.name}</h2> : null}
              {person.interests ? <h3>{person.interests}</h3> : null}
            </button>
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
        {hasText(person.photo) ? (
          <figure className="people-modal-photo">
            <img src={person.photo} alt="" />
          </figure>
        ) : null}
        <div className="people-modal-fields">
          {fields.map(([label, value]) => (
            <section className="people-modal-field" key={label}>
              <span>{label}</span>
              <p>{value}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

function PeopleDetailPage({ id }) {
  const content = useSiteContent();
  const person = findById(content.people || [], id, "name");
  if (!person) return <NotFoundPage />;
  const fields = [
    ["Email", person.email],
    ["兴趣方向", person.interests],
    ["经历", person.history],
    ["经验", person.experience],
  ].filter(([, value]) => hasText(value));
  return (
    <PageShell title={person.name || "People"}>
      <article className="detail-page people-detail reveal-section">
        {person.photo ? (
          <figure className="detail-hero reveal-item">
            <img src={person.photo} alt="" />
          </figure>
        ) : null}
        {fields.length ? (
          <div className="detail-fields">
            {fields.map(([label, value]) => (
                <section className="detail-field reveal-item" key={label}>
                  <span>{label}</span>
                  <p>{value}</p>
                </section>
              ))}
          </div>
        ) : null}
      </article>
    </PageShell>
  );
}

function WorksPage() {
  const content = useSiteContent();
  const works = visibleWorks(content.works);
  return (
    <PageShell title="Works">
      <div className="works-page reveal-section">
        {works.map((item) => (
          <a className="work-row reveal-item" href={`/works/${item.id || makeId(item.title)}`} key={item.id || item.title}>
            {hasText(item.image) ? (
              <figure>
                <img src={item.image} alt="" />
              </figure>
            ) : null}
            <div>
              {hasText(item.date) ? <span>{item.date}</span> : null}
              {hasText(item.title) ? <h2>{item.title}</h2> : null}
              {hasText(item.text) ? <p>{item.text}</p> : null}
            </div>
          </a>
        ))}
      </div>
    </PageShell>
  );
}

function WorksDetailPage({ id }) {
  const content = useSiteContent();
  const work = findById(content.works || [], id);
  if (!work) return <NotFoundPage />;
  return (
    <PageShell title={work.title || "Works"}>
      <DetailArticle image={work.image} fields={[
        ["时间", work.date],
        ["人员", work.people],
        ["介绍", work.text],
        ["正文", work.body],
      ]} />
    </PageShell>
  );
}

function BoardPage() {
  const content = useSiteContent();
  return (
    <PageShell title="Board">
      <div className="board-hub reveal-section">
        {Object.entries(boardSections).map(([key, section], index) => (
          <a className="board-hub-card reveal-item" href={section.path} key={key}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{section.title}</strong>
            <p>{visibleBoardItems(content, key).length} ITEMS</p>
          </a>
        ))}
      </div>
    </PageShell>
  );
}

function BoardListPage({ section }) {
  const content = useSiteContent();
  const meta = boardSections[section];
  if (!meta) return <NotFoundPage />;
  const items = visibleBoardItems(content, section);
  return (
    <PageShell title={meta.title}>
      <div className="board-page reveal-section">
        <div className="board-head reveal-item">
          <span>DATE</span>
          <span>TITLE</span>
          <span>INTRO</span>
        </div>
        {items.map((item) => (
          <a className="board-row reveal-item" href={`${meta.path}/${item.id || makeId(item.title)}`} key={item.id || item.title}>
            {hasText(item.date) ? <span>{item.date}</span> : <span />}
            {hasText(item.title) ? <strong>{item.title}</strong> : <strong />}
            {hasText(item.intro || item.body) ? <p>{item.intro || item.body}</p> : <p />}
          </a>
        ))}
      </div>
    </PageShell>
  );
}

function BoardDetailPage({ section, id }) {
  const content = useSiteContent();
  const meta = boardSections[section];
  const item = findById(getBoardItems(content, section), id);
  if (!meta || !item) return <NotFoundPage />;
  return (
    <PageShell title={item.title || meta.title}>
      <DetailArticle image={item.image} fields={[
        ["时间", item.date],
        ["人员", item.people],
        ["介绍", item.intro],
        ["正文", item.body],
      ]} />
    </PageShell>
  );
}

function DetailArticle({ image, fields }) {
  const visibleFields = fields.filter(([, value]) => hasText(value));
  return (
    <article className="detail-page reveal-section">
      {image ? (
        <figure className="detail-hero reveal-item">
          <img src={image} alt="" />
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
      ) : null}
    </article>
  );
}

function ContactPage() {
  const content = useSiteContent();
  const fields = [
    ["地址", content.site.contactAddress],
    ["邮箱", content.site.contactEmail],
    ["方向", content.site.contactDirections],
  ].filter(([, value]) => hasText(value));
  return (
    <PageShell title="Contact">
      <div className="contact-container reveal-section">
        {fields.map(([label, value]) => (
          <div className="item reveal-item" key={label}>
            <span className="label">{label}</span>
            <p className="address">{value}</p>
          </div>
        ))}
      </div>
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

function TextInput({ label, value, onChange, multiline = false, type = "text" }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function UploadBox({ onUpload }) {
  return (
    <label className="upload-box">
      <ImagePlus size={18} />
      <span>上传图片</span>
      <input type="file" accept="image/*" onChange={(event) => onUpload(event.target.files?.[0])} />
    </label>
  );
}

function AdminPage() {
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
    fetch(`/api/content?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setDraft(data))
      .catch(() => setDraft(publicContent));
  }, [loggedIn]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const savedContent = data.content || draft;
      setDraft(savedContent);
      setContentFromCms(savedContent);
      notifyContentUpdated();
    }
    setSaving(false);
    setMessage(response.ok ? "已保存，前台已同步更新。" : "保存失败，请检查服务器。");
  };

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
      setForm({ username: "admin", password: "" });
    } else {
      setMessage("用户名或密码不正确。");
    }
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setLoggedIn(false);
  };

  const uploadImage = async (callback, file) => {
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    if (!response.ok) {
      setMessage("上传失败，请确认文件格式为图片。");
      return;
    }
    const data = await response.json();
    callback(data.url);
    setMessage("图片已上传，点击保存后前台生效。");
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

  const addListItem = (key, item) => setDraft((current) => ({ ...current, [key]: [...current[key], item] }));
  const removeListItem = (key, index) => setDraft((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }));
  const addBoardItem = (sectionKey) =>
    setDraft((current) => ({
      ...current,
      board: {
        ...current.board,
        [sectionKey]: [...current.board[sectionKey], { id: `item-${Date.now()}`, title: "新条目", date: "", intro: "", people: "", image: "", body: "" }],
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

  return (
    <main className="admin-screen">
      <section className="admin-board">
        <div className="admin-toolbar">
          <div>
            <span className="admin-kicker">ACT IV CMS</span>
            <h1>网站后台管理</h1>
          </div>
          <div className="admin-actions">
            <button type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}保存</button>
            <button type="button" onClick={logout}><LogOut size={18} />退出</button>
          </div>
        </div>

        <nav className="admin-quicknav" aria-label="后台分区">
          <a href="#admin-site">基础信息</a>
          <a href="#admin-home">首页介绍</a>
          <a href="#admin-board-content">Board</a>
          <a href="#admin-people">People</a>
          <a href="#admin-works">Works</a>
        </nav>

        <section className="admin-panel" id="admin-site">
          <h2>基础信息</h2>
          <div className="admin-grid">
            <TextInput label="顶部细条文案" value={draft.site.topLine} onChange={(value) => setDraft((current) => ({ ...current, site: { ...current.site, topLine: value } }))} />
            <TextInput label="联系邮箱" value={draft.site.contactEmail} onChange={(value) => setDraft((current) => ({ ...current, site: { ...current.site, contactEmail: value } }))} />
            <TextInput label="联系地址" value={draft.site.contactAddress} multiline onChange={(value) => setDraft((current) => ({ ...current, site: { ...current.site, contactAddress: value } }))} />
            <TextInput label="联系方向" value={draft.site.contactDirections} multiline onChange={(value) => setDraft((current) => ({ ...current, site: { ...current.site, contactDirections: value } }))} />
            <TextInput label="页脚说明" value={draft.site.footerTagline} multiline onChange={(value) => setDraft((current) => ({ ...current, site: { ...current.site, footerTagline: value } }))} />
          </div>
        </section>

        <section className="admin-panel" id="admin-home">
          <h2>首页介绍</h2>
          <div className="admin-grid">
            {draft.homeIntro.map((paragraph, index) => (
              <TextInput key={index} label={`段落 ${index + 1}`} value={paragraph} multiline onChange={(value) => setDraft((current) => ({ ...current, homeIntro: current.homeIntro.map((item, itemIndex) => itemIndex === index ? value : item) }))} />
            ))}
          </div>
        </section>

        <BoardEditor draft={draft} addBoardItem={addBoardItem} removeBoardItem={removeBoardItem} updateBoardItem={updateBoardItem} uploadImage={uploadImage} />
        <PeopleEditor draft={draft} updatePerson={updatePerson} removePerson={(index) => removeListItem("people", index)} addPerson={() => addListItem("people", { id: `person-${Date.now()}`, photo: "", name: "新成员", email: "", interests: "", history: "", experience: "" })} uploadImage={uploadImage} />
        <WorksEditor draft={draft} updateWork={updateWork} removeWork={(index) => removeListItem("works", index)} addWork={() => addListItem("works", { id: `work-${Date.now()}`, title: "新作品", date: "", text: "", people: "", image: "", body: "" })} uploadImage={uploadImage} />

        {message ? <p className="admin-message sticky-message">{message}</p> : null}
      </section>
    </main>
  );
}

function BoardEditor({ draft, addBoardItem, removeBoardItem, updateBoardItem, uploadImage }) {
  return (
    <section className="admin-panel" id="admin-board-content">
      <h2>Board / News / Project / Research</h2>
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
                  <figure>{item.image ? <img src={item.image} alt="" /> : null}</figure>
                  <div className="admin-work-form">
                    <TextInput label="标题" value={item.title} onChange={(value) => updateBoardItem(key, index, "title", value)} />
                    <TextInput label="时间" value={item.date} onChange={(value) => updateBoardItem(key, index, "date", value)} />
                    <TextInput label="人员 / 作者" value={item.people} onChange={(value) => updateBoardItem(key, index, "people", value)} />
                    <TextInput label="介绍" value={item.intro} multiline onChange={(value) => updateBoardItem(key, index, "intro", value)} />
                    <TextInput label="正文" value={item.body} multiline onChange={(value) => updateBoardItem(key, index, "body", value)} />
                    <TextInput label="图片地址" value={item.image} onChange={(value) => updateBoardItem(key, index, "image", value)} />
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
        <button type="button" onClick={addPerson}><Plus size={16} />新增</button>
      </div>
      <div className="admin-work-list">
        {draft.people.map((person, index) => (
          <article className="admin-work-card" key={person.id || index}>
            <figure>{person.photo ? <img src={person.photo} alt="" /> : null}</figure>
            <div className="admin-work-form">
              <TextInput label="姓名" value={person.name} onChange={(value) => updatePerson(index, "name", value)} />
              <TextInput label="邮箱" value={person.email} onChange={(value) => updatePerson(index, "email", value)} />
              <TextInput label="兴趣方向" value={person.interests} multiline onChange={(value) => updatePerson(index, "interests", value)} />
              <TextInput label="经历" value={person.history} multiline onChange={(value) => updatePerson(index, "history", value)} />
              <TextInput label="经验" value={person.experience} multiline onChange={(value) => updatePerson(index, "experience", value)} />
              <TextInput label="照片地址" value={person.photo} onChange={(value) => updatePerson(index, "photo", value)} />
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
        <button type="button" onClick={addWork}><Plus size={16} />新增</button>
      </div>
      <div className="admin-work-list">
        {draft.works.map((work, index) => (
          <article className="admin-work-card" key={work.id || index}>
            <figure>{work.image ? <img src={work.image} alt="" /> : null}</figure>
            <div className="admin-work-form">
              <TextInput label="标题" value={work.title} onChange={(value) => updateWork(index, "title", value)} />
              <TextInput label="时间" value={work.date} onChange={(value) => updateWork(index, "date", value)} />
              <TextInput label="人员" value={work.people} onChange={(value) => updateWork(index, "people", value)} />
              <TextInput label="介绍" value={work.text} multiline onChange={(value) => updateWork(index, "text", value)} />
              <TextInput label="正文" value={work.body} multiline onChange={(value) => updateWork(index, "body", value)} />
              <TextInput label="照片地址" value={work.image} onChange={(value) => updateWork(index, "image", value)} />
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

function CurrentPage() {
  const path = normalizePath(window.location.pathname);
  const parts = pathParts();
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
  if (path === "/admin") return <AdminPage />;
  return <NotFoundPage />;
}

function AppContentProvider({ children }) {
  const [content, setContent] = useState(defaultContent);
  const setContentFromCms = useCallback((nextContent) => setContent({ ...defaultContent, ...nextContent }), []);
  const refreshContent = useCallback(async () => {
    const response = await fetch(`/api/content?t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
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

function SiteFrame() {
  const path = normalizePath(window.location.pathname);
  const content = useSiteContent();
  if (path === "/admin") return <CurrentPage />;
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
      <SiteFrame />
    </AppContentProvider>
  );
}
