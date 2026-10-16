'use strict';
function bindEvents(){
  els.audioBtn.addEventListener('click',ensureAudio);
  els.helpBtn.addEventListener('click',()=>els.helpDialog.showModal());
  els.rootSelect.addEventListener('change',()=>selectChord(+els.rootSelect.value,state.quality,true));
  els.qualitySelect.addEventListener('change',()=>selectChord(state.root,els.qualitySelect.value,true));
  els.prevVoicing.addEventListener('click',()=>changeVoicing(-1)); els.nextVoicing.addEventListener('click',()=>changeVoicing(1));
  els.upBtn.addEventListener('click',()=>strum('up')); els.downBtn.addEventListener('click',()=>strum('down'));
  els.upStroke.addEventListener('click',()=>strum('up')); els.downStroke.addEventListener('click',()=>strum('down'));
  els.arpBtn.addEventListener('click',arpeggiate);
  els.capoRange.addEventListener('input',()=>{state.capo=+els.capoRange.value;els.capoValue.textContent=state.capo;syncChordControls();renderFretboard();preloadShape(state.activeShape);});
  els.speedRange.addEventListener('input',()=>{state.speed=+els.speedRange.value;els.speedValue.textContent=state.speed<30?'Fast':state.speed<58?'Medium':'Slow';});
  els.dynamicsRange.addEventListener('input',()=>{state.dynamics=+els.dynamicsRange.value/100;els.dynamicsValue.textContent=state.dynamics<.48?'Soft':state.dynamics<.84?'Natural':'Hard';});
  els.patternSelect.addEventListener('change',()=>state.pattern=els.patternSelect.value);
  els.tempoSelect.addEventListener('change',()=>state.tempo=+els.tempoSelect.value);
  els.noteNamesToggle.addEventListener('change',()=>{state.noteNames=els.noteNamesToggle.checked;renderFretboard();});
  [...els.modeTabs.querySelectorAll('button')].forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));

  els.saveCustom.addEventListener('click',()=>{
    const name=els.customName.value.trim()||'My Chord'; if(state.customShape.every(f=>f<0))return;
    const existing=state.customChords.findIndex(c=>c.name.toLowerCase()===name.toLowerCase());
    const item={name,shape:state.customShape.slice()}; if(existing>=0)state.customChords[existing]=item; else state.customChords.push(item);
    persistCustom(); renderCustomSaved(); state.currentSource={kind:'custom',...item};
  });

  els.saveSetBtn.addEventListener('click',()=>{
    const name=(prompt('Save this chord set as:',state.activeSet)||'').trim(); if(!name)return;
    state.activeSet=name; state.sets[name]=clone(state.slots); persistSets(); renderSets();
  });
  els.newSetBtn.addEventListener('click',()=>{
    const name=(prompt('New chord set name:','My Set')||'').trim(); if(!name)return;
    state.activeSet=name; state.slots=clone(DEFAULT_SLOTS); state.sets[name]=clone(state.slots); persistSets(); renderSets(); renderSlots();
  });
  els.deleteSetBtn.addEventListener('click',()=>{
    if(state.activeSet==='Default'){alert('The Default set stays available.');return;}
    if(!confirm(`Delete “${state.activeSet}”?`))return; delete state.sets[state.activeSet];state.activeSet='Default';state.slots=clone(state.sets.Default);persistSets();renderSets();renderSlots();
  });
  els.setSelect.addEventListener('change',()=>{
    state.activeSet=els.setSelect.value; state.slots=clone(state.sets[state.activeSet]); localStorage.setItem('strumlab.activeSet',state.activeSet); renderSets();renderSlots();
  });

  let dragging=false,lastY=0,lastT=0;
  els.strumPad.addEventListener('pointerdown',e=>{dragging=true;lastY=e.clientY;lastT=performance.now();els.strumPad.setPointerCapture?.(e.pointerId);ensureAudio();});
  els.strumPad.addEventListener('pointermove',e=>{if(!dragging)return;const now=performance.now(),dy=e.clientY-lastY,dt=Math.max(8,now-lastT);if(Math.abs(dy)>18){const gesture=Math.min(1,Math.max(.3,Math.abs(dy)/dt*.72));strum(dy>0?'down':'up',Math.max(.25,state.dynamics*(.65+gesture*.55)));lastY=e.clientY;lastT=now;}});
  ['pointerup','pointercancel'].forEach(ev=>els.strumPad.addEventListener(ev,()=>dragging=false));
  els.strumPad.addEventListener('click',()=>strum('down'));

  window.addEventListener('keydown',e=>{
    const tag=e.target?.tagName; if(tag==='INPUT'||tag==='SELECT')return;
    if(e.altKey && /^[1-8]$/.test(e.key)){state.capo=+e.key;els.capoRange.value=String(state.capo);els.capoValue.textContent=state.capo;syncChordControls();renderFretboard();e.preventDefault();return;}
    if(e.key==='Escape'){state.capo=0;els.capoRange.value='0';els.capoValue.textContent='0';syncChordControls();renderFretboard();return;}
    if(e.key==='ArrowDown'||e.code==='Space'){strum('down');e.preventDefault();return;}
    if(e.key==='ArrowUp'){strum('up');e.preventDefault();return;}
    if(e.key.toLowerCase()==='r'){arpeggiate();e.preventDefault();return;}
    const idx='asdfgh'.indexOf(e.key.toLowerCase()); if(idx>=0){playString(idx);e.preventDefault();return;}
    if(/^[0-9]$/.test(e.key)){loadSource(state.slots[+e.key]);e.preventDefault();}
  });
}

async function checkForUpdate(){
  const current='2.0.0';
  if(els.versionLabel) els.versionLabel.textContent=`StrumLab v${current}`;
  try{
    const r=await fetch('https://raw.githubusercontent.com/satorinoiadeus/Mindwtr/strumlab-app/strumlab/version.json',{cache:'no-store'});
    if(!r.ok) return; const remote=await r.json();
    if(remote.version && remote.version!==current && els.updateBadge){
      els.updateBadge.classList.remove('hidden');
      els.updateBadge.textContent=`v${remote.version} available`;
      els.updateBadge.title=remote.notes||'A newer StrumLab build is available on GitHub.';
      els.updateBadge.style.cursor='pointer';
      els.updateBadge.onclick=()=>window.open('https://github.com/satorinoiadeus/Mindwtr/tree/strumlab-app/strumlab','_blank','noopener');
    }
  }catch{}
}

function nativeHeartbeat(){
  const params=new URLSearchParams(location.search); if(params.get('native')!=='1')return;
  const ping=()=>fetch('/heartbeat',{cache:'no-store'}).catch(()=>{}); ping();setInterval(ping,10000);
}

function init(){
  loadPersistence(); initSelects(); renderStringButtons(); bindEvents(); renderSets(); renderSlots(); renderCustomSaved();
  selectChord(0,'maj',true); setMode('chord');
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
  nativeHeartbeat(); checkForUpdate();
}
init();
