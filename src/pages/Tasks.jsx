import { useState } from "react";
import { supabase as db } from "../lib/supabase.js";
import { Card, Pill, Empty, SectionHeader, useToast, useConfirm } from "../components/ui/index.jsx";
import { fmtDate } from "../lib/utils.js";

const PRIORITY_MAP = {
  urgent:["red","🔴 Shoshilinch"],
  high:  ["orange","⬆ Yuqori"],
  medium:["blue","➡ O'rta"],
  low:   ["muted","⬇ Past"],
};

export default function Tasks({ t, data, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState("all");

  const tasks = data.tasks||[];
  const filtered = filter==="all" ? tasks :
    filter==="done" ? tasks.filter(t=>t.status==="done") :
    filter==="todo" ? tasks.filter(t=>t.status==="todo"||t.status==="in_progress") :
    tasks.filter(t=>t.priority===filter);

  const toggle = async (task) => {
    const newStatus = task.status==="done" ? "todo" : "done";
    const { error } = await db.from("tasks").update({status:newStatus}).eq("id",task.id);
    if(error) return toast(error.message,"error");
    loadAll();
  };

  const remove = async id => {
    if(!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("tasks").delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("Vazifa o'chirildi"); loadAll();
  };

  const setStatus = async (id, status) => {
    await db.from("tasks").update({status}).eq("id",id);
    loadAll();
  };

  const cols = [
    {id:"todo",       label:"📋 Rejalangan",  color:"blue"},
    {id:"in_progress",label:"⚙️ Jarayonda",    color:"orange"},
    {id:"done",       label:"✅ Tugallandi",   color:"green"},
    {id:"cancelled",  label:"❌ Bekor",        color:"red"},
  ];

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          {[["all","Barchasi"],["todo","Faol"],["done","Tugallandi"],["urgent","Shoshilinch"]].map(([v,l])=>(
            <button key={v} className={`filter-tab ${filter===v?"on":""}`} onClick={()=>setFilter(v)}>
              {l}<span className="filter-count">
                {v==="all"?tasks.length:
                 v==="todo"?tasks.filter(t=>t.status==="todo"||t.status==="in_progress").length:
                 v==="done"?tasks.filter(t=>t.status==="done").length:
                 tasks.filter(t=>t.priority==="urgent").length}
              </span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"task"})}>{t.addTask}</button>
      </div>

      {/* Kanban board */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {cols.map(col=>{
          const colTasks = tasks.filter(t=>t.status===col.id);
          return (
            <div key={col.id} className="kb-col">
              <div className={`kb-hd kb-hd-${col.color}`}>
                <span>{col.label}</span>
                <span className={`pill pill-${col.color}`}>{colTasks.length}</span>
              </div>
              <div className="kb-body">
                {colTasks.map(task=>{
                  const [pColor] = PRIORITY_MAP[task.priority]||["muted","—"];
                  return (
                    <div key={task.id} className={`kb-card priority-${task.priority}`}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}>
                        <div className={`task-check ${task.status==="done"?"done":""}`}
                          onClick={()=>toggle(task)}>
                          {task.status==="done"&&"✓"}
                        </div>
                        <div className="kb-name" style={{
                          fontSize:12.5,
                          textDecoration:task.status==="done"?"line-through":"none",
                          color:task.status==="done"?"var(--muted)":"var(--text-strong)"
                        }}>{task.title}</div>
                      </div>
                      {task.description&&(
                        <div style={{fontSize:11,color:"var(--text-sub)",marginBottom:6}}>{task.description}</div>
                      )}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                        <Pill type={pColor}>{PRIORITY_MAP[task.priority]?.[1]||task.priority}</Pill>
                        {task.due_date&&(
                          <span style={{fontSize:10,color:new Date(task.due_date)<new Date()&&task.status!=="done"?"var(--danger)":"var(--muted)"}}>
                            📅 {fmtDate(task.due_date)}
                          </span>
                        )}
                      </div>
                      {task.assigned_to&&(
                        <div style={{fontSize:10,color:"var(--muted)",marginTop:5}}>👤 {task.assigned_to}</div>
                      )}
                      <div style={{display:"flex",gap:4,marginTop:8}}>
                        {cols.filter(c=>c.id!==col.id).slice(0,2).map(c=>(
                          <button key={c.id} className="kb-move-btn" onClick={()=>setStatus(task.id,c.id)}>
                            → {c.label.split(" ")[1]}
                          </button>
                        ))}
                        <button className="tiny-x" onClick={()=>remove(task.id)} title="O'chirish" style={{position:"static",marginLeft:"auto"}}>✕</button>
                      </div>
                    </div>
                  );
                })}
                {!colTasks.length&&<div className="kb-empty">Bo'sh</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
