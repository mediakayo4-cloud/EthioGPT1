# EthioGPT Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: A `UserProfile` document at `/users/{userId}` contains PII (`email`). Only the authenticated, email-verified user whose `request.auth.uid == userId` may read, create, or update their own profile.
2. **Master Gate Consistency**: No `ChatSession` can be created unless the parent `UserProfile` exists at `/users/{userId}` (or in the same atomic batch), and no `ChatMessage` can be created unless its parent `ChatSession` exists at `/users/{userId}/chats/{chatId}`.
3. **Identity Integrity**: Every `uid` / `userId` field inside any document MUST strictly equal `request.auth.uid` and the `{userId}` path segment, and must remain immutable after creation.
4. **Temporal Integrity**: `createdAt` and `updatedAt` fields MUST equal `request.time` on creation, `createdAt` is immutable on updates, and `updatedAt` MUST equal `request.time` on updates.
5. **Bounded Volumetric Limits & Strict Keys**: Every write validates `keys().hasAll(...)` and `keys().hasOnly(...)` to block shadow fields; every string validates `.size()`; `attachmentNames` is bounded to `<= 5` items with first-element type validation.
6. **ID Poisoning Guard**: Every document ID path variable (`userId`, `chatId`, `messageId`) must pass `^[a-zA-Z0-9_\-]+$` and `.size() <= 128`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Profile Read**: Anonymous client attempts `GET /users/user123`.
2. **Cross-User Profile Read (PII Leak)**: User B (`uid: userB`) attempts `GET /users/userA`.
3. **Unverified Email Write**: User with `email_verified: false` attempts `CREATE /users/userA`.
4. **Shadow Field Injection on Profile**: Verified User A sends `{ uid: "userA", ..., isAdmin: true }` to `CREATE /users/userA`.
5. **Role/UID Spoofing on Chat Create**: Verified User A sends `userId: "userB"` to `CREATE /users/userA/chats/chat1`.
6. **Client-Forged Timestamp**: Verified User A sends a past `createdAt` timestamp instead of `serverTimestamp()` to `CREATE /users/userA/chats/chat1`.
7. **Orphaned Message Write**: Verified User A attempts `CREATE /users/userA/chats/nonexistentChat/messages/msg1`.
8. **ID Poisoning**: Verified User A attempts `CREATE /users/userA/chats/bad..slash$id`.
9. **Immutable Field Tampering**: Verified User A attempts to mutate `createdAt` or `userId` during `UPDATE /users/userA/chats/chat1`.
10. **Invalid Enum Language Value**: Verified User A sends `language: "xx"` on `CREATE /users/userA/chats/chat1`.
11. **Unbounded Array Abuse**: Verified User A sends 20 items in `attachmentNames` on `CREATE /users/userA/chats/chat1/messages/msg1`.
12. **Blanket Collection Scrape**: User B attempts `LIST /users/userA/chats` to enumerate User A's conversations.
