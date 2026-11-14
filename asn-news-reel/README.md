# asn-news-reel

A standalone `<asn-news-reel>` web component for atlantasoccer.news: an animated reel of the site's latest posts with narration.

## Files

- `asn-news-reel.js` — the component. No dependencies, no build step.
- `generate-narration.mjs` — Node 18+ script that pre-renders one narration MP3 per post through ElevenLabs.

## Embed

```html
<script src="asn-news-reel.js" defer></script>
<asn-news-reel count="8" audio-base="/wp-content/uploads/reel/"></asn-news-reel>
```

| Attribute | Default | Meaning |
|---|---|---|
| `feed` | `https://atlantasoccer.news/wp-json/wp/v2/posts` | WordPress posts endpoint |
| `count` | `8` | Number of stories |
| `audio-base` | none | Folder holding narration files named `{post id}.mp3` |
| `seconds` | `7` | Seconds per story while muted |
| `voice` | none | Preferred built-in browser voice for the fallback |

The reel starts muted. With narration on, it plays `{audio-base}/{post id}.mp3` and advances when the audio ends. If a file is missing it falls back to the browser's built-in voice.

## Narration audio

```sh
ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node generate-narration.mjs reel 8
```

Writes `reel/{post id}.mp3`, skipping posts that already have a file. Upload the folder to the path used in `audio-base`. Keys come from environment variables only; never commit them.

## Status

Tested in headless Chrome against a mocked feed (rendering, auto-advance, pause, MP3 playback path). Not yet installed on atlantasoccer.news, and no narration audio has been generated. The built-in-voice fallback has not been tested in a real browser.
