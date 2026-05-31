import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { initials } from "../../lib/utils.js";

/* ─── Toast ──────────────────────────────────────────────────────── */
export const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const rm = useCallback(id => setList(t => t.filter(x => x.id !== id)), []);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setList(t => [...t.slice(-4), { id, msg, type }]);
    setTimeout(() => rm(id), 3800);
  }, [rm]);
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {list.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => rm(t.id)}>
            <span className="toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ─── Confirm ────────────────────────────────────────────────────── */
export const ConfirmCtx = createContext(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [s, setS] = useState(null);
  const confirm = useCallback(msg => new Promise(res => setS({ msg, res })), []);
  const handle = yes => { s?.res(yes); setS(null); };
  useEffect(() => {
    if (!s) return;
    const fn = e => { if (e.key === "Escape") handle(false); if (e.key === "Enter") handle(true); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [s]);
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {s && (
        <div className="backdrop" style={{ zIndex: 700 }} onClick={() => handle(false)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <p className="confirm-msg">{s.msg}</p>
            <div className="confirm-btns">
              <button className="btn btn-ghost" onClick={() => handle(false)}>Bekor qilish</button>
              <button className="btn btn-danger" onClick={() => handle(true)} autoFocus>O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/* ─── Card ───────────────────────────────────────────────────────── */
export function Card({ children, className = "", style }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

/* ─── Section Header ─────────────────────────────────────────────── */
export function SectionHeader({ title, sub, action, onAction, style }) {
  return (
    <div className="sc-hd" style={style}>
      <div>
        <div className="sc-t">{title}</div>
        {sub && <div className="sc-sub">{sub}</div>}
      </div>
      {action && <button className="btn btn-ghost btn-sm" onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ─── KPI Stat Card ──────────────────────────────────────────────── */
export function StatCard({ label, value, icon, tone = "blue", sub, trend, trendDir = "neutral", onClick }) {
  return (
    <div className={`kpi kpi-${tone} ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <div className="kpi-icon">{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kpi-value">{value ?? 0}</div>
        <div className="kpi-label">{label}</div>
        {(sub || trend) && (
          <div className={`kpi-trend ${trendDir}`}>
            {trend && <span>{trendDir === "up" ? "↑" : trendDir === "down" ? "↓" : ""}</span>}
            <span>{sub || trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Finance Hero ───────────────────────────────────────────────── */
export function FinanceHeroCard({ title, value, tone, icon, sub }) {
  return (
    <div className={`fhero fhero-${tone}`}>
      <div className="fhero-icon">{icon}</div>
      <div>
        <div className="fhero-val">{value}</div>
        <div className="fhero-label">{title}</div>
        {sub && <div className="fhero-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Pill ───────────────────────────────────────────────────────── */
export function Pill({ children, type = "blue" }) {
  return <span className={`pill pill-${type}`}>{children}</span>;
}

/* ─── Status Pill ────────────────────────────────────────────────── */
export function StatusPill({ status, t }) {
  const MAP = {
    active:      ["green",  "Faol"],
    frozen:      ["blue",   "Muzlatilgan"],
    archived:    ["muted",  "Arxiv"],
    inactive:    ["orange", "Nofaol"],
    on_leave:    ["purple", "Ta'tilda"],
    available:   ["green",  "Mavjud"],
    occupied:    ["orange", "Band"],
    maintenance: ["red",    "Ta'mirda"],
    draft:       ["muted",  "Qoralama"],
    completed:   ["green",  "Tugallandi"],
    overdue:     ["red",    "Muddati o'tdi"],
    returned:    ["teal",   "Qaytarildi"],
    active_loan: ["blue",   "Berilgan"],
    todo:        ["blue",   "Rejalangan"],
    in_progress: ["orange", "Jarayonda"],
    done:        ["green",  "Tugallandi"],
    cancelled:   ["muted",  "Bekor"],
    lost:        ["red",    "Yo'qotildi"],
  };
  const [type, label] = MAP[status] || ["muted", status || "—"];
  return <Pill type={type}>{label}</Pill>;
}

/* ─── Progress Bar ───────────────────────────────────────────────── */
export function ProgressBar({ value = 0, color }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const c = color === "green" ? "green" : color === "red" ? "red" : color === "orange" ? "orange" : "";
  return (
    <div className="prog">
      <div className={`prog-bar ${c}`} style={{ width: `${v}%` }} />
    </div>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────────── */
const COLORS = [
  ["#3b82f6","#60a5fa"], ["#7c3aed","#a78bfa"], ["#0891b2","#22d3ee"],
  ["#16a34a","#4ade80"], ["#d97706","#fbbf24"], ["#dc2626","#f87171"],
  ["#db2777","#f472b6"], ["#0d9488","#2dd4bf"],
];

function nameColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (name.charCodeAt(i) + ((h << 5) - h));
  return COLORS[Math.abs(h) % COLORS.length];
}

export function Avatar({ name, size = 32, style }) {
  const [c1, c2] = nameColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg,${c1},${c2})`,
      color: "#fff", fontSize: size * 0.36, fontWeight: 900,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, ...style
    }}>
      {initials(name)}
    </div>
  );
}

/* ─── Person ─────────────────────────────────────────────────────── */
export function Person({ name, sub, size = 30 }) {
  return (
    <div className="person">
      <Avatar name={name} size={size} />
      <div>
        <b>{name || "—"}</b>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

/* ─── Mini Card ──────────────────────────────────────────────────── */
export function Mini({ title, value, tone = "blue", sub }) {
  return (
    <div className={`mini-card ${tone}`}>
      <div className="mini-label">{title}</div>
      <div className="mini-val">{value}</div>
      {sub && <div className="mini-sub">{sub}</div>}
    </div>
  );
}

/* ─── Info Row ───────────────────────────────────────────────────── */
export function Line({ l, r }) {
  return (
    <div className="info-row">
      <span className="info-row-label">{l}</span>
      <span className="info-row-val">{r == null || r === "" ? "—" : r}</span>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────────── */
export function Empty({ text = "Ma'lumot yo'q", icon = "", action, onAction }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{text}</div>
      {action && <button className="btn btn-primary btn-sm" onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ─── Method Badge ───────────────────────────────────────────────── */
export function MethodBadge({ method }) {
  const MAP = { cash: "💵 Naqd", card: "💳 Karta", transfer: "🏦 O'tkazma", online: "📱 Online" };
  return <span className="c-muted" style={{ fontSize: 12 }}>{MAP[method] || method || "—"}</span>;
}

/* ─── Category Badge ─────────────────────────────────────────────── */
export function CategoryBadge({ cat }) {
  const MAP = {
    rent: "🏠 Ijara", salary: "👤 Maosh", utility: "⚡ Kommunal",
    equipment: "🖥 Jihozlar", marketing: "📣 Marketing",
    repair: "🔧 Ta'mirlash", other: "📦 Boshqa",
  };
  return <span style={{ fontSize: 12 }}>{MAP[cat] || cat || "—"}</span>;
}

/* ─── Notice ─────────────────────────────────────────────────────── */
export function Notice({ n }) {
  const type = n.type === "warning" ? "warning" : n.type === "payment" ? "payment" : n.type === "error" ? "error" : "info";
  return (
    <div className={`notif ${!n.is_read ? "unread" : ""}`}>
      <div className={`notif-dot ${type}`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="notif-title">{n.title}</div>
        {n.body && <div className="notif-body">{n.body}</div>}
      </div>
      <div className="notif-time">{n.created_at?.slice(0, 10) || ""}</div>
    </div>
  );
}

/* ─── Finance Row ────────────────────────────────────────────────── */
export function FinanceLine({ name, sub, amount, date }) {
  return (
    <div className="fin-row">
      <Avatar name={name} size={30} />
      <div className="fin-name">
        <b>{name || "—"}</b>
        <small>{sub || "—"}</small>
      </div>
      <div className="fin-amt c-green">{amount}</div>
      <div className="fin-date">{date}</div>
    </div>
  );
}

/* ─── Group Line ─────────────────────────────────────────────────── */
export function GroupLine({ g, count }) {
  const cap = Number(g.capacity || 15);
  const pct = Math.min(100, Math.round(count / cap * 100));
  return (
    <div className="fin-row" style={{ gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>{g.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-4)", marginTop: 2 }}>{g.teacher_name || "—"}</div>
      </div>
      <div style={{ width: 80 }}>
        <ProgressBar value={pct} color={pct >= 90 ? "red" : pct >= 70 ? "orange" : "green"} />
        <div style={{ fontSize: 10.5, color: "var(--text-4)", marginTop: 3, textAlign: "right" }}>{count}/{cap}</div>
      </div>
      <Pill type={pct >= 100 ? "orange" : "green"}>{pct >= 100 ? "To'lgan" : "Faol"}</Pill>
    </div>
  );
}
