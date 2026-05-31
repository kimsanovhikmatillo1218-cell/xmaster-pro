import { useState } from "react";
import { supabase as db } from "../lib/supabase.js";
import { Card, Pill, Empty, useToast, useConfirm } from "../components/ui/index.jsx";
import { fmtDate } from "../lib/utils.js";
import { RES_TYPES } from "../lib/constants.js";

export default function Resources({ t, data, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const resources = data.resources||[];

  const filtered = resources
    .filter(r=>typeFilter==="all"||r.type===typeFilter)
    .filter(r=>!search||r.title?.toLowerCase().includes(search.toLowerCase())||r.subject?.toLowerCase().includes(search.toLowerCase()));

  const remove = async id => {
    if(!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("resources").delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("Resurs o'chirildi"); loadAll();
  };

  return (
    <div className="page-enter">
      {/* Stats */}
      <div className="grid4" style={{marginBottom:16}}>
        {RES_TYPES.slice(0,4).map(type=>{
          const count = resources.filter(r=>r.type===type.v).length;
          return (
            <div key={type.v} className="stat-card stat-blue" style={{cursor:"pointer"}}
              onClick={()=>setTypeFilter(type.v===typeFilter?"all":type.v)}>
              <div className="stat-icon" style={{background:type.bg}}>{type.icon}</div>
              <div className="stat-body">
                <div className="stat-value">{count}</div>
                <div className="stat-label">{type.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="page-toolbar">
        <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Resurs qidirish..."
            style={{height:34,padding:"0 12px",border:"1.5px solid var(--border)",borderRadius:"var(--r-sm)",
                    background:"var(--surface)",color:"var(--text)",fontSize:12.5,width:240,outline:"none"}}
          />
          <div className="filter-tabs">
            <button className={`filter-tab ${typeFilter==="all"?"on":""}`} onClick={()=>setTypeFilter("all")}>
              Barchasi<span className="filter-count">{resources.length}</span>
            </button>
            {RES_TYPES.map(type=>(
              <button key={type.v} className={`filter-tab ${typeFilter===type.v?"on":""}`}
                onClick={()=>setTypeFilter(type.v)}>
                {type.icon} {type.l.split(" ")[1]||type.l}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"resource"})}>
          {t.addResource}
        </button>
      </div>

      <Card>
        {filtered.map(res=>{
          const typeInfo = RES_TYPES.find(r=>r.v===res.type)||RES_TYPES[5];
          return (
            <div key={res.id} className="res-card">
              <div className="res-icon" style={{background:typeInfo.bg}}>{typeInfo.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:12.5,color:"var(--text-strong)"}}>{res.title}</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
                  {res.subject&&<span>📚 {res.subject} · </span>}
                  {res.uploaded_by&&<span>👤 {res.uploaded_by} · </span>}
                  <span>📅 {fmtDate(res.created_at)}</span>
                  {res.downloads>0&&<span> · ⇩ {res.downloads}</span>}
                </div>
                {res.description&&(
                  <div style={{fontSize:11,color:"var(--text-sub)",marginTop:3}}>{res.description}</div>
                )}
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                <Pill type={res.is_public?"green":"blue"}>{res.is_public?"Ommaviy":"Guruh"}</Pill>
                {(res.file_url||res.external_url)&&(
                  <a href={res.file_url||res.external_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-xs">⇩ Ochish</a>
                )}
                <button className="btn btn-ghost btn-xs" onClick={()=>setModal({type:"resource",row:res})}>✎</button>
                <button className="btn btn-ghost btn-xs danger" onClick={()=>remove(res.id)}>✕</button>
              </div>
            </div>
          );
        })}
        {!filtered.length&&<Empty text="Resurslar topilmadi" icon="🗂" action={t.addResource} onAction={()=>setModal({type:"resource"})}/>}
      </Card>
    </div>
  );
}
