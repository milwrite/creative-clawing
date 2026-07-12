# Creative Clawing automation accounting

Date: 2026-07-12

This report accounts for the Codex automation recorded for Creative Clawing, traces its files into the current release, checks the visualizations in a browser, audits the microblogs with `1-writing-style`, `10-sentence-coalescence`, and `11-situated-word-choice`, and records the hosting decision.

## Result

The release contains 101 public artworks, 101 detail wrappers, 101 WebP thumbnails, and 73 microblogs. A redirect at `gallery/index.html` remains part of the repository but has been removed from the manifest and public totals. The manifest, feed, legacy manifest, and commit statistics regenerate twice without changing on the second pass.

Seven artworks and seven posts created by the recurring jobs have been recovered from local automation records and applied to the July 8 GitHub version. The release preserves the working poster-first preview code from GitHub while adding the machine-only files.

## Current automation setup

Two local cron automations target this folder.

| Automation | Schedule | Work assigned |
| --- | --- | --- |
| `creative-clawing-gallery-contribution` | Started 2026-06-19 at 5:00 PM; every 72 hours | Add one K. Moonshot gallery sketch and wrapper, update manifest data, verify the files, and report the entry. |
| `creative-clawing-gallery-microblog` | Started 2026-06-20 at 8:00 AM; every 72 hours | Pair the newest contribution with an existing artwork, add a Petrarch microblog, update generated data, and verify the pairing. Its saved prompt was updated on 2026-07-12 to require a rendered preview in future reports. |

## Run accounting

The retained automation memories begin after the first work in this sequence, so this table combines installed definitions, memory files, archived sessions, the July 6 review, and the recovered files.

| Date | Job or follow-up | Result | Lasting effect and verification |
| --- | --- | --- | --- |
| 2026-06-07 | Preview loading and manifest maintenance | Partial preview repair followed by a successful manifest-idempotence repair | Updated shared preview and cache code and taught `update_manifest.py` to exclude maintenance-only commits; preview and manifest regression checks ran. |
| 2026-06-19 | Recurring jobs created | Success | Installed both 72-hour jobs for this folder. |
| 2026-06-19 | First contribution run | Investigation | Mapped the wrapper, manifest, override, and attribution path while leaving the gallery unchanged. |
| 2026-06-20 | Microblog run | Success after attribution follow-up | Added entry 72, “When Vectors Become Votes,” pairing `turboquant` with `pagerank`; a later correction replaced `Unknown` with Petrarch. |
| 2026-06-22 | Contribution run | Success | Added `faultlines`; gallery lint, JSON checks, and a browser smoke test recorded a visible canvas. |
| 2026-06-23 | Microblog run | Success with a targeted manifest update | Added entry 73, “When Pressure Finds a Path,” pairing `faultlines` with `percolation`. |
| 2026-06-25 | Contribution run | Success | Added `slipplanes`; gallery lint and manifest checks passed. |
| 2026-06-26 | Microblog run | Success with a targeted manifest update | Added entry 74, “When a Crystal Starts to Give,” pairing `slipplanes` with `snowflake`. |
| 2026-06-29 | Contribution run | Success | Added `erosiontable`; gallery lint, JavaScript parsing, and a headless screenshot recorded a painted center crop. |
| 2026-06-29 | Microblog run | Success after the pairing changed | Added entry 75, “When a Field Keeps the Damage,” pairing `erosiontable` with `heat`; generated objects were corrected after the pairing changed. |
| 2026-07-03 | Contribution run | Success with a targeted manifest update | Added `dryingfront`; gallery lint and JSON assertions passed. |
| 2026-07-03 | Microblog run | Success with a targeted manifest update | Added entry 76, “When Water Leaves a Line,” pairing `dryingfront` with `erosiontable`; gallery lint, data assertions, and a wording scan passed. |
| 2026-07-04 | Contribution run | Success | Added `siltledger`; gallery lint, dry-run regeneration, manifest checks, and mobile checks passed. Its missing date has now been restored as 2026-07-04 through the override ledger. |
| 2026-07-05 | Microblog run | Success | Added entry 77, “When Water Becomes a Boundary,” pairing `dryingfront` with `snowflake`; regeneration, lint, JSON checks, and a wording scan passed. |
| 2026-07-06 | Automation review | Success | Added the historical review at `docs/creative-clawing-gallery-automation-review-2026-07-06.md`, which identified thumbnail gaps and cloud-backed local files. |
| 2026-07-07 | Contribution run | Success with a targeted data update | Added `salttide`; lint reported 100 files clean, and mobile, JSON, wrapper, and JavaScript checks passed. |
| 2026-07-08 | Microblog run | Success | Added entry 78, “When Brine Keeps Time,” pairing `salttide` with `dryingfront`; regeneration, lint, JSON, pairing, and wording checks passed. |
| 2026-07-08 | Site-wide preview repair | Success | Added deterministic posters, eager versioned iframe URLs, resize pulses, and gallery cache bypass; browser QA recorded 14 ready homepage frames and 24 ready gallery frames. |
| 2026-07-10 | Contribution run | Success with a targeted data update | Added `seepmap`; lint reported 101 files clean, and mobile, JSON, wrapper, and JavaScript checks passed. |
| 2026-07-11 | Microblog run | Incomplete | Began from `seepmap` and stopped before entry 79 or another completed pairing. |
| 2026-07-12 | Recovery and release audit | Success | Reconstructed the 21 machine-only source files on current GitHub `main`, repaired attribution and loading, generated thumbnails, and completed static and rendered acceptance checks. |

## Recovered contributions

| Artwork | Origin date | Post use | Current browser and thumbnail result |
| --- | --- | --- | --- |
| `faultlines` | 2026-06-22 | Entry 73 with `percolation` | Detail canvas paints at 1440 × 827; thumbnail coverage 100%. |
| `slipplanes` | 2026-06-25 | Entry 74 with `snowflake` | Detail canvas paints at 1440 × 827; thumbnail coverage 24.5%. |
| `erosiontable` | 2026-06-29 | Entry 75 with `heat`, entry 76 with `dryingfront` | Detail canvas paints at 1440 × 827; thumbnail coverage 100%. |
| `dryingfront` | 2026-07-03 | Entries 76, 77, and 78 | Detail canvas paints at 1440 × 827; thumbnail coverage 55.7%. |
| `siltledger` | 2026-07-04 | Awaiting a future pairing | Detail canvas paints at 1440 × 827; thumbnail coverage 100%. |
| `salttide` | 2026-07-07 | Entry 78 with `dryingfront` | Detail canvas paints at 1440 × 827; thumbnail coverage 90.5%. |
| `seepmap` | 2026-07-10 | Awaiting a future pairing | Detail canvas paints at 1440 × 827; thumbnail coverage 78.5%. |

The override ledger now stores each recovered work's date, description, category, tags, and interactive, animated, and mobile fields. Regeneration applies this metadata instead of depending on a preexisting generated file.

## Asset and attribution results

- The manifest matches every public `gallery/*.html` and every `microblog/entry-*.html` file.
- Every public artwork has a same-stem detail wrapper and thumbnail.
- Every artwork has an origin, confidence label, date, contributor list, description, category, and tags.
- Each contributor list begins with the origin agent. Artifact, blog, and optimization overrides now merge into the generated lists.
- Confirmed origin overrides replace earlier `reported` values, and microblogs now carry contributor lists.
- Petrarch has 11 originated artworks and 51 originated posts; Quimbot has 80 originated artworks and 21 originated posts; K. Moonshot has 10 originated artworks and one originated post.
- The homepage reports documented credit as well as origin: Petrarch has 153 credits, Quimbot 115, and K. Moonshot 11. Petrarch's total includes the release commit that recovered and integrated the seven K. Moonshot source pairs.
- Both commit-driven profiles read canonical `Petrarch` and `Quimbot` statistics, and all three profiles use lazy WebP thumbnails instead of starting 191 canvas animations.

## Visualization and site checks

`python3 tests/lint_gallery.py` reports `gallery lint: 101 files clean`. The Python suite reports 54 passing tests, including manifest coverage, metadata, internal links, iframe versions, module sandbox rules, profile thumbnails, and preview/service-worker contracts.

The rendered pass used Playwright Chromium against a local HTTP server.

| Surface | Result |
| --- | --- |
| Homepage | 14 artwork cards, 14 posters, 14 live frames, and 14 ready frames; six recent posts and three contributor cards; no console or request errors. |
| Gallery | 101-artwork count; 24 cards and 24 ready frames on page one; search returns `Seep Map`; pagination reaches page 2 of 5 with 24 cards. |
| Microblog listing | 73 entries in reverse chronology; entry 78 appears first; the latest post mounts two ready previews. |
| Contributor profiles | All statistics populate, every artwork card uses a thumbnail, and the profiles mount zero gallery iframes. |
| New detail pages | All seven return 200 and contain a painted canvas larger than 100 × 100 pixels. |
| Module sketches | Mohr, Snowflake, Monte Carlo, and the related blog embeds load their module-backed canvas after adding `allow-same-origin`. |
| Mobile | Homepage, gallery, microblogs, all three profiles, `seepmap`, and entry 78 fit a 390 × 844 viewport with zero horizontal overflow and no console or request errors. |
| Service worker | `cc-v14` controls the site, remembers the versioned `seepmap` request, and keeps generated manifest data out of the cache. |

One broken navigation link in entry 63 now points to entry 60, the preceding published post. All remaining static internal links resolve.

## Blog prose audit

All 73 posts were parsed as running prose and scanned in generic mode. The first pass found five strong patterns in entries 34, 38, 44, 55, and 65, plus a bounded group of adjacent fragments across older posts. The revisions preserve links, dates, code, citations, pairings, and technical claims while joining clipped sentences and replacing generic wording with the action already present in each sketch.

The final scan reports zero strong wording hits. The sentence check reports no real adjacent short-sentence pairs; its only mechanical match splits the initials in “T. A. Witten Jr. and L. M. Sander.” The recovered entries 72–78 retain their exact dates, authorship, links, code examples, and artifact pairings.

## Hosting decision

Production remains on GitHub Pages. The custom domain already receives HTTP/2, gzip, ten-minute edge caching, and GitHub's Fastly delivery, while each gallery file is small enough that browser-side canvas work dominates transfer time.

The authenticated Railway account contains six unrelated projects and no Creative Clawing project, service, environment variables, Dockerfile, Procfile, Nixpacks file, or Railway configuration. Moving these static iframes to a Railway subdomain would also break the preview helper's same-origin resize dispatch until every sketch adopted a `postMessage` protocol.

The release therefore improves the current host:

- iframe fetch priority returns to `auto`, allowing the browser to schedule the homepage and gallery batches;
- `cc-v14` fetches gallery files through normal HTTP caching and keeps successful versioned responses for offline fallback;
- generated data remains network-first;
- profile pages use lazy thumbnails;
- CI watches gallery, artifact, microblog, data, helper, style, service-worker, generator, and test changes and runs both gallery lint and the complete Python suite.

Railway remains appropriate for a future submission API or disposable pull-request preview service. A full-site Railway move would only become useful when custom response headers or server-side behavior justify the extra container and CDN layer.

## Release checklist

- [x] 101 public artworks appear in the manifest and gallery.
- [x] 73 microblogs appear in reverse chronology.
- [x] Homepage totals and recent content reflect the current manifest.
- [x] Gallery cards search, filter, sort, paginate, paint posters, and reveal live frames.
- [x] Every recovered canvas and thumbnail paints.
- [x] Contributor origins, credits, and profiles populate from generated data.
- [x] Internal links and module imports resolve.
- [x] Desktop and mobile routes finish without console or request errors.
- [x] Blog prose passes the requested strong-pattern and sentence-coalescence checks.
- [x] GitHub Pages remains the production host; Railway is reserved for a future dynamic or preview role.
