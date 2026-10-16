# StrumLab

StrumLab is a responsive virtual six-string guitar and large chord/voicing library for Windows and mobile/web.

## What v2 adds

- **Real guitar playback:** each string/fret is mapped to Meta Open Sound's Meta Steel Guitar CC0 recordings.
- **Three velocity layers:** soft, natural, and hard playing select different real recordings.
- **Physical string behavior:** a new note on a string damps the previous note on that same string.
- **Dynamic chords:** chords are not canned recordings; each string is triggered independently with humanized timing and dynamics.
- **Expressive strumming:** down/up strokes, pointer-speed dynamics, adjustable stroke spread, individual-string playing.
- **Arpeggios:** low-to-high, high-to-low, rolling, and folk pulse patterns with tempo control.
- **456 chord families:** 12 roots × 38 chord qualities, with up to 36 generated playable voicings per chord.
- Capo 0–8, custom voicings, note audition, 10 keyboard chord slots, named saved chord sets.
- Responsive desktop/mobile UI and installable PWA behavior.
- Synthesized fallback if a real sample has not loaded or the network is unavailable.

## Real sample source

StrumLab loads samples lazily from the public `facebookincubator/Meta-open-sound` repository. The **Meta Steel Guitar** samples are CC0 1.0 Universal. See `THIRD_PARTY_NOTICES.md`.

The sample library contains separately recorded physical strings and velocity layers, which lets StrumLab form arbitrary chords dynamically rather than shipping a limited set of pre-recorded chord clips.

## Windows

```bash
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags='-s -w' -o StrumLab.exe .
```

Running `StrumLab.exe` starts a localhost-only server on a free port, opens the interface in the default browser, and exits automatically after the browser stops sending heartbeats.

## Mobile / web

The `web/` directory is the installable PWA. `tools/build_dist.py` also generates `StrumLab-Mobile.html`, a self-contained HTML build for easy copying to a phone.

## Updates

The source-of-truth branch is `strumlab-app`. Pushes to that branch run `.github/workflows/strumlab-build.yml`, which builds fresh Windows/mobile/source archives as GitHub Actions artifacts. Tags named `strumlab-v*` also publish release archives.

`web/version.json` is checked by the app at startup so an older installed build can show when a newer version exists.

## Design / provenance

StrumLab uses familiar virtual-guitar interaction ideas (fretboard selection, chord slots, capo, strumming and arpeggios), but its code, interface and audio implementation are independent. It does **not** copy Recursive Arts source code, proprietary recordings, graphics or branding and is not affiliated with Recursive Arts.
