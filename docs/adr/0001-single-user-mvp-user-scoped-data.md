---
status: superseded by ADR-0003
---

# Single-user MVP, but data model scoped by user from day one

The app starts as a personal project with no login/signup, but the owner wants it usable by other people eventually. We decided to build the MVP without auth UI, but to scope every game/collection record by a `user_id` from the start rather than assuming a single global library. Rejected alternative: build truly single-tenant (no `user_id` at all) and retrofit multi-tenancy later — rejected because migrating a schema and every query from "one global library" to "per-user library" after the fact is a much bigger rewrite than just carrying an unused-for-now `user_id` column from the beginning.
