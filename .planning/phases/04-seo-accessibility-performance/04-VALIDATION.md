---
phase: 4
slug: seo-accessibility-performance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test` + manual Lighthouse on landing page
- **Before `/gsd:verify-work`:** Full Lighthouse audit on all page types in both locales
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | SEO-01, SEO-02, SEO-03, A11Y-04 | unit | `pnpm vitest run tests/seo-meta.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | SEO-06 | unit | `pnpm vitest run tests/json-ld.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 0 | A11Y-01 | unit | `pnpm vitest run tests/a11y-contrast.test.ts` | ❌ W0 | ⬜ pending |
| 4-SEO-01 | 01 | 1 | SEO-01 | unit | `pnpm vitest run tests/seo-meta.test.ts -t "canonical"` | ❌ W0 | ⬜ pending |
| 4-SEO-02 | 01 | 1 | SEO-02 | unit | `pnpm vitest run tests/seo-meta.test.ts -t "og"` | ❌ W0 | ⬜ pending |
| 4-SEO-03 | 01 | 1 | SEO-03 | unit | `pnpm vitest run tests/seo-meta.test.ts -t "hreflang"` | ❌ W0 | ⬜ pending |
| 4-SEO-04 | 01 | 1 | SEO-04 | manual | Build and inspect `dist/sitemap-*.xml` | N/A | ⬜ pending |
| 4-SEO-05 | 01 | 1 | SEO-05 | manual | Build and inspect `dist/robots.txt` | N/A | ⬜ pending |
| 4-SEO-06 | 01 | 1 | SEO-06 | unit | `pnpm vitest run tests/json-ld.test.ts` | ❌ W0 | ⬜ pending |
| 4-A11Y-01 | 02 | 1 | A11Y-01 | unit | `pnpm vitest run tests/a11y-contrast.test.ts` | ❌ W0 | ⬜ pending |
| 4-A11Y-02 | 02 | 1 | A11Y-02 | manual | Keyboard navigation in browser | N/A | ⬜ pending |
| 4-A11Y-03 | 02 | 1 | A11Y-03 | manual | Tab through all pages in browser | N/A | ⬜ pending |
| 4-A11Y-04 | 02 | 1 | A11Y-04 | unit | `pnpm vitest run tests/seo-meta.test.ts -t "alt"` | ❌ W0 | ⬜ pending |
| 4-A11Y-05 | 02 | 1 | A11Y-05 | manual | Toggle prefers-reduced-motion in DevTools | N/A | ⬜ pending |
| 4-PERF-01 | 02 | 2 | PERF-01 | manual | Chrome DevTools Lighthouse audit | N/A | ⬜ pending |
| 4-PERF-02 | 02 | 2 | PERF-02 | manual | Chrome DevTools Lighthouse audit | N/A | ⬜ pending |
| 4-PERF-03 | 02 | 2 | PERF-03 | manual | Chrome DevTools Lighthouse audit | N/A | ⬜ pending |
| 4-PERF-04 | 02 | 2 | PERF-04 | manual | Chrome DevTools Lighthouse audit | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/seo-meta.test.ts` — stubs for SEO-01, SEO-02, SEO-03, A11Y-04 (pure function tests for URL/meta construction)
- [ ] `tests/json-ld.test.ts` — stubs for SEO-06 (JSON-LD object construction)
- [ ] `tests/a11y-contrast.test.ts` — stubs for A11Y-01 (programmatic contrast ratio verification)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sitemap with hreflang alternates | SEO-04 | Requires full build; output is XML file | `pnpm build && cat dist/sitemap-*.xml` — verify xhtml:link alternates for /ca/ and /es/ |
| robots.txt generated correctly | SEO-05 | Requires full build; output is text file | `pnpm build && cat dist/robots.txt` — verify Sitemap: line present |
| Focus-visible styles applied | A11Y-02 | Requires visual browser inspection | Tab through landing, cats list, cat detail, adoption form — verify visible focus ring on all interactive elements |
| Keyboard navigation and skip-to-content | A11Y-03 | Requires browser interaction | Tab from skip-link through all modals and gallery; verify Escape closes lightbox |
| Reduced motion support | A11Y-05 | Requires OS/DevTools preference toggle | Enable prefers-reduced-motion in Chrome DevTools → verify transitions/animations stop |
| Lighthouse Performance >= 95 | PERF-01 | Requires full build and browser audit | `pnpm build && pnpm preview` → Chrome Lighthouse on landing page (mobile) in /ca/ and /es/ |
| Lighthouse Accessibility >= 95 | PERF-02 | Requires browser audit | Same as PERF-01 |
| Lighthouse Best Practices >= 95 | PERF-03 | Requires browser audit | Same as PERF-01 |
| Lighthouse SEO >= 95 | PERF-04 | Requires browser audit | Same as PERF-01 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
