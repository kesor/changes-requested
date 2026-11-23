# Changes Requested

An accessibility code review for any website, styled like a pull-request review. Give it a URL; it opens the page in a real browser, runs automated accessibility checks, and then walks you through each problem on a screenshot of the page: a spotlight on the element, a reviewer comment in plain language, what a screen reader would say there, and a suggested change as a diff. Built at the Fable 5.2 Build Day in Tel Aviv with Claude Code on Fable 5.2. Topic: **Accessibility**. Lane: **Fun**. The fun part is that the pages under review are sites everyone in the room uses every day, and the reviewer does not approve any of them.

The prompts used are in [PROMPT.md](PROMPT.md), verbatim.

## Run it

```sh
npm install
node server.mjs          # http://localhost:4173, with a box to review any URL live
```

Or without the server:

```sh
node capture.mjs https://example.com   # one or more URLs
# then open index.html directly from disk
```

`index.html` opened from disk shows the captures already saved under `captures/` (an Amazon product page, dailymail.co.uk, rakuten.co.jp, buzzfeed.com, drudgereport.com, ynet.co.il, mako.co.il, Hacker News, booking.com, and wikipedia.org as the clean example). Reviewing a new URL from the page needs the server.

## Controls

| Action | Key |
|---|---|
| Next finding | →, n, Space, Enter or Page Down (presenter clicker) |
| Previous finding (from the summary: back to the prompt page) | ←, p, Backspace or Page Up |
| Summary / verdict | Home / End |
| Play tour (autoplay the whole review, about 60 seconds) | t; Esc stops it |
| Prompt page | Shift+P, or the Prompt button |
| Jump to a finding | click a pin on the page, or a tile on the summary |
| See it as: blurred vision, cataract, red-green colour blind, no colour | lens buttons |
| Keyboard tab-path overlay | tab-path button |
| Copy this review as Markdown | button in the review panel |
| Review another site | type a URL in the box (server only) |

## How it works

- `capture.mjs` drives the installed Chromium-family browser (Brave here) through puppeteer-core. It keeps one long-lived window with its own profile in `.browser-profile` on remote-debugging port 9333, so captures after the first one are quick.
- For each URL it scrolls the page to trigger lazy content, runs axe-core, and saves a full-page screenshot plus every violation with its pixel position. All captures are indexed in `captures/all.js`.
- `index.html` is a single file with no libraries. For each finding it shows the spotlight and reviewer comment, the screen-reader line (typed out and spoken), contrast before/after swatches with a computed fixed colour, the tap target at actual size next to a fingertip, and a GitHub-style suggested-change diff.
- `server.mjs` serves the viewer on localhost:4173 and exposes `/api/capture?url=…`, which the URL box calls to review a site live. One capture runs at a time.

## Limits

- Automated checks only catch a portion of real accessibility problems. A page with no findings here is not shown to be accessible; it still needs testing by people, with a keyboard and with assistive technology.
- The screen-reader lines are an approximation of what a screen reader announces, not a recording of one. Real screen readers differ from each other and from this.
- Sites behind CAPTCHAs or logins are not captured. You get a review of whatever page the browser was actually served.
- It needs a Chromium-family browser on PATH (`brave`, `chromium`, `google-chrome-stable` or `google-chrome`), or the path in `BROWSER_BIN`.
- The vision lenses are simple filters, meant to give an impression, not to simulate a specific condition accurately.
- The findings are positioned on a screenshot taken at one desktop width. Mobile layouts are not reviewed.

## 2-minute demo script

| Time | What |
|---|---|
| 0:00 – 0:15 | Open http://localhost:4173. It starts on the prompt page. Say: topic is accessibility, lane is Fun, this is the prompt. |
| 0:15 – 1:15 | Press `t`. The tour runs the whole review by itself in about 60 seconds. Talk over it. |
| 1:15 – 2:00 | Optional, if time is left: ask the audience for a site, type it into the box, and show the live review. |

If the live capture is slow or the site blocks it, stop there; the captured sites already show everything.
