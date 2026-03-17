---
phase: 1
slug: foundation-cms-i18n
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.x |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm build`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | smoke | `pnpm build` | N/A - build | ⬜ pending |
| 01-01-02 | 01 | 1 | FOUND-02 | unit | `vitest run tests/theme.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | FOUND-04 | unit | `vitest run tests/config.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | CMS-01 | unit | `vitest run tests/schemas.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | CMS-02 | unit | `vitest run tests/schemas.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | CMS-03 | unit | `vitest run tests/schemas.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | CMS-04 | unit | `vitest run tests/schemas.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-02-05 | 02 | 1 | CMS-05 | unit | `vitest run tests/schemas.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | I18N-01 | integration | `vitest run tests/i18n.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | I18N-02 | integration | `vitest run tests/i18n.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-03-03 | 03 | 2 | I18N-03 | unit | `vitest run tests/i18n.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-03-04 | 03 | 2 | I18N-04 | unit | `vitest run tests/i18n.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-03-05 | 03 | 2 | I18N-05 | integration | `vitest run tests/i18n.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | FOUND-03 | manual-only | Manual: start dev, visit /keystatic | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install Vitest ^3.x as dev dependency
- [ ] `tests/theme.test.ts` — stubs for FOUND-02 (brand colors in theme)
- [ ] `tests/config.test.ts` — stubs for FOUND-04 (R2 binding in wrangler.toml)
- [ ] `tests/schemas.test.ts` — stubs for CMS-01..05 (Keystatic schema validation)
- [ ] `tests/i18n.test.ts` — stubs for I18N-01..05 (routing and locale behavior)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keystatic admin accessible in dev | FOUND-03 | Requires browser + running dev server | 1. Run `pnpm dev` 2. Navigate to `/keystatic` 3. Verify admin UI loads 4. Create a test cat entry 5. Verify it persists in git |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
