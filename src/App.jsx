// X-MASTER Pro — Premium Education CRM v3.0
import {
  useCallback, useEffect, useMemo, useReducer, useRef, useState
} from "react";
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
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppInner />
      </ConfirmProvider>
    </ToastProvider>
  );
}

/* ── AppInner ────────────────────────────────────────────────────── */
function AppInner() {
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
  const shared = { t, data, stats, sub, setSub, setModal, setDetail, loadAll, nav, markAllRead };

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
              if (!p) return null;
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
                if (!p) return null;
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
          <div className="sb-avatar">
            {((data.settings || [])[0]?.center_name || "X")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-footer-name">{(data.settings || [])[0]?.center_name || "X-MASTER Pro"}</div>
            <div className="sb-footer-role"><span className="online-dot" /> Superadmin</div>
          </div>
          <Shield size={14} style={{ color: "rgba(255,255,255,.25)", flexShrink: 0 }} />
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
            <select className="lang-sel" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="uz">🇺🇿 UZ</option>
              <option value="ru">🇷🇺 RU</option>
              <option value="en">🇬🇧 EN</option>
            </select>
            <div className="tb-branch">
              <span className="tb-branch-dot" />
              <Building2 size={12} style={{ color: "var(--t4)" }} />
              <span>{(data.branches || [])[0]?.name || "Asosiy filial"}</span>
            </div>
            <button className="tb-notif-btn" onClick={() => { nav("dash"); setSub("notifications"); }}
              title="Bildirishnomalar">
              <Bell size={15} />
              {stats.unread > 0 && <span className="tb-notif-count">{stats.unread}</span>}
            </button>
            <div className="tb-user" title="Profil">
              {((data.settings || [])[0]?.center_name || "X")[0].toUpperCase()}
            </div>
          </div>
        </header>

        <div className="content">
          {loading && <div className="load-bar"><div className="load-prog" /></div>}
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
        </div>
      </main>

      {modal  && <ModalForm    modal={modal}   t={t} data={data} close={() => setModal(null)}  loadAll={loadAll} />}
      {detail && <DetailDrawer detail={detail} t={t} data={data} close={() => setDetail(null)} setModal={setModal} loadAll={loadAll} />}
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

function Attendance({ t, data, setModal }) {
  const [selGroup, setSelGroup] = useState("");
  const groups   = useMemo(() => [...new Set((data.students || []).map(s => s.group_name).filter(Boolean))], [data.students]);
  const students = useMemo(() =>
    (selGroup ? (data.students || []).filter(s => s.group_name === selGroup) : (data.students || [])).slice(0, 16),
    [data.students, selGroup]);
  const dates = useMemo(() => {
    const all = [...new Set((data.attendance || []).map(a => a.lesson_date).filter(Boolean))].sort().slice(-7);
    if (all.length) return all;
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toISOString().slice(0, 10); });
  }, [data.attendance]);
  const getStatus = (name, date) => (data.attendance || []).find(a => a.student_name === name && a.lesson_date === date)?.status || null;
  return (
    <div className="page-fade">
      <div className="pg-toolbar">
        <select className="sel-ctrl" value={selGroup} onChange={e => setSelGroup(e.target.value)}>
          <option value="">Barcha guruhlar</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "attendance" })}>+ Davomat</button>
      </div>
      <Card className="pad">
        <div style={{ overflowX: "auto" }}>
          <div className="att-grid" style={{ gridTemplateColumns: `180px repeat(${dates.length},1fr) 56px` }}>
            <div className="att-hdr left">FISH</div>
            {dates.map(d => <div key={d} className="att-th">{new Date(d + "T00:00").getDate()}<br /><span style={{ fontSize: 8, opacity: .6 }}>{["Ya","Du","Se","Ch","Pa","Sh","Ya"][new Date(d + "T00:00").getDay()]}</span></div>)}
            <div className="att-th">%</div>
            {students.flatMap(s => {
              const statuses = dates.map(d => getStatus(s.full_name, d));
              const known    = statuses.filter(x => x !== null);
              const rate     = known.length ? Math.round(known.filter(x => x === "present").length / known.length * 100) : null;
              return [
                <div key={s.id + "n"} className="att-name" title={s.full_name}>{s.full_name}</div>,
                ...dates.map((d, i) => {
                  const st = statuses[i];
                  return <div key={d} className={`att-dot ${st === "present" ? "ad-g" : st === "absent" ? "ad-r" : st === "late" ? "ad-y" : ""}`}
                    style={{ opacity: st ? 1 : .18, cursor: "pointer" }}
                    onClick={() => setModal({ type: "attendance", row: { student_name: s.full_name, lesson_date: d, group_name: s.group_name } })}>
                    {st === "present" ? "✓" : st === "absent" ? "✗" : st === "late" ? "!" : "·"}
                  </div>;
                }),
                <div key={s.id + "p"} className={`${rate !== null ? (rate > 75 ? "green" : "red") : "c-muted"} att-pct-cell`}>{rate !== null ? `${rate}%` : "—"}</div>
              ];
            })}
          </div>
        </div>
        <div className="att-legend">
          <span className="att-cell att-p" style={{ width: 24, height: 18, fontSize: 9 }}>✓</span> Keldi
          <span className="att-cell att-a" style={{ width: 24, height: 18, fontSize: 9, marginLeft: 12 }}>✗</span> Kelmadi
          <span className="att-cell att-l" style={{ width: 24, height: 18, fontSize: 9, marginLeft: 12 }}>!</span> Kechikdi
        </div>
      </Card>
    </div>
  );
}

function Schedule({ data, setModal }) {
  const COLORS = ["sc-bl", "sc-gr", "sc-pu", "sc-am", "sc-cy"];
  const days   = WEEK_DAYS.slice(0, 5);
  const allGroups = useMemo(() => [...new Set((data.schedules || []).map(s => s.group_name).filter(Boolean))], [data.schedules]);
  const colorMap  = useMemo(() => Object.fromEntries(allGroups.map((g, i) => [g, COLORS[i % COLORS.length]])), [allGroups]);
  return (
    <div className="page-fade">
      <div className="page-toolbar">
        <div style={{ display:"flex", alignItems:"center", gap:8, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:15, color:"var(--t1)" }}>
          <Calendar size={16} style={{ color:"var(--brand)" }} /> Haftalik jadval
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "schedule" })}>
          <Plus size={13} /> Dars qo'shish
        </button>
      </div>
      <Card className="pad">
        <div style={{ overflowX: "auto" }}>
          <div className="sch-grid" style={{ gridTemplateColumns: "54px repeat(5,1fr)" }}>
            <div />
            {days.map(d => <div key={d} className="sch-day">{d.slice(0, 3)}</div>)}
            {TIMES.map(tm => [
              <div key={tm} className="sch-time">{tm}</div>,
              ...days.map(day => {
                const cells = (data.schedules || []).filter(s => s.day_name === day && s.start_time === tm);
                return (
                  <div key={day} className={`sch-c ${cells.length ? colorMap[cells[0]?.group_name] || "sc-bl" : "sc-mt"}`}>
                    {cells.map((c, i) => <div key={i}><b style={{ fontSize: 10 }}>{c.group_name}</b><div style={{ opacity: .7, fontSize: 9 }}>{c.room && `X${c.room}`}{c.teacher_name && ` · ${c.teacher_name.split(" ")[0]}`}</div></div>)}
                  </div>
                );
              })
            ])}
          </div>
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

function Reports({ t, data, stats, sub, setSub }) {
  const byMonth = useMemo(() => {
    const map = {};
    (data.payments || []).forEach(r => { if (!r.created_at) return; const m = r.created_at.slice(0, 7); if (!map[m]) map[m] = { income: 0, expense: 0 }; map[m].income += Number(r.amount || 0); });
    (data.expenses || []).forEach(r => { if (!r.created_at) return; const m = r.created_at.slice(0, 7); if (!map[m]) map[m] = { income: 0, expense: 0 }; map[m].expense += Number(r.amount || 0); });
    return Object.entries(map).sort().slice(-6);
  }, [data]);
  const maxI = byMonth.length ? Math.max(...byMonth.map(([, v]) => v.income), 1) : 1;

  return (
    <div className="page-fade">
      <div className="pg-toolbar">
        <div className="tabs">
          {[["home","Moliyaviy"],["growth","O'sish"],["attendance","Davomat"],["teachers","O'qituvchilar"]].map(([id, label]) => (
            <button key={id} className={`ftab ${sub === id ? "on" : ""}`} onClick={() => setSub(id)}>{label}</button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(data.payments, "hisobot")}>⇩ Excel</button>
      </div>

      {sub === "home" && (
        <div className="g2">
          <Card className="pad">
            <SectionHeader title="📈 Oylik daromad" />
            {byMonth.map(([m, v]) => (
              <div key={m} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                  <span style={{ fontWeight: 700 }}>{m}</span>
                  <span style={{ color: "var(--success)" }}>+{short(v.income)}</span>
                </div>
                <ProgressBar value={Math.round(v.income / maxI * 100)} color="green" />
              </div>
            ))}
            {!byMonth.length && <Empty text="Ma'lumot yo'q" />}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="g2">
              <Mini title="Daromad" value={money(stats.income)}  tone="green" />
              <Mini title="Xarajat" value={money(stats.expense)} tone="red" />
              <Mini title="Foyda"   value={money(stats.profit)}  tone={stats.profit >= 0 ? "blue" : "red"} />
              <Mini title="Qarz"    value={money(stats.debt)}    tone="red" />
            </div>
            <Card className="pad">
              <SectionHeader title="Ko'rsatkichlar" />
              {[["Jami to'lovlar",`${(data.payments||[]).length} ta`],["Jami xarajatlar",`${(data.expenses||[]).length} ta`],["Qarzdorlar",`${stats.debtors} ta`],["Faol talabalar",stats.active],["Guruhlar",stats.groups]].map(([l, r]) => <div key={l} className="line"><span>{l}</span><b>{r}</b></div>)}
            </Card>
          </div>
        </div>
      )}

      {sub === "attendance" && (
        <div className="g2">
          <Card className="pad">
            <SectionHeader title="Guruhlar bo'yicha" />
            {[...new Set((data.attendance || []).map(a => a.group_name).filter(Boolean))].map(grp => {
              const rows = (data.attendance || []).filter(a => a.group_name === grp);
              const rate = attRate(rows);
              return (
                <div key={grp} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                    <span style={{ fontWeight: 700 }}>{grp}</span>
                    <span style={{ color: rate > 75 ? "var(--success)" : "var(--danger)" }}>{rate}%</span>
                  </div>
                  <ProgressBar value={rate} color={rate > 75 ? "green" : "red"} />
                </div>
              );
            })}
          </Card>
          <Card className="pad">
            <SectionHeader title="Statistika" />
            {[["O'rtacha",`${attRate(data.attendance||[])}%`],["Kelgan",(data.attendance||[]).filter(a=>a.status==="present").length],["Kelmagan",(data.attendance||[]).filter(a=>a.status==="absent").length],["Kechikkan",(data.attendance||[]).filter(a=>a.status==="late").length]].map(([l, r]) => <div key={l} className="line"><span>{l}</span><b>{r}</b></div>)}
          </Card>
        </div>
      )}

      {sub === "teachers" && (
        <Card>
          <table className="tbl">
            <thead><tr><th>O'qituvchi</th><th>Fan</th><th>Guruhlar</th><th>Talabalar</th><th>Davomat</th><th>Maosh</th></tr></thead>
            <tbody>
              {(data.teachers || []).map(tc => {
                const groups   = (data.study_groups || []).filter(g => g.teacher_name === tc.full_name);
                const students = (data.students || []).filter(s => groups.some(g => g.name === s.group_name));
                const attRows  = (data.attendance || []).filter(a => groups.some(g => g.name === a.group_name));
                return (
                  <tr key={tc.id} className="tbl-row">
                    <td><Person name={tc.full_name} sub={tc.phone} /></td>
                    <td>{tc.subject ? <Pill>{tc.subject}</Pill> : "—"}</td>
                    <td><span className="badge">{groups.length}</span></td>
                    <td><span className="badge">{students.length}</span></td>
                    <td><span style={{ color: attRate(attRows) > 75 ? "var(--success)" : "var(--danger)" }}>{attRate(attRows)}%</span></td>
                    <td className="money green">{money(tc.salary_value)}</td>
                  </tr>
                );
              })}
              {!data.teachers?.length && <tr><td colSpan={6}><Empty text="O'qituvchilar yo'q" /></td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {sub === "growth" && (
        <div className="g2">
          <Card className="pad">
            <SectionHeader title="👥 Talabalar o'sishi" />
            {Object.entries((data.students || []).reduce((m, s) => { if (!s.created_at) return m; const k = s.created_at.slice(0, 7); m[k] = (m[k] || 0) + 1; return m; }, {})).sort().slice(-6).map(([m, v]) => (
              <div key={m} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}><span>{m}</span><span style={{ color: "var(--success)" }}>+{v}</span></div>
                <ProgressBar value={v} color="blue" />
              </div>
            ))}
          </Card>
          <Card className="pad">
            <SectionHeader title="Holat" />
            {[["Faol",(data.students||[]).filter(s=>(s.status||"active")==="active").length],["Muzlatilgan",(data.students||[]).filter(s=>s.status==="frozen").length],["Arxiv",(data.students||[]).filter(s=>s.status==="archived").length],["Jami",(data.students||[]).length]].map(([l, r]) => <div key={l} className="line"><span>{l}</span><b>{r}</b></div>)}
          </Card>
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
      <Card className="pad">
        <div className="card-hd" style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Building2 size={15} strokeWidth={1.75} style={{ color:"var(--green)" }} />
            </div>
            <div className="card-title">Filiallar</div>
          </div>
        </div>
        {(data.branches || []).map(b => (
          <div key={b.id} className="line">
            <span style={{ display:"flex", alignItems:"center", gap:5 }}>
              <MapPin size={11} style={{ color:"var(--t4)" }} /> {b.name}
            </span>
            <b style={{ fontSize:12 }}>{b.address || "—"}</b>
          </div>
        ))}
        {!data.branches?.length && <Empty text="Filiallar yo'q" />}
        <button className="btn btn-primary btn-sm" style={{ marginTop:14, width:"100%" }}
          onClick={() => setModal({ type: "branch" })}>
          <Plus size={12} /> Filial qo'shish
        </button>
      </Card>

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
        toast("Yangilandi");
      } else {
        const { error } = await db.from(cfg.table).insert(form);
        if (error) throw error;
        toast("Qo'shildi");
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
