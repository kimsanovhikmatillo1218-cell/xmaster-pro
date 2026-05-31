import { useMemo, useState } from "react";
import { supabase as db } from "../lib/supabase.js";
import { Person, Pill, StatusPill, ProgressBar, Empty, Card, useToast, useConfirm } from "../components/ui/index.jsx";
import { money, fmtFull, fmtDate, attRate, exportCSV } from "../lib/utils.js";
import { PER_PAGE } from "../lib/constants.js";

export default function Students({ t, rows, data, setModal, setDetail, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [filter,  setFilter]  = useState("active");
  const [pageNum, setPageNum] = useState(1);

  const filtered = useMemo(()=>
    filter==="all" ? rows : rows.filter(s=>(s.status||"active")===filter),
    [rows, filter]
  );
  const paged   = filtered.slice(0, pageNum * PER_PAGE);
  const hasMore = filtered.length > paged.length;

  const sAttRate = (name) => {
    const r=(data.attendance||[]).filter(a=>a.student_name===name);
    if(!r.length) return 0;
    return Math.round(r.filter(a=>a.status==="present").length/r.length*100);
  };

  const remove = async id => {
    if(!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("students").delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("Talaba o'chirildi"); loadAll();
  };

  const tabs=[["active",t.active],["frozen",t.frozen],["archived",t.archived],["all",t.all]];

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          {tabs.map(([v,l])=>(
            <button key={v} className={`filter-tab ${filter===v?"on":""}`}
              onClick={()=>{setFilter(v);setPageNum(1);}}>
              {l}
              <span className="filter-count">
                {v==="all"?rows.length:rows.filter(s=>(s.status||"active")===v).length}
              </span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <button className="btn btn-ghost btn-sm" onClick={()=>exportCSV(filtered,"talabalar")}>⇩ Excel</button>
          <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"student"})}>
            {t.addStudent}
          </button>
        </div>
      </div>

      <Card>
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>{t.name}</th><th>{t.group}</th>
              <th>{t.balance}</th><th>{t.attendance}</th>
              <th>{t.status}</th><th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((s,i)=>{
              const att = sAttRate(s.full_name);
              return (
                <tr key={s.id} className="tbl-row">
                  <td className="muted" style={{fontSize:11}}>{i+1}</td>
                  <td><Person name={s.full_name} sub={s.phone}/></td>
                  <td>{s.group_name?<Pill>{s.group_name}</Pill>:<span className="muted">—</span>}</td>
                  <td className={`money ${Number(s.balance||0)<0?"red":"green"}`}>{money(s.balance)}</td>
                  <td style={{width:110}}>
                    <ProgressBar value={att} color={att>=75?"green":"red"}/>
                    <div className="att-pct">{att}%</div>
                  </td>
                  <td><StatusPill status={s.status||"active"} t={t}/></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-xs" onClick={()=>setDetail({type:"student",row:s})}>👁</button>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setModal({type:"student",row:s})}>✎</button>
                      <button className="btn btn-ghost btn-xs danger" onClick={()=>remove(s.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length&&(
              <tr><td colSpan={7}>
                <Empty text="Talabalar topilmadi" icon="👥"
                  action={t.addStudent} onAction={()=>setModal({type:"student"})}/>
              </td></tr>
            )}
          </tbody>
        </table>
        {hasMore&&(
          <div style={{padding:12,textAlign:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setPageNum(p=>p+1)}>
              Ko'proq ({filtered.length-paged.length} qoldi)
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
