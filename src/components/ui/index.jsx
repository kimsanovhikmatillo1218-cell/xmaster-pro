import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { initials } from "../../lib/utils.js";

/* ─── Toast ──────────────────────────────────────────────────────── */
export const ToastCtx = createContext(()=>{});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback(id=>setToasts(t=>t.filter(x=>x.id!==id)),[]);
  const add = useCallback((msg,type="success")=>{
    const id=Date.now()+Math.random();
    setToasts(t=>[...t.slice(-4),{id,msg,type}]);
    setTimeout(()=>remove(id),3800);
  },[remove]);
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map(t=>(
          <div key={t.id} className={`toast toast-${t.type}`} onClick={()=>remove(t.id)} role="alert">
            <span className="toast-icon">{t.type==="success"?"✓":t.type==="error"?"✕":"!"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ─── Confirm ────────────────────────────────────────────────────── */
export const ConfirmCtx = createContext(async()=>false);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback(msg=>new Promise(res=>setState({msg,res})),[]);
  const handle  = yes=>{ state?.res(yes); setState(null); };
  useEffect(()=>{
    if(!state) return;
    const fn=e=>{ if(e.key==="Escape") handle(false); if(e.key==="Enter") handle(true); };
    window.addEventListener("keydown",fn);
    return()=>window.removeEventListener("keydown",fn);
  },[state]);
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state&&(
        <div className="modal-backdrop" style={{zIndex:700}} onClick={()=>handle(false)}>
          <div className="confirm-box" onClick={e=>e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <p className="confirm-msg">{state.msg}</p>
            <div className="confirm-btns">
              <button className="btn btn-ghost" onClick={()=>handle(false)}>Bekor qilish</button>
              <button className="btn btn-danger" onClick={()=>handle(true)} autoFocus>O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/* ─── Card ───────────────────────────────────────────────────────── */
export function Card({ children, className="", style }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

/* ─── SectionHeader ──────────────────────────────────────────────── */
export function SectionHeader({ title, action, onAction, style }) {
  return (
    <div className="sc-hd" style={style}>
      <div className="sc-t">{title}</div>
      {action&&<button className="btn btn-ghost btn-sm" onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ─── StatCard ───────────────────────────────────────────────────── */
export function StatCard({ label, value, icon, tone="blue", sub, trend, onClick }) {
  return (
    <div className={`stat-card stat-${tone}`} onClick={onClick}
      style={onClick?{cursor:"pointer"}:{}} role={onClick?"button":undefined} tabIndex={onClick?0:undefined}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value??0}</div>
        <div className="stat-label">{label}</div>
        {(sub||trend)&&<div className="stat-trend">{sub||trend}</div>}
      </div>
    </div>
  );
}

/* ─── Pill ───────────────────────────────────────────────────────── */
export function Pill({ children, type="blue" }) {
  return <span className={`pill pill-${type}`}>{children}</span>;
}

/* ─── StatusPill ─────────────────────────────────────────────────── */
export function StatusPill({ status, t }) {
  const MAP = {
    active:   ["green",  t?.active||"Faol"],
    frozen:   ["blue",   t?.frozen||"Muzlatilgan"],
    archived: ["orange", t?.archived||"Arxiv"],
    inactive: ["orange", "Nofaol"],
    on_leave: ["purple", "Ta'tilda"],
    available:["green",  "Mavjud"],
    occupied: ["orange", "Band"],
    maintenance:["red",  "Ta'mirda"],
    draft:    ["muted",  "Qoralama"],
    completed:["green",  "Tugallandi"],
    overdue:  ["red",    "Muddati o'tdi"],
    returned: ["teal",   "Qaytarildi"],
  };
  const [type, label] = MAP[status]||["blue",status||"—"];
  return <Pill type={type}>{label}</Pill>;
}

/* ─── ProgressBar ────────────────────────────────────────────────── */
export function ProgressBar({ value=0, color }) {
  const v=Math.max(0,Math.min(100,Number(value)||0));
  return (
    <div className="prog-wrap" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="prog-bar" style={{
        width:`${v}%`,
        background:color==="red"?"var(--danger)":color==="green"?"var(--success)":color==="orange"?"var(--warning)":undefined
      }}/>
    </div>
  );
}

/* ─── Avatar / Person ────────────────────────────────────────────── */
export function Avatar({ name, size=30, style }) {
  const bg = stringToColor(name||"");
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:`linear-gradient(135deg, ${bg}, ${shiftColor(bg)})`,
      color:"#fff", fontSize:size*0.36, fontWeight:900,
      display:"flex", alignItems:"center", justifyContent:"center",
      flexShrink:0, ...style
    }}>
      {initials(name)}
    </div>
  );
}
function stringToColor(str) {
  let h=0; for(let i=0;i<str.length;i++) h=str.charCodeAt(i)+((h<<5)-h);
  const colors=["#2563eb","#7c3aed","#0891b2","#16a34a","#d97706","#dc2626","#db2777","#0d9488"];
  return colors[Math.abs(h)%colors.length];
}
function shiftColor(hex) {
  const n=parseInt(hex.slice(1),16);
  const r=Math.min(255,(n>>16)+40), g=Math.min(255,(n>>8&0xFF)+20), b=Math.min(255,(n&0xFF)+60);
  return `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`;
}

export function Person({ name, sub, size=30 }) {
  return (
    <div className="person">
      <Avatar name={name} size={size}/>
      <div>
        <b>{name||"—"}</b>
        {sub&&<small>{sub}</small>}
      </div>
    </div>
  );
}

/* ─── Mini card ──────────────────────────────────────────────────── */
export function Mini({ title, value, tone="blue", sub }) {
  return (
    <div className={`mini ${tone}`}>
      <span>{title}</span>
      <b>{value}</b>
      {sub&&<small>{sub}</small>}
    </div>
  );
}

/* ─── Line ───────────────────────────────────────────────────────── */
export function Line({ l, r }) {
  return (
    <div className="line">
      <span>{l}</span>
      <b>{r==null||r===""?"—":r}</b>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────── */
export function Empty({ text="Ma'lumot yo'q", icon="", action, onAction }) {
  return (
    <div className="empty-state">
      {icon&&<div className="empty-icon">{icon}</div>}
      <div className="empty-text">{text}</div>
      {action&&<button className="btn btn-primary btn-sm" onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ─── MethodBadge ────────────────────────────────────────────────── */
export function MethodBadge({ method }) {
  const MAP={cash:"💵 Naqd",card:"💳 Karta",transfer:"🏦 O'tkazma",online:"📱 Online"};
  return <span className="muted" style={{fontSize:11}}>{MAP[method]||method||"—"}</span>;
}

/* ─── CategoryBadge ──────────────────────────────────────────────── */
export function CategoryBadge({ cat }) {
  const MAP={rent:"🏠 Ijara",salary:"👤 Maosh",utility:"⚡ Kommunal",equipment:"🖥 Jihozlar",marketing:"📣 Marketing",repair:"🔧 Ta'mirlash",other:"📦 Boshqa"};
  return <span style={{fontSize:11}}>{MAP[cat]||cat||"—"}</span>;
}

/* ─── Modal ──────────────────────────────────────────────────────── */
export function Modal({ title, children, footer, close, wide, xl }) {
  const ref = useRef(null);
  useEffect(()=>{ setTimeout(()=>ref.current?.focus(),50); },[]);
  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&close()}>
      <div className={`modal ${wide?"modal-wide":""} ${xl?"modal-xl":""}`}
        ref={ref} tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-hd">
          <b>{title}</b>
          <button className="modal-close" onClick={close} aria-label="Yopish">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer&&<div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── Field ──────────────────────────────────────────────────────── */
export function Field({ label, required, error, full, children }) {
  return (
    <label className={`field ${full?"field-full":""} ${error?"field-error":""}`}>
      <span className="field-label">
        {label}{required&&<span className="req-star">*</span>}
      </span>
      {children}
      {error&&<span className="field-err-msg">{error}</span>}
    </label>
  );
}

/* ─── FinanceHeroCard ────────────────────────────────────────────── */
export function FinanceHeroCard({ title, value, tone, icon, sub }) {
  return (
    <div className={`finance-card finance-${tone}`}>
      <div className="fc-icon">{icon}</div>
      <div className="fc-body">
        <div className="fc-value">{value}</div>
        <div className="fc-label">{title}</div>
        {sub&&<div className="fc-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── FinanceLine ────────────────────────────────────────────────── */
export function FinanceLine({ name, sub, amount, date }) {
  return (
    <div className="fin-row">
      <Avatar name={name} size={28}/>
      <div className="fin-name"><b>{name||"—"}</b><small>{sub||"—"}</small></div>
      <div className="fin-amt green">+{amount}</div>
      <div className="fin-date">{date}</div>
    </div>
  );
}

/* ─── GroupLine ──────────────────────────────────────────────────── */
export function GroupLine({ g, count }) {
  const cap=Number(g.capacity||15);
  const pct=Math.min(100,Math.round(count/cap*100));
  return (
    <div className="group-line">
      <div><b>{g.name}</b><small>{g.teacher_name||"—"} · {g.schedule_text||"—"}</small></div>
      <span style={{fontSize:11,color:"var(--text-sub)",whiteSpace:"nowrap"}}>{count}/{cap}</span>
      <div style={{width:60}}><ProgressBar value={pct}/></div>
      <Pill type={pct>=100?"orange":"green"}>{pct>=100?"To'lgan":"Faol"}</Pill>
    </div>
  );
}

/* ─── Notice ─────────────────────────────────────────────────────── */
export function Notice({ n }) {
  return (
    <div className={`notif ${n.is_read?"":"notif-unread"}`}>
      <div className={`nd ${n.type==="warning"?"warning":n.type==="payment"?"payment":n.type==="error"?"danger":""}`}/>
      <div style={{flex:1}}>
        <div className="nt">{n.title}</div>
        <div className="ns">{n.body||"—"}</div>
      </div>
      <div style={{fontSize:10,color:"var(--muted)",whiteSpace:"nowrap"}}>{n.created_at?.slice(0,10)||""}</div>
    </div>
  );
}

/* ─── Spin ───────────────────────────────────────────────────────── */
export function Spin() {
  return <span className="spin" style={{display:"inline-block"}}>↻</span>;
}
