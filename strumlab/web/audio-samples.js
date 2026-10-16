'use strict';
const SAMPLE_BASE='https://raw.githubusercontent.com/facebookincubator/Meta-open-sound/main/systems/instruments/meta-steel-guitar/ogg/';
const SAMPLE_STRINGS=['LowE','A','D','G','B','HighE'];
const FILE_NOTES=['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];
const sampleBuffers=new Map(), samplePromises=new Map();
const activeStrings=new Array(6).fill(null);
let audioCtx=null,master=null,bodyBus=null,samplesLoaded=0,samplesFailed=0;
function sampleName(si,midi,layer){const note=FILE_NOTES[pc(midi)],octave=Math.floor(midi/12)-1;return `INSGuitarSteel_String${SAMPLE_STRINGS[si]}_Vel0${layer}_${note}${octave}_01.ogg`;}
function sampleKey(si,midi,layer){return `${si}:${midi}:${layer}`;}
function velocityLayer(v){return v<.43?1:v<.78?2:3;}
function setSampleStatus(text){if(els.sampleStatus)els.sampleStatus.textContent=text;}
function ensureAudio(){
 if(!audioCtx){
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  master=audioCtx.createGain();master.gain.value=.82;
  bodyBus=audioCtx.createBiquadFilter();bodyBus.type='lowpass';bodyBus.frequency.value=11800;bodyBus.Q.value=.18;
  const warmth=audioCtx.createBiquadFilter();warmth.type='peaking';warmth.frequency.value=185;warmth.Q.value=.65;warmth.gain.value=1.8;
  const presence=audioCtx.createBiquadFilter();presence.type='peaking';presence.frequency.value=2650;presence.Q.value=.7;presence.gain.value=1.2;
  const comp=audioCtx.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=18;comp.ratio.value=3.2;comp.attack.value=.004;comp.release.value=.18;
  bodyBus.connect(warmth).connect(presence).connect(master).connect(comp).connect(audioCtx.destination);
 }
 if(audioCtx.state==='suspended')audioCtx.resume();
 state.audioReady=true;els.audioBtn.textContent='Guitar enabled';els.soundStatus.textContent='Sound on';document.querySelector('.player-toolbar')?.classList.add('status-on');preloadShape(state.activeShape);
}
async function getSample(si,midi,layer){
 ensureAudio();const key=sampleKey(si,midi,layer);if(sampleBuffers.has(key))return sampleBuffers.get(key);if(samplePromises.has(key))return samplePromises.get(key);
 const promise=fetch(SAMPLE_BASE+sampleName(si,midi,layer),{mode:'cors',cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error(`sample ${r.status}`);return r.arrayBuffer();}).then(b=>audioCtx.decodeAudioData(b)).then(decoded=>{sampleBuffers.set(key,decoded);samplePromises.delete(key);samplesLoaded++;setSampleStatus(samplesLoaded<6?`Loading real guitar… ${samplesLoaded}/6`:'Real steel guitar · ready');return decoded;}).catch(err=>{samplePromises.delete(key);samplesFailed++;if(samplesFailed>2)setSampleStatus('Offline synth fallback');throw err;});
 samplePromises.set(key,promise);return promise;
}
function preloadShape(shape=state.activeShape){if(!state.audioReady||!shape)return;let wanted=0;shape.forEach((f,si)=>{if(f<0)return;wanted++;const midi=TUNING_MIDI[si]+f+state.capo;[1,2,3].forEach(layer=>getSample(si,midi,layer).catch(()=>{}));});if(wanted)setSampleStatus('Loading real guitar…');}
function stopString(si,when){const old=activeStrings[si];if(!old)return;try{old.gain.gain.cancelScheduledValues(when);old.gain.gain.setValueAtTime(Math.max(.0001,old.gain.gain.value||.2),when);old.gain.gain.exponentialRampToValueAtTime(.0001,when+.035);old.source.stop(when+.06);}catch{}activeStrings[si]=null;}
