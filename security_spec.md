# GRANTLY — Firestore Zero-Trust Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths (`/{document=**}`) deny all `read` and `write` operations by default.
2. **Verified Identity**: All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **PII Isolation (`user_workspaces/{userId}`)**: Contains scholar email, income, and OTR metadata. Only the document owner (`request.auth.uid == userId`) or a verified Admin can `get`, `create`, or `update` this document. Blanket `list` is forbidden.
4. **Immutable Ownership & Timestamps**: `ownerId` / `authorId` and `createdAt` cannot be altered after creation. All `createdAt` and `updatedAt` fields must equal `request.time`.
5. **Terminal State Locking (`applications/{applicationId}`)**: Once an application reaches `'Disbursed'` or `'Rejected'`, non-admin users cannot update it.
6. **Strict Schema & Key Validation**: Every `create` and `update` must pass `isValid[Entity](incoming())` enforcing `hasAll`, `hasOnly`, string `.size()` bounds, and numeric bounds.

## 2. The "Dirty Dozen" Payloads (Adversarial Test Matrix)
1. **Unauthenticated Write**: Writing to `/user_workspaces/uid1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Writing with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Owner Spoofing on Create**: Creating `/applications/app-1` with `ownerId: 'victim-uid'` while authenticated as `'attacker-uid'` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: Creating `/scholarship_schemes/sch-1` with extra key `isFeatured: true` -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Shadow Field Injection on Update**: Updating `/user_workspaces/uid1` with an unapproved field `role: 'SUPER_ADMIN'` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(...)` check).
6. **Terminal State Re-opening**: Updating `/applications/app-1` when `existing().status == 'Disbursed'` as a non-admin -> `PERMISSION_DENIED`.
7. **ID Poisoning Attack**: Targeting document ID exceeding 128 chars or containing invalid characters -> `PERMISSION_DENIED` (`isValidId` check).
8. **String Overflow (Denial of Wallet)**: Submitting `inoRemark` with 5,000 characters (limit 400) -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Setting `createdAt` or `updatedAt` to a past/future timestamp instead of `request.time` -> `PERMISSION_DENIED`.
10. **PII Cross-User Read**: Authenticated user `'user-a'` attempting `get` on `/user_workspaces/user-b` -> `PERMISSION_DENIED`.
11. **Unscoped List Query Scraping**: Authenticated user running an unfiltered `list` on `/applications` without `where('ownerId', '==', request.auth.uid)` -> `PERMISSION_DENIED`.
12. **Immutable Field Mutation**: Updating `createdAt` or `ownerId` on an existing `/external_links/{linkId}` document -> `PERMISSION_DENIED`.
