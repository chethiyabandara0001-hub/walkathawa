# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Admin-Only Post Mutation**: Only the verified administrator (`chethiyabandara0001@gmail.com` with `email_verified == true` or a registered `/admins/{uid}` document) can create, update, or delete documents in `/posts/{postId}`.
2. **Strict Schema & Volumetric Bounds**: Every `Post` document must strictly contain only the declared keys (`title`, `slug`, `excerpt`, `content`, `category`, `collection`, `coverImage`, `images`, `authorEmail`, `createdAt`, `updatedAt`) with bounded string and array sizes.
3. **Immutable Creation Metadata**: `createdAt` and `authorEmail` on `/posts/{postId}` are set at creation (`createdAt == request.time`) and cannot be altered during updates.
4. **Relational Integrity for Comments**: A `Comment` in `/posts/{postId}/comments/{commentId}` can only be created if the parent `/posts/{postId}` document exists (`exists()`), `incoming().postId == postId`, and `incoming().createdAt == request.time`.
5. **Comment Immutability**: Once posted, comments cannot be modified by readers; only the verified admin can delete comments.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Admin Email Spoof**: Attempting to create a post where `request.auth.token.email == 'chethiyabandara0001@gmail.com'` but `request.auth.token.email_verified == false`.
2. **Non-Admin Post Creation**: Authenticated user with email `intruder@example.com` attempting to create `/posts/post-1`.
3. **Shadow Field Injection on Post Create**: Admin payload containing an undeclared field `isFeatured: true`.
4. **Post Update Bypassing `isValidPost`**: Updating `title` to a 5,000-character string or integer `12345`.
5. **Post Immutable Field Tampering**: Updating `createdAt` or `authorEmail` on an existing `/posts/{postId}` document.
6. **Client Timestamp Forgery on Post**: Creating a post with a past or future client-supplied `createdAt` (`createdAt != request.time`).
7. **Unbounded Images Array**: Creating or updating a post with `images` array containing 25 items (`images.size() > 10`).
8. **ID Poisoning**: Creating a post or comment with a 500-character document ID or invalid characters (`post/../../hack`).
9. **Orphaned Comment Creation**: Creating a comment under `/posts/non_existent_post/comments/c1` where `/posts/non_existent_post` does not exist.
10. **Cross-Post Comment Spoofing**: Creating `/posts/post-a/comments/c1` where `payload.postId == 'post-b'`.
11. **Unauthorized Comment Deletion**: A non-admin user attempting to delete `/posts/post-a/comments/c1`.
12. **Privilege Escalation via `/admins/{uid}`**: A user attempting to write their own UID into `/admins/{uid}`.
