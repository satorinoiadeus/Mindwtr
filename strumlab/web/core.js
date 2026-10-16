'use strict';
const els = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, el]));
const CHORD_SLOT_KEYS = 'qwertasdfg';
const STRING_KEYS = 'zxcvbn';
const ARPEGGIO_KEY = 'p';

  const state = {
    mode: 'chord', root: 0, quality: 'maj', capo: 0, speed: 42, dynamics: 0.78, pattern: 'rise', tempo: 108, noteNames: false,
    voicings: [], voicingIndex: 0, activeShape: [-1,3,2,0,1,0], currentSource: {kind:'chord',root:0,quality:'maj'},
    customShape: [-1,-1,-1,-1,-1,-1], customChords: [],
    sets: {}, activeSet: 'Default', slots: [], audioReady: false
  };

  // ---------- Persistence ----------
  const DEFAULT_SLOTS = [
    ['C','maj'],['G','maj'],['A','min'],['F','maj'],['E','min'],['D','min'],['E','maj'],['D','maj'],['A','maj'],['B','min']
  ].map(([r,q]) => ({kind:'chord', root:NOTES.indexOf(r), quality:q}));

  function loadPersistence(){
    try { state.customChords = JSON.parse(localStorage.getItem('strumlab.custom') || '[]'); } catch { state.customChords = []; }
    try { state.sets = JSON.parse(localStorage.getItem('strumlab.sets') || '{}'); } catch { state.sets = {}; }
    if (!state.sets.Default) state.sets.Default = clone(DEFAULT_SLOTS);
    state.activeSet = localStorage.getItem('strumlab.activeSet') || 'Default';
    if (!state.sets[state.activeSet]) state.activeSet = 'Default';
    state.slots = clone(state.sets[state.activeSet]);
  }
  function persistCustom(){ localStorage.setItem('strumlab.custom', JSON.stringify(state.customChords)); }
  function persistSets(){
    state.sets[state.activeSet] = clone(state.slots);
    localStorage.setItem('strumlab.sets', JSON.stringify(state.sets));
    localStorage.setItem('strumlab.activeSet', state.activeSet);
  }
