(() => {
  'use strict';
  const C = GymCatalog, S = GymStore;
  const $ = id => document.getElementById(id);
  const icons = {
    dumbbell:'M6 5v14M3 8v8M18 5v14M21 8v8M6 12h12', chart:'M4 19V5M4 19h16M8 15l4-5 4 2 4-7',
    folder:'M3 7V5h7l2 3h9v12H3Z', check:'m5 12 4 4L19 6', calendar:'M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16',
    left:'m14 6-6 6 6 6', right:'m10 6 6 6-6 6', plus:'M12 5v14M5 12h14', close:'m6 6 12 12M18 6 6 18',
    search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', minimize:'m6 14 6-6 6 6',
    download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
    info:'M12 10v7M12 6v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', more:'M5 12h.01M12 12h.01M19 12h.01',
    trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7'
  };
  function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.plus}"/></svg>`; }
  function paintIcons() { document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML=icon(el.dataset.icon); }); }
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let today = S.localDay();
  function offsetDay(date, offset) { const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+offset);return S.localDay(d); }
  function dateText(date, short=false) { return new Date(`${date}T12:00:00`).toLocaleDateString('th-TH',short?{day:'numeric',month:'short'}:{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
  function sampleData() {
    const entry=(id,sets)=>({id:`demo-${id}`,exerciseId:id,sets:sets.map(([weight,reps,completed=true])=>({weight,reps,completed}))});
    return {version:1,sessions:{
      [offsetDay(today,-8)]:[entry('db-press',[[10,10],[10,10]]),entry('lat-pull',[[30,10],[30,10]])],
      [offsetDay(today,-5)]:[entry('db-bench',[[12,10],[12,8]]),entry('curl',[[8,12],[8,10]])],
      [offsetDay(today,-3)]:[entry('db-press',[[12,10],[12,8]]),entry('lat-pull',[[35,10],[35,8]])],
      [today]:[entry('db-press',[[12,10],[12,8],[12,null,false]]),entry('lat-pull',[[35,10],[35,null,false]])]
    }};
  }
  // Personal log is the default so nothing typed in the gym lands in throwaway sample data.
  let mode='personal', page='log', selectedDate=today, selectedMuscle='shoulders', equipment='', query='';
  let personal={version:1,sessions:{}}, demo=sampleData(), blockedStorage=false, storageFailure='', rawSaved='', demoWarned=false;
  const exerciseIds=C.exercises.map(e=>e.id);
  try {
    mode=localStorage.getItem('gymlog-ember-mode')==='demo'?'demo':'personal';
    rawSaved=localStorage.getItem('gymlog-ember-v1')||'';
    const report={};
    if(rawSaved)personal=S.validateImport(JSON.parse(rawSaved),exerciseIds,report);
    if(report.skipped){
      // Keep the untouched original before any save drops the unknown entries.
      const backupKey=`gymlog-ember-v1-backup-${today}`;
      if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,rawSaved);
      storageFailure=`พบ ${report.skipped} ท่าที่เวอร์ชันนี้ไม่รู้จัก ซ่อนไว้ก่อน และเก็บสำเนาเดิมไว้ในเครื่องแล้ว`;
    }
  } catch(error) {blockedStorage=true;storageFailure='อ่านบันทึกเดิมไม่ได้ ระบบจะไม่เขียนทับ ส่งออกข้อมูลดิบเก็บไว้ได้ที่เมนูข้อมูล';}
  const data=()=>mode==='demo'?demo:personal;
  const entries=()=>data().sessions[selectedDate] || [];
  function ensureEntries() { return data().sessions[selectedDate] ||= []; }
  let toastTimer;
  function toast(message,action) {
    const t=$('toast');t.replaceChildren(document.createTextNode(message));
    if(action){const b=document.createElement('button');b.className='toast-action';b.textContent=action.label;b.onclick=()=>{t.hidden=true;action.run();};t.append(b);}
    t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,action?7000:4200);
  }
  function save() {
    if(mode==='demo'){
      setStatus('ตัวอย่าง · ไม่บันทึก');
      if(!demoWarned){demoWarned=true;toast('นี่คือข้อมูลตัวอย่าง จะหายเมื่อโหลดหน้าใหม่',{label:'จดจริง',run:()=>setMode('personal')});}
      return;
    }
    if(blockedStorage){setStatus('ยังไม่บันทึกลงเครื่อง',true);toast(storageFailure || 'ยังบันทึกลงเครื่องไม่ได้ ส่งออกไฟล์สำรองได้ในเมนูข้อมูล');return;}
    try {localStorage.setItem('gymlog-ember-v1',JSON.stringify(personal));setStatus('บันทึกแล้ว');}
    catch(error){setStatus('ยังไม่บันทึกลงเครื่อง',true);toast('พื้นที่เบราว์เซอร์ไม่พอหรือถูกปิดกั้น ข้อมูลยังอยู่ในหน้านี้ กรุณาส่งออกไฟล์ก่อนปิด');}
  }
  function setStatus(text,error=false) {$('save-status').innerHTML=icon(error?'info':'check')+esc(text);$('save-status').classList.toggle('error',error);}
  function setMode(next,message) {
    mode=next;selectedDate=today;
    try{localStorage.setItem('gymlog-ember-mode',mode);}catch(error){/* Data export remains available. */}
    renderMode();renderLog();renderResults();if(page==='summary')renderSummary();
    toast(message||(mode==='personal'?'กลับมาที่บันทึกส่วนตัวแล้ว ข้อมูลตัวอย่างไม่ถูกนำมารวม':'กำลังดูข้อมูลตัวอย่าง แก้ไขได้แต่จะไม่ถูกบันทึก'));
  }
  function renderMode(){
    $('demo-banner').hidden=mode!=='demo';$('personal-banner').hidden=mode!=='personal';
    $('data-mode-note').textContent=mode==='demo'?'ตอนนี้อยู่ในโหมดทดลอง ไฟล์ที่ส่งออกจะเป็นข้อมูลตัวอย่าง':blockedStorage?'อ่านบันทึกเดิมไม่ได้ ปุ่มส่งออกจะให้ไฟล์ข้อมูลดิบตามที่เก็บไว้ในเครื่อง':'ตอนนี้ใช้บันทึกส่วนตัว ส่งออกเพื่อสำรองข้อมูลของคุณได้';
    setStatus(mode==='demo'?'ข้อมูลตัวอย่าง':blockedStorage?'อ่านข้อมูลเดิมไม่ได้':'บันทึกในเครื่อง',mode==='personal'&&blockedStorage);
  }
  function setPage(next){
    page=next;document.querySelectorAll('.page').forEach(el=>el.hidden=el.id!==`page-${next}`);
    document.querySelectorAll('[data-page]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.page===next);if(btn.dataset.page===next)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});
    if(next==='summary')renderSummary();window.scrollTo({top:0,behavior:'instant'});
  }
  function countSession(){
    const completed=entries().flatMap(e=>e.sets).filter(S.complete);
    $('session-counts').innerHTML=`<span><b>${entries().length}</b> ท่า</span><i class="count-divider"></i><span><b>${completed.length}</b> เซตที่ทำแล้ว</span><i class="count-divider"></i><span><b>${completed.reduce((sum,s)=>sum+s.reps,0)}</b> ครั้ง</span>`;
  }
  // Re-rendering replaces the log's HTML; remember which field had focus and put it back.
  function focusKey(){
    const a=document.activeElement,card=a?.closest?.('[data-entry]');if(!card)return null;
    return {entry:card.dataset.entry,set:a.closest('[data-set]')?.dataset.set,field:a.dataset.field,confirm:a.hasAttribute('data-confirm-set'),add:a.hasAttribute('data-add-set')};
  }
  function restoreFocus(key){
    if(!key)return;const card=document.querySelector(`[data-entry="${key.entry}"]`);if(!card)return;
    const row=key.set!=null?card.querySelector(`[data-set="${key.set}"]`):null;
    const el=row&&key.field?row.querySelector(`[data-field="${key.field}"]`):row&&key.confirm?row.querySelector('[data-confirm-set]'):key.add?card.querySelector('[data-add-set]'):null;
    el?.focus({preventScroll:true});
  }
  let bodyCollapsedByUser=null;
  function setBodyCollapsed(collapsed){
    $('body-area').hidden=collapsed;$('muscle-chips').hidden=collapsed;
    $('collapse-body').setAttribute('aria-expanded',String(!collapsed));$('collapse-body').setAttribute('aria-label',collapsed?'ขยายภาพร่างกาย':'ย่อภาพร่างกาย');$('collapse-body').style.transform=collapsed?'rotate(180deg)':'';
  }
  // On a phone, once the day has exercises the body picker folds away so the sets sit near the top.
  function applyBodyLayout(){setBodyCollapsed(bodyCollapsedByUser??(matchMedia('(max-width:720px)').matches&&entries().length>0));}
  function renderLog(key=focusKey()){
    const isToday=selectedDate===today;
    $('session-date').value=selectedDate;$('session-date').max=today;$('next-day').disabled=selectedDate>=today;
    $('date-label').textContent=dateText(selectedDate);
    $('log-title').innerHTML=isToday?'วันนี้เล่นอะไร<span>?</span>':'จดย้อนหลัง<span>.</span>';
    $('backdate-banner').hidden=isToday;$('backdate-label').textContent=dateText(selectedDate);
    $('session-kicker').textContent=isToday?'การฝึกวันนี้':`บันทึก ${dateText(selectedDate,true)}`;
    countSession();applyBodyLayout();
    if(!entries().length){$('exercise-log').innerHTML=`<div class="empty-state"><span class="empty-symbol">${icon('dumbbell')}</span><h3>เริ่มจากท่าที่คุณเล่น</h3><p>กดกล้ามเนื้อ หรือค้นหาชื่อท่าแล้วเพิ่มเซต<br>จะจดตอนเล่นหรือกลับมาจดทีหลังก็ได้</p></div>`;return;}
    $('exercise-log').innerHTML=entries().map(entry=>{
      const e=C.get(entry.exerciseId), previous=S.previousWorkout(data(),e.id,selectedDate);
      const previousText=previous?`${dateText(previous.date,true)} · ${previous.sets.map(s=>`${s.weight} × ${s.reps}`).join(', ')} ${e.perSide?'กก./ข้าง':'กก.'}`:'ยังไม่มีเซตที่ทำแล้วจากครั้งก่อน';
      const usePrevious=previous&&entry.sets.filter(s=>s.completed).length<previous.sets.length?`<button class="use-previous" data-use-previous="${entry.id}">ใช้ค่าครั้งก่อน</button>`:'';
      return `<article class="exercise-card" data-entry="${entry.id}"><div class="exercise-header"><button class="exercise-thumb" data-detail="${e.id}" aria-label="ดูภาพและรายละเอียด ${e.name}">${C.thumbnail(e)}</button><div class="exercise-name"><h3>${e.name}</h3><p>${e.th}</p></div><button class="icon-button" data-remove="${entry.id}" aria-label="ลบ ${e.name}">${icon('trash')}</button></div><div class="previous-line"><span>ครั้งก่อน <strong>${previousText}</strong></span>${usePrevious}</div><table class="sets-table"><thead><tr><th><span class="sr-only">ลบ</span></th><th>เซต</th><th>${e.perSide?'กก. / ข้าง':'กก.'}</th><th>ครั้ง</th><th>ทำแล้ว</th></tr></thead><tbody>${entry.sets.map((s,i)=>`<tr class="${s.completed?'completed':''}" data-set="${i}"><td><button class="set-delete" data-delete-set="${i}" aria-label="ลบ ${e.name} เซต ${i+1}">×</button></td><td>${String(i+1).padStart(2,'0')}</td><td><input type="number" min="0" max="2000" step="any" inputmode="decimal" data-field="weight" value="${s.weight??''}" placeholder="—" aria-label="${e.name} เซต ${i+1} น้ำหนัก${e.perSide?'ต่อข้าง':''}"></td><td><input type="number" min="1" max="9999" step="1" inputmode="numeric" data-field="reps" value="${s.reps??''}" placeholder="—" aria-label="${e.name} เซต ${i+1} จำนวนครั้ง"></td><td><button class="set-confirm" data-confirm-set="${i}" aria-label="ยืนยัน ${e.name} เซต ${i+1}" aria-pressed="${s.completed}">${icon('check')}</button></td></tr>`).join('')}</tbody></table><button class="add-set" data-add-set="${entry.id}">${icon('plus')} เพิ่มเซต</button></article>`;
    }).join('');
    restoreFocus(key);
  }
  function selectMuscle(id,scroll=false){
    selectedMuscle=id;query='';$('exercise-search').value='';GymAnatomy.select(id);updateMuscles();renderResults();
    if(scroll && window.innerWidth<=720)$('exercise-browser').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
  function updateMuscles(){
    const m=C.muscle(selectedMuscle);$('body-tag-name').textContent=m?m.th:'ทุกส่วน';$('body-tag-en').textContent=m?m.en:'All muscles';
    $('muscle-chips').innerHTML=C.muscles.map(m=>`<button class="muscle-chip ${m.id===selectedMuscle?'active':''}" data-pick-muscle="${m.id}" aria-pressed="${m.id===selectedMuscle}">${m.th}</button>`).join('');
    document.querySelectorAll('[data-view]').forEach(btn=>{const active=btn.dataset.view===GymAnatomy.getView();btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
  }
  // Exercises with confirmed sets, most recent first.
  function recentExercises(limit=6){
    const ids=[];
    for(const date of Object.keys(data().sessions).sort().reverse())for(const entry of data().sessions[date])
      if(!ids.includes(entry.exerciseId)&&entry.sets.some(S.complete))ids.push(entry.exerciseId);
    return ids.slice(0,limit).map(C.get).filter(Boolean);
  }
  function renderResults(){
    const list=C.search(query,selectedMuscle,equipment),m=C.muscle(selectedMuscle),recent=!query&&!selectedMuscle?recentExercises():[];
    $('browser-heading').textContent=query?'ผลการค้นหา':m?`ท่าสำหรับ${m.th}`:'เลือกท่าออกกำลังกาย';
    $('clear-muscle').textContent=selectedMuscle?'ดูทุกส่วน':'ล้างตัวกรอง';$('clear-muscle').hidden=!selectedMuscle&&!equipment&&!query;
    $('result-count').textContent=`${list.length} ท่า`;
    $('recent-exercises').hidden=!recent.length;
    $('recent-exercises').innerHTML=recent.length?`<span class="recent-label">เคยเล่นล่าสุด</span>${recent.map(e=>`<button class="recent-chip" data-add-exercise="${e.id}" aria-label="เพิ่ม ${e.name}">${icon('plus')}${e.name}</button>`).join('')}`:'';
    $('exercise-results').innerHTML=list.length?list.map(e=>`<article class="result-card"><span class="exercise-thumb">${C.thumbnail(e)}</span><button class="result-info" data-detail="${e.id}" aria-label="ดูรายละเอียด ${e.name}"><strong>${e.name}</strong><small>${e.th}${m&&e.muscle!==m.id?` · <span class="secondary-tag">ช่วย${m.th}</span>`:''}</small></button><button class="result-add" data-add-exercise="${e.id}" aria-label="เพิ่ม ${e.name}">${icon('plus')}</button></article>`).join(''):'<div class="empty-results">ไม่พบท่า ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</div>';
  }
  function addExercise(id){
    const e=C.get(id);if(!e)return;
    if($('catalog-dialog').open)$('catalog-dialog').close();
    const existing=entries().find(x=>x.exerciseId===id);
    if(existing){toast('ท่านี้อยู่ในบันทึกแล้ว กดเพิ่มเซตต่อได้');document.querySelector(`[data-entry="${existing.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    const previous=S.previousWorkout(data(),id,selectedDate);
    ensureEntries().push({id:`entry-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,exerciseId:id,sets:[{weight:previous?.sets[0]?.weight??null,reps:null,completed:false}]});
    save();renderLog();toast(`เพิ่ม ${e.name} แล้ว`);
    const last=$('exercise-log').lastElementChild;last.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function showDetail(id){
    const e=C.get(id),photo=C.hasPhoto(e);
    const art=photo?`<div class="detail-photos">${['ท่าเริ่ม','ท่าจบ'].map((label,i)=>`<figure><img src="assets/exercises/${e.id}-${i}.webp" alt="${e.name} ${label}"><figcaption>${label}</figcaption></figure>`).join('')}</div>`:`<div class="detail-art">${C.sketch(e)}</div>`;
    const note=photo?`ภาพจาก free-exercise-db${C.photoNote(e)?` · ${C.photoNote(e)}`:''} · ใช้ช่วยจำท่า ไม่ใช่คำแนะนำฟอร์ม`:'แผนภาพช่วยจำท่าใน mock · ยังไม่ใช่ภาพสาธิตฟอร์ม';
    $('exercise-detail').innerHTML=`${art}<h2>${e.name}</h2><h3>${e.th}</h3><div class="dialog-tags"><span>${C.muscle(e.muscle).th}</span>${e.also.map(id=>`<span class="tag-secondary">${C.muscle(id).th}</span>`).join('')}<span>${e.equipment==='dumbbell'?'ดัมเบล':'เครื่องในยิม'}</span></div><p>${e.description}</p><p class="sketch-note">${note}<br>บันทึกน้ำหนัก${e.perSide?'ดัมเบลต่อข้าง':'รวมที่ใช้กับท่านี้'}เป็นกิโลกรัม</p><button class="primary-button" id="detail-add">เพิ่มลงบันทึก</button>`;
    $('detail-add').onclick=()=>{$('exercise-dialog').close();addExercise(id);};$('exercise-dialog').showModal();
  }
  let pendingConfirm=null;
  function confirmAction(title,copy,action,label='ยืนยัน'){$('confirm-title').textContent=title;$('confirm-copy').textContent=copy;$('confirm-accept').textContent=label;pendingConfirm=action;$('confirm-dialog').showModal();}
  $('confirm-cancel').onclick=()=>{$('confirm-dialog').close();pendingConfirm=null;};
  $('confirm-accept').onclick=()=>{const action=pendingConfirm;pendingConfirm=null;$('confirm-dialog').close();action?.();};
  $('confirm-dialog').addEventListener('cancel',()=>pendingConfirm=null);
  $('exercise-dialog').querySelector('.dialog-close').onclick=()=>$('exercise-dialog').close();
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.page)setPage(b.dataset.page);
    if(b.dataset.calShift){calMonth=monthShift(calMonth,Number(b.dataset.calShift));renderSummary();return;}
    if(b.dataset.calDate){selectedDate=b.dataset.calDate;renderLog();setPage('log');return;}
    if(b.dataset.pickMuscle)selectMuscle(b.dataset.pickMuscle,true);
    if(b.dataset.view){GymAnatomy.setView(b.dataset.view);updateMuscles();}
    if(b.hasAttribute('data-equipment')){equipment=b.dataset.equipment;document.querySelectorAll('[data-equipment]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));});renderResults();}
    if(b.dataset.detail)showDetail(b.dataset.detail);
    if(b.dataset.addExercise)addExercise(b.dataset.addExercise);
    if(b.dataset.addSet){
      const entry=entries().find(x=>x.id===b.dataset.addSet);if(entry.sets.length>=100){toast('หนึ่งท่ารองรับได้สูงสุด 100 เซต');return;}
      entry.sets.push({weight:entry.sets.at(-1)?.weight??null,reps:null,completed:false});save();
      renderLog({entry:entry.id,set:String(entry.sets.length-1),field:entry.sets.at(-1).weight==null?'weight':'reps'});
    }
    if(b.dataset.remove){
      const entry=entries().find(x=>x.id===b.dataset.remove),day=selectedDate,index=entries().indexOf(entry);
      confirmAction('ลบท่านี้จากบันทึก?',`${C.get(entry.exerciseId).name} และเซตทั้งหมดของ${day===today?'วันนี้':`วันที่ ${dateText(day,true)}`}จะถูกลบ`,()=>{
        data().sessions[day]=(data().sessions[day]||[]).filter(x=>x.id!==entry.id);save();renderLog();
        toast(`ลบ ${C.get(entry.exerciseId).name} แล้ว`,{label:'เลิกทำ',run:()=>{const list=data().sessions[day]||=[];list.splice(Math.min(index,list.length),0,entry);save();renderLog();}});
      },'ลบท่า');
    }
    const card=b.closest('[data-entry]');if(!card)return;
    const entry=entries().find(x=>x.id===card.dataset.entry);
    if(b.hasAttribute('data-delete-set')){
      const index=Number(b.dataset.deleteSet),removed=entry.sets[index];
      const remove=()=>{
        entry.sets.splice(index,1);save();renderLog();
        toast(`ลบเซต ${index+1} แล้ว`,{label:'เลิกทำ',run:()=>{entry.sets.splice(Math.min(index,entry.sets.length),0,removed);save();renderLog();}});
      };
      if(removed.completed)confirmAction('ลบเซตที่ทำแล้ว?',`เซต ${index+1} จะถูกลบจากบันทึกนี้`,remove,'ลบเซต');else remove();
    }
    if(b.hasAttribute('data-use-previous')){
      const previous=S.previousWorkout(data(),entry.exerciseId,selectedDate);if(!previous)return;
      const done=entry.sets.filter(s=>s.completed);
      entry.sets=[...done,...previous.sets.slice(done.length).map(p=>({weight:p.weight,reps:p.reps,completed:false}))];
      save();renderLog({entry:entry.id,set:String(done.length),confirm:true});
      toast('ใส่ค่าจากครั้งก่อนแล้ว กดยืนยันเมื่อทำเซตนั้นจริง');
    }
    if(b.hasAttribute('data-confirm-set')){
      const s=entry.sets[Number(b.dataset.confirmSet)];
      if(!s.completed && !S.complete({...s,completed:true})){toast('กรอกน้ำหนักตั้งแต่ 0 และจำนวนครั้งเป็นจำนวนเต็มมากกว่า 0 ก่อนยืนยัน');return;}
      s.completed=!s.completed;save();renderLog();
    }
  });
  function captureSetInput(e){
    const input=e.target;if(!input.matches('[data-field]'))return;
    const entry=entries().find(x=>x.id===input.closest('[data-entry]').dataset.entry),s=entry.sets[Number(input.closest('[data-set]').dataset.set)];
    if(!input.checkValidity()){if(e.type==='change'){input.reportValidity();input.value=s[input.dataset.field]??'';}return;}
    const value=input.value===''?null:input.dataset.field==='weight'?Math.round(Number(input.value)*100)/100:Number(input.value);
    if(s[input.dataset.field]===value)return;
    s[input.dataset.field]=value;s.completed=false;
    input.closest('tr').classList.remove('completed');input.closest('tr').querySelector('.set-confirm').setAttribute('aria-pressed','false');save();countSession();
  }
  $('exercise-log').addEventListener('input',captureSetInput);
  $('exercise-log').addEventListener('change',captureSetInput);
  // Enter moves weight → reps → confirm, so a set can be logged without reaching for the next field.
  $('exercise-log').addEventListener('keydown',e=>{
    const input=e.target;if(e.key!=='Enter'||!input.matches('[data-field]'))return;
    e.preventDefault();const row=input.closest('tr');
    if(input.dataset.field==='weight')row.querySelector('[data-field="reps"]').focus();
    else row.querySelector('[data-confirm-set]').click();
  });
  function showCatalog(){
    $('catalog-slot').append($('exercise-browser'));
    if(!$('catalog-dialog').open)$('catalog-dialog').showModal();
    $('exercise-search').focus({preventScroll:true});
  }
  $('catalog-close').onclick=()=>$('catalog-dialog').close();
  $('catalog-dialog').addEventListener('close',()=>{
    $('browser-home').append($('exercise-browser'));
    if(query){query='';$('exercise-search').value='';renderResults();}  // don't leave a stale search on the home list
  });
  $('quick-search').onclick=()=>{selectMuscle('');showCatalog();};
  $('exercise-search').addEventListener('input',e=>{query=e.target.value;if(query&&selectedMuscle){selectedMuscle='';GymAnatomy.select('');updateMuscles();}renderResults();});
  $('clear-muscle').onclick=()=>{equipment='';document.querySelectorAll('[data-equipment]').forEach(el=>{const on=el.dataset.equipment==='';el.classList.toggle('active',on);el.setAttribute('aria-pressed',String(on));});selectMuscle('');};
  $('add-exercise').onclick=()=>{selectMuscle('');showCatalog();};
  $('start-personal').onclick=()=>setMode('personal');$('show-demo').onclick=()=>setMode('demo');
  function changeDate(date){if(!S.validDate(date)||date>today){toast('เลือกวันนี้หรือวันที่ย้อนหลัง');$('session-date').value=selectedDate;return;}selectedDate=date;renderLog();}
  $('session-date').onchange=e=>changeDate(e.target.value);$('previous-day').onclick=()=>changeDate(offsetDay(selectedDate,-1));$('next-day').onclick=()=>changeDate(offsetDay(selectedDate,1));
  $('collapse-body').onclick=()=>{bodyCollapsedByUser=!$('body-area').hidden;setBodyCollapsed(bodyCollapsedByUser);};
  matchMedia('(max-width:720px)').addEventListener('change',applyBodyLayout);
  $('back-to-today').onclick=()=>changeDate(today);
  GymAnatomy.onSelect(id=>selectMuscle(id,true));
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&page==='log'&&!document.querySelector('dialog[open]')){e.preventDefault();showCatalog();}});

  const CUTOUT='assets/anatomy-cutout.webp?v=6';
  let calMonth=today.slice(0,7), progressExercise='', chartIndex=-1;
  const summaryFrom=()=>{const p=$('summary-period').value;return p==='all'?'0000-01-01':offsetDay(today,1-Number(p));};
  const doneSets=date=>(data().sessions[date]||[]).flatMap(e=>e.sets).filter(S.complete);
  function monthShift(month,delta){const [y,m]=month.split('-').map(Number),d=new Date(y,m-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
  function heatFigure(view,grouped,max){
    const x=view==='front'?225:870;
    const paths=Object.entries(GymAnatomyRegions[view]).map(([id,r])=>{
      const n=grouped[id]||0;if(!n)return '';
      const level=(.25+.75*n/max).toFixed(2),title=`<title>${C.muscle(id).th} · ${n} เซต</title>`;
      return (r.d?`<path class="heat-region" d="${r.d}" style="fill-opacity:${level}" mask="url(#heat-alpha-${view})">${title}</path>`:'')
        +(r.fabric?`<path class="heat-region on-fabric" d="${r.fabric}" style="fill-opacity:${(level*.6).toFixed(2)}" mask="url(#heat-alpha-${view})">${title}</path>`:'');
    }).join('');
    return `<svg class="heat-figure" viewBox="${x} 0 440 1000" role="img" aria-label="ร่างกาย${view==='front'?'ด้านหน้า':'ด้านหลัง'} ระบายสีตามจำนวนเซต"><defs><mask id="heat-alpha-${view}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024"><image href="${CUTOUT}" width="1536" height="1024"/></mask><clipPath id="heat-crop-${view}"><rect x="${x}" y="0" width="440" height="1000"/></clipPath></defs><g clip-path="url(#heat-crop-${view})"><image href="${CUTOUT}" width="1536" height="1024"/>${paths}</g></svg>`;
  }
  function calendarHtml(){
    const [y,m]=calMonth.split('-').map(Number),lead=new Date(y,m-1,1).getDay(),count=new Date(y,m,0).getDate();
    let trained=0;
    const cells=[...Array(lead)].map(()=>'<span class="cal-cell empty" aria-hidden="true"></span>');
    for(let d=1;d<=count;d++){
      const date=`${calMonth}-${String(d).padStart(2,'0')}`,n=doneSets(date).length;if(n)trained++;
      cells.push(`<button class="cal-cell${n?' trained':''}${date===today?' today':''}" data-cal-date="${date}" ${date>today?'disabled':''} style="--level:${Math.min(1,n/15).toFixed(2)}" aria-label="${dateText(date)}${n?` · ${n} เซต`:''}"><span>${d}</span>${n?`<small>${n}</small>`:''}</button>`);
    }
    const title=new Date(y,m-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
    return `<div class="cal-head"><button class="icon-button" data-cal-shift="-1" aria-label="เดือนก่อนหน้า">${icon('left')}</button><strong>${title}</strong><button class="icon-button" data-cal-shift="1" aria-label="เดือนถัดไป" ${calMonth>=today.slice(0,7)?'disabled':''}>${icon('right')}</button></div><div class="cal-grid">${['อา','จ','อ','พ','พฤ','ศ','ส'].map(d=>`<span class="cal-dow">${d}</span>`).join('')}${cells.join('')}</div><p class="cal-note">ฝึก ${trained} วันในเดือนนี้ · ตัวเลขเล็กคือจำนวนเซต · แตะวันเพื่อเปิดบันทึก</p>`;
  }
  function progressSeries(id){
    const from=summaryFrom();
    return Object.keys(data().sessions).filter(d=>d>=from&&d<=today).sort().map(date=>{
      const sets=data().sessions[date].filter(e=>e.exerciseId===id).flatMap(e=>e.sets).filter(S.complete);
      if(!sets.length)return null;
      const best=[...sets].sort((a,b)=>b.weight-a.weight||b.reps-a.reps)[0];
      return {date,weight:best.weight,reps:best.reps};
    }).filter(Boolean);
  }
  function niceTicks(lo,hi){
    if(hi-lo<1){lo=Math.max(0,lo-2.5);hi+=2.5;}
    const raw=(hi-lo)/4,mag=10**Math.floor(Math.log10(raw)),step=[1,2,2.5,5,10].map(f=>f*mag).find(v=>v>=raw);
    const ticks=[];for(let v=Math.floor(lo/step)*step;v<=Math.ceil(hi/step)*step+1e-9;v+=step)ticks.push(+v.toFixed(2));
    return ticks;
  }
  function drawProgress(){
    const box=$('progress-chart');if(!box||!progressExercise)return;
    const pts=progressSeries(progressExercise),e=C.get(progressExercise),unit=e.perSide?'กก./ข้าง':'กก.';
    const W=Math.max(260,box.clientWidth),H=210,L=38,R=78,T=14,B=26;
    const ticks=niceTicks(Math.min(...pts.map(p=>p.weight)),Math.max(...pts.map(p=>p.weight))),lo=ticks[0],hi=ticks.at(-1);
    const time=d=>new Date(`${d}T12:00:00`).getTime(),t0=time(pts[0].date),t1=time(pts.at(-1).date);
    const X=p=>t1===t0?L+(W-L-R)/2:L+(time(p.date)-t0)/(t1-t0)*(W-L-R),Y=v=>T+(H-T-B)*(1-(v-lo)/(hi-lo));
    const last=pts.at(-1);
    box.innerHTML=`<svg width="${W}" height="${H}" tabindex="0" role="img" aria-label="กราฟน้ำหนักสูงสุดต่อวันของ ${e.name} ใช้ลูกศรซ้ายขวาดูแต่ละวัน"><g class="chart-grid">${ticks.map(v=>`<line x1="${L}" x2="${W-R+8}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')}</g><g class="chart-axis">${ticks.map(v=>`<text x="${L-8}" y="${Y(v)+3}" text-anchor="end">${v}</text>`).join('')}<text x="${X(pts[0])}" y="${H-6}" text-anchor="${pts.length>1?'start':'middle'}">${dateText(pts[0].date,true)}</text>${pts.length>1?`<text x="${X(last)}" y="${H-6}" text-anchor="end">${dateText(last.date,true)}</text>`:''}</g><path class="chart-line" d="${pts.map((p,i)=>`${i?'L':'M'}${X(p).toFixed(1)} ${Y(p.weight).toFixed(1)}`).join('')}"/><line class="chart-cross" y1="${T}" y2="${H-B}" visibility="hidden"/>${pts.map(p=>`<circle class="chart-dot" cx="${X(p)}" cy="${Y(p.weight)}" r="4"/>`).join('')}<text class="chart-end" x="${X(last)+10}" y="${Y(last.weight)+4}">${last.weight} ${unit}</text><rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg><div class="chart-tip" hidden></div>`;
    const svg=box.querySelector('svg'),cross=box.querySelector('.chart-cross'),tip=box.querySelector('.chart-tip');
    const show=i=>{
      chartIndex=i;if(i<0){cross.setAttribute('visibility','hidden');tip.hidden=true;return;}
      const p=pts[i],x=X(p);cross.setAttribute('x1',x);cross.setAttribute('x2',x);cross.setAttribute('visibility','visible');
      const v=document.createElement('strong');v.textContent=`${p.weight} ${unit} × ${p.reps}`;tip.replaceChildren(v,document.createTextNode(dateText(p.date,true)));
      tip.style.left=`${Math.min(Math.max(x,60),W-60)}px`;tip.style.top=`${Y(p.weight)-10}px`;tip.hidden=false;
    };
    const nearest=x=>pts.reduce((best,p,i)=>Math.abs(X(p)-x)<Math.abs(X(pts[best])-x)?i:best,0);
    svg.addEventListener('pointermove',ev=>show(nearest(ev.offsetX)));
    svg.addEventListener('pointerleave',()=>show(-1));
    svg.addEventListener('blur',()=>show(-1));
    svg.addEventListener('keydown',ev=>{if(!['ArrowLeft','ArrowRight'].includes(ev.key))return;ev.preventDefault();show(Math.min(pts.length-1,Math.max(0,(chartIndex<0?pts.length:chartIndex)+(ev.key==='ArrowLeft'?-1:1))));});
  }
  function renderSummary(){
    const from=summaryFrom(),totals=S.summarize(data(),from,today);
    const days=Object.keys(data().sessions).filter(d=>d>=from&&d<=today&&doneSets(d).length).sort().reverse();
    const grouped={},progress={};
    for(const date of [...days].reverse())for(const entry of data().sessions[date]){
      const done=entry.sets.filter(S.complete);if(!done.length)continue;
      const e=C.get(entry.exerciseId);grouped[e.muscle]=(grouped[e.muscle]||0)+done.length;
      const best=[...done].sort((a,b)=>b.weight-a.weight||b.reps-a.reps)[0];
      (progress[e.id]||=[]).push({date,best});
    }
    const max=Math.max(1,...Object.values(grouped));
    const ranked=Object.keys(progress).sort((a,b)=>progress[b].length-progress[a].length);
    if(!progress[progressExercise])progressExercise=ranked[0]||'';
    const bars=Object.entries(grouped).sort((a,b)=>b[1]-a[1]).map(([id,sets])=>`<div class="muscle-bar"><div class="bar-label"><span>${C.muscle(id).th}</span><span>${sets} เซต</span></div><div class="track"><div class="fill" style="width:${sets/max*100}%"></div></div></div>`).join('');
    const history=days.slice(0,8).map(date=>{const entries=data().sessions[date].filter(e=>e.sets.some(S.complete));return `<div class="history-day"><button data-cal-date="${date}"><span><strong>${dateText(date)}</strong><small>${entries.map(e=>C.get(e.exerciseId).th).join(' · ')}</small></span><span class="history-sets">${doneSets(date).length} เซต ↗</span></button></div>`;}).join('');
    const rows=ranked.map(id=>{const e=C.get(id),h=progress[id],first=h[0],last=h.at(-1);return `<div class="progress-row"><div><strong>${e.name}</strong><p>${dateText(first.date,true)}${h.length>1?' ถึง '+dateText(last.date,true):' · บันทึก 1 วัน'}</p></div><div class="progress-values">${h.length>1?first.best.weight+' → ':''}${last.best.weight} <small>กก.${e.perSide?' / ข้าง':''} · ล่าสุด ${last.best.reps} ครั้ง</small></div></div>`;}).join('');
    $('summary-content').innerHTML=`<div class="summary-stats"><article class="stat-card"><p>วันที่ออกกำลังกาย</p><strong>${totals.days}</strong><small>วันที่มีเซตยืนยัน</small></article><article class="stat-card"><p>เซตที่ทำแล้ว</p><strong>${totals.sets}</strong><small>ไม่นับเซตที่ยังไม่ยืนยัน</small></article><article class="stat-card"><p>จำนวนครั้งรวม</p><strong>${totals.reps}</strong><small>จากเซตที่ทำแล้ว</small></article></div>`
      +`<div class="summary-grid"><section class="summary-card"><h2>ช่วงนี้ฝึกส่วนไหนบ้าง</h2>${bars?`<div class="heat-figures">${heatFigure('front',grouped,max)}${heatFigure('back',grouped,max)}</div><div class="heat-legend"><span>น้อย</span><i class="heat-ramp"></i><span>มาก</span><span class="heat-legend-note">ตามจำนวนเซตที่ยืนยัน</span></div><p class="heat-note">สีบอกปริมาณที่จด ไม่ได้วัดความล้าหรือความพร้อมของกล้ามเนื้อ</p>${bars}`:'<p class="intro">ยังไม่มีเซตที่ยืนยันในช่วงนี้</p>'}</section>`
      +`<section class="summary-card"><h2>ปฏิทินการฝึก</h2>${calendarHtml()}<h3 class="history-title">ล่าสุดในช่วงที่เลือก</h3>${history||'<p class="intro">เริ่มจดและยืนยันเซต แล้วกลับมาดูการฝึกได้ที่นี่</p>'}</section></div>`
      +`<section class="summary-card progress-panel"><div class="progress-head"><div><h2>น้ำหนักที่บันทึกแต่ละท่า</h2><p class="intro">น้ำหนักสูงสุดของแต่ละวันในช่วงที่เลือก</p></div>${ranked.length?`<label class="period-label">ท่า<select id="progress-exercise">${ranked.map(id=>`<option value="${id}" ${id===progressExercise?'selected':''}>${C.get(id).name}</option>`).join('')}</select></label>`:''}</div>${ranked.length?'<div id="progress-chart"></div>':''}<h3 class="history-title">ทุกท่าในช่วงนี้</h3>${rows||'<p class="intro">ยังไม่มีข้อมูลในช่วงนี้</p>'}</section>`;
    $('progress-exercise')?.addEventListener('change',ev=>{progressExercise=ev.target.value;drawProgress();});
    drawProgress();
  }
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(page==='summary')drawProgress();},150);});
  $('summary-period').onchange=renderSummary;
  $('export-data').onclick=()=>{
    // An unreadable log is exported exactly as stored, so a backup never comes out empty.
    const raw=mode==='personal'&&blockedStorage&&rawSaved;
    const blob=new Blob([raw||JSON.stringify(data(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`gymlog-${mode}${raw?'-raw':''}-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast(raw?'ส่งออกข้อมูลดิบแล้ว เก็บไฟล์นี้ไว้ก่อนแก้ไขหรือนำเข้าใหม่':mode==='demo'?'ส่งออกข้อมูลตัวอย่างแล้ว':'ส่งออกบันทึกส่วนตัวแล้ว');
  };
  $('import-data').onclick=()=>$('import-file').click();
  $('import-file').onchange=async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    try{
      if(file.size>5*1024*1024)throw new Error('ไฟล์ใหญ่เกิน 5 MB');
      const report={},incoming=S.validateImport(JSON.parse(await file.text()),exerciseIds,report),count=Object.keys(incoming.sessions).length;
      const skipped=report.skipped?` ข้าม ${report.skipped} ท่าที่เวอร์ชันนี้ไม่รู้จัก`:'';
      confirmAction('แทนที่บันทึกส่วนตัว?',`นำเข้า ${count} วัน${skipped} ข้อมูลส่วนตัวเดิมจะถูกแทนที่ ควรส่งออกสำรองก่อน ข้อมูลตัวอย่างจะไม่ถูกเปลี่ยน`,()=>{
        personal=incoming;blockedStorage=false;rawSaved='';setMode('personal',`นำเข้า ${count} วันแล้ว${skipped}`);save();renderLog();if(page==='summary')renderSummary();
      },'แทนที่และนำเข้า');
    }catch(error){toast('นำเข้าไม่ได้: '+(error instanceof SyntaxError?'ไฟล์นี้ไม่ใช่ JSON ที่ถูกต้อง':error.message));}
  };
  function refreshToday(){
    const now=S.localDay();if(now===today)return;
    const followToday=selectedDate===today;today=now;if(followToday)selectedDate=now;
    demo=sampleData();  // sample dates are relative to today
    if(calMonth<today.slice(0,7)&&followToday)calMonth=today.slice(0,7);
    renderLog();if(page==='summary')renderSummary();
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshToday();});
  setInterval(refreshToday,60000);
  paintIcons();renderMode();renderLog();updateMuscles();renderResults();if(storageFailure)toast(storageFailure);
})();
