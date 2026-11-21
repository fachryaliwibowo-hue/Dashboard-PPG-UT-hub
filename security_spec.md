# Security Specification — PPG UT Participant Data Dashboard

## 1. Data Invariants
1. **Default Deny**: All unmatched Firestore paths are denied by default (`match /{document=**} { allow read, write: if false; }`).
2. **Admin Authorization**: Only verified Google users whose email matches the bootstrapped primary admin (`fachryaliwibowo@gmail.com` with `email_verified == true`) or exists in `/admins/{safeEmail}` (with `email_verified == true`) may write to `/datasets`, `/datasets/active/chunks`, `/locations`, or `/admins`.
3. **Public Read-Only Dashboard Access**: Any user across any device may read published dashboard metadata (`/datasets/active`), published chunks (`/datasets/active/chunks/{chunkId}`), and published lecture locations (`/locations/{locationId}`) ONLY when `isPublic == true`.
4. **No Self-Assigned Roles**: Unauthenticated or non-admin users cannot create or modify `/admins/{adminId}`.
5. **Identity & Temporal Integrity**: All write operations must supply `request.auth.uid` in `uploadedByUid` / `updatedByUid` / `addedByUid` and `request.time` in `updatedAt` / `createdAt`.
6. **Strict Keys & Size Boundaries**: Every write validates exact required and allowed field keys (`hasAll` + `hasOnly`), exact data types, bounded string lengths, and bounded array lengths.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Unauthenticated write to `/datasets/active` -> `PERMISSION_DENIED`.
2. Non-admin authenticated user writing to `/locations/loc_1` -> `PERMISSION_DENIED`.
3. Spoofed email with `email_verified == false` attempting admin write -> `PERMISSION_DENIED`.
4. Non-admin creating `/admins/attacker_gmail_com` (privilege escalation) -> `PERMISSION_DENIED`.
5. Admin payload with shadow field (`isSuperAdmin: true`) on `/locations/loc_1` -> `PERMISSION_DENIED`.
6. Admin payload with invalid document ID (`../../etc/passwd` or >128 chars) -> `PERMISSION_DENIED`.
7. Admin payload with empty `namaLokasi` (`""`) or oversized `alamatLengkap` (>1000 chars) -> `PERMISSION_DENIED`.
8. Admin payload forging `updatedByUid` to another UID -> `PERMISSION_DENIED`.
9. Admin payload forging `updatedAt` to a client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
10. Admin chunk payload exceeding 400 rows in `rows` array -> `PERMISSION_DENIED`.
11. Unauthenticated `list` on `/admins` -> `PERMISSION_DENIED`.
12. Unauthenticated `list` on `/locations` without `isPublic == true` filter -> `PERMISSION_DENIED`.
