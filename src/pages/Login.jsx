import { useState } from "react";
import { Eye, EyeOff, Lock, User, Crown, ShieldCheck, GraduationCap, Headphones, AlertCircle, ArrowRight } from "lucide-react";
import { supabase as db } from "../lib/supabase.js";

const USERS = [
  { username:"superadmin", password:"admin123",  role:"superadmin", name:"Super Admin",    avatar:"SA", color:"#4f6ef7" },
  { username:"admin",      password:"admin123",  role:"admin",      name:"Administrator",  avatar:"AD", color:"#7c3aed" },
  { username:"teacher1",   password:"teacher123",role:"teacher",    name:"O'qituvchi",     avatar:"OQ", color:"#10b981" },
  { username:"reception",  password:"recep123",  role:"reception",  name:"Resepshen",      avatar:"RE", color:"#f59e0b" },
];

const ROLE_DEFS = {
  superadmin: { Icon: Crown,         label: "Superadmin"  },
  admin:      { Icon: ShieldCheck,   label: "Admin"       },
  teacher:    { Icon: GraduationCap, label: "O'qituvchi" },
  reception:  { Icon: Headphones,    label: "Resepshen"   },
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [lang,     setLang]     = useState(localStorage.getItem("xm_lang") || "uz");
  const [showDemo, setShowDemo] = useState(false);

  const LABELS = {
    uz:{ title:"O'quv markaz tizimi", user:"Foydalanuvchi nomi", pass:"Parol", btn:"Kirish", demo:"Demo hisoblar", err:"Login yoki parol noto'g'ri", welcome:"Xush kelibsiz!" },
    ru:{ title:"Система учебного центра", user:"Имя пользователя", pass:"Пароль", btn:"Войти", demo:"Демо аккаунты", err:"Неверный логин или пароль", welcome:"Добро пожаловать!" },
    en:{ title:"Learning Center System", user:"Username", pass:"Password", btn:"Sign in", demo:"Demo accounts", err:"Incorrect login or password", welcome:"Welcome!" },
  };
  const L = LABELS[lang] || LABELS.uz;

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true); setError("");
    try {
      // 1) Avval hardcoded admin/superadmin ni tekshir
      const builtIn = USERS.find(u => u.username === username.trim() && u.password === password);
      if (builtIn) {
        localStorage.setItem("xm_user", JSON.stringify(builtIn));
        localStorage.setItem("xm_lang", lang);
        onLogin(builtIn); return;
      }
      // 2) Supabase app_users jadvalini tekshir
      const { data: rows } = await db.from("app_users")
        .select("*").eq("username", username.trim()).eq("is_active", true).limit(1);
      const dbUser = rows?.[0];
      if (dbUser && dbUser.password === password) {
        const user = {
          id: dbUser.id,
          username: dbUser.username,
          name: dbUser.full_name || dbUser.username,
          role: dbUser.role,
          color: dbUser.color || "#7c3aed",
          avatar: (dbUser.full_name || dbUser.username || "U").slice(0,2).toUpperCase(),
          linked_id: dbUser.linked_id,
          group_name: dbUser.group_name,
        };
        localStorage.setItem("xm_user", JSON.stringify(user));
        localStorage.setItem("xm_lang", lang);
        onLogin(user); return;
      }
      setError(L.err);
    } catch { setError(L.err); }
    finally { setLoading(false); }
  };

  const quickFill = (u) => { setUsername(u.username); setPassword(u.password); setError(""); };

  return (
    <div className="login-screen">
      <div className="login-bg">
        <div className="login-orb login-orb1" />
        <div className="login-orb login-orb2" />
        <div className="login-orb login-orb3" />
      </div>

      {/* Lang */}
      <div className="login-lang-bar">
        {[
          {v:"uz", color:"#1eb53a", label:"UZ"},
          {v:"ru", color:"#d52b1e", label:"RU"},
          {v:"en", color:"#012169", label:"EN"},
        ].map(l => (
          <button key={l.v} className={`login-lang-btn ${lang===l.v?"on":""}`}
            onClick={() => { setLang(l.v); localStorage.setItem("xm_lang",l.v); }}>
            <span className="lang-flag" style={{background:l.color}}>{l.label}</span>
            {l.label}
          </button>
        ))}
      </div>

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo-sq">XM</div>
          <div>
            <div className="login-app-name">X-MASTER Pro</div>
            <div className="login-app-sub">{L.title}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form" noValidate>
          <div className="login-field">
            <label className="login-label">{L.user}</label>
            <div className="login-inp-wrap">
              <User size={15} className="login-inp-ico" />
              <input
                className="login-input"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="username"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">{L.pass}</label>
            <div className="login-inp-wrap">
              <Lock size={15} className="login-inp-ico" />
              <input
                className="login-input"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••"
                autoComplete="current-password"
              />
              <button type="button" className="login-eye-btn"
                onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error-box">
              <AlertCircle size={14} style={{flexShrink:0}}/> {error}
            </div>
          )}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading
              ? <><span className="login-spin" /> Kirish...</>
              : <>{L.btn} <ArrowRight size={15}/></>}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="login-divider">
          <button className="login-demo-toggle" onClick={() => setShowDemo(v => !v)}>
            <span>{L.demo}</span>
            <span className="login-demo-arrow" style={{transform: showDemo ? "rotate(180deg)" : "rotate(0deg)"}}>▾</span>
          </button>
        </div>
        {showDemo && (
          <div className="login-demo-grid">
            {USERS.map(u => {
              const { Icon, label } = ROLE_DEFS[u.role] || { Icon: User, label: u.role };
              return (
                <button key={u.username} className="login-demo-card" onClick={() => quickFill(u)}>
                  <div className="login-demo-av" style={{ background: u.color }}>
                    {u.avatar}
                  </div>
                  <div>
                    <div className="login-demo-role" style={{display:"flex",alignItems:"center",gap:5}}>
                      <Icon size={11}/> {label}
                    </div>
                    <div className="login-demo-cred">{u.username}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="login-footer-bar">X-MASTER Pro v3.0 · © 2025</div>
    </div>
  );
}
