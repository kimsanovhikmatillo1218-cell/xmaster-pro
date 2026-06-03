import { useRef, useMemo, useState } from "react";
import {
  Plus, List, BarChart2, FileText, Pencil, Trash2,
  Clock, Users, ArrowLeft, CheckCircle, XCircle,
  Award, Calendar, Target, TrendingUp, HelpCircle,
  Upload, RefreshCw, Save, Image as ImageIcon, X
} from "lucide-react";
import { supabase as db } from "../lib/supabase.js";
import { Card, Pill, Empty, SectionHeader, StatusPill, useToast, useConfirm } from "../components/ui/index.jsx";
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

  const tests   = data.tests||[];
  const results = data.test_results||[];

  if(sel) {
    const test = tests.find(t=>t.id===sel);
    const qs   = (data.test_questions||[]).filter(q=>q.test_id===sel);
    const res  = results.filter(r=>r.test_id===sel);
    return <TestDetail test={test} questions={qs} results={res} t={t} data={data} back={()=>setSel(null)} loadAll={loadAll}/>;
  }

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          <button className={`filter-tab ${view==="list"?"on":""}`} onClick={()=>setView("list")}>
            <List size={12}/> Ro'yxat <span className="filter-count">{tests.length}</span>
          </button>
          <button className={`filter-tab ${view==="results"?"on":""}`} onClick={()=>setView("results")}>
            <BarChart2 size={12}/> Natijalar <span className="filter-count">{results.length}</span>
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"test"})}>
          <Plus size={13}/> {t.addTest}
        </button>
      </div>

      {view==="list" && (
        <div className="g3">
          {tests.map(test => {
            const resCount = results.filter(r=>r.test_id===test.id).length;
            const avgScore = resCount ? Math.round(results.filter(r=>r.test_id===test.id).reduce((a,r)=>a+Number(r.score||0),0)/resCount) : null;
            const qCount   = (data.test_questions||[]).filter(q=>q.test_id===test.id).length;
            return (
              <div key={test.id} className="test-card">
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <FileText size={16} strokeWidth={1.75} style={{color:"var(--brand)"}}/>
                  </div>
                  <StatusPill status={test.status} t={t}/>
                </div>
                <div className="test-title" style={{marginTop:8}}>{test.title}</div>
                <div className="test-meta" style={{display:"flex",flexDirection:"column",gap:4}}>
                  {test.subject && <span style={{display:"flex",alignItems:"center",gap:5}}><Target size={10} style={{color:"var(--t4)"}}/> {test.subject}</span>}
                  {test.group_name && <span style={{display:"flex",alignItems:"center",gap:5}}><Users size={10} style={{color:"var(--t4)"}}/> {test.group_name}</span>}
                  <div style={{display:"flex",gap:12}}>
                    {test.test_date && <span style={{display:"flex",alignItems:"center",gap:4}}><Calendar size={10} style={{color:"var(--t4)"}}/> {fmtDate(test.test_date)}</span>}
                    <span style={{display:"flex",alignItems:"center",gap:4}}><Clock size={10} style={{color:"var(--t4)"}}/> {test.duration||"—"} daq</span>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--card2)",borderRadius:"var(--r-xs)",padding:"7px 10px",border:"1px solid var(--line2)"}}>
                  <span style={{fontSize:11,color:"var(--t4)"}}>Savollar: <b style={{color:"var(--t1)"}}>{qCount}</b></span>
                  <span style={{fontSize:11,color:"var(--t4)"}}>O'tish: <b style={{color:"var(--brand)"}}>{test.pass_marks||60}/{test.total_marks||100}</b></span>
                </div>
                {resCount>0 && (
                  <div style={{background:avgScore>=70?"#ecfdf5":"#fef2f2",borderRadius:"var(--r-xs)",padding:"7px 10px",border:`1px solid ${avgScore>=70?"#a7f3d0":"#fecaca"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                      <span style={{color:"var(--t3)",display:"flex",alignItems:"center",gap:4}}><Users size={10}/> {resCount} topshirdi</span>
                      <span style={{fontWeight:800,color:avgScore>=70?"var(--green)":"var(--red)",display:"flex",alignItems:"center",gap:3}}><TrendingUp size={10}/> O'rtacha: {avgScore}%</span>
                    </div>
                  </div>
                )}
                <div className="card-actions">
                  <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>setSel(test.id)}>
                    <HelpCircle size={12}/> Savollar / Natija
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setModal({type:"test",row:test})}><Pencil size={12}/></button>
                  <button className="btn btn-ghost btn-sm danger" onClick={()=>remove(test.id)}><Trash2 size={12}/></button>
                </div>
              </div>
            );
          })}
          <div className="group-card add-card" onClick={()=>setModal({type:"test"})} role="button" tabIndex={0}>
            <FileText size={32} strokeWidth={1} style={{color:"var(--t4)"}}/>
            <span style={{fontSize:13.5,fontWeight:700}}>{t.addTest}</span>
          </div>
        </div>
      )}

      {view==="results" && (
        <Card>
          <table className="tbl">
            <thead><tr><th>Test</th><th>Talaba</th><th>Ball</th><th>Natija</th><th>Sana</th></tr></thead>
            <tbody>
              {results.map(r=>{
                const test = tests.find(tk=>tk.id===r.test_id);
                const pct  = Math.round((r.score||0)/(test?.total_marks||100)*100);
                return (
                  <tr key={r.id} className="tbl-row">
                    <td><div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:28,height:28,borderRadius:7,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <FileText size={12} strokeWidth={1.75} style={{color:"var(--brand)"}}/>
                      </div>
                      <b style={{fontSize:12.5}}>{test?.title||"—"}</b>
                    </div></td>
                    <td><b style={{fontSize:13}}>{r.student_name||"—"}</b></td>
                    <td><div className={`score-circle score-${pct>=80?"pass":pct>=60?"medium":"fail"}`} style={{width:42,height:42,fontSize:13,fontWeight:900}}>{r.score||0}</div></td>
                    <td><Pill type={r.passed?"green":"red"}>{r.passed?<><CheckCircle size={10} style={{display:"inline",marginRight:3}}/>{t.passed}</>:<><XCircle size={10} style={{display:"inline",marginRight:3}}/>{t.failed}</>}</Pill></td>
                    <td style={{fontSize:12,color:"var(--t4)"}}>{fmtFull(r.submitted_at)}</td>
                  </tr>
                );
              })}
              {!results.length && <tr><td colSpan={5}><Empty text="Natijalar yo'q" sub="Hali hech qanday test topshirilmagan"/></td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ── TestDetail — savol boshqaruvi ─────────────────────────────── */
function TestDetail({ test, questions, results, t, data, back, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const fileRef = useRef();

  const BLANK_Q = { question:"", option_a:"", option_b:"", option_c:"", option_d:"", correct:"a", points:1, image_url:"" };
  const [showQForm, setShowQForm] = useState(false);
  const [qForm,     setQForm]     = useState(BLANK_Q);
  const [editQId,   setEditQId]   = useState(null);
  const [savingQ,   setSavingQ]   = useState(false);
  const [uploading, setUploading] = useState(false);

  // Natija qo'shish
  const [showResForm, setShowResForm] = useState(false);
  const [resForm,     setResForm]     = useState({ student_name:"", score:"" });
  const [savingRes,   setSavingRes]   = useState(false);

  const passed   = results.filter(r=>r.passed).length;
  const avgScore = results.length ? Math.round(results.reduce((a,r)=>a+Number(r.score||0),0)/results.length) : 0;

  const openAddQ  = () => { setQForm(BLANK_Q); setEditQId(null); setShowQForm(true); };
  const openEditQ = q => { setQForm({...q}); setEditQId(q.id); setShowQForm(true); };

  const uploadImg = async file => {
    if(!file) return;
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `test-images/${Date.now()}.${ext}`;
      const { error } = await db.storage.from("xmaster").upload(path, file, {upsert:true});
      if(error) throw error;
      const { data: pub } = db.storage.from("xmaster").getPublicUrl(path);
      setQForm(f=>({...f, image_url:pub.publicUrl}));
      toast("Rasm yuklandi");
    } catch { toast("Rasm yuklanmadi — URL kiriting","warning"); }
    finally { setUploading(false); }
  };

  const saveQ = async () => {
    if(!qForm.question) return toast("Savol matni majburiy","warning");
    if(!qForm.option_a || !qForm.option_b) return toast("Kamida A va B variantlar kerak","warning");
    setSavingQ(true);
    try {
      if(editQId) {
        const {id,test_id,...rest} = qForm;
        const { error } = await db.from("test_questions").update(rest).eq("id",editQId);
        if(error) throw error; toast("Savol yangilandi");
      } else {
        const { error } = await db.from("test_questions").insert({...qForm, test_id:test?.id});
        if(error) throw error; toast("Savol qo'shildi");
      }
      setShowQForm(false); loadAll();
    } catch(e){ toast(e.message,"error"); }
    finally { setSavingQ(false); }
  };

  const removeQ = async id => {
    if(!await confirm("Bu savolni o'chirasizmi?")) return;
    await db.from("test_questions").delete().eq("id",id);
    toast("Savol o'chirildi"); loadAll();
  };

  const saveRes = async () => {
    if(!resForm.student_name || !resForm.score) return toast("Talaba va ball kiritilsin","warning");
    setSavingRes(true);
    const score  = Number(resForm.score);
    const passed = score >= (test?.pass_marks||60);
    const { error } = await db.from("test_results").insert({
      test_id:test?.id, student_name:resForm.student_name,
      score, total:test?.total_marks||100, passed
    });
    setSavingRes(false);
    if(error) return toast(error.message,"error");
    toast("Natija qo'shildi"); setShowResForm(false); setResForm({student_name:"",score:""}); loadAll();
  };

  const students = (data.study_groups||[]).some(g=>g.name===test?.group_name)
    ? (data.students||[]).filter(s=>s.group_name===test?.group_name)
    : data.students||[];

  const OPT_COLORS = {a:"var(--brand)",b:"var(--green)",c:"var(--orange)",d:"var(--red)"};

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <button className="btn btn-ghost btn-sm" onClick={back}>
          <ArrowLeft size={13}/> Orqaga
        </button>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowResForm(v=>!v)}>
            <Award size={13}/> Natija qo'shish
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddQ}>
            <Plus size={13}/> Savol qo'shish
          </button>
        </div>
      </div>

      {/* Test ma'lumot + Statistika */}
      <div className="grid2" style={{marginBottom:14}}>
        <Card className="pad">
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:900,fontSize:16,color:"var(--t1)",marginBottom:12}}>{test?.title}</div>
          {[
            ["Fan",         test?.subject||"—"],
            ["Guruh",       test?.group_name||"—"],
            ["Sana",        fmtDate(test?.test_date)],
            ["Davomiyligi", `${test?.duration||60} daqiqa`],
            ["Savollar",    `${questions.length} ta`],
            ["O'tish bali", `${test?.pass_marks||60}/${test?.total_marks||100}`],
          ].map(([l,r])=>(
            <div key={l} className="line"><span>{l}</span><b>{r}</b></div>
          ))}
        </Card>
        <Card className="pad">
          <div style={{fontWeight:800,fontSize:13,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
            <BarChart2 size={14} style={{color:"var(--brand)"}}/> Statistika
          </div>
          <div style={{display:"flex",justifyContent:"space-around",marginBottom:16}}>
            {[
              [results.length, "Topshirdi", "var(--brand)"],
              [passed,         "O'tdi",     "var(--green)"],
              [results.length-passed,"O'tmadi","var(--red)"],
              [avgScore+"%",   "O'rtacha",  "var(--purple)"],
            ].map(([v,l,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:26,fontWeight:900,color:c,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{v}</div>
                <div style={{fontSize:11,color:"var(--t4)",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          {results.length>0 && (
            <div>
              <div style={{height:8,background:"var(--line)",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.round(passed/results.length*100)}%`,background:"var(--green)",borderRadius:4,transition:"width .4s"}}/>
              </div>
              <div style={{fontSize:10,color:"var(--t4)",marginTop:4,textAlign:"right"}}>{Math.round(passed/results.length*100)}% o'tdi</div>
            </div>
          )}
        </Card>
      </div>

      {/* Natija qo'shish formi */}
      {showResForm && (
        <Card className="pad" style={{marginBottom:14,border:"1.5px solid var(--green-b)"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,display:"flex",alignItems:"center",gap:6,color:"var(--green)"}}>
            <Award size={14}/> Natija qo'shish
          </div>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <label style={{flex:2,display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Talaba</span>
              <select value={resForm.student_name} onChange={e=>setResForm(f=>({...f,student_name:e.target.value}))}>
                <option value="">— Tanlang —</option>
                {students.map(s=><option key={s.id} value={s.full_name}>{s.full_name}</option>)}
              </select>
            </label>
            <label style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Ball (/{test?.total_marks||100})</span>
              <input type="number" value={resForm.score} onChange={e=>setResForm(f=>({...f,score:e.target.value}))} placeholder="85"/>
            </label>
            <button className="btn btn-primary btn-sm" onClick={saveRes} disabled={savingRes}>
              {savingRes?<RefreshCw size={12} className="spin"/>:<Save size={12}/>} Saqlash
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowResForm(false)}><X size={13}/></button>
          </div>
        </Card>
      )}

      {/* Savol qo'shish / tahrirlash formi */}
      {showQForm && (
        <Card className="pad" style={{marginBottom:14,border:"2px solid var(--brand-brd)",boxShadow:"0 8px 32px rgba(124,58,237,.1)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14,display:"flex",alignItems:"center",gap:7,color:"var(--brand)"}}>
              <HelpCircle size={15}/> {editQId?"Savolni tahrirlash":"Yangi savol qo'shish"}
            </div>
            <button onClick={()=>setShowQForm(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t4)"}}><X size={16}/></button>
          </div>

          {/* Savol matni */}
          <label style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
            <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Savol matni *</span>
            <textarea rows={2} value={qForm.question} onChange={e=>setQForm(f=>({...f,question:e.target.value}))} placeholder="Savol matnini kiriting..." style={{resize:"vertical",fontSize:13}}/>
          </label>

          {/* Rasm yuklash */}
          <div style={{marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Rasm (ixtiyoriy)</span>
            <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>uploadImg(e.target.files?.[0])}/>
              <button type="button" className="btn btn-ghost btn-sm" onClick={()=>fileRef.current?.click()} disabled={uploading}>
                {uploading?<><RefreshCw size={12} className="spin"/> Yuklanmoqda</>:<><Upload size={12}/> Rasm yuklash</>}
              </button>
              <input value={qForm.image_url||""} onChange={e=>setQForm(f=>({...f,image_url:e.target.value}))} placeholder="yoki rasm URL kiriting..." style={{flex:1,height:34,fontSize:12}}/>
              {qForm.image_url && <button type="button" onClick={()=>setQForm(f=>({...f,image_url:""}))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t4)"}}><X size={14}/></button>}
            </div>
            {qForm.image_url && (
              <img src={qForm.image_url} alt="preview" style={{marginTop:8,maxHeight:120,borderRadius:8,border:"1px solid var(--line)",objectFit:"contain"}}/>
            )}
          </div>

          {/* Variantlar */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            {["a","b","c","d"].map(opt=>(
              <label key={opt} style={{display:"flex",flexDirection:"column",gap:4}}>
                <span style={{fontSize:11,fontWeight:700,color:OPT_COLORS[opt],display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:18,height:18,borderRadius:5,background:OPT_COLORS[opt]+"22",color:OPT_COLORS[opt],display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800}}>
                    {opt.toUpperCase()}
                  </span>
                  {opt==="a"||opt==="b" ? " *" : ""}
                </span>
                <input value={qForm[`option_${opt}`]||""} onChange={e=>setQForm(f=>({...f,[`option_${opt}`]:e.target.value}))} placeholder={`${opt.toUpperCase()} variant...`}/>
              </label>
            ))}
          </div>

          {/* To'g'ri javob + Ball */}
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <label style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>To'g'ri javob</span>
              <select value={qForm.correct} onChange={e=>setQForm(f=>({...f,correct:e.target.value}))}>
                {["a","b","c","d"].filter(o=>qForm[`option_${o}`]).map(o=>(
                  <option key={o} value={o}>{o.toUpperCase()}) {qForm[`option_${o}`]?.slice(0,30)}</option>
                ))}
              </select>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4,width:100}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>Ball</span>
              <input type="number" value={qForm.points||1} onChange={e=>setQForm(f=>({...f,points:e.target.value}))} min={1}/>
            </label>
          </div>

          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary btn-sm" onClick={saveQ} disabled={savingQ}>
              {savingQ?<><RefreshCw size={12} className="spin"/> Saqlanmoqda...</>:<><Save size={12}/> Saqlash</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setShowQForm(false);if(!editQId)setQForm(BLANK_Q);}}>Bekor</button>
          </div>
        </Card>
      )}

      {/* Savollar ro'yxati */}
      <div className="grid2">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontWeight:800,fontSize:13,display:"flex",alignItems:"center",gap:7}}>
            <HelpCircle size={14} style={{color:"var(--brand)"}}/> Savollar ({questions.length})
          </div>
          {questions.length===0 && (
            <Card className="pad">
              <Empty text="Savollar yo'q" sub="Yuqoridagi tugmani bosib savol qo'shing" icon={<HelpCircle size={28} strokeWidth={1} style={{color:"var(--t4)"}}/>}/>
            </Card>
          )}
          {questions.map((q,i)=>(
            <Card key={q.id} className="pad" style={{position:"relative"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:"var(--brand3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:800,fontSize:12,color:"var(--brand)"}}>
                  {i+1}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--t1)",marginBottom:8,lineHeight:1.4}}>{q.question}</div>
                  {q.image_url && <img src={q.image_url} alt="" style={{maxHeight:100,borderRadius:8,marginBottom:8,objectFit:"contain",border:"1px solid var(--line)"}}/>}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                    {["a","b","c","d"].map(opt=>(
                      q[`option_${opt}`] && (
                        <div key={opt} style={{
                          fontSize:11.5,padding:"5px 10px",borderRadius:8,
                          background:q.correct===opt?"#dcfce7":"var(--card2)",
                          color:q.correct===opt?"#166534":"var(--t2)",
                          border:`1.5px solid ${q.correct===opt?"#16a34a":"var(--line)"}`,
                          fontWeight:q.correct===opt?800:400,
                          display:"flex",alignItems:"center",gap:6
                        }}>
                          <span style={{width:16,height:16,borderRadius:4,background:OPT_COLORS[opt]+"22",color:OPT_COLORS[opt],display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>
                            {opt.toUpperCase()}
                          </span>
                          {q[`option_${opt}`]}
                          {q.correct===opt && <CheckCircle size={10} style={{marginLeft:"auto",color:"#16a34a"}}/>}
                        </div>
                      )
                    ))}
                  </div>
                  {q.points>1 && <div style={{fontSize:10,color:"var(--t4)",marginTop:6}}>{q.points} ball</div>}
                </div>
              </div>
              <div style={{position:"absolute",top:12,right:12,display:"flex",gap:4}}>
                <button className="btn btn-ghost btn-xs" onClick={()=>openEditQ(q)}><Pencil size={10}/></button>
                <button className="btn btn-ghost btn-xs danger" onClick={()=>removeQ(q.id)}><Trash2 size={10}/></button>
              </div>
            </Card>
          ))}
        </div>

        {/* Natijalar */}
        <Card>
          <div style={{padding:"16px 16px 0",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <Award size={14} style={{color:"var(--yellow)"}}/> Natijalar ({results.length})
          </div>
          <table className="tbl">
            <thead><tr><th>Talaba</th><th>Ball</th><th>Natija</th></tr></thead>
            <tbody>
              {results.map(r=>(
                <tr key={r.id} className="tbl-row">
                  <td><b style={{fontSize:12}}>{r.student_name||"—"}</b></td>
                  <td>
                    <span style={{fontWeight:900,fontSize:13,color:r.passed?"var(--green)":"var(--red)"}}>{r.score||0}</span>
                    <span style={{color:"var(--t5)",fontSize:10}}>/{r.total||100}</span>
                  </td>
                  <td><Pill type={r.passed?"green":"red"}>{r.passed?<><CheckCircle size={10} style={{display:"inline",marginRight:3}}/>O'tdi</>:<><XCircle size={10} style={{display:"inline",marginRight:3}}/>O'tmadi</>}</Pill></td>
                </tr>
              ))}
              {!results.length && <tr><td colSpan={3}><Empty text="Natijalar yo'q"/></td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

const OPT_COLORS = {a:"var(--brand)",b:"var(--green)",c:"var(--orange)",d:"var(--red)"};
