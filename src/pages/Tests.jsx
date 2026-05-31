import { useMemo, useState } from "react";
import { supabase as db } from "../lib/supabase.js";
import { Card, Pill, Person, Empty, SectionHeader, StatusPill, useToast, useConfirm } from "../components/ui/index.jsx";
import { fmtDate, fmtFull } from "../lib/utils.js";

export default function Tests({ t, data, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [view, setView] = useState("list");
  const [sel,  setSel]  = useState(null);

  const remove = async id => {
    if(!await confirm(t.confirmDelete)) return;
    await db.from("test_questions").delete().eq("test_id",id);
    const { error } = await db.from("tests").delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("Test o'chirildi"); loadAll();
  };

  const tests = data.tests||[];
  const results = data.test_results||[];

  if(sel) {
    const test = tests.find(t=>t.id===sel);
    const qs = (data.test_questions||[]).filter(q=>q.test_id===sel);
    const res = results.filter(r=>r.test_id===sel);
    return (
      <TestDetail test={test} questions={qs} results={res}
        t={t} data={data} back={()=>setSel(null)} loadAll={loadAll}/>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          <button className={`filter-tab ${view==="list"?"on":""}`} onClick={()=>setView("list")}>📋 Ro'yxat</button>
          <button className={`filter-tab ${view==="results"?"on":""}`} onClick={()=>setView("results")}>📊 Natijalar</button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"test"})}>
          {t.addTest}
        </button>
      </div>

      {view==="list"&&(
        <div className="grid3">
          {tests.map(test=>{
            const resCount = results.filter(r=>r.test_id===test.id).length;
            const avgScore = resCount
              ? Math.round(results.filter(r=>r.test_id===test.id).reduce((a,r)=>a+Number(r.score||0),0)/resCount)
              : null;
            const qCount = (data.test_questions||[]).filter(q=>q.test_id===test.id).length;
            return (
              <div key={test.id} className="test-card">
                <div className="test-title">{test.title}</div>
                <div className="test-meta">
                  {test.subject&&<span>📚 {test.subject}</span>}
                  {test.group_name&&<span>👥 {test.group_name}</span>}
                  {test.test_date&&<span>📅 {fmtDate(test.test_date)}</span>}
                  <span>⏱ {test.duration} daq</span>
                  <span>❓ {qCount} savol</span>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <StatusPill status={test.status} t={t}/>
                  <div style={{fontSize:11,color:"var(--text-sub)"}}>
                    O'tish: <b>{test.pass_marks||60}/{test.total_marks||100}</b>
                  </div>
                </div>
                {resCount>0&&(
                  <div style={{background:"var(--bg)",borderRadius:"var(--r-sm)",padding:"8px 10px",marginBottom:10,fontSize:11}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span>{resCount} ta talaba topshirdi</span>
                      <span style={{fontWeight:800}}>O'rt: {avgScore}%</span>
                    </div>
                  </div>
                )}
                <div className="card-actions">
                  <button className="btn btn-primary btn-sm" onClick={()=>setSel(test.id)}>Ko'rish</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setModal({type:"test",row:test})}>✎</button>
                  <button className="btn btn-ghost btn-sm danger" onClick={()=>remove(test.id)}>✕</button>
                </div>
              </div>
            );
          })}
          <div className="group-card add-card" onClick={()=>setModal({type:"test"})} role="button" tabIndex={0}>
            <span className="add-card-icon">📝</span><span>{t.addTest}</span>
          </div>
        </div>
      )}

      {view==="results"&&(
        <Card>
          <table className="tbl">
            <thead>
              <tr><th>Test</th><th>Talaba</th><th>Ball</th><th>Natija</th><th>Sana</th></tr>
            </thead>
            <tbody>
              {results.map(r=>{
                const test = tests.find(t=>t.id===r.test_id);
                const pct = Math.round((r.score||0)/(test?.total_marks||100)*100);
                return (
                  <tr key={r.id} className="tbl-row">
                    <td><b style={{fontSize:12}}>{test?.title||"—"}</b></td>
                    <td><b>{r.student_name||"—"}</b></td>
                    <td>
                      <div className={`score-circle score-${pct>=80?"pass":pct>=60?"medium":"fail"}`} style={{width:40,height:40,fontSize:12}}>
                        {r.score||0}
                      </div>
                    </td>
                    <td>
                      <Pill type={r.passed?"green":"red"}>{r.passed?t.passed:t.failed}</Pill>
                    </td>
                    <td className="muted">{fmtFull(r.submitted_at)}</td>
                  </tr>
                );
              })}
              {!results.length&&<tr><td colSpan={5}><Empty text="Natijalar yo'q" icon="📊"/></td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function TestDetail({ test, questions, results, t, data, back, loadAll }) {
  const toast = useToast();
  const passed = results.filter(r=>r.passed).length;
  const avgScore = results.length
    ? Math.round(results.reduce((a,r)=>a+Number(r.score||0),0)/results.length)
    : 0;

  const addResult = async (studentName, score) => {
    const passed = score >= (test.pass_marks||60);
    const { error } = await db.from("test_results").insert({
      test_id:test.id, student_name:studentName,
      score, total:test.total_marks||100, passed
    });
    if(error) return toast(error.message,"error");
    toast("Natija qo'shildi"); loadAll();
  };

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <button className="btn btn-ghost btn-sm" onClick={back}>← Orqaga</button>
        <button className="btn btn-primary btn-sm" onClick={()=>{}}>+ Natija qo'shish</button>
      </div>

      <div className="grid2" style={{marginBottom:16}}>
        <Card className="pad">
          <div className="test-title" style={{marginBottom:10}}>{test?.title}</div>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {[
              ["Fan",test?.subject||"—"],
              ["Guruh",test?.group_name||"—"],
              ["Sana",fmtDate(test?.test_date)],
              ["Davomiyligi",`${test?.duration||60} daqiqa`],
              ["Savollar",`${questions.length} ta`],
              ["O'tish bali",`${test?.pass_marks||60}/${test?.total_marks||100}`],
            ].map(([l,r])=>(
              <div key={l} className="line"><span>{l}</span><b>{r}</b></div>
            ))}
          </div>
        </Card>
        <Card className="pad">
          <div style={{fontWeight:800,fontSize:13,marginBottom:12}}>📊 Statistika</div>
          <div style={{display:"flex",justifyContent:"space-around",marginBottom:14}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:"var(--brand)"}}>{results.length}</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>Topshirdi</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:"var(--success)"}}>{passed}</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>O'tdi</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:"var(--danger)"}}>{results.length-passed}</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>O'tmadi</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:"var(--purple)"}}>{avgScore}%</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>O'rtacha</div>
            </div>
          </div>
          {results.length>0&&(
            <div style={{background:"var(--bg)",borderRadius:"var(--r-sm)",padding:10}}>
              <div style={{fontWeight:700,fontSize:11,marginBottom:6}}>O'tish darajasi</div>
              <div style={{height:8,background:"var(--bg-raised)",borderRadius:4,overflow:"hidden"}}>
                <div style={{
                  height:"100%",width:`${Math.round(passed/results.length*100)}%`,
                  background:"var(--success)",borderRadius:4
                }}/>
              </div>
              <div style={{fontSize:10,color:"var(--muted)",marginTop:4,textAlign:"right"}}>
                {Math.round(passed/results.length*100)}%
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid2">
        <Card className="pad">
          <SectionHeader title={`❓ Savollar (${questions.length})`}/>
          {questions.map((q,i)=>(
            <div key={q.id} style={{padding:"10px 0",borderBottom:"1px solid var(--border-light)"}}>
              <div style={{fontSize:12.5,fontWeight:700,color:"var(--text-strong)",marginBottom:6}}>
                {i+1}. {q.question}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                {["a","b","c","d"].map(opt=>(
                  q[`option_${opt}`]&&(
                    <div key={opt} style={{
                      fontSize:11,padding:"4px 8px",borderRadius:"var(--r-xs)",
                      background:q.correct===opt?"var(--success-bg)":"var(--bg)",
                      color:q.correct===opt?"var(--success)":"var(--text-sub)",
                      border:`1px solid ${q.correct===opt?"var(--success)":"var(--border)"}`,
                      fontWeight:q.correct===opt?800:400
                    }}>
                      {opt.toUpperCase()}) {q[`option_${opt}`]}
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
          {!questions.length&&<Empty text="Savollar yo'q" icon="❓"/>}
        </Card>

        <Card>
          <SectionHeader title="🏆 Natijalar" style={{padding:"14px 14px 0"}}/>
          <table className="tbl">
            <thead><tr><th>Talaba</th><th>Ball</th><th>Natija</th></tr></thead>
            <tbody>
              {results.map(r=>(
                <tr key={r.id} className="tbl-row">
                  <td><b style={{fontSize:12}}>{r.student_name||"—"}</b></td>
                  <td>
                    <span style={{
                      fontWeight:900,fontSize:13,
                      color:r.passed?"var(--success)":"var(--danger)"
                    }}>{r.score||0}</span>
                    <span style={{color:"var(--muted)",fontSize:10}}>/{r.total||100}</span>
                  </td>
                  <td><Pill type={r.passed?"green":"red"}>{r.passed?"✓ O'tdi":"✗ O'tmadi"}</Pill></td>
                </tr>
              ))}
              {!results.length&&<tr><td colSpan={3}><Empty text="Natijalar yo'q"/></td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
