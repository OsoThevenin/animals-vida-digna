---
phase: 2
slug: public-pages-cats-directory
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | LAND-01 | unit | `pnpm vitest run tests/landing.test.ts -t "LAND-01"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | LAND-02 | smoke | Manual -- visual check per locale | N/A | ⬜ pending |
| 02-01-03 | 01 | 1 | LAND-03 | smoke | Manual -- visual check per locale | N/A | ⬜ pending |
| 02-01-04 | 01 | 1 | LAND-04 | smoke | Manual -- visual check per locale | N/A | ⬜ pending |
| 02-01-05 | 01 | 1 | LAND-05 | smoke | Manual -- visual check per locale | N/A | ⬜ pending |
| 02-01-06 | 01 | 1 | LAND-06 | smoke | Manual -- visual check per locale | N/A | ⬜ pending |
| 02-01-07 | 01 | 1 | LAND-07 | smoke | Manual -- visual check per locale | N/A | ⬜ pending |
| 02-02-01 | 02 | 2 | CATS-01 | unit | `pnpm vitest run tests/cats-filter.test.ts -t "CATS-01"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | CATS-02 | smoke | Manual -- verify HTML contains cat cards | N/A | ⬜ pending |
| 02-02-03 | 02 | 2 | CATS-03 | unit | `pnpm vitest run tests/cats-routes.test.ts -t "CATS-03"` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 2 | CATS-04 | smoke | Manual -- verify ARIA and keyboard nav | N/A | ⬜ pending |
| 02-02-05 | 02 | 2 | CATS-05 | unit | `pnpm vitest run tests/cats-filter.test.ts -t "CATS-05"` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | DONA-01 | unit | `pnpm vitest run tests/donate.test.ts -t "DONA-01"` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | DONA-02 | unit | `pnpm vitest run tests/donate.test.ts -t "DONA-02"` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | DONA-03 | smoke | Manual -- scroll test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/cats-filter.test.ts` — stubs for CATS-01, CATS-05 (filter logic unit tests)
- [ ] `tests/cats-routes.test.ts` — stubs for CATS-03 (slug mapping logic)
- [ ] `tests/landing.test.ts` — stubs for LAND-01 (section ordering from blocks)
- [ ] `tests/donate.test.ts` — stubs for DONA-01, DONA-02 (settings reading)
- [ ] `tests/markdoc.test.ts` — markdoc rendering helper
- [ ] Install `@markdoc/markdoc`: `pnpm add @markdoc/markdoc`
- [ ] Install `@midzer/tobii`: `pnpm add @midzer/tobii`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Landing sections render correct locale content | LAND-02 to LAND-07 | Visual rendering check per locale | Open / and /es, verify each section displays correct language content |
| Cats listing HTML is crawlable | CATS-02 | Need to inspect server-rendered HTML | View page source, verify cat cards present in raw HTML |
| Gallery lightbox accessible | CATS-04 | ARIA + keyboard interaction | Open cat detail, click gallery image, verify Tab/Escape/Arrow keys work |
| Sticky CTA appears on scroll | DONA-03 | Scroll interaction | Open any page, scroll past hero, verify donate CTA appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
