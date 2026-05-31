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
    setTimeout(() => rm(id), 4000);
  }, [rm]);
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {list.map(x => (
          <div key={x.id} className={`toast toast-${x.type}`} onClick={() => rm(x.id)}>
            <span className="toast-ico">{x.type === "success" ? "✓" : x.type === "error" ? "✕" : "!"}</span>
            {x.msg}
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
  const done = yes => { s?.res(yes); setS(null); };
  useEffect(() => {
    if (!s) return;
    const fn = e => { if (e.key === "Escape") done(false); if (e.key === "Enter") done(true); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [s]);
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {s && (
        <div className="backdrop" style={{ zIndex: 700 }} onClick={() => done(false)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div className="confirm-ico">⚠️</div>
            <p className="confirm-msg">{s.msg}</p>
            <div className="confirm-btns">
              <button className="btn btn-ghost" onClick={() => done(false)}>Bekor qilish</button>
              <button className="btn btn-danger" onClick={() => done(true)} autoFocus>O'chirish</button>
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

/* ─── Card Header ────────────────────────────────────────────────── */
export function CardHd({ title, sub, right, style }) {
  return (
    <div className="card-hd" style={style}>
      <div>
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {right && <div className="card-hd-right">{right}</div>}
    </div>
  );
}

/* ─── Section Header (legacy compat) ─────────────────────────────── */
export function SectionHeader({ title, sub, action, onAction, style }) {
  return (
    <div className="card-hd" style={style}>
      <div>
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {action && <button className="btn btn-ghost btn-sm" onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ─── Premium KPI Stat Card ──────────────────────────────────────── */
export function StatCard({ label, value, icon, tone = "blue", sub, trend, trendUp, onClick, gradient }) {
  return (
    <div className={`kpi kpi-${tone} ${gradient ? `kpi-gradient g-${tone}` : ""} ${onClick ? "click" : ""}`}
      onClick={onClick}>
      <div className="kpi-top">
        <div className="kpi-icon">{icon}</div>
        {trend !== undefined && (
          <div className={`kpi-trend-chip ${trendUp === true ? "up" : trendUp === false ? "down" : "neutral"}`}>
            {trendUp === true ? "↑" : trendUp === false ? "↓" : ""} {trend}
          </div>
        )}
      </div>
      <div className="kpi-val">{value ?? 0}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

/* ─── Finance Hero Card ──────────────────────────────────────────── */
export function FinanceHeroCard({ title, value, tone, icon, sub }) {
  return (
    <div className={`fin-card fin-${tone}`}>
      <div className="fin-icon">{icon}</div>
      <div>
        <div className="fin-amt">{value}</div>
        <div className="fin-label">{title}</div>
        {sub && <div className="fin-count">{sub}</div>}
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
export function ProgressBar({ value = 0, color = "blue" }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="prog">
      <div className={`prog-fill ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
}

/* ─── SVG Bar Chart ──────────────────────────────────────────────── */
export function BarChart({ data = [], height = 160, color = "#3b82f6", color2 }) {
  if (!data.length) return <div className="empty-state" style={{ padding: 24 }}><div className="es-title">Ma'lumot yo'q</div></div>;
  const max   = Math.max(...data.map(d => Math.max(d.value || 0, d.value2 || 0)), 1);
  const w     = 100 / data.length;
  const pad   = 2;
  const bw    = color2 ? w * 0.38 : w * 0.55;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="chart-wrap" style={{ width: "100%", height }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f}
          x1={0} y1={height - height * f}
          x2={100} y2={height - height * f}
          className="chart-grid-line" strokeDasharray="2,2" />
      ))}
      {data.map((d, i) => {
        const x     = i * w + pad / 2;
        const h1    = Math.max(2, (d.value || 0) / max * (height - 20));
        const h2    = color2 ? Math.max(2, (d.value2 || 0) / max * (height - 20)) : 0;
        const xc    = x + (w - pad) / 2 - (color2 ? bw / 2 + 1 : bw / 2);
        return (
          <g key={i}>
            {/* Bar 1 */}
            <rect
              x={color2 ? xc - bw / 2 : xc}
              y={height - h1 - 10}
              width={bw} height={h1}
              rx={2} fill={color}
              className="chart-bar-rect" opacity={.9}
            />
            {/* Bar 2 */}
            {color2 && (
              <rect
                x={xc + bw + 2}
                y={height - h2 - 10}
                width={bw} height={h2}
                rx={2} fill={color2}
                className="chart-bar-rect" opacity={.75}
              />
            )}
            {/* Label */}
            <text
              x={x + (w - pad) / 2}
              y={height - 2}
              textAnchor="middle"
              className="chart-label"
            >{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── SVG Line Chart ─────────────────────────────────────────────── */
export function LineChart({ data = [], height = 120, color = "#3b82f6" }) {
  if (data.length < 2) return null;
  const max   = Math.max(...data.map(d => d.value || 0), 1);
  const pts   = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 96 + 2;
    const y = height - 20 - ((d.value || 0) / max) * (height - 28);
    return `${x},${y}`;
  });
  const lineD = "M" + pts.join(" L");
  const areaD = `M${pts[0]} L${pts.join(" L")} L${(data.length - 1) / (data.length - 1) * 96 + 2},${height - 20} L2,${height - 20} Z`;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="chart-wrap" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={`lg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity=".02" />
        </linearGradient>
      </defs>
      {/* Area */}
      <path d={areaD} fill={`url(#lg-${color.replace("#","")})`} />
      {/* Line */}
      <path d={lineD} className="chart-line" stroke={color} />
      {/* Dots */}
      {pts.map((p, i) => {
        const [x, y] = p.split(",");
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="2.5" fill={color} className="chart-dot" />
            <text x={x} y={height - 3} textAnchor="middle" className="chart-label">{data[i].label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── SVG Donut Chart ────────────────────────────────────────────── */
export function DonutChart({ value = 0, max = 100, color = "#3b82f6", size = 100, label }) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .6s var(--ease)" }}
        />
      </svg>
      <div className="donut-center">
        <div className="donut-pct" style={{ color }}>{Math.round(pct)}%</div>
        {label && <div className="donut-lbl">{label}</div>}
      </div>
    </div>
  );
}

/* ─── Sparkline ──────────────────────────────────────────────────── */
export function Sparkline({ data = [], color = "#3b82f6", width = 64, height = 28 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sl-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${pts.join(" L")} L${width},${height} L0,${height} Z`}
        fill={`url(#sl-${color.replace("#","")})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────────── */
const AV_COLORS = [
  ["#3b82f6","#1d4ed8"], ["#8b5cf6","#7c3aed"], ["#06b6d4","#0891b2"],
  ["#10b981","#059669"], ["#f59e0b","#d97706"], ["#ef4444","#dc2626"],
  ["#ec4899","#db2777"], ["#14b8a6","#0d9488"], ["#f97316","#ea580c"],
];
function avColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (name.charCodeAt(i) + ((h << 5) - h));
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

export function Avatar({ name, size = 32, style }) {
  const [c1, c2] = avColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg,${c1},${c2})`,
      color: "#fff", fontSize: Math.round(size * 0.36), fontWeight: 900,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, letterSpacing: "-.5px", ...style
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
    <div className={`mini ${tone}`}>
      <div className="mini-lbl">{title}</div>
      <div className="mini-val">{value}</div>
      {sub && <div className="mini-sub">{sub}</div>}
    </div>
  );
}

/* ─── Info Row ───────────────────────────────────────────────────── */
export function Line({ l, r }) {
  return (
    <div className="info-row">
      <span className="ir-label">{l}</span>
      <span className="ir-val">{r == null || r === "" ? "—" : r}</span>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────────── */
export function Empty({ text = "Ma'lumot yo'q", icon = "", sub, action, onAction }) {
  return (
    <div className="empty-state">
      {icon && <div className="es-icon">{icon}</div>}
      <div className="es-title">{text}</div>
      {sub && <div className="es-sub">{sub}</div>}
      {action && <button className="btn btn-primary" onClick={onAction} style={{ marginTop: 4 }}>{action}</button>}
    </div>
  );
}

/* ─── Method Badge ───────────────────────────────────────────────── */
export function MethodBadge({ method }) {
  const MAP = { cash: "💵 Naqd", card: "💳 Karta", transfer: "🏦 O'tkazma", online: "📱 Online" };
  return <span style={{ fontSize: 12, color: "var(--t4)", fontWeight: 500 }}>{MAP[method] || method || "—"}</span>;
}

/* ─── Category Badge ─────────────────────────────────────────────── */
export function CategoryBadge({ cat }) {
  const MAP = {
    rent: "🏠 Ijara", salary: "👤 Maosh", utility: "⚡ Kommunal",
    equipment: "🖥 Jihozlar", marketing: "📣 Marketing",
    repair: "🔧 Ta'mirlash", food: "🍕 Ovqat", other: "📦 Boshqa",
  };
  return <span style={{ fontSize: 12 }}>{MAP[cat] || cat || "—"}</span>;
}

/* ─── Notice ─────────────────────────────────────────────────────── */
export function Notice({ n }) {
  const type = n.type === "warning" ? "warning" : n.type === "payment" ? "payment" : n.type === "error" ? "error" : "info";
  return (
    <div className={`notif ${!n.is_read ? "unread" : ""}`}>
      <div className={`n-dot ${type}`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="n-title">{n.title}</div>
        {n.body && <div className="n-body">{n.body}</div>}
      </div>
      <div className="n-time">{n.created_at?.slice(0, 10) || ""}</div>
    </div>
  );
}

/* ─── Pay Row ────────────────────────────────────────────────────── */
export function FinanceLine({ name, sub, amount, date }) {
  return (
    <div className="pay-row">
      <Avatar name={name} size={32} />
      <div className="pay-info">
        <div className="pay-name">{name || "—"}</div>
        {sub && <div className="pay-sub">{sub}</div>}
      </div>
      <div className="pay-amt green">{amount}</div>
      <div className="pay-date">{date}</div>
    </div>
  );
}

/* ─── Group Line ─────────────────────────────────────────────────── */
export function GroupLine({ g, count }) {
  const cap = Number(g.capacity || 15);
  const pct = Math.min(100, Math.round(count / cap * 100));
  const color = pct >= 90 ? "red" : pct >= 70 ? "orange" : "green";
  return (
    <div className="pay-row" style={{ gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pay-name">{g.name}</div>
        <div className="pay-sub">{g.teacher_name || "—"} · {g.schedule_text || "—"}</div>
      </div>
      <div style={{ width: 90 }}>
        <ProgressBar value={pct} color={color} />
        <div style={{ fontSize: 10, color: "var(--t4)", textAlign: "right", marginTop: 2 }}>{count}/{cap}</div>
      </div>
      <Pill type={pct >= 100 ? "orange" : "green"}>{pct >= 100 ? "To'lgan" : "Faol"}</Pill>
    </div>
  );
}
