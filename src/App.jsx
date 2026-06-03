// X-MASTER Pro — Premium Education CRM v3.0
import {
  useCallback, useEffect, useMemo, useReducer, useRef, useState
} from "react";
import Login from "./pages/Login.jsx";
import {
  LayoutDashboard, Users, GraduationCap, UserCircle, CreditCard,
  ClipboardCheck, Calendar, FileText, BookOpen, Star,
  Library as LibraryIcon, FolderOpen, Target, CheckSquare,
  BarChart3, Settings as SettingsIcon, Bell, Sun, Moon, RefreshCw,
  Search, X, Building2, Shield,
  Plus, Pencil, Trash2, LayoutGrid, List,
  Clock, UserCircle2, BookMarked, MoreHorizontal,
  TrendingUp, TrendingDown, ArrowRight, Eye,
  CheckCircle2, XCircle, AlertCircle, Phone, Mail,
  MapPin, Award, Layers, Save, ChevronRight, Download
} from "lucide-react";
import { supabase as db } from "./lib/supabase.js";
import { getLang } from "./lib/i18n.js";
import {
  TABLES, ORDERED_TABLES, LEAD_STAGES,
  WEEK_DAYS, TIMES, EXPENSE_CATS, PAYMENT_METHODS,
  SALARY_TYPES, BOOK_CATS, RES_TYPES
} from "./lib/constants.js";
import {
  sum, money, short, fmtDate, fmtFull, fmtTime,
  attRate, exportCSV, useDebounce
} from "./lib/utils.js";

// Pages
import Dashboard from "./pages/Dashboard.jsx";
import Students  from "./pages/Students.jsx";
import Finance   from "./pages/Finance.jsx";
import Tests     from "./pages/Tests.jsx";
import Library   from "./pages/Library.jsx";
import Tasks     from "./pages/Tasks.jsx";
import Resources from "./pages/Resources.jsx";

// UI components
import {
  ToastProvider, useToast, ConfirmProvider, useConfirm,
  Card, SectionHeader, Pill, StatusPill, ProgressBar,
  Person, Avatar, Mini, Line, Empty, MethodBadge,
  GroupLine, Notice, FinanceHeroCard
} from "./components/ui/index.jsx";

import "./index.css";

/* ── Role permissions ────────────────────────────────────────────── */
const ROLE_PAGES = {
  superadmin: ["dash","students","groups","teachers","finance","attend","sched","tests","homework","grades","library","resources","leads","tasks","reports","settings"],
  admin:      ["dash","students","groups","teachers","finance","attend","sched","tests","homework","grades","library","resources","leads","tasks","reports","settings"],
  teacher:    ["dash","groups","attend","sched","tests","homework","grades","library","resources","tasks","reports"],
  reception:  ["dash","students","groups","finance","attend","leads","tasks"],
};
const canAccess = (role, pageId) => (ROLE_PAGES[role] || ROLE_PAGES.reception).includes(pageId);

/* ── Page definitions with Lucide icons ─────────────────────────── */
const PAGES = [
  { id:"dash",      key:"dashboard",  Icon:LayoutDashboard, group:"main" },
  { id:"students",  key:"students",   Icon:Users,           group:"main" },
  { id:"groups",    key:"groups",     Icon:GraduationCap,   group:"main" },
  { id:"teachers",  key:"teachers",   Icon:UserCircle,      group:"main" },
  { id:"finance",   key:"finance",    Icon:CreditCard,      group:"main" },
  { id:"attend",    key:"attendance", Icon:ClipboardCheck,  group:"edu"  },
  { id:"sched",     key:"schedule",   Icon:Calendar,        group:"edu"  },
  { id:"tests",     key:"tests",      Icon:FileText,        group:"edu"  },
  { id:"homework",  key:"homework",   Icon:BookOpen,        group:"edu"  },
  { id:"grades",    key:"grades",     Icon:Star,            group:"edu"  },
  { id:"library",   key:"library",    Icon:LibraryIcon,     group:"res"  },
  { id:"resources", key:"resources",  Icon:FolderOpen,      group:"res"  },
  { id:"leads",     key:"leads",      Icon:Target,          group:"crm", dot:true },
  { id:"tasks",     key:"tasks",      Icon:CheckSquare,     group:"crm"  },
  { id:"reports",   key:"reports",    Icon:BarChart3,       group:"sys"  },
  { id:"settings",  key:"settings",   Icon:SettingsIcon,    group:"sys"  },
];

/* ── Data store ──────────────────────────────────────────────────── */
const DEFAULT_DATA = Object.fromEntries(TABLES.map(t => [t, []]));

function dataReducer(state, action) {
  if (action.type === "SET_ALL")   return { ...state, ...action.payload };
  if (action.type === "SET_TABLE") return { ...state, [action.table]: action.rows };
  return state;
}

/* ── Root ────────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("xm_user")); } catch { return null; }
  });

  if (!user) return <Login onLogin={u => setUser(u)} />;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppInner user={user} onLogout={() => { localStorage.removeItem("xm_user"); setUser(null); }} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

/* ── AppInner ────────────────────────────────────────────────────── */
function AppInner({ user, onLogout }) {
  const toast = useToast();
  const [lang,     setLang]     = useState(() => localStorage.getItem("xm_lang")  || "uz");
  const [theme,    setTheme]    = useState(() => localStorage.getItem("xm_theme") || "light");
  const [page,     setPage]     = useState("dash");
  const [sub,      setSub]      = useState("home");
  const [query,    setQuery]    = useState("");
  const [data,     dispatch]    = useReducer(dataReducer, DEFAULT_DATA);
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState(null);
  const [detail,   setDetail]   = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const dq = useDebounce(query, 280);
  const t  = getLang(lang);

  useEffect(() => { document.body.classList.toggle("dark", theme === "dark"); localStorage.setItem("xm_theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("xm_lang", lang); }, [lang]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        TABLES.map(async table => {
          let q = db.from(table).select("*");
          if (ORDERED_TABLES.has(table)) q = q.order("created_at", { ascending: false });
          const { data: rows } = await q;
          return [table, rows || []];
        })
      );
      dispatch({ type: "SET_ALL", payload: Object.fromEntries(results) });
      setLastSync(new Date());
    } catch { toast("Ma'lumotlar yuklanmadi", "error"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const ch = db.channel("xmaster-rt")
      .on("postgres_changes", { event: "*", schema: "public" }, () => loadAll())
      .subscribe();
    return () => db.removeChannel(ch);
  }, [loadAll]);

  useEffect(() => {
    const fn = e => {
      if (e.key === "Escape") { setModal(null); setDetail(null); }
      if (e.ctrlKey && e.key === "k") { e.preventDefault(); document.getElementById("xm-search")?.focus(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const markAllRead = useCallback(async () => {
    await db.from("notifications").update({ is_read: true }).eq("is_read", false);
    toast("Barchasi o'qildi"); loadAll();
  }, [loadAll, toast]);

  const stats = useMemo(() => {
    const income  = sum(data.payments,  "amount");
    const expense = sum(data.expenses,  "amount");
    const debtors = (data.students || []).filter(s => Number(s.balance || 0) < 0);
    return {
      income, expense, profit: income - expense,
      active:   (data.students || []).filter(s => (s.status || "active") === "active").length,
      debtors:  debtors.length,
      debt:     debtors.reduce((a, b) => a + Math.abs(Number(b.balance || 0)), 0),
      unread:   (data.notifications || []).filter(n => !n.is_read).length,
      groups:   (data.study_groups || []).length,
      teachers: (data.teachers || []).length,
    };
  }, [data]);

  const filteredStudents = useMemo(() => {
    const q = dq.toLowerCase().trim();
    return (data.students || []).filter(s =>
      !q || [s.full_name, s.phone, s.parent_phone, s.group_name].join(" ").toLowerCase().includes(q)
    );
  }, [data.students, dq]);

  const nav    = useCallback(id => { setPage(id); setSub("home"); }, []);
  const role   = user?.role || "reception";
  const shared = { t, data, stats, sub, setSub, setModal, setDetail, loadAll, nav, markAllRead, role, user };

  const PAGE_GROUPS = [
    { label: "ANA",    pages: ["dash","students","groups","teachers","finance"] },
    { label: "TA'LIM", pages: ["attend","sched","tests","homework","grades"] },
    { label: "RESURS", pages: ["library","resources"] },
    { label: "CRM",    pages: ["leads","tasks"] },
    { label: "TIZIM",  pages: ["reports","settings"] },
  ];

  return (
    <div className="shell">
      {/* ── Icon bar ─────────────────────────────────────────────── */}
      <aside className="iconbar" role="navigation">
        <div className="ib-logo">
          <div className="ib-logo-inner">XM</div>
        </div>
        {PAGE_GROUPS.map(grp => (
          <div key={grp.label} className="ib-group">
            {grp.pages.map(pid => {
              const p = PAGES.find(x => x.id === pid);
              if (!p || !canAccess(role, pid)) return null;
              const badge = p.dot ? stats.unread : 0;
              const IcoEl = p.Icon;
              return (
                <button key={pid}
                  className={`ib-btn ${page === pid ? "on" : ""}`}
                  onClick={() => nav(pid)} title={t[p.key]}>
                  {IcoEl ? <IcoEl size={18} strokeWidth={page === pid ? 2.2 : 1.8} /> : null}
                  {badge > 0 && <span className="ib-dot" />}
                </button>
              );
            })}
            <div className="ib-sep" />
          </div>
        ))}
        <div className="ib-bottom">
          <div className="ib-avatar">{((data.settings || [])[0]?.center_name || "X")[0].toUpperCase()}</div>
        </div>
      </aside>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sb-head">
          <div className="sb-brand">
            <div className="sb-logo">XM</div>
            <div>
              <div className="sb-name">X-MASTER Pro</div>
              <div className="sb-role">Education CRM</div>
            </div>
          </div>
          <label className="sb-search">
            <span className="sb-search-icon"><Search size={13} /></span>
            <input id="xm-search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={t.search} autoComplete="off" />
            {query && <button className="sb-clear" onClick={() => setQuery("")}><X size={13} /></button>}
            <kbd className="sb-search-kbd">⌘K</kbd>
          </label>
        </div>

        <nav className="sb-nav">
          {PAGE_GROUPS.map(grp => (
            <div key={grp.label}>
              <div className="sb-section">{grp.label}</div>
              {grp.pages.map(pid => {
                const p = PAGES.find(x => x.id === pid);
                if (!p || !canAccess(role, pid)) return null;
                const IcoEl = p.Icon;
                const badge =
                  p.dot ? stats.unread :
                  pid === "library" ? (data.library_loans || []).filter(l => l.status === "overdue").length || null :
                  pid === "tasks"   ? (data.tasks || []).filter(tk => tk.status === "todo").length || null : null;
                return (
                  <button key={pid} className={`nm ${page === pid ? "on" : ""}`} onClick={() => nav(pid)}>
                    <span className="nm-icon">
                      {IcoEl ? <IcoEl size={15} strokeWidth={page === pid ? 2.2 : 1.8} /> : null}
                    </span>
                    <span className="nm-txt">{t[p.key]}</span>
                    {badge > 0 && <span className={`nm-badge ${p.dot ? "" : "blue"}`}>{badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-avatar" style={{ background: user?.color || "var(--brand)", flexShrink:0 }}>
            {(user?.name || user?.username || "X")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-footer-name">{user?.name || user?.username || "Admin"}</div>
            <div className="sb-footer-role"><span className="online-dot" /> {user?.role || "superadmin"}</div>
          </div>
          <button
            onClick={onLogout}
            title="Chiqish"
            style={{ background:"transparent", border:"none", cursor:"pointer", color:"rgba(255,255,255,.3)", padding:"4px", borderRadius:"6px", display:"flex", alignItems:"center", flexShrink:0, transition:"color .15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.3)"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="main">
        <header className="topbar">
          <div className="tb-left">
            <div className="tb-page-title">{t[PAGES.find(x => x.id === page)?.key] || "Dashboard"}</div>
            <div className="tb-crumb">
              <span>X-MASTER Pro</span>
              <span className="tb-crumb-sep">›</span>
              <span>{t[PAGES.find(x => x.id === page)?.key]}</span>
              {lastSync && <><span className="tb-crumb-sep">·</span><span>🕐 {fmtTime(lastSync)}</span></>}
            </div>
          </div>
          <div className="tb-right">
            <button className="tb-icon-btn" onClick={loadAll} title="Yangilash">
              <RefreshCw size={15} className={loading ? "spin" : ""} />
            </button>
            <button className="tb-icon-btn" onClick={() => setTheme(v => v === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Yorug' rejim" : "Qorong'i rejim"}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="lang-btn-group">
              {[{v:"uz",f:"🇺🇿",l:"UZ"},{v:"ru",f:"🇷🇺",l:"RU"},{v:"en",f:"🇬🇧",l:"EN"}].map(x=>(
                <button key={x.v} className={`lang-btn ${lang===x.v?"on":""}`} onClick={()=>setLang(x.v)}>
                  {x.f} {x.l}
                </button>
              ))}
            </div>
            <select className="lang-sel" value={lang} onChange={e => setLang(e.target.value)} style={{display:"none"}}>
              <option value="uz">🇺🇿 UZ</option>
              <option value="ru">🇷🇺 RU</option>
              <option value="en">🇬🇧 EN</option>
            </select>
            {(data.branches || []).length > 1 ? (
              <select
                className="lang-sel"
                style={{ maxWidth: 130 }}
                value={(data.branches || [])[0]?.id || ""}
                onChange={() => {}}
                title="Filial tanlash"
              >
                {(data.branches || []).map(b => (
                  <option key={b.id} value={b.id}>🏢 {b.name}</option>
                ))}
              </select>
            ) : (
              <div className="tb-branch">
                <span className="tb-branch-dot" />
                <Building2 size={12} style={{ color: "var(--t4)" }} />
                <span>{(data.branches || [])[0]?.name || "Asosiy filial"}</span>
              </div>
            )}
            <button className="tb-notif-btn" onClick={() => { nav("dash"); setSub("notifications"); }}
              title="Bildirishnomalar">
              <Bell size={15} />
              {stats.unread > 0 && <span className="tb-notif-count">{stats.unread}</span>}
            </button>
            <div className="tb-user" title={`${user?.name} · ${role}`}
              style={{ background: user?.color ? undefined : "var(--brand-g)" }}>
              {(user?.name || "A")[0].toUpperCase()}
            </div>
          </div>
        </header>

        <div className="content">
          {loading && <div className="load-bar"><div className="load-prog" /></div>}
          {loading && page === "dash" && (
            <div className="skeleton-dashboard">
              <div className="skel-strip">
                {[1,2,3,4].map(i => <div key={i} className="skel-kpi" />)}
              </div>
              <div className="skel-grid">
                <div className="skel-card tall" /><div className="skel-card" /><div className="skel-card" />
              </div>
            </div>
          )}
          {/* Role-based page guard */}
          {!canAccess(role, page) ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", gap:16, opacity:.6 }}>
              <div style={{ fontSize:48 }}>🔒</div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:18, color:"var(--t3)" }}>Kirish taqiqlangan</div>
              <div style={{ fontSize:13, color:"var(--t4)" }}>Bu sahifaga sizning rolingiz kirish huquqiga ega emas</div>
            </div>
          ) : <>
            {page === "dash"      && <Dashboard  {...shared} filteredStudents={filteredStudents} />}
            {page === "students"  && <Students   {...shared} rows={filteredStudents} />}
            {page === "groups"    && <Groups     {...shared} rows={data.study_groups || []} />}
            {page === "teachers"  && <Teachers   {...shared} rows={data.teachers || []} />}
            {page === "finance"   && <Finance    {...shared} />}
            {page === "attend"    && <Attendance {...shared} />}
            {page === "sched"     && <Schedule   {...shared} />}
            {page === "tests"     && <Tests      {...shared} />}
            {page === "homework"  && <Homework   {...shared} />}
            {page === "grades"    && <Grades     {...shared} />}
            {page === "library"   && <Library    {...shared} />}
            {page === "resources" && <Resources  {...shared} />}
            {page === "leads"     && <Leads      {...shared} rows={data.leads || []} />}
            {page === "tasks"     && <Tasks      {...shared} />}
            {page === "reports"   && <Reports    {...shared} />}
            {page === "settings"  && <Settings   {...shared} />}
          </>}
        </div>
      </main>

      {modal  && <ModalForm    modal={modal}   t={t} data={data} close={() => setModal(null)}  loadAll={loadAll} />}
      {detail && <DetailDrawer detail={detail} t={t} data={data} close={() => setDetail(null)} setModal={setModal} loadAll={loadAll} />}

      {/* ── Mobile Bottom Navigation ─────────────────────────────── */}
      <nav className="mob-nav">
        {[
          { id:"dash",     Icon:LayoutDashboard, label:"Bosh" },
          { id:"students", Icon:Users,           label:"Talabalar" },
          { id:"finance",  Icon:CreditCard,      label:"Moliya" },
          { id:"attend",   Icon:ClipboardCheck,  label:"Davomat" },
          { id:"leads",    Icon:Target,          label:"CRM", dot:true },
        ].map(({ id, Icon, label, dot }) => (
          <button key={id} className={`mob-nav-btn ${page === id ? "on" : ""}`} onClick={() => nav(id)}>
            <div style={{ position:"relative", display:"inline-flex" }}>
              <Icon size={21} strokeWidth={page===id ? 2.2 : 1.8} />
              {dot && stats.unread > 0 && <span className="mob-nav-dot" />}
            </div>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   INLINE PAGE COMPONENTS
══════════════════════════════════════════════════════════════════════ */

function Groups({ t, rows, data, setModal, nav, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [view, setView] = useState("grid");

  const remove = async id => {
    if (!await confirm(t?.confirmDelete || "O'chirasizmi?")) return;
    const { error } = await db.from("study_groups").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Guruh o'chirildi"); loadAll();
  };

  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="page-fade">
      <div className="page-toolbar">
        <div className="filter-tabs">
          <button className={`filter-tab ${view === "grid" ? "on" : ""}`} onClick={() => setView("grid")}>
            <LayoutGrid size={12} /> Grid
          </button>
          <button className={`filter-tab ${view === "list" ? "on" : ""}`} onClick={() => setView("list")}>
            <List size={12} /> Ro'yxat
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "group" })}>
          <Plus size={13} /> Guruh qo'shish
        </button>
      </div>

      {safeRows.length === 0 && (
        <Empty text="Guruhlar hali yo'q" sub="Birinchi guruhingizni yarating"
          action="+ Birinchi guruh" onAction={() => setModal({ type: "group" })} />
      )}

      {view === "grid" && safeRows.length > 0 ? (
        <div className="g3">
          {safeRows.map(g => {
            const count = (data?.students || []).filter(s => s.group_name === g.name).length;
            const cap   = Number(g.capacity || 15);
            const pct   = Math.min(100, Math.round(count / cap * 100));
            return (
              <div className="grp-card" key={g.id}>
                <div className="grp-head">
                  <div>
                    <div className="grp-name">{g.name}</div>
                    <div className="grp-teacher">
                      <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12 }}>
                        <UserCircle size={12} style={{ color:"var(--t4)" }} />
                        {g.teacher_name || "—"} · {g.subject || "—"}
                      </span>
                    </div>
                  </div>
                  <Pill type={pct >= 100 ? "orange" : pct >= 80 ? "blue" : "green"}>
                    {pct >= 100 ? "To'lgan" : "Faol"}
                  </Pill>
                </div>
                <div className="grp-info" style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <Clock size={12} style={{ color:"var(--t4)", flexShrink:0 }} />
                  {g.schedule_text || "—"} · {money(g.price || 0)}
                </div>
                <div className="grp-stat">
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <Users size={12} style={{ color:"var(--t4)" }} />
                    {count}/{cap} talaba
                  </span>
                  <span style={{ fontWeight:700, color: pct >= 80 ? "var(--red)" : "var(--green)" }}>{pct}%</span>
                </div>
                <ProgressBar value={pct} color={pct >= 80 ? "red" : "green"} />
                <div className="grp-actions">
                  <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={() => nav("attend")}>
                    <ClipboardCheck size={12} /> Davomat
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: "group", row: g })}>
                    <Pencil size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm danger" onClick={() => remove(g.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="group-card add-card" onClick={() => setModal({ type: "group" })} role="button" tabIndex={0}>
            <GraduationCap size={32} strokeWidth={1} style={{ color:"var(--t4)" }} />
            <span style={{ fontSize:13.5, fontWeight:700 }}>Yangi guruh</span>
          </div>
        </div>
      ) : view === "list" ? (
        <Card>
          <table className="tbl">
            <thead><tr><th>Guruh</th><th>O'qituvchi</th><th>Fan</th><th>Narx</th><th>Bandlik</th><th>Amal</th></tr></thead>
            <tbody>
              {safeRows.map(g => {
                const count = (data?.students || []).filter(s => s.group_name === g.name).length;
                const cap   = Number(g.capacity || 15);
                const pct   = Math.min(100, Math.round(count / cap * 100));
                return (
                  <tr key={g.id} className="tbl-row">
                    <td>
                      <div style={{ fontWeight:700, fontSize:13 }}>{g.name}</div>
                      <div style={{ fontSize:11, color:"var(--t4)", marginTop:2 }}>{g.schedule_text}</div>
                    </td>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <UserCircle size={14} style={{ color:"var(--t4)", flexShrink:0 }} />
                        {g.teacher_name || "—"}
                      </div>
                    </td>
                    <td>{g.subject ? <Pill type="purple">{g.subject}</Pill> : "—"}</td>
                    <td style={{ fontWeight:900, fontVariantNumeric:"tabular-nums", color:"var(--t1)" }}>{money(g.price || 0)}</td>
                    <td style={{ width:120 }}>
                      <ProgressBar value={pct} color={pct >= 80 ? "red" : "green"} />
                      <div style={{ fontSize:10, color:"var(--t4)", marginTop:2 }}>{count}/{cap}</div>
                    </td>
                    <td><div className="row-btns">
                      <button className="btn btn-ghost btn-xs" onClick={() => setModal({ type: "group", row: g })}><Pencil size={11} /></button>
                      <button className="btn btn-ghost btn-xs danger" onClick={() => remove(g.id)}><Trash2 size={11} /></button>
                    </div></td>
                  </tr>
                );
              })}
              {!safeRows.length && <tr><td colSpan={6}><Empty text="Guruhlar yo'q" action="+ Guruh qo'shish" onAction={() => setModal({ type: "group" })} /></td></tr>}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}

function Teachers({ t, rows, data, setModal, loadAll }) {
  const toast = useToast(), confirm = useConfirm();
  const remove = async id => {
    if (!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("teachers").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("O'qituvchi o'chirildi"); loadAll();
  };
  return (
    <div className="page-fade">
      <div className="page-toolbar">
        <div />
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "teacher" })}>
          <Plus size={13} /> O'qituvchi qo'shish
        </button>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>FISH</th><th>Telefon</th><th>Fan</th><th>Maosh turi</th><th>Maosh</th><th>Guruhlar</th><th>Holat</th><th>Amal</th></tr></thead>
          <tbody>
            {rows.map(r => {
              const gc = (data.study_groups || []).filter(g => g.teacher_name === r.full_name).length;
              return (
                <tr key={r.id} className="tbl-row">
                  <td><Person name={r.full_name} sub={r.subject} /></td>
                  <td>{r.phone || "—"}</td>
                  <td>{r.subject ? <Pill>{r.subject}</Pill> : "—"}</td>
                  <td style={{ color:"var(--t3)", fontSize:12 }}>{r.salary_type || "—"}</td>
                  <td style={{ fontWeight:900, color:"var(--green)", fontVariantNumeric:"tabular-nums" }}>{money(r.salary_value)}</td>
                  <td><span className="badge" style={{ background:"var(--brand3)", color:"var(--brand)", borderColor:"var(--brand-brd)" }}>{gc}</span></td>
                  <td><StatusPill status={r.status || "active"} t={t} /></td>
                  <td><div className="row-btns">
                    <button className="btn btn-ghost btn-xs" title="Tahrirlash" onClick={() => setModal({ type: "teacher", row: r })}><Pencil size={11} /></button>
                    <button className="btn btn-ghost btn-xs danger" title="O'chirish" onClick={() => remove(r.id)}><Trash2 size={11} /></button>
                  </div></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={8}><Empty text="O'qituvchilar yo'q" sub="Yangi o'qituvchi qo'shing" action="+ O'qituvchi" onAction={() => setModal({ type: "teacher" })} /></td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Attendance({ t, data, loadAll }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0,10);
  const [selGroup,  setSelGroup]  = useState("");
  const [lessonDate,setLessonDate]= useState(today);
  const [saving,    setSaving]    = useState({});   // { studentName: true/false }
  const [notes,     setNotes]     = useState({});   // { studentName: "..." }
  const [showNote,  setShowNote]  = useState(null); // studentName

  const groups = useMemo(()=>[...new Set((data.students||[]).map(s=>s.group_name).filter(Boolean))],[data.students]);
  const students = useMemo(()=>selGroup ? (data.students||[]).filter(s=>s.group_name===selGroup) : [],[data.students,selGroup]);

  const getAtt = (name) => (data.attendance||[]).find(a=>a.student_name===name && a.lesson_date===lessonDate);
  const getRate = (name) => {
    const rows = (data.attendance||[]).filter(a=>a.student_name===name);
    if (!rows.length) return null;
    return Math.round(rows.filter(a=>a.status==="present").length/rows.length*100);
  };

  const markOne = async (studentName, status) => {
    setSaving(s=>({...s,[studentName]:true}));
    try {
      const groupName = (data.students||[]).find(s=>s.full_name===studentName)?.group_name||"";
      const note = notes[studentName]||"";
      const existing = getAtt(studentName);
      if (existing) {
        await db.from("attendance").update({status,note}).eq("id",existing.id);
      } else {
        await db.from("attendance").insert({student_name:studentName,group_name:groupName,lesson_date:lessonDate,status,note});
      }
      setShowNote(null);
      await loadAll();
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(s=>({...s,[studentName]:false})); }
  };

  const markAll = async (status) => {
    if (!students.length) return;
    setSaving(Object.fromEntries(students.map(s=>[s.full_name,true])));
    try {
      await db.from("attendance").delete().eq("group_name",selGroup).eq("lesson_date",lessonDate);
      await db.from("attendance").insert(students.map(s=>({
        student_name:s.full_name, group_name:selGroup, lesson_date:lessonDate, status, note:""
      })));
      toast(`${status==="present"?"✅":"❌"} ${students.length} talaba belgilandi`);
      await loadAll();
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving({}); }
  };

  const presentCount = students.filter(s=>getAtt(s.full_name)?.status==="present").length;
  const absentCount  = students.filter(s=>getAtt(s.full_name)?.status==="absent").length;
  const unmarkedCount= students.filter(s=>!getAtt(s.full_name)).length;

  const DAY_NAMES = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];

  return (
    <div className="page-fade" style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* ── 1. Guruh + Sana tanlash ── */}
      <div className="att-header-card">
        <div className="att-sel-row">
          <div className="att-sel-wrap">
            <span className="att-sel-label">Guruh</span>
            <select className="att-sel" value={selGroup} onChange={e=>{setSelGroup(e.target.value);setSaving({});}}>
              <option value="">— Guruh tanlang —</option>
              {groups.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="att-sel-wrap">
            <span className="att-sel-label">Sana</span>
            <input type="date" className="att-sel" value={lessonDate} onChange={e=>setLessonDate(e.target.value)}/>
          </div>
          <div className="att-day-badge">
            {DAY_NAMES[new Date(lessonDate+"T00:00").getDay()]}
          </div>
        </div>

        {selGroup && students.length > 0 && (
          <div className="att-bulk-row">
            <span style={{fontSize:12,color:"var(--t4)",fontWeight:600}}>Barchasi:</span>
            <button className="att-bulk-btn present" onClick={()=>markAll("present")}>✓ Hammasi keldi</button>
            <button className="att-bulk-btn absent"  onClick={()=>markAll("absent")}>✗ Hammasi kelmadi</button>
            <div className="att-stats">
              <span className="att-stat-chip present">{presentCount} keldi</span>
              <span className="att-stat-chip absent">{absentCount} kelmadi</span>
              <span className="att-stat-chip none">{unmarkedCount} belgilanmagan</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Talabalar ro'yxati ── */}
      {!selGroup ? (
        <div className="att-empty-state">
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:16,fontWeight:800,color:"var(--t3)"}}>Guruh tanlang</div>
          <div style={{fontSize:13,color:"var(--t4)",marginTop:6}}>Yuqoridan guruh tanlang va davomat belgilang</div>
        </div>
      ) : students.length === 0 ? (
        <div className="att-empty-state">
          <div style={{fontSize:48,marginBottom:12}}>👥</div>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:16,fontWeight:800,color:"var(--t3)"}}>Bu guruhda talabalar yo'q</div>
        </div>
      ) : (
        <div className="att-student-list">
          {students.map((s, si) => {
            const att   = getAtt(s.full_name);
            const st    = att?.status || null;
            const rate  = getRate(s.full_name);
            const isBusy= saving[s.full_name];
            const initials = (s.full_name||"?").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();

            return (
              <div key={s.id} className={`att-student-row ${st||"none"}`}>
                {/* Avatar + ism */}
                <div className="att-student-info">
                  <div className="att-student-av" style={{background: st==="present"?"#dcfce7":st==="absent"?"#fee2e2":st==="late"?"#fef3c7":"var(--card3)", color:st==="present"?"#16a34a":st==="absent"?"#dc2626":st==="late"?"#d97706":"var(--t4)"}}>
                    {initials}
                  </div>
                  <div>
                    <div className="att-student-name">{s.full_name}</div>
                    <div className="att-student-meta">
                      {s.phone && <span>{s.phone}</span>}
                      {rate !== null && <span style={{color:rate>75?"var(--green)":"var(--red)",fontWeight:700}}>{rate}%</span>}
                    </div>
                  </div>
                </div>

                {/* Tugmalar */}
                <div className="att-action-btns">
                  {[
                    {s:"present", l:"✓",  label:"Keldi",    c:"present"},
                    {s:"absent",  l:"✗",  label:"Kelmadi",  c:"absent"},
                    {s:"late",    l:"!",  label:"Kechikdi", c:"late"},
                    {s:"excused", l:"~",  label:"Sababli",  c:"excused"},
                  ].map(btn=>(
                    <button key={btn.s}
                      className={`att-btn att-btn-${btn.c} ${st===btn.s?"active":""}`}
                      onClick={()=>markOne(s.full_name, btn.s)}
                      disabled={isBusy}
                      title={btn.label}>
                      {isBusy && st!==btn.s ? <RefreshCw size={11} className="spin"/> : btn.l}
                    </button>
                  ))}
                  <button className="att-btn att-btn-note" title="Izoh" onClick={()=>setShowNote(showNote===s.full_name?null:s.full_name)}>
                    💬
                  </button>
                </div>

                {/* Izoh input */}
                {showNote===s.full_name && (
                  <div className="att-note-row">
                    <input
                      type="text"
                      placeholder="Izoh yozing (ixtiyoriy)..."
                      value={notes[s.full_name]||""}
                      onChange={e=>setNotes(n=>({...n,[s.full_name]:e.target.value}))}
                      onKeyDown={e=>{ if(e.key==="Enter" && st) markOne(s.full_name, st); }}
                      autoFocus
                      style={{fontSize:12}}
                    />
                    {st && <button className="btn btn-primary btn-xs" onClick={()=>markOne(s.full_name,st)}>Saqlash</button>}
                  </div>
                )}

                {/* Mavjud izoh */}
                {att?.note && showNote!==s.full_name && (
                  <div className="att-existing-note">💬 {att.note}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Schedule({ data, setModal }) {
  const toast  = useToast();
  const [hover, setHover] = useState(null); // {day, time}
  const [selDays, setSelDays] = useState(["Du","Se","Cho","Pay","Ju"]);

  const COLORS   = { sc_bl:"#eff6ff", sc_gr:"#f0fdf4", sc_pu:"#f5f3ff", sc_am:"#fff7ed", sc_cy:"#ecfeff", sc_pi:"#fdf2f8" };
  const COLOR_BG = ["#eff6ff","#f0fdf4","#f5f3ff","#fff7ed","#ecfeff","#fdf2f8"];
  const COLOR_BD = ["#3b82f6","#22c55e","#8b5cf6","#f97316","#06b6d4","#ec4899"];
  const days     = WEEK_DAYS.slice(0, 6); // Du - Shanba

  const allGroups = useMemo(() => [...new Set((data.schedules||[]).map(s=>s.group_name).filter(Boolean))], [data.schedules]);
  const colorIdx  = useMemo(() => Object.fromEntries(allGroups.map((g,i)=>[g,i%COLOR_BG.length])), [allGroups]);

  const isBusy = (day, time) => (data.schedules||[]).some(s=>s.day_name===day&&s.start_time===time);
  const getCells = (day, time) => (data.schedules||[]).filter(s=>s.day_name===day&&s.start_time===time);

  const DAY_SHORT = {Dushanba:"Du",Seshanba:"Se",Chorshanba:"Cho",Payshanba:"Pay",Juma:"Ju",Shanba:"Sha"};

  return (
    <div className="page-fade" style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:15,color:"var(--t1)",display:"flex",alignItems:"center",gap:7}}>
            <Calendar size={16} style={{color:"var(--brand)"}}/> Haftalik jadval
          </div>
          {/* Legend */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {allGroups.slice(0,6).map((g,i)=>(
              <span key={g} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600}}>
                <span style={{width:10,height:10,borderRadius:3,background:COLOR_BD[i%COLOR_BD.length]}}/>
                {g}
              </span>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"schedule"})}>
          <Plus size={13}/> Dars qo'shish
        </button>
      </div>

      {/* Band vaqtlar statistikasi */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {l:"Jami darslar", v:(data.schedules||[]).length, c:"var(--brand)"},
          {l:"Band soatlar", v:new Set((data.schedules||[]).map(s=>`${s.day_name}-${s.start_time}`)).size, c:"var(--orange)"},
          {l:"Bo'sh soatlar", v:TIMES.length*days.length-new Set((data.schedules||[]).map(s=>`${s.day_name}-${s.start_time}`)).size, c:"var(--green)"},
        ].map(x=>(
          <div key={x.l} style={{padding:"8px 14px",background:"var(--card)",border:"1px solid var(--line)",borderRadius:12,boxShadow:"var(--sh1)"}}>
            <div style={{fontSize:10,color:"var(--t4)",fontWeight:600}}>{x.l}</div>
            <div style={{fontSize:18,fontWeight:900,color:x.c,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{x.v}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <Card className="pad">
        <div style={{overflowX:"auto"}}>
          <div className="sch-grid" style={{gridTemplateColumns:`60px repeat(${days.length},1fr)`,minWidth:550}}>
            {/* Header */}
            <div style={{background:"transparent"}}/>
            {days.map(d=>(
              <div key={d} className="sch-day">
                <div>{DAY_SHORT[d]||d.slice(0,3)}</div>
                <div style={{fontSize:9,opacity:.6,fontWeight:500,marginTop:1}}>
                  {(data.schedules||[]).filter(s=>s.day_name===d).length} dars
                </div>
              </div>
            ))}

            {/* Rows */}
            {TIMES.map((tm,ti)=>[
              <div key={`t${ti}`} className="sch-time">{tm}</div>,
              ...days.map((day,di)=>{
                const cells = getCells(day,tm);
                const busy  = cells.length > 0;
                const isHov = hover?.day===day && hover?.time===tm;
                return (
                  <div key={`${ti}-${di}`}
                    className={`sch-c ${busy?"":"sc-mt"}`}
                    style={{
                      background: busy ? COLOR_BG[colorIdx[cells[0]?.group_name]||0] : isHov ? "var(--brand4)" : "",
                      borderLeft: busy ? `3px solid ${COLOR_BD[colorIdx[cells[0]?.group_name]||0]}` : "",
                      cursor: busy ? "default" : "pointer",
                      minHeight:44,
                      position:"relative",
                    }}
                    onMouseEnter={()=>setHover({day,time:tm})}
                    onMouseLeave={()=>setHover(null)}
                    onClick={()=>!busy&&setModal({type:"schedule",row:{day_name:day,start_time:tm}})}
                  >
                    {busy ? cells.map((c,i)=>(
                      <div key={i}>
                        <div style={{fontSize:10.5,fontWeight:800,color:COLOR_BD[colorIdx[c.group_name]||0]}}>{c.group_name}</div>
                        <div style={{fontSize:9,color:"var(--t4)",marginTop:1}}>
                          {c.room&&`Xona ${c.room} · `}{c.teacher_name?.split(" ")[0]}
                        </div>
                      </div>
                    )) : isHov ? (
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--brand)",fontSize:18,opacity:.5}}>+</div>
                    ) : null}
                  </div>
                );
              })
            ])}
          </div>
        </div>
        <div style={{display:"flex",gap:14,padding:"10px 0 0",fontSize:11,color:"var(--t4)"}}>
          <span style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:12,height:12,borderRadius:3,background:"var(--brand3)",border:"1px solid var(--brand-brd)",display:"inline-block"}}/> Bo'sh (bosib qo'shish)
          </span>
          <span style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:12,height:12,borderRadius:3,background:"#eff6ff",border:"2px solid #3b82f6",display:"inline-block"}}/> Band
          </span>
        </div>
      </Card>
    </div>
  );
}

function Leads({ t, rows, setModal, loadAll }) {
  const toast = useToast(), confirm = useConfirm();
  const [view, setView] = useState("kanban");
  const move = async (id, stage) => {
    await db.from("leads").update({ stage }).eq("id", id);
    toast(`→ ${LEAD_STAGES.find(s => s.id === stage)?.label}`); loadAll();
  };
  const remove = async id => {
    if (!await confirm(t.confirmDelete)) return;
    await db.from("leads").delete().eq("id", id);
    toast("Lid o'chirildi"); loadAll();
  };
  return (
    <div className="page-fade">
      <div className="page-toolbar">
        <div className="filter-tabs">
          <button className={`filter-tab ${view === "kanban" ? "on" : ""}`} onClick={() => setView("kanban")}>
            <Layers size={12} /> Kanban
          </button>
          <button className={`filter-tab ${view === "list" ? "on" : ""}`} onClick={() => setView("list")}>
            <List size={12} /> Ro'yxat
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "lead" })}>
          <Plus size={13} /> Yangi lid
        </button>
      </div>
      {view === "kanban" ? (
        <div className="kanban">
          {LEAD_STAGES.map(({ id: st, label, color }) => (
            <div className="kb-col" key={st}>
              <div className={`kb-hd ${color}`}>
                <span>{label}</span>
                <span className={`pill pill-${color}`} style={{ fontSize:10 }}>{rows.filter(x => x.stage === st).length}</span>
              </div>
              <div className="kb-list">
                {rows.filter(x => x.stage === st).map(l => (
                  <div className="kb-card" key={l.id}>
                    <div className="kb-name">{l.full_name}</div>
                    <div className="kb-meta" style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <Phone size={10} style={{ color:"var(--t4)", flexShrink:0 }} />
                      {l.phone || "—"}{l.source && ` · ${l.source}`}
                    </div>
                    {l.interested_course && (
                      <div className="kb-course" style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <BookOpen size={10} style={{ flexShrink:0 }} /> {l.interested_course}
                      </div>
                    )}
                    <div className="kb-moves">
                      {LEAD_STAGES.filter(s => s.id !== st).slice(0, 3).map(s => (
                        <button key={s.id} className="kb-move"
                          style={{ display:"flex", alignItems:"center", gap:3 }}
                          onClick={() => move(l.id, s.id)}>
                          <ArrowRight size={8} /> {s.label.slice(0, 8)}
                        </button>
                      ))}
                    </div>
                    <button className="kb-del" onClick={() => remove(l.id)}><Trash2 size={10} /></button>
                  </div>
                ))}
                {!rows.filter(x => x.stage === st).length && <div className="kb-empty">Bo'sh</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <table className="tbl">
            <thead><tr><th>FISH</th><th>Tel</th><th>Manba</th><th>Kurs</th><th>Bosqich</th><th>Sana</th><th>Amal</th></tr></thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id} className="tbl-row">
                  <td><b>{l.full_name}</b></td><td>{l.phone || "—"}</td><td>{l.source || "—"}</td>
                  <td>{l.interested_course || "—"}</td>
                  <td><Pill type={LEAD_STAGES.find(s => s.id === l.stage)?.color || "blue"}>{LEAD_STAGES.find(s => s.id === l.stage)?.label || l.stage}</Pill></td>
                  <td className="c-muted">{fmtDate(l.created_at)}</td>
                  <td><div className="row-btns">
                    <button className="btn btn-ghost btn-xs" onClick={() => setModal({ type: "lead", row: l })}>✎</button>
                    <button className="btn btn-ghost btn-xs danger" onClick={() => remove(l.id)}>✕</button>
                  </div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7}><Empty text="Lidlar yo'q" icon="📣" /></td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Homework({ t, data, setModal, loadAll }) {
  const toast = useToast(), confirm = useConfirm();
  const remove = async id => {
    if (!await confirm(t.confirmDelete)) return;
    await db.from("homework").delete().eq("id", id);
    toast("Vazifa o'chirildi"); loadAll();
  };
  return (
    <div className="page-fade">
      <div className="pg-toolbar"><b style={{ fontWeight: 900 }}>📚 Uy vazifalari</b><button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "homework" })}>+ Vazifa</button></div>
      <div className="g3">
        {(data.homework || []).map(hw => {
          const subs = (data.homework_submissions || []).filter(s => s.homework_id === hw.id);
          return (
            <Card key={hw.id} className="pad">
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{hw.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                {hw.group_name && <span>👥 {hw.group_name} · </span>}
                {hw.due_date && <span>📅 {fmtDate(hw.due_date)}</span>}
              </div>
              {hw.description && <div style={{ fontSize: 11.5, color: "var(--text-sub)", marginBottom: 8 }}>{hw.description}</div>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <StatusPill status={hw.status} t={t} /><span style={{ fontSize: 11, color: "var(--text-sub)" }}>{subs.length} topshirdi</span>
              </div>
              <div className="grp-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: "homework", row: hw })}>✎</button>
                <button className="btn btn-ghost btn-sm danger" onClick={() => remove(hw.id)}>✕</button>
              </div>
            </Card>
          );
        })}
        <div className="group-card add-card" onClick={() => setModal({ type: "homework" })} role="button" tabIndex={0}>
          <span className="add-ico">📚</span><span>Vazifa qo'shish</span>
        </div>
      </div>
    </div>
  );
}

function Grades({ t, data, setModal, loadAll }) {
  const toast = useToast(), confirm = useConfirm();
  const [filter, setFilter] = useState("all");
  const grades   = data.grades || [];
  const filtered = filter === "all" ? grades : grades.filter(g => g.grade_type === filter);
  const remove = async id => {
    if (!await confirm(t.confirmDelete)) return;
    await db.from("grades").delete().eq("id", id);
    toast("Baho o'chirildi"); loadAll();
  };
  return (
    <div className="page-fade">
      <div className="pg-toolbar">
        <div className="tabs">
          {[["all","Barchasi"],["homework","Uy vazifasi"],["test","Test"],["exam","Imtihon"]].map(([v, l]) => (
            <button key={v} className={`ftab ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "grade" })}>+ Baho</button>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>Talaba</th><th>Guruh</th><th>Fan</th><th>Tur</th><th>Ball</th><th>Sana</th><th>Amal</th></tr></thead>
          <tbody>
            {filtered.map(g => {
              const pct = Math.round(Number(g.score || 0) / Number(g.max_score || 10) * 100);
              return (
                <tr key={g.id} className="tbl-row">
                  <td><b>{g.student_name || "—"}</b></td>
                  <td>{g.group_name ? <Pill>{g.group_name}</Pill> : "—"}</td>
                  <td>{g.subject || "—"}</td>
                  <td><Pill type={g.grade_type === "exam" ? "red" : g.grade_type === "test" ? "orange" : "blue"}>{g.grade_type || "—"}</Pill></td>
                  <td><span style={{ fontWeight: 900, fontSize: 15, color: pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--warning)" : "var(--danger)" }}>{g.score}</span><span style={{ color: "var(--muted)", fontSize: 11 }}>/{g.max_score || 10}</span></td>
                  <td className="c-muted">{fmtDate(g.lesson_date || g.created_at)}</td>
                  <td><button className="btn btn-ghost btn-xs danger" onClick={() => remove(g.id)}>✕</button></td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={7}><Empty text="Baholar yo'q" icon="⭐" /></td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ── SVG Chart helpers ───────────────────────────────────────────── */
function SvgBarChart({ data, height = 160, barW = 28, gap = 12 }) {
  if (!data?.length) return <Empty text="Ma'lumot yo'q" />;
  const max = Math.max(...data.flatMap(d => [d.a || 0, d.b || 0]), 1);
  const totalW = data.length * (barW * 2 + gap + 10);
  return (
    <svg width="100%" viewBox={`0 0 ${Math.max(totalW, 300)} ${height + 32}`} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const x = i * (barW * 2 + gap + 10) + 5;
        const ha = Math.round((d.a || 0) / max * height);
        const hb = Math.round((d.b || 0) / max * height);
        return (
          <g key={i}>
            {/* Bar A (income) */}
            <rect x={x} y={height - ha} width={barW} height={ha || 2}
              rx={4} fill="url(#gIncome)" />
            {ha > 16 && <text x={x + barW / 2} y={height - ha - 4} textAnchor="middle"
              fontSize={8} fill="var(--green)" fontWeight={700}>{short(d.a)}</text>}
            {/* Bar B (expense) */}
            <rect x={x + barW + 3} y={height - hb} width={barW} height={hb || 2}
              rx={4} fill="url(#gExpense)" />
            {hb > 16 && <text x={x + barW + 3 + barW / 2} y={height - hb - 4} textAnchor="middle"
              fontSize={8} fill="var(--red)" fontWeight={700}>{short(d.b)}</text>}
            {/* Label */}
            <text x={x + barW} y={height + 14} textAnchor="middle"
              fontSize={9} fill="var(--t4)" fontWeight={600}>{d.label}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#f87171" stopOpacity=".6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SvgLineChart({ points, height = 120, color = "#4f6ef7" }) {
  if (!points?.length || points.length < 2) return <Empty text="Yetarli ma'lumot yo'q" />;
  const max = Math.max(...points.map(p => p.v), 1);
  const w = 280, pad = 10;
  const step = (w - pad * 2) / (points.length - 1);
  const toY = v => height - pad - Math.round(v / max * (height - pad * 2));
  const coords = points.map((p, i) => ({ x: pad + i * step, y: toY(p.v), ...p }));
  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${pad} ${height} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height + 20}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`lg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={pad} y1={toY(max * f)} x2={w - pad} y2={toY(max * f)}
          stroke="var(--line)" strokeWidth={1} strokeDasharray="4 4" />
      ))}
      {/* Area fill */}
      <path d={areaD} fill={`url(#lg-${color.replace("#","")})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots + labels */}
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={3.5} fill={color} stroke="var(--card)" strokeWidth={2} />
          <text x={c.x} y={height + 16} textAnchor="middle" fontSize={8.5} fill="var(--t4)" fontWeight={600}>{c.label}</text>
        </g>
      ))}
    </svg>
  );
}

function SvgDonut({ slices, size = 100 }) {
  const r = 36, cx = size / 2, cy = size / 2, stroke = 14;
  const total = slices.reduce((s, x) => s + x.v, 0) || 1;
  let offset = 0;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      {slices.map((s, i) => {
        const dash = (s.v / total) * circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray .5s" }}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--t1)">
        {Math.round(slices[0]?.v / total * 100) || 0}%
      </text>
    </svg>
  );
}

function Reports({ t, data, stats, sub, setSub }) {
  const byMonth = useMemo(() => {
    const map = {};
    (data.payments || []).forEach(r => { if (!r.created_at) return; const m = r.created_at.slice(0, 7); if (!map[m]) map[m] = { income: 0, expense: 0 }; map[m].income += Number(r.amount || 0); });
    (data.expenses || []).forEach(r => { if (!r.created_at) return; const m = r.created_at.slice(0, 7); if (!map[m]) map[m] = { income: 0, expense: 0 }; map[m].expense += Number(r.amount || 0); });
    return Object.entries(map).sort().slice(-6);
  }, [data]);

  const barData = byMonth.map(([m, v]) => ({ label: m.slice(5), a: v.income, b: v.expense }));

  const growthPoints = useMemo(() => {
    const map = {};
    (data.students || []).forEach(s => { if (!s.created_at) return; const m = s.created_at.slice(0, 7); map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).sort().slice(-7).map(([m, v]) => ({ label: m.slice(5), v }));
  }, [data.students]);

  const leadSources = useMemo(() => {
    const map = {};
    (data.leads || []).forEach(l => { const s = l.source || "other"; map[s] = (map[s] || 0) + 1; });
    const colors = { instagram:"#e1306c", telegram:"#24a1de", facebook:"#1877f2", friend:"#10b981", call:"#f59e0b", other:"#6366f1" };
    return Object.entries(map).map(([k, v]) => ({ label: k, v, color: colors[k] || "#94a3b8" }));
  }, [data.leads]);

  const attGroups = useMemo(() => {
    return [...new Set((data.attendance || []).map(a => a.group_name).filter(Boolean))].map(grp => {
      const rows = (data.attendance || []).filter(a => a.group_name === grp);
      return { label: grp, v: attRate(rows) };
    });
  }, [data.attendance]);

  return (
    <div className="page-fade">
      <div className="pg-toolbar">
        <div className="tabs">
          {[["home","💰 Moliya"],["growth","📈 O'sish"],["attendance","📋 Davomat"],["teachers","👨‍🏫 O'qituvchilar"]].map(([id, label]) => (
            <button key={id} className={`ftab ${sub === id ? "on" : ""}`} onClick={() => setSub(id)}>{label}</button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(data.payments, "hisobot")}>⇩ Excel</button>
      </div>

      {/* ── MOLIYA ── */}
      {sub === "home" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="g2">
            <Mini title="Daromad" value={money(stats.income)} tone="green" />
            <Mini title="Xarajat" value={money(stats.expense)} tone="red" />
            <Mini title="Foyda"   value={money(stats.profit)} tone={stats.profit >= 0 ? "blue" : "red"} />
            <Mini title="Qarz"    value={money(stats.debt)}   tone="red" />
          </div>
          <Card className="pad">
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:14, color:"var(--t1)", marginBottom:4 }}>
                📊 Oylik moliyaviy ko'rinish
              </div>
              <div style={{ display:"flex", gap:14, fontSize:11, color:"var(--t4)" }}>
                <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:"#10b981", display:"inline-block" }} /> Daromad
                </span>
                <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:"#ef4444", display:"inline-block" }} /> Xarajat
                </span>
              </div>
            </div>
            {barData.length ? <SvgBarChart data={barData} /> : <Empty text="Ma'lumot yo'q" />}
          </Card>
          <Card className="pad">
            <SectionHeader title="Ko'rsatkichlar" />
            {[
              ["Jami to'lovlar",`${(data.payments||[]).length} ta`],
              ["Jami xarajatlar",`${(data.expenses||[]).length} ta`],
              ["Qarzdorlar",`${stats.debtors} ta · ${money(stats.debt)}`],
              ["Faol talabalar", stats.active],
              ["Guruhlar", stats.groups],
            ].map(([l, r]) => <div key={l} className="line"><span>{l}</span><b>{r}</b></div>)}
          </Card>
        </div>
      )}

      {/* ── O'SISH ── */}
      {sub === "growth" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card className="pad">
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:14, color:"var(--t1)", marginBottom:16 }}>
              📈 Talabalar o'sish dinamikasi
            </div>
            <SvgLineChart points={growthPoints} color="#4f6ef7" />
          </Card>
          <div className="g2">
            {/* Lead manbalari donut */}
            <Card className="pad">
              <div style={{ fontWeight:800, fontSize:13, marginBottom:14 }}>🎯 Lid manbalari</div>
              {leadSources.length ? (
                <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                  <SvgDonut slices={leadSources} size={110} />
                  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                    {leadSources.map(s => (
                      <div key={s.label} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11 }}>
                        <span style={{ width:9, height:9, borderRadius:3, background:s.color, flexShrink:0 }} />
                        <span style={{ color:"var(--t3)", fontWeight:600, textTransform:"capitalize" }}>{s.label}</span>
                        <span style={{ marginLeft:"auto", fontWeight:800, color:"var(--t1)" }}>{s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <Empty text="Lidlar yo'q" />}
            </Card>
            {/* Holat */}
            <Card className="pad">
              <div style={{ fontWeight:800, fontSize:13, marginBottom:14 }}>👥 Talabalar holati</div>
              {[
                ["Faol",      (data.students||[]).filter(s=>(s.status||"active")==="active").length, "#10b981"],
                ["Muzlatilgan",(data.students||[]).filter(s=>s.status==="frozen").length,             "#f59e0b"],
                ["Arxiv",     (data.students||[]).filter(s=>s.status==="archived").length,            "#94a3b8"],
                ["Jami",      (data.students||[]).length,                                              "#4f6ef7"],
              ].map(([l, v, c]) => (
                <div key={l} className="line">
                  <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:50, background:c, flexShrink:0 }} />{l}
                  </span>
                  <b style={{ color:c }}>{v}</b>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── DAVOMAT ── */}
      {sub === "attendance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card className="pad">
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:14, color:"var(--t1)", marginBottom:16 }}>
              📋 Guruhlar bo'yicha davomat
            </div>
            {attGroups.length ? (
              <SvgLineChart points={attGroups.map(g => ({ label: g.label.slice(0,6), v: g.v }))} color="#10b981" />
            ) : <Empty text="Ma'lumot yo'q" />}
          </Card>
          <div className="g2">
            <Card className="pad">
              <SectionHeader title="Guruhlar reytingi" />
              {attGroups.sort((a,b)=>b.v-a.v).map(g => (
                <div key={g.label} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:11 }}>
                    <span style={{ fontWeight:700 }}>{g.label}</span>
                    <span style={{ color: g.v>75 ? "var(--green)" : "var(--red)", fontWeight:800 }}>{g.v}%</span>
                  </div>
                  <div style={{ height:7, background:"var(--line)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${g.v}%`, background: g.v>75 ? "var(--green)" : "var(--red)", borderRadius:4, transition:"width .4s" }} />
                  </div>
                </div>
              ))}
              {!attGroups.length && <Empty text="Ma'lumot yo'q" />}
            </Card>
            <Card className="pad">
              <SectionHeader title="Umumiy statistika" />
              {[
                ["O'rtacha",  `${attRate(data.attendance||[])}%`],
                ["Keldi",     (data.attendance||[]).filter(a=>a.status==="present").length],
                ["Kelmadi",   (data.attendance||[]).filter(a=>a.status==="absent").length],
                ["Kechikdi",  (data.attendance||[]).filter(a=>a.status==="late").length],
                ["Sababli",   (data.attendance||[]).filter(a=>a.status==="excused").length],
              ].map(([l, r]) => <div key={l} className="line"><span>{l}</span><b>{r}</b></div>)}
            </Card>
          </div>
        </div>
      )}

    </div>
  );
}

function Settings({ t, data, setModal, loadAll }) {
  const toast = useToast();
  const s = (data.settings || [])[0] || {};
  const [form, setFormData] = useState({
    center_name: s.center_name || "X-MASTER Pro",
    phone: s.phone || "",
    address: s.address || ""
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const op = s.id
      ? db.from("settings").update(form).eq("id", s.id)
      : db.from("settings").insert(form);
    const { error } = await op;
    setSaving(false);
    if (error) return toast(error.message, "error");
    toast("Sozlamalar saqlandi"); loadAll();
  };

  const SETTING_FIELDS = [
    { k: "center_name", label: "Markaz nomi",   Icon: Building2  },
    { k: "phone",       label: "Telefon raqami", Icon: Phone      },
    { k: "address",     label: "Manzil",         Icon: MapPin     },
  ];

  const ROLES = [
    { role:"Superadmin",  desc:"Barcha funksiyalar",   tone:"green",  Icon: Shield    },
    { role:"Admin",       desc:"Asosiy funksiyalar",    tone:"blue",   Icon: UserCircle},
    { role:"O'qituvchi",  desc:"Davomat va jadval",     tone:"orange", Icon: GraduationCap },
    { role:"Kassa",       desc:"Moliya bo'limi",        tone:"purple", Icon: CreditCard},
  ];

  const STATS_DATA = [
    ["Talabalar",   (data.students||[]).length,      "var(--brand)"],
    ["Guruhlar",    (data.study_groups||[]).length,   "var(--purple)"],
    ["O'qituvchilar",(data.teachers||[]).length,     "var(--cyan)"],
    ["To'lovlar",   (data.payments||[]).length,       "var(--green)"],
    ["Davomat",     (data.attendance||[]).length,     "var(--yellow)"],
    ["Lidlar",      (data.leads||[]).length,          "var(--orange)"],
    ["Testlar",     (data.tests||[]).length,          "var(--red)"],
    ["Kitoblar",    (data.library_books||[]).length,  "var(--teal)"],
    ["Resurslar",   (data.resources||[]).length,      "var(--indigo)"],
    ["Vazifalar",   (data.tasks||[]).length,          "var(--pink)"],
  ];

  return (
    <div className="page-enter grid2">
      {/* Markaz ma'lumoti */}
      <Card className="pad">
        <div className="card-hd" style={{ marginBottom:18 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Building2 size={15} strokeWidth={1.75} style={{ color:"var(--brand)" }} />
              </div>
              <div className="card-title">Markaz ma'lumoti</div>
            </div>
          </div>
        </div>
        {SETTING_FIELDS.map(({ k, label, Icon: I }) => (
          <label key={k} style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
            <span style={{ fontSize:12, fontWeight:600, color:"var(--t3)", display:"flex", alignItems:"center", gap:5 }}>
              <I size={12} style={{ color:"var(--t4)" }} /> {label}
            </span>
            <input type="text" value={form[k] || ""} placeholder={label}
              onChange={e => setFormData(f => ({ ...f, [k]: e.target.value }))} />
          </label>
        ))}
        <button className="btn btn-primary" style={{ width:"100%", marginTop:4 }}
          onClick={save} disabled={saving}>
          {saving
            ? <><RefreshCw size={13} className="spin" /> Saqlanmoqda...</>
            : <><Save size={13} /> Saqlash</>}
        </button>
      </Card>

      {/* Filiallar */}
      <BranchManager data={data} loadAll={loadAll} toast={toast} setModal={setModal} />

      {/* Rollar */}
      <Card className="pad">
        <div className="card-hd" style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"#f5f3ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Shield size={15} strokeWidth={1.75} style={{ color:"var(--purple)" }} />
            </div>
            <div className="card-title">Rollar / Ruxsatlar</div>
          </div>
        </div>
        {ROLES.map(({ role, desc, tone, Icon: I }) => (
          <div key={role} className="line" style={{ alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:"var(--card2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I size={13} strokeWidth={1.75} style={{ color:"var(--t3)" }} />
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:12.5, color:"var(--t1)" }}>{role}</div>
                <div style={{ fontSize:10.5, color:"var(--t4)" }}>{desc}</div>
              </div>
            </div>
            <Pill type={tone}>Faol</Pill>
          </div>
        ))}
      </Card>

      {/* Statistika */}
      <Card className="pad">
        <div className="card-hd" style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <BarChart3 size={15} strokeWidth={1.75} style={{ color:"var(--brand)" }} />
            </div>
            <div className="card-title">Tizim statistikasi</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {STATS_DATA.map(([label, val, color]) => (
            <div key={label} style={{ background:"var(--card2)", border:"1px solid var(--line)", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:18, fontWeight:900, color, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:"-.3px" }}>{val}</div>
              <div style={{ fontSize:11, color:"var(--t4)", marginTop:2, fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Telegram sozlamalari — to'liq 2 ustun */}
      <TelegramSettings data={data} toast={toast} />
    </div>
  );
}

/* ── Branch Manager ─────────────────────────────────────────────── */
function BranchManager({ data, loadAll, toast, setModal }) {
  const confirm = useConfirm();
  const [editId,   setEditId]   = useState(null);
  const [editName, setEditName] = useState("");
  const [editAddr, setEditAddr] = useState("");
  const [saving,   setSaving]   = useState(false);

  const deleteBranch = async (id, name) => {
    if (!await confirm(`"${name}" filialini o'chirasizmi?`)) return;
    const { error } = await db.from("branches").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Filial o'chirildi"); loadAll();
  };

  const saveEdit = async () => {
    if (!editName.trim()) return toast("Filial nomi kerak","warning");
    setSaving(true);
    const { error } = await db.from("branches").update({ name:editName, address:editAddr }).eq("id",editId);
    setSaving(false);
    if (error) return toast(error.message,"error");
    toast("Saqlandi"); setEditId(null); loadAll();
  };

  return (
    <Card className="pad">
      <div className="card-hd" style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"var(--brand3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Building2 size={15} strokeWidth={1.75} style={{ color:"var(--brand)" }} />
          </div>
          <div className="card-title">Filiallar</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type:"branch" })}>
          <Plus size={12} /> Qo'shish
        </button>
      </div>

      {(data.branches || []).length ? (data.branches || []).map(b => (
        <div key={b.id}>
          {editId === b.id ? (
            <div style={{ background:"var(--card2)", borderRadius:12, padding:"12px", marginBottom:8, border:"1px solid var(--brand-brd)" }}>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <input placeholder="Filial nomi *" value={editName} onChange={e=>setEditName(e.target.value)} style={{ flex:1 }} />
                <input placeholder="Manzil" value={editAddr} onChange={e=>setEditAddr(e.target.value)} style={{ flex:2 }} />
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>
                  {saving ? <RefreshCw size={11} className="spin"/> : <><Save size={11}/> Saqlash</>}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setEditId(null)}>Bekor</button>
              </div>
            </div>
          ) : (
            <div className="line" style={{ alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"var(--brand3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <MapPin size={15} style={{ color:"var(--brand)" }} />
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{b.name}</div>
                  <div style={{ fontSize:11, color:"var(--t4)" }}>{b.address || "Manzil kiritilmagan"}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button className="btn btn-ghost btn-xs" onClick={()=>{ setEditId(b.id); setEditName(b.name); setEditAddr(b.address||""); }}>
                  <Pencil size={11}/>
                </button>
                <button className="btn btn-ghost btn-xs danger" onClick={()=>deleteBranch(b.id, b.name)}>
                  <Trash2 size={11}/>
                </button>
              </div>
            </div>
          )}
        </div>
      )) : (
        <div style={{ textAlign:"center", padding:"24px 0", color:"var(--t4)", fontSize:12 }}>
          Filiallar yo'q — qo'shish tugmasini bosing
        </div>
      )}
    </Card>
  );
}

/* ── Telegram Settings ───────────────────────────────────────────── */
function TelegramSettings({ data, toast }) {
  const [token,   setToken]   = useState(localStorage.getItem("xm_tg_token")  || "");
  const [chatId,  setChatId]  = useState(localStorage.getItem("xm_tg_chat")   || "");
  const [msg,     setMsg]     = useState("Salom! Bu X-MASTER Pro test xabari 👋");
  const [sending, setSending] = useState(false);
  const [status,  setStatus]  = useState(null); // null | "ok" | "error"

  const save = () => {
    localStorage.setItem("xm_tg_token", token);
    localStorage.setItem("xm_tg_chat",  chatId);
    toast("Telegram sozlamalari saqlandi");
  };

  const sendTest = async () => {
    if (!token || !chatId) return toast("Token va Chat ID kiritilishi shart", "warning");
    setSending(true); setStatus(null);
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode:"HTML" }) }
      );
      const json = await res.json();
      if (json.ok) { setStatus("ok"); toast("✅ Xabar yuborildi!"); }
      else         { setStatus("error"); toast(json.description || "Xato", "error"); }
    } catch { setStatus("error"); toast("Tarmoq xatosi", "error"); }
    setSending(false);
  };

  const sendDebtors = async () => {
    const debtors = (data.students||[]).filter(s=>Number(s.balance||0)<0);
    if (!token || !chatId) return toast("Avval Telegram sozlang", "warning");
    if (!debtors.length)   return toast("Qarzdorlar yo'q 🎉");
    setSending(true);
    const text = `📢 <b>Qarzdorlar ro'yxati</b>\n\n` +
      debtors.slice(0,10).map((s,i)=>`${i+1}. ${s.full_name} — ${new Intl.NumberFormat("uz-UZ").format(Math.abs(Number(s.balance)))} so'm`).join("\n") +
      (debtors.length>10 ? `\n\n...va yana ${debtors.length-10} ta` : "");
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`,
        { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ chat_id:chatId, text, parse_mode:"HTML" }) });
      const json = await res.json();
      if (json.ok) toast(`✅ ${debtors.length} ta qarzdor ro'yxati yuborildi`);
      else toast(json.description||"Xato","error");
    } catch { toast("Tarmoq xatosi","error"); }
    setSending(false);
  };

  return (
    <div style={{ gridColumn:"1/-1", background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", padding:20, boxShadow:"var(--sh1)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"#e0f2fe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
          ✈️
        </div>
        <div>
          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:14, color:"var(--t1)" }}>Telegram Bot Integratsiya</div>
          <div style={{ fontSize:11, color:"var(--t4)" }}>Xabar yuborish, bildirishnomalar, qarzdorlar ro'yxati</div>
        </div>
        {status === "ok"    && <span style={{ marginLeft:"auto", background:"#dcfce7", color:"#166534", borderRadius:8, padding:"4px 12px", fontSize:11, fontWeight:700 }}>✓ Ulangan</span>}
        {status === "error" && <span style={{ marginLeft:"auto", background:"#fee2e2", color:"#991b1b", borderRadius:8, padding:"4px 12px", fontSize:11, fontWeight:700 }}>✕ Xato</span>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <label style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <span style={{ fontSize:11, fontWeight:600, color:"var(--t4)" }}>Bot Token</span>
          <input type="password" value={token} onChange={e=>setToken(e.target.value)}
            placeholder="1234567890:ABCdef..."
            style={{ fontFamily:"monospace", fontSize:11 }} />
          <span style={{ fontSize:10, color:"var(--t4)" }}>
            <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color:"var(--brand)" }}>@BotFather</a> dan oling
          </span>
        </label>
        <label style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <span style={{ fontSize:11, fontWeight:600, color:"var(--t4)" }}>Chat ID</span>
          <input type="text" value={chatId} onChange={e=>setChatId(e.target.value)}
            placeholder="-1001234567890" />
          <span style={{ fontSize:10, color:"var(--t4)" }}>
            Guruh yoki kanal ID. <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={{ color:"var(--brand)" }}>@userinfobot</a> dan toping
          </span>
        </label>
      </div>

      <label style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:600, color:"var(--t4)" }}>Test xabar matni</span>
        <textarea rows={2} value={msg} onChange={e=>setMsg(e.target.value)}
          style={{ resize:"vertical", fontFamily:"inherit", fontSize:12 }} />
      </label>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={save}>
          <Save size={12}/> Saqlash
        </button>
        <button className="btn btn-ghost btn-sm" onClick={sendTest} disabled={sending}>
          {sending ? <><RefreshCw size={12} className="spin"/> Yuborilmoqda...</>
                   : <>✈️ Test xabar yuborish</>}
        </button>
        <button className="btn btn-ghost btn-sm danger" onClick={sendDebtors} disabled={sending}>
          ⚠️ Qarzdorlarga xabar ({(data.students||[]).filter(s=>Number(s.balance||0)<0).length} ta)
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MODAL FORM
══════════════════════════════════════════════════════════════════════ */
function ModalForm({ modal, t, data, close, loadAll }) {
  const toast = useToast();
  const isEdit = !!modal.row?.id;
  const [form,   setForm]   = useState(modal.row || {});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const firstRef = useRef(null);
  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 80); }, []);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })); };

  const CONFIGS = {
    student: { title: isEdit ? "Talabani tahrirlash" : "+ Yangi talaba", table: "students", fields: [
      {k:"full_name",label:"FISH",req:true},{k:"phone",label:"Telefon",type:"tel"},{k:"parent_phone",label:"Ota-ona tel",type:"tel"},
      {k:"group_name",label:"Guruh",type:"select",opts:(data.study_groups||[]).map(g=>({v:g.name,l:g.name}))},
      {k:"balance",label:"Balans",type:"number"},{k:"discount",label:"Chegirma %",type:"number"},{k:"birth_date",label:"Tug'ilgan",type:"date"},
      {k:"source",label:"Manba",type:"select",opts:[{v:"instagram",l:"Instagram"},{v:"telegram",l:"Telegram"},{v:"friend",l:"Do'stdan"},{v:"other",l:"Boshqa"}]},
      {k:"status",label:"Holat",type:"select",opts:[{v:"active",l:"Faol"},{v:"frozen",l:"Muzlatilgan"},{v:"archived",l:"Arxiv"}]},
      {k:"note",label:"Izoh",full:true}
    ]},
    group: { title: isEdit ? "Guruhni tahrirlash" : "+ Yangi guruh", table: "study_groups", fields: [
      {k:"name",label:"Guruh nomi",req:true},{k:"subject",label:"Fan",req:true},
      {k:"teacher_name",label:"O'qituvchi",type:"select",opts:(data.teachers||[]).map(tc=>({v:tc.full_name,l:tc.full_name}))},
      {k:"price",label:"Narx",type:"number"},{k:"capacity",label:"Sig'im",type:"number"},
      {k:"start_date",label:"Boshlanish",type:"date"},{k:"end_date",label:"Tugash",type:"date"},
      {k:"schedule_text",label:"Jadval",full:true},
      {k:"status",label:"Holat",type:"select",opts:[{v:"active",l:"Faol"},{v:"closed",l:"Yopilgan"}]}
    ]},
    teacher: { title: isEdit ? "O'qituvchini tahrirlash" : "+ Yangi o'qituvchi", table: "teachers", fields: [
      {k:"full_name",label:"FISH",req:true},{k:"phone",label:"Telefon",type:"tel"},{k:"email",label:"Email",type:"email"},{k:"subject",label:"Fan"},
      {k:"salary_type",label:"Maosh turi",type:"select",opts:SALARY_TYPES},
      {k:"salary_value",label:"Maosh",type:"number"},{k:"hire_date",label:"Ishga kirgan",type:"date"},
      {k:"status",label:"Holat",type:"select",opts:[{v:"active",l:"Faol"},{v:"inactive",l:"Nofaol"},{v:"on_leave",l:"Ta'tilda"}]}
    ]},
    payment: { title: "To'lov qabul", table: "payments", fields: [
      {k:"student_name",label:"Talaba",req:true,type:"select",opts:(data.students||[]).map(s=>({v:s.full_name,l:s.full_name}))},
      {k:"group_name",label:"Guruh",type:"select",opts:(data.study_groups||[]).map(g=>({v:g.name,l:g.name}))},
      {k:"amount",label:"Summa",req:true,type:"number"},
      {k:"method",label:"Usul",type:"select",opts:PAYMENT_METHODS},
      {k:"type",label:"Tur",type:"select",opts:[{v:"tuition",l:"O'qish to'lovi"},{v:"registration",l:"Ro'yxat"},{v:"other",l:"Boshqa"}]},
      {k:"period",label:"Davr"},{k:"note",label:"Izoh",full:true}
    ]},
    expense: { title: "Xarajat qo'shish", table: "expenses", fields: [
      {k:"category",label:"Kategoriya",req:true,type:"select",opts:EXPENSE_CATS},
      {k:"amount",label:"Summa",req:true,type:"number"},
      {k:"method",label:"Usul",type:"select",opts:PAYMENT_METHODS},
      {k:"recipient",label:"Kimga"},{k:"note",label:"Izoh",full:true}
    ]},
    salary: { title: "Maosh to'lash", table: "salary_payments", fields: [
      {k:"teacher_name",label:"O'qituvchi",req:true,type:"select",opts:(data.teachers||[]).map(tc=>({v:tc.full_name,l:tc.full_name}))},
      {k:"amount",label:"Summa",req:true,type:"number"},
      {k:"method",label:"Usul",type:"select",opts:PAYMENT_METHODS},
      {k:"period",label:"Davr"},{k:"note",label:"Izoh",full:true}
    ]},
    lead: { title: isEdit ? "Lidni tahrirlash" : "+ Yangi lid", table: "leads", fields: [
      {k:"full_name",label:"FISH",req:true},{k:"phone",label:"Telefon",type:"tel"},{k:"age",label:"Yoshi",type:"number"},
      {k:"source",label:"Manba",type:"select",opts:[{v:"instagram",l:"Instagram"},{v:"telegram",l:"Telegram"},{v:"facebook",l:"Facebook"},{v:"friend",l:"Do'stdan"},{v:"call",l:"Qo'ng'iroq"},{v:"other",l:"Boshqa"}]},
      {k:"stage",label:"Bosqich",type:"select",opts:LEAD_STAGES.map(s=>({v:s.id,l:s.label}))},
      {k:"interested_course",label:"Qiziqtirgan kurs"},{k:"next_action_date",label:"Keyingi harakat",type:"date"},
      {k:"note",label:"Izoh",full:true}
    ]},
    attendance: { title: "Davomat belgilash", table: "attendance", fields: [
      {k:"student_name",label:"Talaba",req:true,type:"select",opts:(data.students||[]).map(s=>({v:s.full_name,l:s.full_name}))},
      {k:"group_name",label:"Guruh",type:"select",opts:(data.study_groups||[]).map(g=>({v:g.name,l:g.name}))},
      {k:"lesson_date",label:"Sana",req:true,type:"date"},
      {k:"status",label:"Holat",req:true,type:"select",opts:[{v:"present",l:"Keldi ✓"},{v:"absent",l:"Kelmadi ✗"},{v:"late",l:"Kechikdi !"},{v:"excused",l:"Sababli"}]},
      {k:"note",label:"Sabab",full:true}
    ]},
    schedule: { title: "Dars qo'shish", table: "schedules", fields: [
      {k:"group_name",label:"Guruh",req:true,type:"select",opts:(data.study_groups||[]).map(g=>({v:g.name,l:g.name}))},
      {k:"teacher_name",label:"O'qituvchi",type:"select",opts:(data.teachers||[]).map(tc=>({v:tc.full_name,l:tc.full_name}))},
      {k:"day_name",label:"Kun",req:true,type:"select",opts:WEEK_DAYS.map(d=>({v:d,l:d}))},
      {k:"start_time",label:"Boshlanish",req:true,type:"time"},{k:"end_time",label:"Tugash",type:"time"},{k:"room",label:"Xona"}
    ]},
    test: { title: isEdit ? "Testni tahrirlash" : "+ Yangi test", table: "tests", fields: [
      {k:"title",label:"Test nomi",req:true},{k:"subject",label:"Fan"},
      {k:"group_name",label:"Guruh",type:"select",opts:(data.study_groups||[]).map(g=>({v:g.name,l:g.name}))},
      {k:"duration",label:"Vaqt (daq)",type:"number"},{k:"total_marks",label:"Jami ball",type:"number"},{k:"pass_marks",label:"O'tish bali",type:"number"},
      {k:"test_date",label:"Sana",type:"date"},
      {k:"status",label:"Holat",type:"select",opts:[{v:"draft",l:"Qoralama"},{v:"active",l:"Faol"},{v:"completed",l:"Tugallandi"}]},
      {k:"description",label:"Tavsif",full:true}
    ]},
    homework: { title: isEdit ? "Vazifani tahrirlash" : "+ Uy vazifasi", table: "homework", fields: [
      {k:"title",label:"Sarlavha",req:true},
      {k:"group_name",label:"Guruh",type:"select",opts:(data.study_groups||[]).map(g=>({v:g.name,l:g.name}))},
      {k:"due_date",label:"Muddat",type:"date"},{k:"max_score",label:"Maks ball",type:"number"},
      {k:"description",label:"Tavsif",full:true}
    ]},
    grade: { title: "Baho qo'yish", table: "grades", fields: [
      {k:"student_name",label:"Talaba",req:true,type:"select",opts:(data.students||[]).map(s=>({v:s.full_name,l:s.full_name}))},
      {k:"group_name",label:"Guruh",type:"select",opts:(data.study_groups||[]).map(g=>({v:g.name,l:g.name}))},
      {k:"subject",label:"Fan"},
      {k:"grade_type",label:"Tur",type:"select",opts:[{v:"homework",l:"Uy vazifasi"},{v:"test",l:"Test"},{v:"exam",l:"Imtihon"},{v:"project",l:"Loyiha"},{v:"activity",l:"Faollik"}]},
      {k:"score",label:"Ball",req:true,type:"number"},{k:"max_score",label:"Maks ball",type:"number"},
      {k:"lesson_date",label:"Sana",type:"date"},{k:"comment",label:"Izoh",full:true}
    ]},
    book: { title: isEdit ? "Kitobni tahrirlash" : "+ Kitob qo'shish", table: "library_books", fields: [
      {k:"title",label:"Kitob nomi",req:true},{k:"author",label:"Muallif"},{k:"isbn",label:"ISBN"},{k:"subject",label:"Fan"},
      {k:"category",label:"Kategoriya",type:"select",opts:BOOK_CATS},
      {k:"total_copies",label:"Nusxalar",type:"number"},{k:"available",label:"Mavjud",type:"number"},{k:"location",label:"Joylashuv"}
    ]},
    loan: { title: "Kitob berish", table: "library_loans", fields: [
      {k:"book_title",label:"Kitob",req:true,type:"select",opts:(data.library_books||[]).map(b=>({v:b.title,l:b.title}))},
      {k:"borrower_name",label:"Oluvchi",req:true,type:"select",opts:[...(data.students||[]).map(s=>({v:s.full_name,l:`👥 ${s.full_name}`})),...(data.teachers||[]).map(tc=>({v:tc.full_name,l:`🧑‍🏫 ${tc.full_name}`}))]},
      {k:"borrower_type",label:"Tur",type:"select",opts:[{v:"student",l:"Talaba"},{v:"teacher",l:"O'qituvchi"}]},
      {k:"issue_date",label:"Berilgan sana",type:"date"},{k:"due_date",label:"Qaytarish muddati",type:"date"},{k:"note",label:"Izoh",full:true}
    ]},
    task: { title: isEdit ? "Vazifani tahrirlash" : "+ Yangi vazifa", table: "tasks", fields: [
      {k:"title",label:"Vazifa nomi",req:true},{k:"assigned_to",label:"Kim uchun"},
      {k:"priority",label:"Muhimlik",type:"select",opts:[{v:"low",l:"Past"},{v:"medium",l:"O'rta"},{v:"high",l:"Yuqori"},{v:"urgent",l:"Shoshilinch"}]},
      {k:"status",label:"Holat",type:"select",opts:[{v:"todo",l:"Rejalangan"},{v:"in_progress",l:"Jarayonda"},{v:"done",l:"Tugallandi"}]},
      {k:"due_date",label:"Muddat",type:"date"},{k:"description",label:"Tavsif",full:true}
    ]},
    resource: { title: isEdit ? "Resursni tahrirlash" : "+ Resurs qo'shish", table: "resources", fields: [
      {k:"title",label:"Sarlavha",req:true},
      {k:"type",label:"Tur",type:"select",opts:RES_TYPES.map(r=>({v:r.v,l:r.l}))},
      {k:"subject",label:"Fan"},
      {k:"group_name",label:"Guruh",type:"select",opts:(data.study_groups||[]).map(g=>({v:g.name,l:g.name}))},
      {k:"file_url",label:"Fayl URL"},{k:"external_url",label:"Tashqi havola"},{k:"uploaded_by",label:"Yuklagan"},
      {k:"description",label:"Tavsif",full:true}
    ]},
    branch: { title: "Filial qo'shish", table: "branches", fields: [
      {k:"name",label:"Filial nomi",req:true},{k:"phone",label:"Telefon",type:"tel"},{k:"address",label:"Manzil",full:true}
    ]},
  };

  const cfg = CONFIGS[modal.type];
  if (!cfg) return null;

  const validate = () => {
    const errs = {};
    cfg.fields.filter(f => f.req).forEach(f => { if (!form[f.k]) errs[f.k] = `${f.label} majburiy`; });

    // 📵 Telefon duplikat tekshiruvi — talaba qo'shishda
    if ((modal.type === "student" || modal.type === "teacher") && !isEdit && form.phone) {
      const allPeople = [...(data.students||[]), ...(data.teachers||[])];
      const dup = allPeople.find(p => p.phone && p.phone.replace(/\D/g,"") === form.phone.replace(/\D/g,"") && p.id !== form.id);
      if (dup) errs.phone = `Bu telefon allaqachon mavjud: ${dup.full_name}`;
    }

    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const submit = async () => {
    if (!validate()) return toast("Majburiy maydonlarni to'ldiring", "warning");
    setSaving(true);
    try {
      if (isEdit) {
        const { id, created_at, ...rest } = form;
        const { error } = await db.from(cfg.table).update(rest).eq("id", id);
        if (error) throw error;
        toast("Yangilandi ✓");
      } else {
        const { error } = await db.from(cfg.table).insert(form);
        if (error) throw error;
        toast("Qo'shildi ✓");

        /* ── Balans auto-sync ──────────────────────────────────────
           To'lov qo'shilganda → talabaning balansini avtomatik yangilash
        ─────────────────────────────────────────────────────────── */
        if (modal.type === "payment" && form.student_name && form.amount) {
          const student = (data.students || []).find(s => s.full_name === form.student_name);
          if (student) {
            const newBalance = Number(student.balance || 0) + Number(form.amount);
            await db.from("students").update({ balance: newBalance }).eq("id", student.id);
          }
        }

        /* ── Guruh davomatiga auto-bildirishnoma ───────────────────
           Yangi talaba qo'shilganda notification yaratish
        ─────────────────────────────────────────────────────────── */
        if (modal.type === "student" && form.full_name) {
          await db.from("notifications").insert({
            title: `Yangi talaba: ${form.full_name}`,
            body: `${form.group_name || "Guruhsiz"} · ${form.source || ""}`,
            type: "info",
            is_read: false,
          }).catch(() => {}); // xato bo'lsa ignore
        }
      }
      close(); await loadAll();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal modal-w" role="dialog" aria-modal="true">
        <div className="modal-head">
          <b>{cfg.title}</b>
          <button className="m-close" onClick={close} disabled={saving}>×</button>
        </div>
        <div className="m-body">
          {cfg.fields.map(({ k, label, type = "text", opts, full, req }, idx) => (
            <label key={k} className={`field ${full ? "fld-full" : ""} ${errors[k] ? "fld error" : ""}`}>
              <span className="fld-label">{label}{req && <span className="req-star">*</span>}</span>
              {type === "select" ? (
                <select ref={idx === 0 ? firstRef : null}
                  value={form[k] || ""} onChange={e => set(k, e.target.value)}
                  className={`select-input ${errors[k] ? "input-err" : ""}`}>
                  <option value="">— Tanlang —</option>
                  {(opts || []).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ) : (
                <input ref={idx === 0 ? firstRef : null}
                  type={type} value={form[k] || ""} onChange={e => set(k, e.target.value)}
                  placeholder={label} className={errors[k] ? "input-err" : ""} />
              )}
              {errors[k] && <span className="fld-err">{errors[k]}</span>}
            </label>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={close} disabled={saving}>
            <X size={13} /> Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving
              ? <><RefreshCw size={13} className="spin" /> Saqlanmoqda...</>
              : isEdit
                ? <><Pencil size={13} /> Yangilash</>
                : <><Save size={13} /> Saqlash</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Drawer ───────────────────────────────────────────────── */
function DetailDrawer({ detail, t, data, close, setModal, loadAll }) {
  const toast = useToast(), confirm = useConfirm();
  const r = detail.row;
  if (detail.type !== "student") return null;
  const payments = (data.payments  || []).filter(p => p.student_name === r.full_name);
  const attRows  = (data.attendance || []).filter(a => a.student_name === r.full_name);
  const grades   = (data.grades    || []).filter(g => g.student_name === r.full_name);
  const rate     = attRate(attRows);
  const archive = async () => {
    if (!await confirm("Bu talabani arxivlamoqchimisiz?")) return;
    const { error } = await db.from("students").update({ status: "archived" }).eq("id", r.id);
    if (error) return toast(error.message, "error");
    toast("Arxivlandi"); close(); loadAll();
  };

  const INFO_ROWS = [
    { l:"Telefon",    v:r.phone,        Icon: Phone       },
    { l:"Ota-ona",    v:r.parent_phone, Icon: Phone       },
    { l:"Guruh",      v:r.group_name,   Icon: GraduationCap},
    { l:"Holat",      v:<StatusPill key="s" status={r.status||"active"} t={t}/>, Icon: CheckCircle2 },
    { l:"Davomat",    v:<span key="a" style={{fontWeight:700,color:rate>75?"var(--green)":"var(--red)"}}>{rate}% ({attRows.length} dars)</span>, Icon: ClipboardCheck },
  ];

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && close()}>
      <div className="drawer">
        <div className="modal-head">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <UserCircle size={18} strokeWidth={1.75} style={{ color:"var(--brand)" }} />
            <b>Talaba profili</b>
          </div>
          <button className="m-close" onClick={close}><X size={14} /></button>
        </div>
        <div className="drawer-body">
          <div className="profile-head">
            <Avatar name={r.full_name} size={50} />
            <div className="profile-info">
              <div className="profile-name">{r.full_name}</div>
              <div className="profile-phone" style={{ display:"flex", alignItems:"center", gap:4 }}>
                <Phone size={11} style={{ color:"var(--t4)" }} /> {r.phone || "—"}
              </div>
            </div>
            <Pill type={Number(r.balance || 0) < 0 ? "red" : "green"}>{money(r.balance)}</Pill>
          </div>
          <div className="drawer-section">
            {INFO_ROWS.map(({ l, v, Icon: I }) => (
              <div key={l} className="line">
                <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <I size={12} style={{ color:"var(--t4)", flexShrink:0 }} /> {l}
                </span>
                <b style={{ fontSize:12 }}>{v == null || v === "" ? "—" : v}</b>
              </div>
            ))}
          </div>
          <div className="drawer-section">
            <div className="drawer-section-title" style={{ display:"flex", alignItems:"center", gap:5 }}>
              <CreditCard size={11} style={{ color:"var(--brand)" }} /> To'lovlar
            </div>
            {payments.slice(0, 5).map(p => (
              <div key={p.id} className="fin-row">
                <Avatar name={p.student_name} size={28} />
                <div className="fin-name">
                  <b style={{ color:"var(--green)", fontSize:13 }}>+{money(p.amount)}</b>
                  <small style={{ color:"var(--t4)", fontSize:10.5 }}>{fmtFull(p.created_at)}</small>
                </div>
                <MethodBadge method={p.method} />
              </div>
            ))}
            {!payments.length && <Empty text="To'lovlar yo'q" />}
          </div>
          <div className="drawer-section">
            <div className="drawer-section-title" style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Star size={11} style={{ color:"var(--yellow)" }} /> Baholar
            </div>
            {grades.slice(0, 5).map(g => {
              const pct = Number(g.score) / Number(g.max_score || 10);
              return (
                <div key={g.id} className="line">
                  <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <Award size={11} style={{ color:"var(--t4)" }} />
                    {g.subject || g.grade_type}
                  </span>
                  <b style={{ color: pct >= 0.8 ? "var(--green)" : pct >= 0.6 ? "var(--yellow)" : "var(--red)" }}>
                    {g.score}/{g.max_score || 10}
                  </b>
                </div>
              );
            })}
            {!grades.length && <Empty text="Baholar yo'q" />}
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn btn-primary" style={{ flex:1 }}
            onClick={() => { setModal({ type:"payment", row:{ student_name:r.full_name, group_name:r.group_name } }); close(); }}>
            <CreditCard size={13} /> To'lov
          </button>
          <button className="btn btn-ghost"
            onClick={() => { setModal({ type:"student", row:r }); close(); }}>
            <Pencil size={13} />
          </button>
          <button className="btn btn-ghost danger" onClick={archive}>
            <Trash2 size={13} /> Arxiv
          </button>
        </div>
      </div>
    </div>
  );
}
