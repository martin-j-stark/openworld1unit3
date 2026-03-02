const $=(s,e=document)=>e.querySelector(s);
const $$=(s,e=document)=>Array.from(e.querySelectorAll(s));
const STORAGE_KEY="unit3_progress_v1";
const STORAGE_DATA_OVERRIDE="unit3_data_override_v1";
let DATA=null,MODE="learn",ACTIVE_TOPIC_ID=null;

function loadProgress(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch{return{}}}
function saveProgress(p){localStorage.setItem(STORAGE_KEY,JSON.stringify(p))}
function resetProgress(){localStorage.removeItem(STORAGE_KEY);renderAll()}
function getDataOverride(){try{return JSON.parse(sessionStorage.getItem(STORAGE_DATA_OVERRIDE)||"null")}catch{return null}}
async function loadData(){
  const o=getDataOverride(); if(o) return o;
  const r=await fetch("data/unit3.json",{cache:"no-store"});
  if(!r.ok) throw new Error("Konnte data/unit3.json nicht laden.");
  return await r.json();
}
function shuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return escapeHtml(s).replace(/"/g,"&quot;")}
function escapeJson(o){
  return JSON.stringify(o).replace(/</g,"\u003c");
}
function cssEsc(s){return CSS.escape(String(s))}

function speak(text){
  try{
    if(!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(String(text||""));
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch(e){}
}

function flattenTasks(data){
  const list=[];
  data.topics.forEach(t=>(t.sections||[]).forEach(s=>(s.tasks||[]).forEach((task,i)=>list.push({topicId:t.id,sectionId:s.id,taskIndex:i,task}))));
  return list;
}
function flattenVocab(data){
  const list=[];
  data.topics.forEach(t=>(t.sections||[]).forEach(s=>(s.vocab||[]).forEach(v=>list.push({topicId:t.id,sectionId:s.id,topicTitle:t.title,sectionTitle:s.title,...v}))));
  return list;
}
function progressStats(data,progress){
  const tasks=flattenTasks(data);
  const total=tasks.length;
  const done=tasks.filter(x=>progress[`task:${x.topicId}:${x.sectionId}:${x.taskIndex}`]===true).length;
  const percent=total?Math.round((done/total)*100):0;
  return {total,done,percent};
}
function setActiveNav(topicId){
  ACTIVE_TOPIC_ID=topicId;
  $$(".navItem").forEach(n=>n.classList.toggle("is-active",n.dataset.id===topicId));
}
function renderNav(data){
  const nav=$("#nav"); nav.innerHTML="";
  data.topics.forEach(t=>{
    const el=document.createElement("div");
    el.className="navItem"; el.dataset.id=t.id;
    el.innerHTML=`<div class="t">${escapeHtml(t.title)}</div><div class="d">${(t.tags||[]).slice(0,4).map(x=>`<span class="tag">${escapeHtml(x)}</span>`).join("")}</div>`;
    el.addEventListener("click",()=>{setActiveNav(t.id);renderView(); if(window.innerWidth<980)window.scrollTo({top:0,behavior:"smooth"})});
    nav.appendChild(el);
  });
  if(!ACTIVE_TOPIC_ID) setActiveNav(data.topics[0]?.id||null);
  setActiveNav(ACTIVE_TOPIC_ID);
}
function setMode(mode){
  MODE=mode;
  $("#btnModeLearn").classList.toggle("is-active",mode==="learn");
  $("#btnModeCards").classList.toggle("is-active",mode==="cards");
  $("#btnModePractice").classList.toggle("is-active",mode==="practice");
  $("#btnModeQuiz").classList.toggle("is-active",mode==="quiz");
  $("#btnModeGlossary").classList.toggle("is-active",mode==="glossary");
  renderView();
}
function renderAll(){
  const progress=loadProgress();
  const stats=progressStats(DATA,progress);
  $("#progressText").textContent=`${stats.percent}%`;
  $("#progressBar").style.width=`${stats.percent}%`;
  renderNav(DATA);
  renderView();
}
function renderView(){
  const topic=DATA.topics.find(t=>t.id===ACTIVE_TOPIC_ID)||DATA.topics[0];
  if(!topic) return;
  const view=$("#view");
  view.innerHTML = MODE==="learn" ? renderLearn(topic)
               : MODE==="cards" ? renderCards(topic)
               : MODE==="practice" ? renderPractice(topic)
               : MODE==="quiz" ? renderQuiz(topic)
               : renderGlossary();
  attachInteractiveHandlers();
}

/* ----- Learn ----- */
function renderLearn(topic){
  const sections=topic.sections||[];
  const totalTasks=sections.reduce((a,s)=>a+(s.tasks?.length||0),0);
  const totalVocab=sections.reduce((a,s)=>a+(s.vocab?.length||0),0);
  const imgHtml=topic.image?`<img src="${escapeAttr(topic.image)}" alt="Unit 3 Bild" />`:
    `<div class="placeholder">Kein Bild gesetzt.<br/><span class="small">Tipp: In <code>data/unit3.json</code> ein Bildpfad angeben.</span></div>`;
  return `
    <section class="card hero">
      <div>
        <h1 class="h1">${escapeHtml(topic.title)}</h1>
        <p class="p">${escapeHtml(topic.intro||"")}</p>
        <div class="kpis">
          <div class="kpi"><div class="n">${sections.length}</div><div class="l">Unterkapitel</div></div>
          <div class="kpi"><div class="n">${totalVocab}</div><div class="l">Vokabeln</div></div>
          <div class="kpi"><div class="n">${totalTasks}</div><div class="l">Aufgaben</div></div>
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn btnPrimary" data-action="startPractice">Gemischt üben</button>
          <button class="btn" data-action="startQuiz">Kapitel‑Quiz</button>
        </div>
      </div>
      <div class="heroImg">${imgHtml}</div>
    </section>
    <section class="card">
      <div class="sectionTitle">Unterkapitel</div>
      <div class="accordion">${sections.map((s,idx)=>renderSection(topic,s,idx)).join("")}</div>
    </section>`;
}
function renderSection(topic,section,idx){
  const theory=section.theory||[], vocab=section.vocab||[], tasks=section.tasks||[];
  const progress=loadProgress();
  const doneCount=tasks.filter((t,i)=>progress[`task:${topic.id}:${section.id}:${i}`]===true).length;
  return `
    <div class="accItem" data-acc="${escapeAttr(section.id)}">
      <div class="accHead" data-action="toggleAcc" data-acc="${escapeAttr(section.id)}">
        <div class="left">
          <div class="st">${escapeHtml(section.title)}</div>
          <div class="sd">${theory.length} Theorie · ${vocab.length} Vokabeln · ${tasks.length} Aufgaben</div>
        </div>
        <div class="row"><span class="badge">${doneCount}/${tasks.length||0} erledigt</span><span class="badge">#${idx+1}</span></div>
      </div>
      <div class="accBody" id="acc_${escapeAttr(section.id)}">
        ${theory.length?`<div class="hr"></div><div class="sectionTitle">Theorie</div>
          <div class="theoryGrid">${theory.map(x=>`<div class="theoryBox"><h4>${escapeHtml(x.h||"")}</h4><p>${escapeHtml(x.p||"")}</p></div>`).join("")}</div>`:""}
        ${vocab.length?`<div class="hr"></div><div class="sectionTitle">Vokabeln</div>
          <div class="vocabGrid">${vocab.map(v=>`<div class="vocabCard"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px"><div class="term">${escapeHtml(v.term||"")}</div><button class="ttsBtn" data-action="tts" data-text="${escapeAttr(v.term||"")}">🔊</button></div><div class="def">${escapeHtml(v.definition||"")}</div>${v.example?`<div class="ex">Beispiel: ${escapeHtml(v.example)}</div>`:""}</div>`).join("")}</div>`:""}
        ${tasks.length?`<div class="hr"></div><div class="sectionTitle">Aufgaben</div>
          <div class="taskList">${tasks.map((t,i)=>renderTask(topic.id,section.id,t,i)).join("")}</div>`:""}
      </div>
    </div>`;
}
function renderTask(topicId,sectionId,task,idx){
  const key=`task:${topicId}:${sectionId}:${idx}`;
  const done=loadProgress()[key]===true;
  const header=`<div class="row" style="justify-content:space-between">
    <div class="q">${escapeHtml(task.q||"Aufgabe")}</div>
    <div class="row"><span class="badge">${escapeHtml(task.type)}</span>
      <button class="chip" data-action="toggleDone" data-key="${escapeAttr(key)}">${done?"Erledigt ✓":"Als erledigt markieren"}</button></div></div>`;
  if(task.type==="mcq"){
    const choices=(task.choices||[]).map((c,i)=>`<label class="choice"><input type="radio" name="${escapeAttr(key)}" value="${i}"/><span>${escapeHtml(c)}</span></label>`).join("");
    return `<div class="task" data-task="${escapeAttr(key)}">${header}${choices}
      <div class="meta"><button class="btn" data-action="checkMcq" data-key="${escapeAttr(key)}" data-answer="${task.answer}">Check</button>
      <button class="btn" data-action="toggleExplain" data-key="${escapeAttr(key)}">Lösung anzeigen</button></div>
      ${task.explain?`<div class="explain" id="ex_${escapeAttr(key)}">${escapeHtml(task.explain)}</div>`:""}</div>`;
  }
  if(task.type==="fill"){
    return `<div class="task" data-task="${escapeAttr(key)}">${header}
      <input class="input" data-fill="${escapeAttr(key)}" placeholder="Antwort eingeben…"/>
      <div class="meta"><button class="btn" data-action="checkFill" data-key="${escapeAttr(key)}" data-answer="${escapeAttr(task.answer||"")}" data-alt="${escapeAttr((task.alt||[]).join("|"))}">Check</button>
      ${task.hint?`<span class="badge">Hinweis: ${escapeHtml(task.hint)}</span>`:""}
      <button class="btn" data-action="toggleExplain" data-key="${escapeAttr(key)}">Lösung</button></div>
      <div class="explain" id="ex_${escapeAttr(key)}">Lösung: <b>${escapeHtml(task.answer||"")}</b></div></div>`;
  }
  if(task.type==="truefalse"){
    return `<div class="task" data-task="${escapeAttr(key)}">${header}
      <div class="meta"><button class="btn" data-action="answerTF" data-key="${escapeAttr(key)}" data-val="true">True</button>
      <button class="btn" data-action="answerTF" data-key="${escapeAttr(key)}" data-val="false">False</button>
      <button class="btn" data-action="toggleExplain" data-key="${escapeAttr(key)}">Lösung</button></div>
      <div class="explain" id="ex_${escapeAttr(key)}">Korrekt: <b>${task.answer?"True":"False"}</b>${task.explain?` – ${escapeHtml(task.explain)}`:""}</div></div>`;
  }
  if(task.type==="match"){
    const pairs=(task.pairs||[]);
    const left=pairs.map(p=>p[0]);
    const right=shuffle(pairs.map(p=>p[1]));
    return `<div class="task" data-task="${escapeAttr(key)}">${header}
      <div class="small" style="margin-top:6px">Ordne zu:</div>
      <div style="display:grid;gap:8px;margin-top:8px">
        ${left.map((l,i)=>`<div style="display:grid;grid-template-columns: 1fr 1fr;gap:10px;align-items:center">
          <div><b>${escapeHtml(l)}</b></div>
          <select class="input" style="margin-top:0" data-match="${escapeAttr(key)}" data-i="${i}">
            <option value="">— wählen —</option>${right.map(r=>`<option value="${escapeAttr(r)}">${escapeHtml(r)}</option>`).join("")}
          </select></div>`).join("")}
      </div>
      <div class="meta"><button class="btn" data-action="checkMatch" data-key="${escapeAttr(key)}">Check</button>
      <button class="btn" data-action="toggleExplain" data-key="${escapeAttr(key)}">Lösung</button></div>
      <div class="explain" id="ex_${escapeAttr(key)}">${pairs.map(p=>`<div><b>${escapeHtml(p[0])}</b> → ${escapeHtml(p[1])}</div>`).join("")}</div>
      <script type="application/json" data-match-answers="${escapeAttr(key)}">${escapeJson(pairs)}</script></div>`;
  }
  
  if(task.type==="order"){
    const items=(task.items||[]).slice();
    const shuffled=shuffle(items);
    return `<div class="task" data-task="${escapeAttr(key)}">
      ${header}
      <div class="small" style="margin-top:6px">Ziehe die Elemente in die richtige Reihenfolge:</div>
      <div class="orderList" data-order-root="${escapeAttr(key)}">
        ${shuffled.map(it=>`<div class="orderItem" draggable="true" data-order-item="${escapeAttr(key)}" data-text="${escapeAttr(it)}">${escapeHtml(it)}</div>`).join("")}
      </div>
      <div class="meta">
        <button class="btn" data-action="checkOrder" data-key="${escapeAttr(key)}">Check</button>
        <button class="btn" data-action="toggleExplain" data-key="${escapeAttr(key)}">Lösung</button>
      </div>
      <div class="explain" id="ex_${escapeAttr(key)}">
        Lösung: <b>${escapeHtml((task.answer||task.items||[]).join(" → "))}</b>${task.explain?`<div class="small" style="margin-top:6px">${escapeHtml(task.explain)}</div>`:""}
      </div>
      <script type="application/json" data-order-answers="${escapeAttr(key)}">${escapeJson(task.answer||task.items||[])}</script>
    </div>`;
  }
return `<div class="task" data-task="${escapeAttr(key)}">${header}<div class="p">Nicht unterstützt: <code>${escapeHtml(task.type)}</code></div></div>`;
}

/* ----- Cards ----- */
let CARD_STATE={list:[],idx:0,show:false};
function renderCards(topic){
  const vocab=[]; (topic.sections||[]).forEach(s=>(s.vocab||[]).forEach(v=>vocab.push({section:s.title,...v})));
  if(!vocab.length) return `<section class="card"><h2 class="h1">Karten</h2><p class="p">Noch keine Vokabeln eingetragen.</p></section>`;
  const cats=[...new Set(vocab.map(v=>v.category||"General"))].sort();
  return `<section class="card">
    <div class="row" style="justify-content:space-between">
      <div><div class="h1">Karten: ${escapeHtml(topic.title)}</div><p class="p">Tippe auf die Karte, um die Lösung zu sehen.</p></div>
      <div class="row">
        <select id="cardCategory" class="input" style="margin-top:0;min-width:200px">
          <option value="__all__">Alle Kategorien</option>
          ${cats.map(c=>`<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("")}
        </select>
        <button class="btn" data-action="shuffleCards">Mischen</button><button class="btn btnPrimary" data-action="nextCard">Nächste</button>
      </div>
    </div><div class="hr"></div>
    <div id="cardArea" class="card" style="background:rgba(0,0,0,.18)"></div>
    <div class="row" style="margin-top:10px;justify-content:space-between">
      <div class="small" id="cardCounter"></div>
      <div class="row"><button class="btn" data-action="markCard" data-grade="hard">Schwierig</button>
      <button class="btn" data-action="markCard" data-grade="ok">Geht</button>
      <button class="btn" data-action="markCard" data-grade="easy">Kann ich</button></div>
    </div>
    <script type="application/json" id="cardsJson">${escapeJson(vocab)}</script></section>`;
}
function initCards(shuffleNow){
  const all=JSON.parse($("#cardsJson")?.textContent||"[]");
  const sel=$("#cardCategory");
  const cat=sel?sel.value:"__all__";
  const list=(cat==="__all__")?all:all.filter(v=>(v.category||"General")===cat);
  CARD_STATE.list=shuffleNow?shuffle(list):list; CARD_STATE.idx=0; CARD_STATE.show=false; renderCard();
  if(sel && !sel.dataset.wired){
    sel.dataset.wired="1";
    sel.addEventListener("change", ()=>initCards(false));
  }
}
function renderCard(){
  const area=$("#cardArea"), counter=$("#cardCounter");
  if(!area||!counter) return;
  if(!CARD_STATE.list.length){area.innerHTML=`<div class="p">Keine Karten.</div>`; counter.textContent=""; return;}
  const c=CARD_STATE.list[CARD_STATE.idx];
  area.innerHTML=`<div style="cursor:pointer"><div class="small">${escapeHtml(c.section||"")}</div>
    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px;margin-top:6px"><div class="h1" style="margin:0">${escapeHtml(c.term||"")}</div><button class="ttsBtn" data-action="ttsCard">🔊</button></div><div class="hr"></div>
    <div class="p" style="display:${CARD_STATE.show?"block":"none"}"><b>${escapeHtml(c.definition||"")}</b>${c.example?`<div class="small" style="margin-top:8px">Beispiel: ${escapeHtml(c.example)}</div>`:""}</div>
    <div class="p" style="display:${CARD_STATE.show?"none":"block"}">Tippe, um die Lösung zu sehen.</div></div>`;
  counter.textContent=`Karte ${CARD_STATE.idx+1} / ${CARD_STATE.list.length}`;
  area.onclick=()=>{CARD_STATE.show=!CARD_STATE.show;renderCard();}
}
function nextCard(){if(!CARD_STATE.list.length)return;CARD_STATE.idx=(CARD_STATE.idx+1)%CARD_STATE.list.length;CARD_STATE.show=false;renderCard();}
function markCard(grade){
  const p=loadProgress(); const c=CARD_STATE.list[CARD_STATE.idx]; const key=`card:${c.term}`;
  const cur=p[key]||{easy:0,ok:0,hard:0}; cur[grade]=(cur[grade]||0)+1; p[key]=cur; saveProgress(p); nextCard();
}

/* ----- Practice ----- */
function renderPractice(topic){
  const tasks=[]; (topic.sections||[]).forEach(s=>(s.tasks||[]).forEach((t,i)=>tasks.push({topicId:topic.id,sectionId:s.id,sectionTitle:s.title,taskIndex:i,task:t})));
  if(!tasks.length) return `<section class="card"><h2 class="h1">Üben</h2><p class="p">Noch keine Aufgaben eingetragen.</p></section>`;
  return `<section class="card">
    <div class="row" style="justify-content:space-between"><div><div class="h1">Gemischtes Üben</div><p class="p">Zufällige Aufgaben aus <b>${escapeHtml(topic.title)}</b>.</p></div>
    <div class="row"><button class="btn" data-action="newPracticeSet">Neue Runde</button><button class="btn btnPrimary" data-action="startAllTopicQuiz">Unit‑Test</button></div></div>
    <div class="hr"></div><div id="practiceList"></div>
    <script type="application/json" id="practiceJson">${escapeJson(tasks)}</script></section>`;
}
function initPractice(){
  const tasks=JSON.parse($("#practiceJson")?.textContent||"[]");
  const pick=shuffle(tasks).slice(0,Math.min(8,tasks.length));
  $("#practiceList").innerHTML=pick.map(x=>{
    // reuse the normal task renderer (keeps all buttons)
    return renderTask(x.topicId,x.sectionId,x.task,x.taskIndex);
  }).join("");
  attachInteractiveHandlers();
}

/* ----- Quiz ----- */
function renderQuiz(topic){
  const tasks=[];(topic.sections||[]).forEach(s=>(s.tasks||[]).forEach((t,i)=>{if(["mcq","truefalse","fill"].includes(t.type))tasks.push({topicId:topic.id,sectionId:s.id,sectionTitle:s.title,taskIndex:i,task:t})}));
  if(!tasks.length) return `<section class="card"><h2 class="h1">Quiz</h2><p class="p">Für Quiz brauchst du Aufgaben vom Typ <code>mcq</code>, <code>truefalse</code> oder <code>fill</code>.</p></section>`;
  return `<section class="card">
    <div class="row" style="justify-content:space-between"><div><div class="h1">Kapitel‑Quiz</div><p class="p">10 Fragen – Auswertung am Schluss.</p></div>
    <div class="row"><button class="btn" data-action="startTopicQuiz">Start</button><button class="btn btnPrimary" data-action="startAllTopicQuiz">Unit‑Test</button></div></div>
    <div class="hr"></div><div id="quizArea" class="p">Klicke auf <b>Start</b>.</div>
    <script type="application/json" id="quizJson">${escapeJson(tasks)}</script></section>`;
}
function initQuiz(isUnit){
  let pool=[];
  if(isUnit){
    DATA.topics.forEach(t=>{
      (t.sections||[]).forEach(s=>{
        (s.tasks||[]).forEach((task)=>{
          if(["mcq","truefalse","fill"].includes(task.type)){
            pool.push({topicTitle:t.title, sectionTitle:s.title, task});
          }
        });
      });
    });
  }else pool=JSON.parse($("#quizJson")?.textContent||"[]").map(x=>({topicTitle:"",sectionTitle:x.sectionTitle,task:x.task}));
  pool=shuffle(pool);
  const items=pool.slice(0,Math.min(10,pool.length));
  const area=$("#quizArea"); let idx=0,score=0,answers=[];
  function renderOne(){
    const cur=items[idx];
    if(!cur){
      const percent=items.length?Math.round((score/items.length)*100):0;
      area.innerHTML=`<div class="card" style="background:rgba(0,0,0,.18)"><div class="h1">Resultat</div>
        <p class="p">Punkte: <b>${score}</b> / ${items.length} (${percent}%)</p><div class="hr"></div>
        <div class="sectionTitle">Auswertung</div>${answers.map(a=>`<div class="task" style="margin-top:10px"><div class="q">${escapeHtml(a.title)}</div>
        <div class="p" style="margin-top:6px;color:${a.ok?'rgba(0,255,214,.9)':'rgba(255,77,172,.95)'}">${a.ok?"✓ korrekt":"✕ falsch"}</div>
        <div class="small" style="margin-top:6px;color:rgba(255,255,255,.7)">Richtig: <b>${escapeHtml(a.correct)}</b></div></div>`).join("")}
        <div class="row" style="margin-top:12px"><button class="btn" data-action="startTopicQuiz">Nochmal</button><button class="btn btnPrimary" data-action="startAllTopicQuiz">Unit‑Test</button></div></div>`;
      attachInteractiveHandlers(); return;
    }
    const title=(cur.topicTitle?cur.topicTitle+" – ":"")+cur.sectionTitle;
    area.innerHTML=`<div class="task"><div class="row" style="justify-content:space-between"><div class="q">${escapeHtml(title)}</div>
      <span class="badge">Frage ${idx+1}/${items.length}</span></div><div class="hr"></div>
      <div class="q">${escapeHtml(cur.task.q||"")}</div><div id="quizQ" style="margin-top:10px"></div>
      <div class="meta" style="margin-top:12px"><button class="btn btnPrimary" id="btnQuizNext">Antwort prüfen</button>
      <span class="badge">Typ: ${escapeHtml(cur.task.type)}</span></div></div>`;
    const qArea=$("#quizQ");
    if(cur.task.type==="mcq"){
      qArea.innerHTML=(cur.task.choices||[]).map((c,i)=>`<label class="choice"><input type="radio" name="quiz" value="${i}"/><span>${escapeHtml(c)}</span></label>`).join("");
      $("#btnQuizNext").onclick=()=>{const sel=$("input[name='quiz']:checked"); if(!sel)return;
        const ok=Number(sel.value)===Number(cur.task.answer); if(ok)score++;
        answers.push({title:cur.task.q,ok,correct:cur.task.choices?.[cur.task.answer]??""}); idx++; renderOne();};
    }else if(cur.task.type==="truefalse"){
      qArea.innerHTML=`<div class="row"><button class="btn" id="tfTrue">True</button><button class="btn" id="tfFalse">False</button></div>`;
      let chosen=null; $("#tfTrue").onclick=()=>chosen=true; $("#tfFalse").onclick=()=>chosen=false;
      $("#btnQuizNext").onclick=()=>{if(chosen===null)return; const ok=Boolean(chosen)===Boolean(cur.task.answer); if(ok)score++;
        answers.push({title:cur.task.q,ok,correct:cur.task.answer?"True":"False"}); idx++; renderOne();};
    }else if(cur.task.type==="fill"){
      qArea.innerHTML=`<input class="input" id="fillQuiz" placeholder="Antwort…"/>`;
      $("#btnQuizNext").onclick=()=>{const val=($("#fillQuiz").value||"").trim().toLowerCase();
        const corr=String(cur.task.answer||"").trim().toLowerCase();
        const alt=(cur.task.alt||[]).map(x=>String(x||"").trim().toLowerCase());
        const ok=[corr,...alt].includes(val); if(ok)score++;
        answers.push({title:cur.task.q,ok,correct:cur.task.answer}); idx++; renderOne();};
    }else {$("#btnQuizNext").onclick=()=>{idx++;renderOne();}}
  }
  renderOne();
}

/* ----- Glossary ----- */
function renderGlossary(){
  const vocab=flattenVocab(DATA);
  return `<section class="card">
    <div class="row" style="justify-content:space-between"><div><div class="h1">Glossar</div><p class="p">Alle Vokabeln der Unit.</p></div>
    <div class="row"><input id="glossSearch" class="search" style="width:280px" placeholder="Begriff / Definition…"/></div></div>
    <div class="hr"></div><div id="glossList" class="vocabGrid"></div>
    <script type="application/json" id="glossJson">${escapeJson(vocab)}</script></section>`;
}
function initGlossary(){
  const list=JSON.parse($("#glossJson")?.textContent||"[]");
  const render=(items)=>{$("#glossList").innerHTML=items.map(v=>`<div class="vocabCard"><div class="term">${escapeHtml(v.term||"")}</div>
    <div class="def">${escapeHtml(v.definition||"")}</div>${v.example?`<div class="ex">Beispiel: ${escapeHtml(v.example)}</div>`:""}
    <div class="small" style="margin-top:8px">${escapeHtml(v.topicTitle||"")} · ${escapeHtml(v.sectionTitle||"")}</div></div>`).join("");};
  render(list);
  $("#glossSearch").addEventListener("input",()=>{const q=$("#glossSearch").value.trim().toLowerCase();
    render(list.filter(v=>(v.term||"").toLowerCase().includes(q)||(v.definition||"").toLowerCase().includes(q)||(v.example||"").toLowerCase().includes(q)));});
}

/* ----- Checks & Progress ----- */
function updateProgressBar(){
  const stats=progressStats(DATA,loadProgress());
  $("#progressText").textContent=`${stats.percent}%`;
  $("#progressBar").style.width=`${stats.percent}%`;
}
function flash(el,ok){
  el.style.borderColor=ok?"rgba(0,255,214,.45)":"rgba(255,77,172,.45)";
  setTimeout(()=>{el.style.borderColor="";},700);
}
function toggleAcc(id){const el=$("#acc_"+cssEsc(id)); if(el) el.classList.toggle("is-open");}
function toggleDone(key){const p=loadProgress(); p[key]=!(p[key]===true); saveProgress(p); renderAll();}
function toggleExplain(key){const el=$("#ex_"+cssEsc(key)); if(el) el.classList.toggle("is-open");}
function checkMcq(key,ans){
  const root=document.querySelector(`[data-task="${cssEsc(key)}"]`); if(!root)return;
  const sel=root.querySelector(`input[name="${cssEsc(key)}"]:checked`); if(!sel){flash(root,false);return;}
  const ok=Number(sel.value)===ans; flash(root,ok);
  root.querySelector(`#ex_${cssEsc(key)}`)?.classList.add("is-open");
  if(ok){const p=loadProgress(); p[key]=true; saveProgress(p); updateProgressBar(); root.querySelector(`[data-action="toggleDone"]`).textContent="Erledigt ✓";}
}
function checkFill(key,answer,alt){
  const root=document.querySelector(`[data-task="${cssEsc(key)}"]`);
  const input=root?.querySelector(`[data-fill="${cssEsc(key)}"]`); if(!input)return;
  const val=(input.value||"").trim().toLowerCase();
  const answers=[answer,...(alt?alt.split("|").filter(Boolean):[])].map(x=>String(x||"").trim().toLowerCase());
  const ok=answers.includes(val); input.classList.toggle("good",ok); input.classList.toggle("bad",!ok);
  root.querySelector(`#ex_${cssEsc(key)}`)?.classList.add("is-open");
  if(ok){const p=loadProgress(); p[key]=true; saveProgress(p); updateProgressBar(); root.querySelector(`[data-action="toggleDone"]`).textContent="Erledigt ✓";}
}
function answerTF(key,val){
  const root=document.querySelector(`[data-task="${cssEsc(key)}"]`); if(!root)return;
  const ex=root.querySelector(`#ex_${cssEsc(key)}`); const correct=ex?.innerHTML.includes("<b>True</b>")?true:false;
  const ok=val===correct; flash(root,ok); ex?.classList.add("is-open");
  if(ok){const p=loadProgress(); p[key]=true; saveProgress(p); updateProgressBar(); root.querySelector(`[data-action="toggleDone"]`).textContent="Erledigt ✓";}
}

function getOrderCurrent(key){
  const root=document.querySelector(`[data-task="${cssEsc(key)}"]`);
  if(!root) return [];
  return Array.from(root.querySelectorAll(`[data-order-item="${cssEsc(key)}"]`)).map(el=>el.dataset.text);
}
function checkOrder(key){
  const root=document.querySelector(`[data-task="${cssEsc(key)}"]`); if(!root) return;
  const ansEl=root.querySelector(`[data-order-answers="${cssEsc(key)}"]`);
  const correct=JSON.parse(ansEl?.textContent||"[]");
  const cur=getOrderCurrent(key);
  const ok=JSON.stringify(cur)===JSON.stringify(correct);
  flash(root,ok);
  root.querySelector(`#ex_${cssEsc(key)}`)?.classList.add("is-open");
  const items=Array.from(root.querySelectorAll(`[data-order-item="${cssEsc(key)}"]`));
  items.forEach((el,i)=>{
    const good=correct[i]===el.dataset.text;
    el.classList.toggle("good",good);
    el.classList.toggle("bad",!good);
  });
  if(ok){
    const p=loadProgress(); p[key]=true; saveProgress(p); updateProgressBar();
    root.querySelector(`[data-action="toggleDone"]`).textContent="Erledigt ✓";
  }
}
function wireOrderDnD(){
  const items=$$(".orderItem");
  let dragging=null;
  items.forEach(it=>{
    it.addEventListener("dragstart",(e)=>{dragging=it; it.classList.add("dragging"); e.dataTransfer.effectAllowed="move";});
    it.addEventListener("dragend",()=>{it.classList.remove("dragging"); dragging=null;});
    it.addEventListener("dragover",(e)=>{
      e.preventDefault();
      if(!dragging || dragging===it) return;
      const parent=it.parentElement;
      if(!parent || parent!==dragging.parentElement) return;
      const rect=it.getBoundingClientRect();
      const before=(e.clientY-rect.top) < rect.height/2;
      parent.insertBefore(dragging, before ? it : it.nextSibling);
    });
    it.addEventListener("drop",(e)=>e.preventDefault());
  });
}
function checkMatch(key){
  const root=document.querySelector(`[data-task="${cssEsc(key)}"]`); if(!root)return;
  const jsonEl=root.querySelector(`[data-match-answers="${cssEsc(key)}"]`);
  const pairs=JSON.parse(jsonEl?.textContent||"[]");
  const selects=$$(`[data-match="${cssEsc(key)}"]`,root); let okAll=true;
  selects.forEach(sel=>{const i=Number(sel.dataset.i); const chosen=sel.value; const correct=pairs[i]?.[1];
    const ok=chosen&&chosen===correct; sel.classList.toggle("good",ok); sel.classList.toggle("bad",!ok); if(!ok) okAll=false;});
  root.querySelector(`#ex_${cssEsc(key)}`)?.classList.add("is-open");
  flash(root,okAll);
  if(okAll){const p=loadProgress(); p[key]=true; saveProgress(p); updateProgressBar(); root.querySelector(`[data-action="toggleDone"]`).textContent="Erledigt ✓";}
}

/* ----- Wiring ----- */
function attachInteractiveHandlers(){
  $$("[data-action]").forEach(el=>{
    el.addEventListener("click",()=>{
      const a=el.dataset.action, key=el.dataset.key;
      if(a==="toggleAcc") toggleAcc(el.dataset.acc);
      if(a==="toggleDone") toggleDone(key);
      if(a==="toggleExplain") toggleExplain(key);
      if(a==="checkMcq") checkMcq(key,Number(el.dataset.answer));
      if(a==="checkFill") checkFill(key,el.dataset.answer,el.dataset.alt);
      if(a==="answerTF") answerTF(key,el.dataset.val==="true");
      if(a==="checkMatch") checkMatch(key);
      if(a==="checkOrder") checkOrder(key);
      if(a==="startPractice"){setMode("practice");initPractice();}
      if(a==="startQuiz"){setMode("quiz");}
      if(a==="newPracticeSet") initPractice();
      if(a==="startTopicQuiz") initQuiz(false);
      if(a==="startAllTopicQuiz") initQuiz(true);
      if(a==="shuffleCards") initCards(true);
      if(a==="nextCard") nextCard();
      if(a==="markCard") markCard(el.dataset.grade);
      if(a==="tts") speak(el.dataset.text);
      if(a==="ttsCard"){const c=CARD_STATE.list[CARD_STATE.idx]; speak(c?.term||"");}
    });
  });
  if(MODE==="practice") initPractice();
  if(MODE==="cards") initCards(false);
  if(MODE==="glossary") initGlossary();
  wireOrderDnD();
  $("#searchNav").addEventListener("input",()=>{
    const q=$("#searchNav").value.trim().toLowerCase();
    $$(".navItem").forEach(it=>{it.style.display=it.textContent.toLowerCase().includes(q)?"":"none";});
  });
}
function wireUI(){
  $("#btnModeLearn").onclick=()=>setMode("learn");
  $("#btnModeCards").onclick=()=>setMode("cards");
  $("#btnModePractice").onclick=()=>setMode("practice");
  $("#btnModeQuiz").onclick=()=>setMode("quiz");
  $("#btnModeGlossary").onclick=()=>setMode("glossary");
  $("#btnHelp").onclick=()=>$("#dlgHelp").showModal();
  $("#btnReset").onclick=()=>resetProgress();
  $("#fileData").addEventListener("change",async(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{const json=JSON.parse(await f.text()); sessionStorage.setItem(STORAGE_DATA_OVERRIDE,JSON.stringify(json));
      DATA=json; ACTIVE_TOPIC_ID=DATA.topics?.[0]?.id||null; renderAll(); $("#dlgHelp").close();
    }catch(err){alert("JSON konnte nicht geladen werden: "+err.message);}
  });
  $("#btnExportProgress").onclick=()=>{
    const p=loadProgress(); const blob=new Blob([JSON.stringify(p,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="unit3_progress.json"; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),800);
  };
}
(async function(){
  try{DATA=await loadData(); wireUI(); renderAll();}
  catch(err){$("#view").innerHTML=`<section class="card"><div class="h1">Fehler</div><p class="p">${escapeHtml(err.message)}</p></section>`;}
})();
