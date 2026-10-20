# Superseded-brief checkpoint

The brief received later on 20 Oct 2026 changes the account journey, payment split and phase order. The earlier work is preserved on `feature/catalogue-application-payments`; it is not merged into production.

Catalogue milestone commits: frontend `50e10d9`, backend `e53d8d5`.

The later working checkpoint includes encrypted guest drafts, the seven-step application prototype, scanned private uploads, policy settings, payment-account step-up checks, proof review and an atomic settlement callback. Its old guest-link entry and combined application/exam/accommodation invoice do **not** match the new free verified-applicant-account journey and separate invoices. They must be adapted, not released as the new system.

Checks completed before the new phase boundary: both builds; responsive catalogue/application fixture checks; existing frontend authentication/workspace/deployment checks; isolated backend checks; full temporary MongoDB integration suite (24 passed, including concurrent transfer verification and rollback of reused evidence). The subsequent account-instruction refresh/history addition was built but has not received equivalent integration coverage.

This checkpoint is implementation material for later phases. It is not a completed production release, and no production data, accounts, fees or bank settings were changed. The unrelated untracked public-media Worker files were preserved.
