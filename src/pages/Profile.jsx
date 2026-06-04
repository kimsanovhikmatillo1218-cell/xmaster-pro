import { useEffect, useState } from "react";
import {
  X, Download, Shield, UserCircle, Users, GraduationCap,
  ExternalLink, AlertCircle, CheckCircle2, RefreshCw,
  Save, Eye, EyeOff
} from "lucide-react";
import { supabase as db } from "../lib/supabase.js";

/* ── Platform SVG icons ─────────────────────────────────────────── */
const WinIcon = () => (
  <svg width="22" height="22" viewBox="0 0 88 88">
    <path d="M0 12.5L36 7.6v34.8H0zm40-5.5L88 0v42.4H40zM0 45.2h36v34.8L0 75.5zm40 0h48V88L40 81.2z" fill="#0078d4"/>
  </svg>
);
const AndroidIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M6.18 9A6 6 0 0 1 18 9v6a6 6 0 0 1-12 0V9z" fill="#3ddc84"/>
    <circle cx="9.5" cy="12" r="1.1" fill="#fff"/>
    <circle cx="14.5" cy="12" r="1.1" fill="#fff"/>
    <path d="M8 6.5 6 4.5M16 6.5l2-2M9 6h6" stroke="#3ddc84" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M9 19v2M15 19v2" stroke="#3ddc84" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const AppleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#333">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

/* ── Role config ─────────────────────────────────────────────────── */
const ROLE_CFG = {
  superadmin: { color:"#4f6ef7", label:"Superadmin",  g:"linear-gradient(135deg,#4f6ef7,#7c3aed)" },
  admin:      { color:"#7c3aed", label:"Admin",        g:"linear-gradient(135deg,#7c3aed,#a855f7)" },
  teacher:    { color:"#10b981", label:"O'qituvchi",  g:"linear-gradient(135deg,#10b981,#06b6d4)" },
  reception:  { color:"#f59e0b", label:"Resepshen",    g:"linear-gradient(135deg,#f59e0b,#f97316)" },
  student:    { color:"#06b6d4", label:"Talaba",       g:"linear-gradient(135deg,#06b6d4,#3b82f6)" },
};

/* ══════════════════════════════════════════════════════════════════
   PROFILE MODAL
══════════════════════════════════════════════════════════════════ */
export default function ProfileModal({ user, onClose, onLogout, toast }) {
  const [tab,     setTab]     = useState("profile");
  const [editPwd, setEditPwd] = useState(false);
  const [newPwd,  setNewPwd]  = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [release, setRelease] = useState(null);
  const [loadRel, setLoadRel] = useState(false);

  const REPO = "kimsanovhikmatillo1218-cell/xmaster-pro";

  useEffect(() => {
    if (tab !== "download") return;
    setLoadRel(true);
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setRelease(d))
      .catch(() => {})
      .finally(() => setLoadRel(false));
  }, [tab]);

  /* Platform aniqlash */
  const ua        = (navigator.userAgent || "").toLowerCase();
  const isWin     = ua.includes("win") && !ua.includes("android");
  const isAndroid = ua.includes("android");
  const isIOS     = /iphone|ipad|ipod/.test(ua);
  const isElectron = !!window.electronAPI?.isElectron;

  const getA = kw => release?.assets?.find(a => a.name.toLowerCase().includes(kw));
  const rc   = ROLE_CFG[user?.role] || ROLE_CFG.admin;

  const PLATFORMS = [
    {
      id: "win", PIC: WinIcon, name: "Windows", sub: "Windows 10 / 11 · x64",
      accent: "#0078d4", bg: "linear-gradient(135deg,#dbeafe,#eff6ff)", bdr: "#93c5fd",
      isCurrent: isWin, badge: isElectron ? "Hozir ishlatyapsiz" : null,
      files: [
        { label: "Setup o'rnatuvchi (.exe)",  asset: getA("setup") || getA(".exe") },
        { label: "Portable (o'rnatsiz)",      asset: release?.assets?.find(a => a.name.includes(".exe") && !a.name.toLowerCase().includes("setup")) },
      ],
    },
    {
      id: "android", PIC: AndroidIcon, name: "Android", sub: "Android 7.0+ · API 24+",
      accent: "#16a34a", bg: "linear-gradient(135deg,#dcfce7,#f0fdf4)", bdr: "#86efac",
      isCurrent: isAndroid, badge: null,
      files: [
        { label: "APK (to'g'ridan o'rnatish)", asset: getA(".apk") },
        { label: "AAB (Google Play uchun)",    asset: getA(".aab") },
      ],
    },
    {
      id: "ios", PIC: AppleIcon, name: "iOS / iPadOS", sub: "iPhone · iPad · iOS 14+",
      accent: "#374151", bg: "linear-gradient(135deg,#f9fafb,#f3f4f6)", bdr: "#d1d5db",
      isCurrent: isIOS, badge: null,
      files: [
        { label: "IPA (TestFlight / Xcode)", asset: getA(".ipa") },
      ],
    },
  ];

  const TABS = [
    { id: "profile",  Icon: UserCircle, label: "Profil"     },
    { id: "download", Icon: Download,   label: "Ilovalar"   },
    { id: "password", Icon: Shield,     label: "Xavfsizlik" },
  ];

  const savePwd = async () => {
    if (newPwd.length < 6) return toast("Parol kamida 6 ta belgi", "warning");
    if (!user?.id)         return toast("Builtin hisob uchun o'zgartirib bo'lmaydi", "warning");
    setSaving(true);
    const { error } = await db.from("app_users").update({ password: newPwd }).eq("id", user.id);
    setSaving(false);
    if (error) return toast(error.message, "error");
    toast("Parol yangilandi"); setEditPwd(false); setNewPwd("");
  };

  /* Parol kuchi */
  const strength = newPwd.length >= 10 ? 4 : newPwd.length >= 7 ? 3 : newPwd.length >= 5 ? 2 : newPwd.length > 0 ? 1 : 0;
  const strColor = ["var(--line)","var(--red)","var(--orange)","var(--yellow)","var(--green)"][strength];

  return (
    <div className="backdrop"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems:"stretch", justifyContent:"flex-end", padding:0, background:"rgba(10,14,26,.55)", backdropFilter:"blur(8px)" }}>
      <div style={{
        width:440, height:"100vh", background:"var(--card)",
        display:"flex", flexDirection:"column",
        animation:"slideInRight .28s var(--spring)",
        boxShadow:"-16px 0 60px rgba(15,17,23,.2)",
        overflow:"hidden",
      }}>

        {/* ── GRADIENT HERO HEADER ──────────────────────────── */}
        <div style={{ background:rc.g, padding:"28px 24px 0", flexShrink:0, position:"relative", overflow:"hidden" }}>
          {/* Deko doiralar */}
          <div style={{ position:"absolute", top:-70, right:-70, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,.07)" }}/>
          <div style={{ position:"absolute", top:20,  right:60,  width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>

          {/* Yopish */}
          <button onClick={onClose} style={{
            position:"absolute", top:16, right:16,
            width:34, height:34, borderRadius:"50%",
            background:"rgba(255,255,255,.18)", border:"1px solid rgba(255,255,255,.3)",
            cursor:"pointer", color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(8px)", transition:"background .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.18)"; }}>
            <X size={15}/>
          </button>

          {/* Avatar + info */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:14, position:"relative", zIndex:1 }}>
            <div style={{
              width:64, height:64, borderRadius:20, flexShrink:0,
              background:"rgba(255,255,255,.22)", backdropFilter:"blur(12px)",
              border:"2px solid rgba(255,255,255,.4)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, fontWeight:900, color:"#fff",
              fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:"-.5px",
              boxShadow:"0 8px 28px rgba(0,0,0,.18)",
            }}>
              {(user?.name || user?.username || "U").slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0, paddingBottom:4 }}>
              <div style={{
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:900, fontSize:17,
                color:"#fff", letterSpacing:"-.3px", lineHeight:1.2,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}>
                {user?.name || user?.username || "Foydalanuvchi"}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                <span style={{
                  background:"rgba(255,255,255,.22)", color:"#fff",
                  fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:20,
                  backdropFilter:"blur(6px)",
                }}>
                  {rc.label}
                </span>
                <span style={{ display:"flex", alignItems:"center", gap:4, color:"rgba(255,255,255,.8)", fontSize:11 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", display:"inline-block", boxShadow:"0 0 8px #4ade80" }}/>
                  Online
                </span>
              </div>
            </div>
          </div>

          {/* Tablar */}
          <div style={{ display:"flex", marginTop:20, position:"relative", zIndex:1 }}>
            {TABS.map(({ id, Icon, label }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, padding:"10px 6px", border:"none", background:"transparent", cursor:"pointer",
                color: tab === id ? "#fff" : "rgba(255,255,255,.5)",
                fontSize:11.5, fontWeight: tab === id ? 700 : 500,
                borderBottom: tab === id ? "2.5px solid #fff" : "2.5px solid transparent",
                transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center", gap:5,
              }}>
                <Icon size={12}/> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:12 }}>

          {/* ─── PROFIL ─── */}
          {tab === "profile" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { l:"To'liq ism", v: user?.name || "—",            I:UserCircle,   c:"var(--brand)"  },
                  { l:"Username",   v: user?.username || "—",         I:Users,        c:"var(--purple)" },
                  { l:"Rol",        v: rc.label,                      I:Shield,       c:rc.color        },
                  { l:"Guruh",      v: user?.group_name || "Umumiy",  I:GraduationCap,c:"var(--green)"  },
                ].map(({ l, v, I, c }) => (
                  <div key={l} style={{
                    background:"var(--card2)", borderRadius:14, padding:"13px 14px",
                    border:"1px solid var(--line)",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                      <div style={{ width:26, height:26, borderRadius:8, background:c+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <I size={12} style={{ color:c }}/>
                      </div>
                      <span style={{ fontSize:10, color:"var(--t4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em" }}>{l}</span>
                    </div>
                    <div style={{ fontWeight:700, fontSize:13, color:"var(--t1)", paddingLeft:2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* App versiya banner */}
              <div style={{
                background:"var(--brand3)", borderRadius:14, padding:"14px 16px",
                border:"1px solid var(--brand-brd)",
                display:"flex", alignItems:"center", gap:12,
              }}>
                <div style={{ width:40, height:40, borderRadius:12, background:rc.g, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 14px ${rc.color}44` }}>
                  <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:900, color:"#fff" }}>XM</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"var(--t1)" }}>X-MASTER Pro v2.1.0</div>
                  <div style={{ fontSize:11, color:"var(--t4)", marginTop:2 }}>Windows · Android · iOS uchun mavjud</div>
                </div>
                <button onClick={() => setTab("download")} className="btn btn-ghost btn-sm" style={{ flexShrink:0 }}>
                  <Download size={12}/> Yuklab olish
                </button>
              </div>

              {/* Chiqish */}
              <button
                className="btn"
                style={{ width:"100%", color:"var(--red)", borderColor:"var(--red-b)", background:"var(--red-bg)", border:"1.5px solid", fontWeight:700 }}
                onClick={() => { onClose(); onLogout(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Tizimdan chiqish
              </button>
            </>
          )}

          {/* ─── ILOVALAR ─── */}
          {tab === "download" && (
            <>
              {/* Banner */}
              <div style={{
                background:"linear-gradient(135deg,var(--brand3),transparent)",
                borderRadius:14, padding:"14px 16px",
                border:"1px solid var(--brand-brd)",
                display:"flex", alignItems:"center", gap:12,
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:14, color:"var(--t1)" }}>
                    {loadRel
                      ? <span style={{ display:"flex", alignItems:"center", gap:7 }}><RefreshCw size={13} className="spin"/>Yuklanmoqda...</span>
                      : `X-MASTER Pro ${release?.tag_name || "v2.1.0"}`}
                  </div>
                  <div style={{ fontSize:11.5, color:"var(--t4)", marginTop:2 }}>Barcha platformalar uchun bepul</div>
                </div>
                <a href={`https://github.com/${REPO}/releases/latest`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ flexShrink:0 }}>
                  <ExternalLink size={11}/> GitHub
                </a>
              </div>

              {/* Platform kartalar */}
              {PLATFORMS.map(({ id, PIC, name, sub, accent, bg, bdr, isCurrent, badge, files }) => (
                <div key={id} style={{
                  background: bg, borderRadius:16, padding:18,
                  border: `1.5px solid ${isCurrent ? accent : bdr}`,
                  boxShadow: isCurrent ? `0 6px 28px ${accent}22` : "0 1px 4px rgba(15,17,23,.04)",
                  transition:"box-shadow .2s",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{
                      width:50, height:50, borderRadius:14, background:"#fff",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow:`0 4px 14px ${accent}22`, flexShrink:0,
                      border:`1.5px solid ${accent}22`,
                    }}>
                      <PIC/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:14, color:"var(--t1)" }}>{name}</span>
                        {isCurrent && !badge && (
                          <span style={{ background:accent, color:"#fff", fontSize:9, fontWeight:800, padding:"2px 9px", borderRadius:20 }}>
                            Sizning qurilmangiz
                          </span>
                        )}
                        {badge && (
                          <span style={{ background:accent+"22", color:accent, fontSize:9, fontWeight:700, padding:"2px 9px", borderRadius:20, border:`1px solid ${accent}44` }}>
                            {badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:11.5, color:"var(--t4)", marginTop:2 }}>{sub}</div>
                    </div>
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {files.map(({ label, asset }, fi) =>
                      asset ? (
                        <a key={fi} href={asset.browser_download_url} target="_blank" rel="noreferrer"
                          style={{
                            display:"flex", alignItems:"center", gap:10,
                            padding:"12px 15px", borderRadius:12, textDecoration:"none",
                            background: fi === 0 ? accent : "#fff",
                            color: fi === 0 ? "#fff" : accent,
                            border: fi === 0 ? "none" : `1.5px solid ${accent}44`,
                            fontWeight:700, fontSize:12.5,
                            boxShadow: fi === 0 ? `0 4px 18px ${accent}44` : "0 1px 4px rgba(15,17,23,.06)",
                            transition:"all .15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = fi === 0 ? `0 8px 28px ${accent}55` : `0 4px 14px ${accent}22`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = fi === 0 ? `0 4px 18px ${accent}44` : "0 1px 4px rgba(15,17,23,.06)"; }}>
                          <Download size={13} style={{ flexShrink:0 }}/>
                          <span style={{ flex:1 }}>{label}</span>
                          <span style={{ fontSize:10.5, opacity:.65, fontWeight:500 }}>
                            {asset.size ? `${Math.round(asset.size / 1024 / 1024)} MB` : ""}
                          </span>
                        </a>
                      ) : (
                        <div key={fi} style={{
                          display:"flex", alignItems:"center", gap:10,
                          padding:"12px 15px", borderRadius:12,
                          background:"var(--card)", border:"1.5px dashed var(--line)",
                          color:"var(--t5)", fontSize:12, fontWeight:500,
                        }}>
                          <RefreshCw size={12} style={{ flexShrink:0 }}/>
                          <span style={{ flex:1 }}>{label}</span>
                          <span style={{ fontSize:10, background:"var(--card2)", padding:"2px 9px", borderRadius:8, color:"var(--t5)" }}>
                            Build kutilmoqda
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}

              {/* Yo'riqnoma */}
              <div style={{ background:"var(--card2)", borderRadius:14, padding:"14px 16px", border:"1px solid var(--line)" }}>
                <div style={{ fontWeight:700, fontSize:12, color:"var(--t2)", marginBottom:10, display:"flex", alignItems:"center", gap:7 }}>
                  <AlertCircle size={13} style={{ color:"var(--brand)" }}/> O'rnatish yo'riqnomasi
                </div>
                {[
                  { P: WinIcon,     t: "Setup.exe → Davom → O'rnatish (Admin huquqi kerak bo'lishi mumkin)" },
                  { P: AndroidIcon, t: "APK → Telefon sozlamalari → Noma'lum manbalar → O'rnatish" },
                  { P: AppleIcon,   t: "IPA → TestFlight yoki Xcode → Window → Devices" },
                ].map(({ P, t }, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom: i < 2 ? 10 : 0 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:"var(--card)", border:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <P/>
                    </div>
                    <span style={{ fontSize:11.5, color:"var(--t3)", lineHeight:1.5, paddingTop:4 }}>{t}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─── XAVFSIZLIK ─── */}
          {tab === "password" && (
            <>
              <div style={{ background:"var(--card2)", borderRadius:16, padding:20, border:"1px solid var(--line)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
                  <div style={{ width:46, height:46, borderRadius:14, background:rc.g, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 16px ${rc.color}44` }}>
                    <Shield size={20} style={{ color:"#fff" }}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:"var(--t1)" }}>Parolni o'zgartirish</div>
                    <div style={{ fontSize:11.5, color:"var(--t4)", marginTop:2 }}>Hisob xavfsizligini oshiring</div>
                  </div>
                </div>

                {!user?.id ? (
                  <div style={{ padding:"12px 14px", borderRadius:12, background:"var(--yellow-bg)", border:"1px solid var(--yellow-b)", fontSize:12, color:"#92400e", display:"flex", alignItems:"flex-start", gap:8 }}>
                    <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/>
                    Builtin hisob (admin, teacher) uchun parolni faqat developer o'zgartira oladi.
                  </div>
                ) : !editPwd ? (
                  <button className="btn btn-primary" style={{ width:"100%" }} onClick={() => setEditPwd(true)}>
                    <Shield size={13}/> Parolni o'zgartirish
                  </button>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <label style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"var(--t3)" }}>Yangi parol (min 6 belgi)</span>
                      <div style={{ position:"relative" }}>
                        <input
                          type={showPwd ? "text" : "password"}
                          value={newPwd}
                          onChange={e => setNewPwd(e.target.value)}
                          placeholder="••••••••"
                          style={{ width:"100%", paddingRight:44 }}
                          autoFocus
                          onKeyDown={e => e.key === "Enter" && savePwd()}
                        />
                        <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                          position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                          background:"none", border:"none", cursor:"pointer", color:"var(--t4)", display:"flex",
                        }}>
                          {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                      </div>

                      {/* Parol kuchi ko'rsatkichi */}
                      {newPwd.length > 0 && (
                        <div>
                          <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} style={{
                                flex:1, height:3, borderRadius:4, transition:"background .25s",
                                background: strength >= i ? strColor : "var(--line)",
                              }}/>
                            ))}
                          </div>
                          <div style={{ fontSize:10.5, color:strColor, fontWeight:600 }}>
                            {["","Juda zaif","Zaif","O'rta","Kuchli"][strength]}
                          </div>
                        </div>
                      )}
                    </label>

                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={savePwd} disabled={saving}>
                        {saving ? <><RefreshCw size={12} className="spin"/> Saqlanmoqda...</> : <><Save size={12}/> Saqlash</>}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditPwd(false); setNewPwd(""); }}>
                        <X size={12}/> Bekor
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tavsiyalar */}
              <div style={{ borderRadius:14, padding:"14px 16px", background:"var(--card2)", border:"1px solid var(--line)" }}>
                <div style={{ fontWeight:700, fontSize:12, color:"var(--t2)", marginBottom:10, display:"flex", alignItems:"center", gap:7 }}>
                  <CheckCircle2 size={13} style={{ color:"var(--green)" }}/> Xavfsizlik tavsiyalari
                </div>
                {[
                  "Kamida 8 ta belgi, raqam va maxsus belgi ishlating",
                  "Boshqa saytlarda qaytarmaslik — har bir hisob uchun alohida",
                  "Parolni 3 oyda bir o'zgartiring",
                ].map((tip, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:9, marginBottom: i < 2 ? 8 : 0, fontSize:12, color:"var(--t3)" }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:rc.color, flexShrink:0, marginTop:5 }}/>
                    {tip}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
