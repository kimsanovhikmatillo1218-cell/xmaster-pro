import { useRef, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, ExternalLink,
  FileText, Video, Music, Link, Image, Package,
  FolderOpen, Globe, Lock, Upload, X, RefreshCw, Save
} from "lucide-react";
import { supabase as db } from "../lib/supabase.js";
import { Card, Pill, Empty, useToast, useConfirm, CustomSelect } from "../components/ui/index.jsx";
import { fmtDate } from "../lib/utils.js";
import { RES_TYPES } from "../lib/constants.js";

const TYPE_ICONS = {
  document: { Icon: FileText, bg: "#eff6ff", color: "#1d4ed8"  },
  video:    { Icon: Video,    bg: "#fef2f2", color: "#dc2626"  },
  audio:    { Icon: Music,    bg: "#fdf4ff", color: "#7c3aed"  },
  link:     { Icon: Link,     bg: "#f0fdf4", color: "#059669"  },
  image:    { Icon: Image,    bg: "#fffbeb", color: "#b45309"  },
  other:    { Icon: Package,  bg: "#f1f5f9", color: "#475569"  },
};

export default function Resources({ t, data, user, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const fileRef = useRef();

  const [typeFilter, setTypeFilter] = useState("all");
  const [search,     setSearch]     = useState("");
  const [showAdd,    setShowAdd]    = useState(false);
  const [editRow,    setEditRow]    = useState(null);
  const [form,       setForm]       = useState({ title:"", type:"document", subject:"", group_name:"", description:"", file_url:"", external_url:"", is_public:false });
  const [uploading,  setUploading]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [dragOver,   setDragOver]   = useState(false);

  const resources = data.resources || [];
  const groups    = [...new Set((data.study_groups||[]).map(g=>g.name))];
  const filtered  = resources
    .filter(r => typeFilter === "all" || r.type === typeFilter)
    .filter(r => !search
      || r.title?.toLowerCase().includes(search.toLowerCase())
      || r.subject?.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => {
    setForm({ title:"", type:"document", subject:"", group_name:"", description:"", file_url:"", external_url:"", is_public:false });
    setEditRow(null); setShowAdd(false);
  };

  const openEdit = r => {
    setForm({ title:r.title||"", type:r.type||"document", subject:r.subject||"", group_name:r.group_name||"", description:r.description||"", file_url:r.file_url||"", external_url:r.external_url||"", is_public:!!r.is_public });
    setEditRow(r); setShowAdd(true);
  };

  const uploadFile = async file => {
    if (!file) return;
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `resources/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await db.storage.from("xmaster").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = db.storage.from("xmaster").getPublicUrl(path);
      setForm(f => ({ ...f, file_url: pub.publicUrl, title: f.title || file.name.replace(/\.[^.]+$/,"") }));
      toast("Fayl yuklandi");
    } catch(e) {
      // Storage bucket yo'q bo'lsa URL sifatida saqla
      toast("Fayl yuklanmadi — URL kiriting","warning");
    } finally { setUploading(false); }
  };

  const handleDrop = e => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const save = async () => {
    if (!form.title) return toast("Sarlavha majburiy","warning");
    setSaving(true);
    try {
      const payload = { ...form, uploaded_by: user?.name || "" };
      if (editRow) {
        const { error } = await db.from("resources").update(payload).eq("id", editRow.id);
        if (error) throw error; toast("Yangilandi");
      } else {
        const { error } = await db.from("resources").insert(payload);
        if (error) throw error; toast("Qo'shildi");
      }
      resetForm(); loadAll();
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(false); }
  };

  const remove = async id => {
    if (!await confirm(t?.confirmDelete || "O'chirasizmi?")) return;
    await db.from("resources").delete().eq("id", id);
    toast("O'chirildi"); loadAll();
  };

  return (
    <div className="page-enter">

      {/* ── Type stats ── */}
      <div className="g4" style={{ marginBottom:16 }}>
        {RES_TYPES.slice(0,4).map(type => {
          const count  = resources.filter(r=>r.type===type.v).length;
          const ti     = TYPE_ICONS[type.v] || TYPE_ICONS.other;
          const active = typeFilter === type.v;
          return (
            <div key={type.v} onClick={()=>setTypeFilter(active?"all":type.v)} style={{
              background:"var(--card)", border:`1.5px solid ${active?ti.color:"var(--line)"}`,
              borderRadius:"var(--r)", padding:"14px 16px",
              boxShadow:active?`0 4px 14px ${ti.bg}`:"var(--sh1)",
              display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"all .15s"
            }}>
              <div style={{width:38,height:38,borderRadius:10,background:ti.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <ti.Icon size={17} strokeWidth={1.75} style={{color:ti.color}}/>
              </div>
              <div>
                <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:20,fontWeight:900,color:"var(--t1)",letterSpacing:"-.4px",lineHeight:1}}>{count}</div>
                <div style={{fontSize:11,color:"var(--t4)",marginTop:2}}>{type.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="search-toolbar" style={{marginBottom:12}}>
        <div className="search-box-main">
          <Search size={13} className="sb-ico"/>
          <input className="sb-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Resurs qidirish..."/>
          {search && <button className="sb-clear-btn" onClick={()=>setSearch("")}><X size={13}/></button>}
        </div>
        <div className="filter-tabs">
          <button className={`filter-tab ${typeFilter==="all"?"on":""}`} onClick={()=>setTypeFilter("all")}>
            <FolderOpen size={11}/> Barchasi <span className="filter-count">{resources.length}</span>
          </button>
          {RES_TYPES.map(type=>{
            const ti=TYPE_ICONS[type.v]||TYPE_ICONS.other;
            return (
              <button key={type.v} className={`filter-tab ${typeFilter===type.v?"on":""}`} onClick={()=>setTypeFilter(type.v)}>
                <ti.Icon size={11}/> {type.l}
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary btn-sm" style={{marginLeft:"auto"}} onClick={()=>{setEditRow(null);setForm({title:"",type:"document",subject:"",group_name:"",description:"",file_url:"",external_url:"",is_public:false});setShowAdd(true)}}>
          <Plus size={13}/> Resurs qo'shish
        </button>
      </div>

      {/* ── Add/Edit Form ── */}
      {showAdd && (
        <Card className="pad" style={{marginBottom:14,border:"2px solid var(--brand-brd)",boxShadow:"0 8px 32px rgba(124,58,237,.12)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{fontWeight:800,fontSize:14,display:"flex",alignItems:"center",gap:7,color:"var(--brand)"}}>
              <FolderOpen size={15}/> {editRow?"Resurs tahrirlash":"Yangi resurs qo'shish"}
            </div>
            <button onClick={resetForm} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t4)",display:"flex",alignItems:"center"}}>
              <X size={16}/>
            </button>
          </div>

          {/* Fayl yuklash zona */}
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={handleDrop}
            onClick={()=>fileRef.current?.click()}
            style={{
              border:`2px dashed ${dragOver?"var(--brand)":"var(--line)"}`,
              borderRadius:14,padding:"24px",
              background:dragOver?"var(--brand4)":"var(--card2)",
              display:"flex",flexDirection:"column",alignItems:"center",gap:8,
              cursor:"pointer",transition:"all .15s",marginBottom:14,
            }}>
            <input ref={fileRef} type="file" style={{display:"none"}} onChange={e=>uploadFile(e.target.files?.[0])}/>
            {uploading ? (
              <><RefreshCw size={24} className="spin" style={{color:"var(--brand)"}}/><span style={{fontSize:12,color:"var(--t3)"}}>Yuklanmoqda...</span></>
            ) : form.file_url ? (
              <><div style={{display:"flex",alignItems:"center",gap:8,color:"var(--green)",fontWeight:700,fontSize:13}}>
                <FileText size={18}/> Fayl yuklandi
              </div>
              <div style={{fontSize:11,color:"var(--t4)",wordBreak:"break-all",textAlign:"center",maxWidth:400}}>{form.file_url.split("/").pop()}</div></>
            ) : (
              <><Upload size={28} strokeWidth={1.5} style={{color:"var(--t4)"}}/><div style={{fontSize:13,fontWeight:600,color:"var(--t3)"}}>Faylni shu yerga tashlang yoki bosing</div>
              <div style={{fontSize:11,color:"var(--t5)"}}>PDF, DOC, MP4, MP3, JPG, PNG va boshqalar</div></>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Sarlavha *</span>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Resurs nomi"/>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Tur</span>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                {RES_TYPES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Fan</span>
              <input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Matematika..."/>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Guruh</span>
              <select value={form.group_name} onChange={e=>setForm(f=>({...f,group_name:e.target.value}))}>
                <option value="">Umumiy (barcha)</option>
                {groups.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Tashqi havola (ixtiyoriy)</span>
              <input value={form.external_url} onChange={e=>setForm(f=>({...f,external_url:e.target.value}))} placeholder="https://..."/>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Tavsif</span>
              <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Qisqacha..."/>
            </label>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,cursor:"pointer"}}>
            <input type="checkbox" checked={form.is_public} onChange={e=>setForm(f=>({...f,is_public:e.target.checked}))} style={{width:16,height:16,accentColor:"var(--brand)"}}/>
            <span style={{fontSize:12,fontWeight:600,color:"var(--t2)"}}>Ommaviy (barcha foydalanuvchilar ko'radi)</span>
          </label>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving?<><RefreshCw size={12} className="spin"/> Saqlanmoqda...</>:<><Save size={12}/> Saqlash</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={resetForm}>Bekor</button>
          </div>
        </Card>
      )}

      {/* ── Resources list ── */}
      <Card>
        {filtered.length === 0 && (
          <Empty text="Resurslar topilmadi" sub="Yangi resurs qo'shing" action="+ Qo'shish" onAction={()=>{setShowAdd(true)}}/>
        )}
        {filtered.map(res => {
          const ti = TYPE_ICONS[res.type] || TYPE_ICONS.other;
          const TI = ti.Icon;
          return (
            <div key={res.id} className="res-row">
              <div style={{width:42,height:42,borderRadius:12,background:ti.bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <TI size={19} strokeWidth={1.75} style={{color:ti.color}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:13,color:"var(--t1)",marginBottom:3}}>{res.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  {res.subject && <span style={{fontSize:11,color:"var(--brand)",fontWeight:600}}>{res.subject}</span>}
                  {res.group_name && <span style={{fontSize:11,color:"var(--t4)"}}>{res.group_name}</span>}
                  {res.uploaded_by && <span style={{fontSize:11,color:"var(--t4)"}}>{res.uploaded_by}</span>}
                  <span style={{fontSize:11,color:"var(--t5)"}}>{fmtDate(res.created_at)}</span>
                </div>
                {res.description && <div style={{fontSize:11,color:"var(--t3)",marginTop:2,lineHeight:1.5}}>{res.description}</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <Pill type={res.is_public?"green":"blue"}>
                  {res.is_public?<><Globe size={9} style={{display:"inline",marginRight:3}}/>Ommaviy</>:<><Lock size={9} style={{display:"inline",marginRight:3}}/>Guruh</>}
                </Pill>
                {(res.file_url||res.external_url) && (
                  <a href={res.file_url||res.external_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" style={{display:"flex",alignItems:"center",gap:4}}>
                    <ExternalLink size={11}/> Ochish
                  </a>
                )}
                {res.file_url && (
                  <a href={res.file_url} download className="btn btn-ghost btn-xs" style={{display:"flex",alignItems:"center",gap:4}}>
                    <Download size={11}/>
                  </a>
                )}
                <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(res)}><Pencil size={11}/></button>
                <button className="btn btn-ghost btn-xs danger" onClick={()=>remove(res.id)}><Trash2 size={11}/></button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
