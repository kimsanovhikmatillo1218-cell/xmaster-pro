import { useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";

const USERS = [
  { username:"superadmin", password:"admin123",  role:"superadmin", name:"Super Admin",    avatar:"SA", color:"#4f6ef7" },
  { username:"admin",      password:"admin123",  role:"admin",      name:"Administrator",  avatar:"AD", color:"#7c3aed" },
  { username:"teacher1",   password:"teacher123",role:"teacher",    name:"O'qituvchi",     avatar:"OQ", color:"#10b981" },
  { username:"reception",  password:"recep123",  role:"reception",  name:"Resepshen",      avatar:"RE", color:"#f59e0b" },
];

const ROLE_LABELS = {
  superadmin:"👑 Superadmin",
  admin:"🛡️ Admin",
  teacher:"👨‍🏫 O'qituvchi",
  reception:"🎧 Resepshen",
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [lang,     setLang]     = useState(localStorage.getItem("xm_lang") || "uz");

  const LABELS = {
    uz:{ title:"O'quv markaz tizimi", user:"Foydalanuvchi nomi", pass:"Parol", btn:"Kirish", demo:"Demo hisoblar", err:"Login yoki parol noto'g'ri", welcome:"Xush kelibsiz!" },
    ru:{ title:"Система учебного центра", user:"Имя пользователя", pass:"Пароль", btn:"Войти", demo:"Демо аккаунты", err:"Неверный логин или пароль", welcome:"Добро пожаловать!" },
    en:{ title:"Learning Center System", user:"Username", pass:"Password", btn:"Sign in", demo:"Demo accounts", err:"Incorrect login or password", welcome:"Welcome!" },
  };
  const L = LABELS[lang] || LABELS.uz;

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true); setError("");
    await new Promise(r => setTimeout(r, 500));
    const user = USERS.find(u => u.username === username.trim() && u.password === password);
    if (user) {
      localStorage.setItem("xm_user", JSON.stringify(user));
      localStorage.setItem("xm_lang", lang);
      onLogin(user);
    } else {
      setError(L.err);
    }
    setLoading(false);
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
        {["uz","ru","en"].map(l => (
          <button key={l} className={`login-lang-btn ${lang===l?"on":""}`}
            onClick={() => { setLang(l); localStorage.setItem("xm_lang",l); }}>
            {l === "uz" ? "🇺🇿 UZ" : l === "ru" ? "🇷🇺 RU" : "🇬🇧 EN"}
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
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading
              ? <><span className="login-spin" /> Kirish...</>
              : <>{L.btn} →</>}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="login-divider"><span>{L.demo}</span></div>
        <div className="login-demo-grid">
          {USERS.map(u => (
            <button key={u.username} className="login-demo-card"
              onClick={() => quickFill(u)}>
              <div className="login-demo-av" style={{ background: u.color }}>
                {u.avatar}
              </div>
              <div>
                <div className="login-demo-role">{ROLE_LABELS[u.role]}</div>
                <div className="login-demo-cred">{u.username}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="login-footer-bar">X-MASTER Pro v3.0 · © 2025</div>
    </div>
  );
}
