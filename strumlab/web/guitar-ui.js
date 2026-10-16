'use strict';
// ---------- UI rendering ----------
  function initSelects(){
    NOTES.forEach((n,i)=>els.rootSelect.add(new Option(n,String(i))));
    QUALITIES.forEach(q=>els.qualitySelect.add(new Option(q.label,q.id)));
    for(let i=0;i<=12;i++){ const d=document.createElement('span'); d.textContent=i===0?'open':i; els.fretNumbers.appendChild(d); }
  }

  function renderFretboard(){
    els.fretboard.innerHTML='';
    DISPLAY_STRINGS.forEach(si=>{
      const row=document.createElement('div'); row.className='fret-row'; row.style.setProperty('--string-size',`${1.25+(5-si)*.42}px`);
      for(let fret=0;fret<=12;fret++){
        const cell=document.createElement('button'); cell.className='fret-cell'; cell.dataset.string=si; cell.dataset.fret=fret;
        const dot=document.createElement('span'); dot.className='note-dot';
        const soundingMidi=TUNING_MIDI[si]+fret+state.capo; dot.textContent=state.noteNames?noteName(soundingMidi):'●';
        cell.appendChild(dot);
        const selected = state.mode==='custom' ? state.customShape[si]===fret : state.activeShape[si]===fret;
        if(selected){ cell.classList.add(state.mode==='custom'?'custom':'active');
          const rootPc=state.mode==='custom'?null:state.root;
          if(rootPc!==null && pc(TUNING_MIDI[si]+fret)===rootPc) cell.classList.add('root');
        }
        cell.addEventListener('click',()=>onFretClick(si,fret,cell));
        cell.addEventListener('contextmenu',e=>{e.preventDefault(); if(state.mode==='custom'){state.customShape[si]=-1;renderFretboard();}});
        row.appendChild(cell);
      }
      els.fretboard.appendChild(row);
    });
  }

  function onFretClick(si,fret,cell){
    if(state.mode==='custom'){
      state.customShape[si]=state.customShape[si]===fret?-1:fret; state.activeShape=state.customShape.slice(); state.currentSource={kind:'customDraft'}; renderFretboard();
      if(state.customShape[si]>=0) playString(si,0,state.customShape); return;
    }
    // Note/chord mode: tapping the neck always auditions that exact note.
    ensureAudio(); playSampledString(si,fret+state.capo,0,Math.min(1,state.dynamics+.08));
    cell.classList.add('note-preview'); setTimeout(()=>cell.classList.remove('note-preview'),180);
  }

  function flashString(si,fret){
    const c=els.fretboard.querySelector(`[data-string="${si}"][data-fret="${fret}"]`); if(!c)return;
    c.animate([{filter:'brightness(1)'},{filter:'brightness(1.7)'},{filter:'brightness(1)'}],{duration:280,easing:'ease-out'});
  }

  function renderStringButtons(){
    els.stringButtons.innerHTML=''; [0,1,2,3,4,5].forEach(si=>{
      const b=document.createElement('button'); b.textContent=String(6-si); b.title=`String ${6-si} · ${STRING_NAMES[si]}`; b.addEventListener('click',()=>playString(si)); els.stringButtons.appendChild(b);
    });
  }

  function setMode(mode){
    state.mode=mode;
    [...els.modeTabs.querySelectorAll('button')].forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    els.chordPanel.classList.toggle('hidden',mode==='custom'); els.customPanel.classList.toggle('hidden',mode!=='custom');
    if(mode==='custom'){state.activeShape=state.customShape.slice();}
    else if(mode==='chord'){state.activeShape=state.voicings[state.voicingIndex]?.slice()||state.activeShape;}
    renderFretboard();
  }

  function sourceLabel(src){
    if(!src)return '—';
    if(src.kind==='chord') return chordName(src.root,src.quality);
    if(src.kind==='custom') return src.name;
    return 'Custom';
  }
  function renderSlots(){
    els.slotGrid.innerHTML='';
    state.slots.forEach((src,i)=>{
      const b=document.createElement('button'); b.className='slot'; b.title='Tap to load · hold to assign current chord';
      b.innerHTML=`<div class="slot-key">${CHORD_SLOT_KEYS[i].toUpperCase()}</div><div class="slot-name">${sourceLabel(src)}</div>`;
      let timer=null, held=false;
      b.addEventListener('pointerdown',()=>{held=false;timer=setTimeout(()=>{held=true;assignSlot(i);navigator.vibrate?.(25);},620)});
      ['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>{if(timer)clearTimeout(timer)}));
      b.addEventListener('click',e=>{if(held){e.preventDefault();return;} loadSource(src);});
      b.addEventListener('dblclick',()=>assignSlot(i));
      els.slotGrid.appendChild(b);
    });
  }
  function assignSlot(i){
    let src;
    if(state.mode==='custom') src={kind:'custom',name:els.customName.value.trim()||'Custom',shape:state.customShape.slice()};
    else src=clone(state.currentSource);
    state.slots[i]=src; persistSets(); renderSlots();
  }
  function loadSource(src){
    if(!src)return;
    if(src.kind==='chord') selectChord(src.root,src.quality);
    else if(src.kind==='custom'){
      state.customShape=src.shape.slice(); state.activeShape=src.shape.slice(); state.currentSource=clone(src); els.customName.value=src.name; setMode('custom');
    }
  }

  function renderSets(){
    els.setSelect.innerHTML=''; Object.keys(state.sets).sort().forEach(name=>els.setSelect.add(new Option(name,name)));
    els.setSelect.value=state.activeSet; els.setTitle.textContent=state.activeSet;
  }
  function renderCustomSaved(){
    els.customSaved.innerHTML=''; state.customChords.forEach((c,idx)=>{
      const b=document.createElement('button'); b.className='custom-chip'; b.textContent=c.name; b.title='Tap to load · Shift-click to delete';
      b.addEventListener('click',e=>{if(e.shiftKey){state.customChords.splice(idx,1);persistCustom();renderCustomSaved();return;} loadSource({kind:'custom',name:c.name,shape:c.shape});});
      els.customSaved.appendChild(b);
    });
  }
