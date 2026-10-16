'use strict';
const NOTES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const TUNING_MIDI=[40,45,50,55,59,64];
const STRING_NAMES=['E2','A2','D3','G3','B3','E4'];
const DISPLAY_STRINGS=[5,4,3,2,1,0];
const QUALITIES=[
{id:'maj',label:'Major',symbol:'',intervals:[0,4,7],essential:[0,4,7]},
{id:'min',label:'Minor',symbol:'m',intervals:[0,3,7],essential:[0,3,7]},
{id:'5',label:'Power 5',symbol:'5',intervals:[0,7],essential:[0,7]},
{id:'sus2',label:'Sus2',symbol:'sus2',intervals:[0,2,7],essential:[0,2,7]},
{id:'sus4',label:'Sus4',symbol:'sus4',intervals:[0,5,7],essential:[0,5,7]},
{id:'dim',label:'Diminished',symbol:'dim',intervals:[0,3,6],essential:[0,3,6]},
{id:'aug',label:'Augmented',symbol:'aug',intervals:[0,4,8],essential:[0,4,8]},
{id:'6',label:'6',symbol:'6',intervals:[0,4,7,9],essential:[0,4,9]},
{id:'m6',label:'Minor 6',symbol:'m6',intervals:[0,3,7,9],essential:[0,3,9]},
{id:'7',label:'Dominant 7',symbol:'7',intervals:[0,4,7,10],essential:[0,4,10]},
{id:'maj7',label:'Major 7',symbol:'maj7',intervals:[0,4,7,11],essential:[0,4,11]},
{id:'m7',label:'Minor 7',symbol:'m7',intervals:[0,3,7,10],essential:[0,3,10]},
{id:'dim7',label:'Diminished 7',symbol:'dim7',intervals:[0,3,6,9],essential:[0,3,6,9]},
{id:'m7b5',label:'Minor 7 ♭5',symbol:'m7♭5',intervals:[0,3,6,10],essential:[0,3,6,10]},
{id:'add9',label:'Add 9',symbol:'add9',intervals:[0,4,7,14],essential:[0,4,14]},
{id:'madd9',label:'Minor add 9',symbol:'m(add9)',intervals:[0,3,7,14],essential:[0,3,14]},
{id:'add11',label:'Add 11',symbol:'add11',intervals:[0,4,7,17],essential:[0,4,17]},
{id:'madd11',label:'Minor add 11',symbol:'m(add11)',intervals:[0,3,7,17],essential:[0,3,17]},
{id:'9',label:'Dominant 9',symbol:'9',intervals:[0,4,7,10,14],essential:[0,4,10,14]},
{id:'maj9',label:'Major 9',symbol:'maj9',intervals:[0,4,7,11,14],essential:[0,4,11,14]},
{id:'m9',label:'Minor 9',symbol:'m9',intervals:[0,3,7,10,14],essential:[0,3,10,14]},
{id:'11',label:'Dominant 11',symbol:'11',intervals:[0,4,7,10,14,17],essential:[0,4,10,17]},
{id:'m11',label:'Minor 11',symbol:'m11',intervals:[0,3,7,10,14,17],essential:[0,3,10,17]},
{id:'13',label:'Dominant 13',symbol:'13',intervals:[0,4,7,10,14,17,21],essential:[0,4,10,21]},
{id:'m13',label:'Minor 13',symbol:'m13',intervals:[0,3,7,10,14,17,21],essential:[0,3,10,21]},
{id:'69',label:'6 / 9',symbol:'6/9',intervals:[0,4,7,9,14],essential:[0,4,9,14]},
{id:'m69',label:'Minor 6 / 9',symbol:'m6/9',intervals:[0,3,7,9,14],essential:[0,3,9,14]},
{id:'7sus2',label:'7 Sus2',symbol:'7sus2',intervals:[0,2,7,10],essential:[0,2,10]},
{id:'7sus4',label:'7 Sus4',symbol:'7sus4',intervals:[0,5,7,10],essential:[0,5,10]},
{id:'7b5',label:'7 ♭5',symbol:'7♭5',intervals:[0,4,6,10],essential:[0,4,6,10]},
{id:'7s5',label:'7 ♯5',symbol:'7♯5',intervals:[0,4,8,10],essential:[0,4,8,10]},
{id:'7b9',label:'7 ♭9',symbol:'7♭9',intervals:[0,4,7,10,13],essential:[0,4,10,13]},
{id:'7s9',label:'7 ♯9',symbol:'7♯9',intervals:[0,4,7,10,15],essential:[0,4,10,15]},
{id:'maj7s11',label:'Major 7 ♯11',symbol:'maj7♯11',intervals:[0,4,7,11,18],essential:[0,4,11,18]},
{id:'mmaj7',label:'Minor major 7',symbol:'m(maj7)',intervals:[0,3,7,11],essential:[0,3,11]},
{id:'maj7b5',label:'Major 7 ♭5',symbol:'maj7♭5',intervals:[0,4,6,11],essential:[0,4,6,11]},
{id:'maj7s5',label:'Major 7 ♯5',symbol:'maj7♯5',intervals:[0,4,8,11],essential:[0,4,8,11]},
{id:'9sus4',label:'9 Sus4',symbol:'9sus4',intervals:[0,5,7,10,14],essential:[0,5,10,14]}
];
const qById=id=>QUALITIES.find(q=>q.id===id)||QUALITIES[0];
const pc=n=>((n%12)+12)%12;
const noteName=n=>NOTES[pc(n)];
const chordName=(root,quality)=>`${NOTES[root]}${qById(quality).symbol}`;
const chordLongName=(root,quality)=>`${NOTES[root]} ${qById(quality).label}`;
const clone=x=>JSON.parse(JSON.stringify(x));
