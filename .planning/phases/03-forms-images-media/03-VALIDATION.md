---
phase: 3
slug: forms-images-media
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
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
| 03-01-01 | 01 | 1 | FORM-01 | unit | `pnpm vitest run tests/contact-api.test.ts -t "contact"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | FORM-02 | unit | `pnpm vitest run tests/adopt-api.test.ts -t "adopt"` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | FORM-03 | unit | `pnpm vitest run tests/form-validation.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | FORM-04 | unit | `pnpm vitest run tests/contact-api.test.ts -t "rate"` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | FORM-05 | unit | `pnpm vitest run tests/form-validation.test.ts -t "locale"` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 1 | FORM-06 | unit | `pnpm vitest run tests/email-templates.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | IMG-01 | manual-only | Manual — requires R2 credentials | N/A | ⬜ pending |
| 03-02-02 | 02 | 1 | IMG-02 | manual-only | Manual — requires R2 credentials | N/A | ⬜ pending |
| 03-02-03 | 02 | 1 | IMG-03 | unit | `pnpm vitest run tests/optimized-image.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | IMG-04 | manual-only | Manual — verify in Cloudflare dashboard | N/A | ⬜ pending |
| 03-02-05 | 02 | 1 | IMG-05 | unit | `pnpm vitest run tests/optimized-image.test.ts -t "lazy"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/form-validation.test.ts` — stubs for FORM-03, FORM-05 (pure validation logic, locale messages)
- [ ] `tests/email-templates.test.ts` — stubs for FORM-06 (template rendering CA/ES)
- [ ] `tests/contact-api.test.ts` — stubs for FORM-01, FORM-04 (endpoint logic with mocked Resend, rate limiting)
- [ ] `tests/adopt-api.test.ts` — stubs for FORM-02 (adoption endpoint, cat pre-fill)
- [ ] `tests/optimized-image.test.ts` — stubs for IMG-03, IMG-05 (URL generation, lazy loading attributes)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Images stored in R2 | IMG-01 | Requires R2 credentials and Cloudflare account | Run `npm run sync-images`, verify in Cloudflare dashboard |
| CMS images synced to R2 | IMG-02 | Requires R2 credentials | Upload via Keystatic, run sync, check R2 bucket |
| Cache headers on R2 objects | IMG-04 | Requires deployed environment | Check response headers via curl or Cloudflare dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
