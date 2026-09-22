# Security Specification: Creator Intelligence Pro

This document defines the security specification for the application's Firestore database, outlining data invariants, potential attack vectors (the "Dirty Dozen"), and the security test cases designed to verify our Attribute-Based Access Control (ABAC) and Zero-Trust architecture.

## 1. Data Invariants

- **Isolation**: No user can read, list, create, update, or delete bookmarks, history, or preferences belonging to another user.
- **Identity Integrity**: The user ID embedded in the document paths and payloads (`userId`) must match the authenticated user's ID (`request.auth.uid`).
- **Verified Sign-ins Only**: Standard database writes are only allowed for authenticated users with a verified email (`request.auth.token.email_verified == true`).
- **Strict Payload Structure**: All created documents must contain only permitted properties of valid types and lengths. No arbitrary "Ghost Fields" or "Shadow Fields" are allowed.
- **Path Hardening**: All document path variables must be verified as valid, restricted alphanumeric IDs of sane lengths (`<= 128` characters).

---

## 2. The "Dirty Dozen" Payloads (Attack Vectors)

Here are the 12 specific payloads or operations designed to attempt bypassing security boundaries:

1. **Identity Spoofing (Write)**: An authenticated user (`user_abc`) attempts to create a bookmark in another user's subcollection (`/users/user_xyz/bookmarks/b1`).
2. **Identity Spoofing (Read)**: An authenticated user (`user_abc`) attempts to read a bookmark belonging to `user_xyz`.
3. **Ghost Fields Injection**: Creating a bookmark with an unrequested field (e.g., `{ isVerifiedAdmin: true }`) to escalate privileges.
4. **Invalid DataType Poisoning**: Injecting an array into `title` or a number into `toolId` to break UI parsers.
5. **Denial of Wallet (ID Poisoning)**: Creating a bookmark with a massive, 1MB long junk ID to exhaust indexing resources.
6. **Email Verification Bypass**: A user with `email_verified == false` attempts to write/modify a bookmark.
7. **Unauthenticated Access**: A non-signed-in client attempts to query/list any user's bookmarks.
8. **Mutable Immutable Fields**: Attempting to update a bookmark's `userId` or `id` after creation.
9. **Blanket Query Scraping**: Attempting to list bookmarks without filtering by the authorized `userId` to scrape the collection.
10. **State Shortcutting / Key Pollution**: Injecting unwanted state keys during a preference update.
11. **Negative / Massive Timestamp**: Creating a history item with a negative timestamp or future date to break chronological ordering.
12. **Orphaned Writes**: Writing bookmarks under a malformed user ID path that is not valid.

---

## 3. Firestore Rules Structure & Validations

The accompanying `firestore.rules` will implement:
- Standalone validation helpers: `isValidId()`, `isSignedIn()`, `isVerifiedUser()`, `isValidBookmark()`, `isValidHistory()`, `isValidPreference()`.
- Use `affectedKeys().hasOnly()` on updates to enforce exact field updates.
- Path-variable verification using regular expressions.
