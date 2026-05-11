import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUp, ImagePlus, Loader2, LogOut, Menu, Save, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import defaultContent from "./content.js";

gsap.registerPlugin(ScrollTrigger);

const navItems = [
  { label: "About LAB", path: "/about-lab" },
  { label: "People", path: "/people" },
  { label: "Works", path: "/works" },
  { label: "Board", path: "/board" },
  { label: "Contact", path: "/contact" },
];

const ContentContext = createContext(defaultContent);
const ContentActionsContext = createContext({
  refreshContent: async () => {},
  setContentFromCms: () => {},
});
const CONTENT_UPDATED_EVENT = "act4-content-updated";

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

function useSiteContent() {
  return useContext(ContentContext);
}

function useContentActions() {
  return useContext(ContentActionsContext);
}

function normalizePath(path) {
  return path.replace(/\/$/, "") || "/";
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

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xf4f4f4,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0xb8b8b8,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
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
    const points = new THREE.Points(
      pointGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.012,
        transparent: true,
        opacity: 0.32,
      }),
    );
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
            <a className={path === item.path ? "active" : ""} key={item.label} href={item.path}>
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
            <a key={item.label} href={item.path}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
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
  useEffect(() => {
    const sections = gsap.utils.toArray(".reveal-section");
    sections.forEach((section) => {
      gsap.to(section.querySelectorAll(".reveal-item"), {
        opacity: 1,
        y: 0,
        duration: 0.72,
        ease: "power3.out",
        stagger: 0.16,
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
        },
      });
    });
    return () => ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }, []);
}

function HomePage() {
  const content = useSiteContent();
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
        {content.homeIntro.map((paragraph) => (
          <p className="reveal-item" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mb-latest container">
        <section className="news reveal-section">
          <MainTitle href="/board">News</MainTitle>
          <ul className="news-list">
            {content.news.map((item) => (
              <li className="reveal-item" key={item.title}>
                <a href="/board">
                  <span className="subj">{item.title}</span>
                  <span className="cont">{item.text}</span>
                  <span className="date">{item.date}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="exhibition reveal-section">
          <MainTitle href="/works">Works</MainTitle>
          <ul className="exhibition-list">
            {content.works.map((item) => (
              <li className="reveal-item" key={item.title}>
                <a href="/works">
                  <div className="item">
                    <span className="subj">{item.title}</span>
                    <span className="date">{item.date}</span>
                  </div>
                  <span className="thumb">
                    <img src={item.image} alt="" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <a className="more-btn" href="/works">
            查看全部作品 <ArrowRight size={22} />
          </a>
        </section>

        <section className="project reveal-section">
          <MainTitle href="/people">Project</MainTitle>
          <ul className="project-list">
            {content.projects.map((item) => (
              <li className="reveal-item" key={item}>
                <a href="/people">
                  <span className="subj">{item}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="dissertation reveal-section">
          <MainTitle href="/about-lab">Archive</MainTitle>
          <ul className="archive-list">
            {content.archive.map(([title, text]) => (
              <li className="reveal-item" key={title}>
                <a href="/about-lab">
                  <span>{title}</span>
                  <span>{text}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
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

function AboutPage() {
  const content = useSiteContent();

  return (
    <PageShell title="About LAB">
      <div className="about-lab">
        <div className="sub-slogan">
          <p>{content.about.label}</p>
          <p>{content.about.title}</p>
        </div>
        {content.about.sections.map((section) => (
          <section className="cont-group reveal-section" key={section.number}>
            <p className="num reveal-item">{section.number}</p>
            <p className="subj reveal-item">{section.title}</p>
            <div className="reveal-item">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
        <div className="object-band" aria-hidden="true">
          <span>Gaze</span>
          <span>Flow</span>
          <span>Dialogue</span>
          <span>Breakthrough</span>
        </div>
        <ul className="about-list reveal-section">
          {content.archive.map(([title, text], index) => (
            <li className="reveal-item" key={title}>
              <p className="subj">
                <span className="num">{String(index + 1).padStart(2, "0")}</span>
                {title}
              </p>
              <p className="comment">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}

function PeoplePage() {
  const content = useSiteContent();

  return (
    <PageShell title="People">
      <div className="people-page reveal-section">
        <span className="professor-label reveal-item">研究方向</span>
        <div className="people-grid-page">
          {content.people.map(([title, text], index) => (
            <article className="people-card reveal-item" key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function WorksPage() {
  const content = useSiteContent();

  return (
    <PageShell title="Works">
      <div className="works-page reveal-section">
        {content.works.map((item) => (
          <article className="work-row reveal-item" key={item.title}>
            <figure>
              <img src={item.image} alt="" />
            </figure>
            <div>
              <span>{item.date}</span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function BoardPage() {
  const content = useSiteContent();

  return (
    <PageShell title="Board">
      <div className="board-page reveal-section">
        <div className="board-head reveal-item">
          <span>日期</span>
          <span>标题</span>
          <span>内容</span>
        </div>
        {content.boardRows.map(([date, title, text]) => (
          <a className="board-row reveal-item" href="/contact" key={title}>
            <span>{date}</span>
            <strong>{title}</strong>
            <p>{text}</p>
          </a>
        ))}
      </div>
    </PageShell>
  );
}

function ContactPage() {
  const content = useSiteContent();

  return (
    <PageShell title="Contact">
      <div className="contact-container reveal-section">
        <div className="item reveal-item">
          <span className="label">地址</span>
          <p className="address">{content.site.contactAddress}</p>
        </div>
        <div className="item reveal-item">
          <span className="label">邮箱</span>
          <p className="address">{content.site.contactEmail}</p>
        </div>
        <div className="item reveal-item">
          <span className="label">方向</span>
          <p className="address">{content.site.contactDirections}</p>
        </div>
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

function updateListValue(list, index, value) {
  return list.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function updateTupleValue(list, rowIndex, columnIndex, value) {
  return list.map((row, itemIndex) =>
    itemIndex === rowIndex ? row.map((cell, cellIndex) => (cellIndex === columnIndex ? value : cell)) : row,
  );
}

function SimpleListEditor({ title, items, labels, onChange }) {
  return (
    <section className="admin-panel">
      <h2>{title}</h2>
      <div className="admin-grid">
        {items.map((item, index) => (
          <div className="admin-mini-card" key={`${title}-${index}`}>
            {Array.isArray(item) ? (
              item.map((cell, columnIndex) => (
                <TextInput
                  key={`${title}-${index}-${columnIndex}`}
                  label={labels[columnIndex] || `内容 ${columnIndex + 1}`}
                  value={cell}
                  multiline={columnIndex > 0}
                  onChange={(value) => onChange(updateTupleValue(items, index, columnIndex, value))}
                />
              ))
            ) : (
              <TextInput
                label={labels[0] || "内容"}
                value={item}
                multiline
                onChange={(value) => onChange(updateListValue(items, index, value))}
              />
            )}
          </div>
        ))}
      </div>
    </section>
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
  }, [loggedIn, publicContent]);

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
    setMessage(response.ok ? "已保存，前台刷新后立即生效。" : "保存失败，请检查服务器。");
  };

  const updateWork = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      works: current.works.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const updateNews = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      news: current.news.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const updateAboutSection = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      about: {
        ...current.about,
        sections: current.about.sections.map((section, itemIndex) =>
          itemIndex === index ? { ...section, [key]: value } : section,
        ),
      },
    }));
  };

  const uploadWorkImage = async (index, file) => {
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    if (!response.ok) {
      setMessage("上传失败，请确认文件格式为图片。");
      return;
    }
    const data = await response.json();
    updateWork(index, "image", data.url);
    setMessage("图片已上传，点击保存后前台生效。");
  };

  if (!authChecked) {
    return (
      <main className="admin-screen">
        <Loader2 className="spin" />
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="admin-screen admin-login">
        <form onSubmit={login} className="admin-login-box">
          <span className="admin-kicker">ACT IV ADMIN</span>
          <h1>后台登录</h1>
          <TextInput label="用户名" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
          <TextInput
            label="密码"
            value={form.password}
            type="password"
            onChange={(value) => setForm({ ...form, password: value })}
          />
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
            <button type="button" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              保存
            </button>
            <button type="button" onClick={logout}>
              <LogOut size={18} />
              退出
            </button>
          </div>
        </div>

        <section className="admin-panel">
          <h2>基础信息</h2>
          <div className="admin-grid">
            <TextInput
              label="顶部细条文案"
              value={draft.site.topLine}
              onChange={(value) => setDraft({ ...draft, site: { ...draft.site, topLine: value } })}
            />
            <TextInput
              label="联系邮箱"
              value={draft.site.contactEmail}
              onChange={(value) => setDraft({ ...draft, site: { ...draft.site, contactEmail: value } })}
            />
            <TextInput
              label="联系地址"
              value={draft.site.contactAddress}
              multiline
              onChange={(value) => setDraft({ ...draft, site: { ...draft.site, contactAddress: value } })}
            />
            <TextInput
              label="联系方向"
              value={draft.site.contactDirections}
              multiline
              onChange={(value) => setDraft({ ...draft, site: { ...draft.site, contactDirections: value } })}
            />
            <TextInput
              label="页脚说明"
              value={draft.site.footerTagline}
              multiline
              onChange={(value) => setDraft({ ...draft, site: { ...draft.site, footerTagline: value } })}
            />
          </div>
        </section>

        <section className="admin-panel">
          <h2>首页介绍</h2>
          <div className="admin-grid">
            {draft.homeIntro.map((paragraph, index) => (
              <TextInput
                key={`home-intro-${index}`}
                label={`段落 ${index + 1}`}
                value={paragraph}
                multiline
                onChange={(value) => setDraft({ ...draft, homeIntro: updateListValue(draft.homeIntro, index, value) })}
              />
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <h2>About LAB 页面</h2>
          <div className="admin-grid">
            <TextInput
              label="介绍标签"
              value={draft.about.label}
              onChange={(value) => setDraft({ ...draft, about: { ...draft.about, label: value } })}
            />
            <TextInput
              label="介绍标题"
              value={draft.about.title}
              onChange={(value) => setDraft({ ...draft, about: { ...draft.about, title: value } })}
            />
          </div>
          <div className="admin-work-list">
            {draft.about.sections.map((section, index) => (
              <article className="admin-mini-card" key={section.number}>
                <TextInput label="编号" value={section.number} onChange={(value) => updateAboutSection(index, "number", value)} />
                <TextInput label="标题" value={section.title} onChange={(value) => updateAboutSection(index, "title", value)} />
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <TextInput
                    key={`${section.number}-${paragraphIndex}`}
                    label={`段落 ${paragraphIndex + 1}`}
                    value={paragraph}
                    multiline
                    onChange={(value) =>
                      updateAboutSection(index, "paragraphs", updateListValue(section.paragraphs, paragraphIndex, value))
                    }
                  />
                ))}
              </article>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <h2>新闻卡片</h2>
          <div className="admin-grid">
            {draft.news.map((item, index) => (
              <div className="admin-mini-card" key={`${item.title}-${index}`}>
                <TextInput label="标题" value={item.title} onChange={(value) => updateNews(index, "title", value)} />
                <TextInput label="日期 / 标签" value={item.date} onChange={(value) => updateNews(index, "date", value)} />
                <TextInput label="内容" value={item.text} multiline onChange={(value) => updateNews(index, "text", value)} />
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <h2>作品图片与内容</h2>
          <div className="admin-work-list">
            {draft.works.map((work, index) => (
              <article className="admin-work-card" key={`${work.title}-${index}`}>
                <figure>
                  <img src={work.image} alt="" />
                </figure>
                <div className="admin-work-form">
                  <TextInput label="标题" value={work.title} onChange={(value) => updateWork(index, "title", value)} />
                  <TextInput label="编号" value={work.date} onChange={(value) => updateWork(index, "date", value)} />
                  <TextInput label="说明" value={work.text} multiline onChange={(value) => updateWork(index, "text", value)} />
                  <TextInput label="图片地址" value={work.image} onChange={(value) => updateWork(index, "image", value)} />
                  <label className="upload-box">
                    <ImagePlus size={18} />
                    <span>上传替换图片</span>
                    <input type="file" accept="image/*" onChange={(event) => uploadWorkImage(index, event.target.files?.[0])} />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <SimpleListEditor
          title="Project 列表"
          items={draft.projects}
          labels={["项目内容"]}
          onChange={(items) => setDraft({ ...draft, projects: items })}
        />
        <SimpleListEditor
          title="Archive 列表"
          items={draft.archive}
          labels={["标题", "内容"]}
          onChange={(items) => setDraft({ ...draft, archive: items })}
        />
        <SimpleListEditor
          title="People / 研究方向"
          items={draft.people}
          labels={["方向名称", "方向说明"]}
          onChange={(items) => setDraft({ ...draft, people: items })}
        />
        <SimpleListEditor
          title="Board / 公告"
          items={draft.boardRows}
          labels={["日期", "标题", "内容"]}
          onChange={(items) => setDraft({ ...draft, boardRows: items })}
        />

        {message ? <p className="admin-message sticky-message">{message}</p> : null}
      </section>
    </main>
  );
}

function CurrentPage() {
  const path = normalizePath(window.location.pathname);
  if (path === "/") return <HomePage />;
  if (path === "/about-lab") return <AboutPage />;
  if (path === "/people") return <PeoplePage />;
  if (path === "/works") return <WorksPage />;
  if (path === "/board") return <BoardPage />;
  if (path === "/contact") return <ContactPage />;
  if (path === "/admin") return <AdminPage />;
  return <NotFoundPage />;
}

function AppContentProvider({ children }) {
  const [content, setContent] = useState(defaultContent);

  const setContentFromCms = useCallback((nextContent) => {
    setContent({ ...defaultContent, ...nextContent });
  }, []);

  const refreshContent = useCallback(async () => {
    const response = await fetch(`/api/content?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
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
        .then((data) => {
          if (active) setContentFromCms(data);
        })
        .catch(() => {
          if (active) setContent(defaultContent);
        });
    };
    load();

    const onFocus = () => load();
    const onUpdated = () => load();
    const onStorage = (event) => {
      if (event.key === CONTENT_UPDATED_EVENT) load();
    };
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

  const value = useMemo(() => content, [content]);
  const actions = useMemo(() => ({ refreshContent, setContentFromCms }), [refreshContent, setContentFromCms]);

  return (
    <ContentActionsContext.Provider value={actions}>
      <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
    </ContentActionsContext.Provider>
  );
}

function SiteFrame() {
  const path = normalizePath(window.location.pathname);
  const content = useSiteContent();
  const isAdmin = path === "/admin";

  if (isAdmin) return <CurrentPage />;

  return (
    <>
      <Header />
      <CurrentPage />
      <footer className="footer">
        <div className="container">
          <p>COPYRIGHT © 2026 ACT IV FUTURE VISUAL LAB</p>
          <p>{content.site.footerTagline}</p>
          <a href="/">
            <ArrowUp size={18} />
            top
          </a>
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
