// X-MASTER Pro — Complete Education CRM
import {
  useCallback, useEffect, useMemo, useReducer, useRef, useState
} from "react";
import { supabase as db } from "./lib/supabase.js";
import { getLang } from "./lib/i18n.js";
import {
  TABLES, ORDERED_TABLES, PAGES, LEAD_STAGES,
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
        <div className="ib-logo">XM</div>
        {PAGE_GROUPS.map(grp => (
          <div key={grp.label} style={{ display: "contents" }}>
            {grp.pages.map(pid => {
              const p = PAGES.find(x => x.id === pid);
              if (!p) return null;
              const badge = p.dot ? stats.unread : 0;
              return (
                <button key={pid}
                  className={`ib-btn ${page === pid ? "on" : ""}`}
                  onClick={() => nav(pid)}
                  title={t[p.key]}
                  aria-label={t[p.key]}>
                  <span className="ib-icon">{p.icon}</span>
                  {badge > 0 && <span className="ib-dot" />}
                </button>
              );
            })}
            <div className="ib-sep" />
          </div>
        ))}
      </aside>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sb-head">
          <div className="sb-brand">
            <div className="sb-logo">XM</div>
            <div>
              <div className="sb-title">X-MASTER Pro</div>
              <div className="sb-sub">Education CRM</div>
            </div>
          </div>
          <label className="sb-search">
            <span className="sb-search-icon">⌕</span>
            <input id="xm-search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={t.search} autoComplete="off" />
            {query && <button className="sb-clear" onClick={() => setQuery("")}>×</button>}
            <kbd className="sb-kbd">⌃K</kbd>
          </label>
        </div>

        <nav className="sb-nav">
          {PAGE_GROUPS.map(grp => (
            <div key={grp.label}>
              <div className="sb-section-label">{grp.label}</div>
              {grp.pages.map(pid => {
                const p = PAGES.find(x => x.id === pid);
                if (!p) return null;
                const badge =
                  p.dot ? stats.unread :
                  pid === "library" ? (data.library_loans || []).filter(l => l.status === "overdue").length || null :
                  pid === "tasks"   ? (data.tasks || []).filter(t => t.status === "todo").length || null : null;
                return (
                  <button key={pid}
                    className={`nm ${page === pid ? "on" : ""}`}
                    onClick={() => nav(pid)}>
                    <span className="nm-ico">{p.icon}</span>
                    <span className="nm-label">{t[p.key]}</span>
                    {badge > 0 && <span className="nm-badge b">{badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sb-user">
          <div className="sb-avatar">A</div>
          <div className="sb-user-info">
            <div className="sb-uname">{(data.settings || [])[0]?.center_name || "X-MASTER Pro"}</div>
            <div className="sb-urole"><span className="online-dot" />Superadmin</div>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="main">
        <header className="topbar">
          <div className="tb-left">
            <div className="tb-title">{t[PAGES.find(x => x.id === page)?.key] || "Dashboard"}</div>
            <div className="tb-breadcrumb">
              <span>X-MASTER Pro</span><span className="tb-sep">›</span>
              <span>{t[PAGES.find(x => x.id === page)?.key]}</span>
              {lastSync && <><span className="tb-sep">·</span><span className="tb-sync">🕐 {fmtTime(lastSync)}</span></>}
            </div>
          </div>
          <div className="tb-right">
            <button className="tb-icon-btn" onClick={loadAll}>
              <span className={loading ? "spin" : ""}>↻</span>
            </button>
            <button className="tb-icon-btn" onClick={() => setTheme(v => v === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <select className="tb-chip lang-sel" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="uz">🇺🇿 UZ</option>
              <option value="ru">🇷🇺 RU</option>
              <option value="en">🇬🇧 EN</option>
            </select>
            <div className="tb-chip">
              <span className="dot" />
              <span>{(data.branches || [])[0]?.name || t.branch}</span>
            </div>
            {stats.unread > 0 && (
              <button className="tb-notif" onClick={() => { nav("dash"); setSub("notifications"); }}>
                🔔<span className="tb-notif-badge">{stats.unread}</span>
              </button>
            )}
          </div>
        </header>

        <div className="content">
          {loading && <div className="loading-bar"><div className="loading-progress" /></div>}
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
  const toast = useToast(), confirm = useConfirm();
  const [view, setView] = useState("grid");
  const remove = async id => {
    if (!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("study_groups").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Guruh o'chirildi"); loadAll();
  };
  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          <button className={`filter-tab ${view === "grid" ? "on" : ""}`} onClick={() => setView("grid")}>▤ Grid</button>
          <button className={`filter-tab ${view === "list" ? "on" : ""}`} onClick={() => setView("list")}>≡ Ro'yxat</button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "group" })}>+ Guruh</button>
      </div>
      {view === "grid" ? (
        <div className="grid3">
          {rows.map(g => {
            const count = (data.students || []).filter(s => s.group_name === g.name).length;
            const cap = Number(g.capacity || 15);
            const pct = Math.min(100, Math.round(count / cap * 100));
            return (
              <div className="group-card" key={g.id}>
                <div className="group-card-top">
                  <div>
                    <div className="group-title">{g.name}</div>
                    <div className="group-sub">{g.teacher_name || "—"} · {g.subject || "—"}</div>
                  </div>
                  <Pill type={pct >= 100 ? "orange" : pct >= 80 ? "blue" : "green"}>
                    {pct >= 100 ? "To'lgan" : "Faol"}
                  </Pill>
                </div>
                <div className="group-info">🕒 {g.schedule_text || "—"} · {money(g.price || 0)}</div>
                <div className="group-meta">
                  <span>{count}/{cap} talaba</span>
                  <span className={pct >= 80 ? "red" : "green"}>{pct}%</span>
                </div>
                <ProgressBar value={pct} />
                <div className="card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => nav("attend")}>{t.attendance}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: "group", row: g })}>✎</button>
                  <button className="btn btn-ghost btn-sm danger" onClick={() => remove(g.id)}>✕</button>
                </div>
              </div>
            );
          })}
          <div className="group-card add-card" onClick={() => setModal({ type: "group" })} role="button" tabIndex={0}>
            <span className="add-card-icon">＋</span><span>Yangi guruh</span>
          </div>
        </div>
      ) : (
        <Card>
          <table className="tbl">
            <thead><tr><th>Guruh</th><th>O'qituvchi</th><th>Fan</th><th>Narx</th><th>Bandlik</th><th>Amal</th></tr></thead>
            <tbody>
              {rows.map(g => {
                const count = (data.students || []).filter(s => s.group_name === g.name).length;
                const cap   = Number(g.capacity || 15);
                return (
                  <tr key={g.id} className="tbl-row">
                    <td><b>{g.name}</b><br /><span className="muted" style={{ fontSize: 10 }}>{g.schedule_text}</span></td>
                    <td>{g.teacher_name || "—"}</td>
                    <td>{g.subject ? <Pill>{g.subject}</Pill> : "—"}</td>
                    <td className="money">{money(g.price || 0)}</td>
                    <td><ProgressBar value={Math.min(100, Math.round(count / cap * 100))} /><span style={{ fontSize: 10, color: "var(--muted)" }}>{count}/{cap}</span></td>
                    <td><div className="row-actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => setModal({ type: "group", row: g })}>✎</button>
                      <button className="btn btn-ghost btn-xs danger" onClick={() => remove(g.id)}>✕</button>
                    </div></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={6}><Empty text="Guruhlar yo'q" icon="🎓" /></td></tr>}
            </tbody>
          </table>
        </Card>
      )}
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
    <div className="page-enter">
      <div className="page-toolbar"><div /><button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "teacher" })}>+ O'qituvchi</button></div>
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
                  <td className="muted">{r.salary_type || "—"}</td>
                  <td className="money green">{money(r.salary_value)}</td>
                  <td><span className="badge-count">{gc}</span></td>
                  <td><StatusPill status={r.status || "active"} t={t} /></td>
                  <td><div className="row-actions">
                    <button className="btn btn-ghost btn-xs" onClick={() => setModal({ type: "teacher", row: r })}>✎</button>
                    <button className="btn btn-ghost btn-xs danger" onClick={() => remove(r.id)}>✕</button>
                  </div></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={8}><Empty text="O'qituvchilar yo'q" icon="🧑‍🏫" /></td></tr>}
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
    <div className="page-enter">
      <div className="page-toolbar">
        <select className="select-control" value={selGroup} onChange={e => setSelGroup(e.target.value)}>
          <option value="">Barcha guruhlar</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "attendance" })}>+ Davomat</button>
      </div>
      <Card className="pad">
        <div style={{ overflowX: "auto" }}>
          <div className="att-grid" style={{ gridTemplateColumns: `180px repeat(${dates.length},1fr) 56px` }}>
            <div className="att-hdr left">FISH</div>
            {dates.map(d => <div key={d} className="att-hdr">{new Date(d + "T00:00").getDate()}<br /><span style={{ fontSize: 8, opacity: .6 }}>{["Ya","Du","Se","Ch","Pa","Sh","Ya"][new Date(d + "T00:00").getDay()]}</span></div>)}
            <div className="att-hdr">%</div>
            {students.flatMap(s => {
              const statuses = dates.map(d => getStatus(s.full_name, d));
              const known    = statuses.filter(x => x !== null);
              const rate     = known.length ? Math.round(known.filter(x => x === "present").length / known.length * 100) : null;
              return [
                <div key={s.id + "n"} className="att-nm" title={s.full_name}>{s.full_name}</div>,
                ...dates.map((d, i) => {
                  const st = statuses[i];
                  return <div key={d} className={`att-dot ${st === "present" ? "ad-g" : st === "absent" ? "ad-r" : st === "late" ? "ad-y" : ""}`}
                    style={{ opacity: st ? 1 : .18, cursor: "pointer" }}
                    onClick={() => setModal({ type: "attendance", row: { student_name: s.full_name, lesson_date: d, group_name: s.group_name } })}>
                    {st === "present" ? "✓" : st === "absent" ? "✗" : st === "late" ? "!" : "·"}
                  </div>;
                }),
                <div key={s.id + "p"} className={`${rate !== null ? (rate > 75 ? "green" : "red") : "muted"} att-pct-cell`}>{rate !== null ? `${rate}%` : "—"}</div>
              ];
            })}
          </div>
        </div>
        <div className="att-legend">
          <span className="att-dot ad-g" style={{ width: 24, height: 18, fontSize: 9 }}>✓</span> Keldi
          <span className="att-dot ad-r" style={{ width: 24, height: 18, fontSize: 9, marginLeft: 12 }}>✗</span> Kelmadi
          <span className="att-dot ad-y" style={{ width: 24, height: 18, fontSize: 9, marginLeft: 12 }}>!</span> Kechikdi
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
    <div className="page-enter">
      <div className="page-toolbar">
        <b style={{ fontWeight: 900, fontSize: 14 }}>📅 Haftalik jadval</b>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "schedule" })}>+ Dars qo'shish</button>
      </div>
      <Card className="pad">
        <div style={{ overflowX: "auto" }}>
          <div className="sch-grid" style={{ gridTemplateColumns: "54px repeat(5,1fr)" }}>
            <div />
            {days.map(d => <div key={d} className="sch-th">{d.slice(0, 3)}</div>)}
            {TIMES.map(tm => [
              <div key={tm} className="sch-tm">{tm}</div>,
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
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          <button className={`filter-tab ${view === "kanban" ? "on" : ""}`} onClick={() => setView("kanban")}>⬚ Kanban</button>
          <button className={`filter-tab ${view === "list" ? "on" : ""}`}   onClick={() => setView("list")}>≡ Ro'yxat</button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "lead" })}>+ Yangi lid</button>
      </div>
      {view === "kanban" ? (
        <div className="kanban">
          {LEAD_STAGES.map(({ id: st, label, color }) => (
            <div className="kb-col" key={st}>
              <div className={`kb-hd kb-hd-${color}`}>
                <span>{label}</span>
                <span className={`pill pill-${color}`}>{rows.filter(x => x.stage === st).length}</span>
              </div>
              <div className="kb-body">
                {rows.filter(x => x.stage === st).map(l => (
                  <div className="kb-card" key={l.id}>
                    <div className="kb-name">{l.full_name}</div>
                    <div className="kb-meta">📞 {l.phone || "—"}{l.source && ` · ${l.source}`}</div>
                    {l.interested_course && <div className="kb-course">📚 {l.interested_course}</div>}
                    <div className="kb-move">
                      {LEAD_STAGES.filter(s => s.id !== st).slice(0, 3).map(s => (
                        <button key={s.id} className="kb-move-btn" onClick={() => move(l.id, s.id)}>→ {s.label.slice(0, 7)}</button>
                      ))}
                    </div>
                    <button className="tiny-x" onClick={() => remove(l.id)}>✕</button>
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
                  <td className="muted">{fmtDate(l.created_at)}</td>
                  <td><div className="row-actions">
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
    <div className="page-enter">
      <div className="page-toolbar"><b style={{ fontWeight: 900 }}>📚 Uy vazifalari</b><button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "homework" })}>+ Vazifa</button></div>
      <div className="grid3">
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
              <div className="card-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: "homework", row: hw })}>✎</button>
                <button className="btn btn-ghost btn-sm danger" onClick={() => remove(hw.id)}>✕</button>
              </div>
            </Card>
          );
        })}
        <div className="group-card add-card" onClick={() => setModal({ type: "homework" })} role="button" tabIndex={0}>
          <span className="add-card-icon">📚</span><span>Vazifa qo'shish</span>
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
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          {[["all","Barchasi"],["homework","Uy vazifasi"],["test","Test"],["exam","Imtihon"]].map(([v, l]) => (
            <button key={v} className={`filter-tab ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>{l}</button>
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
                  <td className="muted">{fmtDate(g.lesson_date || g.created_at)}</td>
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
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          {[["home","Moliyaviy"],["growth","O'sish"],["attendance","Davomat"],["teachers","O'qituvchilar"]].map(([id, label]) => (
            <button key={id} className={`filter-tab ${sub === id ? "on" : ""}`} onClick={() => setSub(id)}>{label}</button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(data.payments, "hisobot")}>⇩ Excel</button>
      </div>

      {sub === "home" && (
        <div className="grid2">
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
            <div className="grid2 mini-grid">
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
        <div className="grid2">
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
                    <td><span className="badge-count">{groups.length}</span></td>
                    <td><span className="badge-count">{students.length}</span></td>
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
        <div className="grid2">
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
  const [form, setFormData] = useState({ center_name: s.center_name || "X-MASTER Pro", phone: s.phone || "", address: s.address || "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const op = s.id ? db.from("settings").update(form).eq("id", s.id) : db.from("settings").insert(form);
    const { error } = await op;
    setSaving(false);
    if (error) return toast(error.message, "error");
    toast("Sozlamalar saqlandi"); loadAll();
  };
  return (
    <div className="page-enter grid2">
      <Card className="pad">
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>🏫 Markaz ma'lumoti</div>
        {[["center_name","Markaz nomi"],["phone","Telefon"],["address","Manzil"]].map(([k, label]) => (
          <label key={k} style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-sub)" }}>{label}</span>
            <input type="text" value={form[k] || ""} onChange={e => setFormData(f => ({ ...f, [k]: e.target.value }))} placeholder={label} />
          </label>
        ))}
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "⟳ Saqlanmoqda..." : "Saqlash"}</button>
      </Card>
      <Card className="pad">
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>🏢 Filiallar</div>
        {(data.branches || []).map(b => <div key={b.id} className="line"><span>{b.name}</span><b>{b.address || "—"}</b></div>)}
        {!data.branches?.length && <Empty text="Filiallar yo'q" />}
        <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setModal({ type: "branch" })}>+ Filial</button>
      </Card>
      <Card className="pad">
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>🔐 Rollar</div>
        {[["Superadmin","Barcha funksiyalar","green"],["Admin","Asosiy funksiyalar","blue"],["O'qituvchi","Davomat va jadval","orange"],["Kassa","Moliya","purple"]].map(([role, desc, tone]) => (
          <div key={role} className="line">
            <div><div style={{ fontWeight: 800, fontSize: 12 }}>{role}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{desc}</div></div>
            <Pill type={tone}>Faol</Pill>
          </div>
        ))}
      </Card>
      <Card className="pad">
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>📊 Statistika</div>
        {[["Talabalar",(data.students||[]).length],["Guruhlar",(data.study_groups||[]).length],["O'qituvchilar",(data.teachers||[]).length],["To'lovlar",(data.payments||[]).length],["Davomat",(data.attendance||[]).length],["Lidlar",(data.leads||[]).length],["Testlar",(data.tests||[]).length],["Kitoblar",(data.library_books||[]).length],["Resurslar",(data.resources||[]).length],["Vazifalar",(data.tasks||[]).length]].map(([l, r]) => <div key={l} className="line"><span>{l}</span><b>{r}</b></div>)}
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
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal modal-wide" role="dialog" aria-modal="true">
        <div className="modal-hd">
          <b>{cfg.title}</b>
          <button className="modal-close" onClick={close} disabled={saving}>×</button>
        </div>
        <div className="modal-body">
          {cfg.fields.map(({ k, label, type = "text", opts, full, req }, idx) => (
            <label key={k} className={`field ${full ? "field-full" : ""} ${errors[k] ? "field-error" : ""}`}>
              <span className="field-label">{label}{req && <span className="req-star">*</span>}</span>
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
              {errors[k] && <span className="field-err-msg">{errors[k]}</span>}
            </label>
          ))}
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={close} disabled={saving}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <><span className="spin-sm">⟳</span> Saqlanmoqda...</> : (isEdit ? "Yangilash" : "Saqlash")}
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
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && close()}>
      <div className="drawer">
        <div className="modal-hd"><b>👤 Talaba profili</b><button className="modal-close" onClick={close}>×</button></div>
        <div className="drawer-body">
          <div className="profile-head">
            <Avatar name={r.full_name} size={52} />
            <div className="profile-info">
              <div className="profile-name">{r.full_name}</div>
              <div className="profile-phone">{r.phone || "—"}</div>
            </div>
            <Pill type={Number(r.balance || 0) < 0 ? "red" : "green"}>{money(r.balance)}</Pill>
          </div>
          <div className="drawer-section">
            {[["Telefon",r.phone],["Ota-ona",r.parent_phone],["Guruh",r.group_name],["Holat",<StatusPill key="s" status={r.status||"active"} t={t}/>],["Davomat",<span key="a" style={{color:rate>75?"var(--success)":"var(--danger)"}}>{rate}% ({attRows.length} dars)</span>]].map(([l, rv]) => (
              <div key={l} className="line"><span>{l}</span><b>{rv == null || rv === "" ? "—" : rv}</b></div>
            ))}
          </div>
          <div className="drawer-section">
            <div className="drawer-section-title">💳 To'lovlar</div>
            {payments.slice(0, 5).map(p => (
              <div key={p.id} className="fin-row">
                <div className="fin-name"><b style={{ color: "var(--success)" }}>+{money(p.amount)}</b><small>{fmtFull(p.created_at)}</small></div>
                <MethodBadge method={p.method} />
              </div>
            ))}
            {!payments.length && <Empty text="To'lovlar yo'q" />}
          </div>
          <div className="drawer-section">
            <div className="drawer-section-title">⭐ Baholar</div>
            {grades.slice(0, 5).map(g => (
              <div key={g.id} className="line">
                <span>{g.subject || g.grade_type}</span>
                <b style={{ color: Number(g.score) / Number(g.max_score || 10) >= 0.8 ? "var(--success)" : "var(--danger)" }}>{g.score}/{g.max_score || 10}</b>
              </div>
            ))}
            {!grades.length && <Empty text="Baholar yo'q" />}
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => { setModal({ type: "payment", row: { student_name: r.full_name, group_name: r.group_name } }); close(); }}>
            + To'lov
          </button>
          <button className="btn btn-ghost" onClick={() => { setModal({ type: "student", row: r }); close(); }}>✎</button>
          <button className="btn btn-ghost danger" onClick={archive}>Arxiv</button>
        </div>
      </div>
    </div>
  );
}
