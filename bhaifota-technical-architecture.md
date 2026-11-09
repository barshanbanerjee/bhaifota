# Bhaifota --- Revised Technical Architecture

**Architecture status:** Proposed\
**Product model:** Private, two-person, real-time Bhaifota experience\
**Core principle:** A shared virtual gathering with manual, freeform
ritual interactions --- not a guided ceremony.

------------------------------------------------------------------------

## 1. Product understanding

The application connects exactly two siblings:

-   One participant joins as **Bhai / Dada**.
-   One participant joins as **Bon / Didi**.
-   The room is private and bound to the two participants' verified
    email addresses.
-   They communicate through live audio/video.
-   They can manually drag and offer virtual ritual objects.
-   Each accepted interaction is synchronized to both screens.
-   There is no mandatory ritual sequence.
-   If either participant explicitly restarts the experience, the shared
    ritual state is cleared and they begin again.
-   Room and interaction data are temporary.

The application is not intended to replace the emotional or physical
meaning of Bhaifota. It provides a way for siblings who cannot be
together physically to share a meaningful moment.

## 2. Final technology stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                Next.js + TypeScript    Application UI and
                                                  interactions

  UI styling              Tailwind CSS            Responsive interface

  Animation               Framer Motion           Drag/drop and ritual
                                                  animations

  Client state            Zustand                 Local representation of
                                                  room state

  API                     NestJS                  Authentication, rooms
                                                  and authorization

  Database                PostgreSQL + Prisma     Persistent account and
                                                  temporary room records

  Cache                   Redis                   Presence, rate limits
                                                  and ephemeral
                                                  coordination

  Video/audio             LiveKit Cloud           WebRTC media

  Realtime application    Socket.IO               Ritual interaction and
  events                                          room-state
                                                  synchronization

  Email                   Transactional email     Private sibling
                          provider                invitations

  Monitoring              Sentry + OpenTelemetry  Errors and performance
  -----------------------------------------------------------------------

LiveKit handles media. NestJS owns room authorization and application
business logic. Socket.IO carries application events.

## 3. User journey

### Room creator

1.  Sign in with Google.
2.  Choose Brother or Sister.
3.  Enter the sibling's email address.
4.  Create a private room.
5.  The backend creates a room and a single-use invitation.
6.  The invitation is emailed to the sibling.
7.  The creator waits in the room.

### Invited sibling

1.  Open the invitation link.
2.  Sign in with Google.
3.  Backend verifies the authenticated, verified email against the
    invited email.
4.  Backend verifies that the invitation is valid, unused and unexpired.
5.  The sibling joins with the role reserved by the invitation.

### Shared experience

1.  Both participants enter a waiting area.
2.  They check camera and microphone permissions.
3.  Both join the LiveKit media room.
4.  The application marks the room active when both participants are
    ready.
5.  They interact freely using the ritual tray.
6.  Either participant can leave or restart, subject to the room rules.
7.  When the session ends or expires, temporary room data is deleted.

Ask for camera and microphone permission in context, in the waiting
room. Do not request these permissions immediately after Google login.

## 4. Private invitation and room access

Email-based invitations should be the primary access mechanism. A
six-character room code may be retained as a human-friendly room
reference, but it must never grant access by itself.

### Invitation flow

``` text
Creator signs in with Google
        |
Chooses own role
        |
Enters sibling's email
        |
POST /rooms
        |
Backend creates room and invitation
        |
Email provider sends invitation link
        |
Sibling opens invitation
        |
Sibling signs in with Google
        |
Backend verifies Google email and invitation
        |
Sibling joins reserved room and role
```

### Invitation security requirements

-   Verify Google's ID token on the backend.
-   Require Google's `email_verified` claim to be true.
-   Normalize email addresses before comparison.
-   Bind the invitation to the intended email and reserved role.
-   Generate a cryptographically random invitation token.
-   Store only a hash of the invitation token.
-   Make invitation tokens single-use.
-   Give invitations a short expiry, for example 24 hours.
-   Rate-limit invitation creation and redemption.
-   Do not expose whether arbitrary email addresses have accounts.
-   Do not allow room codes to bypass invitation authorization.
-   Do not put long-lived credentials in invitation URLs.
-   After successful redemption, issue the normal authenticated
    application session.

The creator's email must not equal the invited sibling's email. The same
user must not occupy both participant slots.

If the invitation is forwarded, another Google account must still be
rejected.

### Room code

A six-character code can remain useful for displaying or identifying a
room. Use a 32-character alphabet that excludes ambiguous characters:

``` ts
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
```

Use cryptographically secure random bytes. Since this alphabet has 32
characters, each byte maps evenly using modulo 32. Enforce uniqueness
with a PostgreSQL unique constraint and retry on collision.

The code is an identifier, not a secret or authorization credential.

## 5. Room and session lifecycle

Use a simple lifecycle. Do not model the interaction as a guided
ceremony with ordered steps.

``` text
WAITING
   |
   | invited sibling joins
   v
CONNECTED
   |
   | both media connections ready
   v
ACTIVE
   |
   | either participant ends the session
   v
COMPLETED

WAITING / CONNECTED / ACTIVE
   |
   | expiry or unrecoverable termination
   v
EXPIRED
```

A temporary network interruption should not immediately terminate the
room. Keep the room state and allow a reconnection window.

### Restart semantics

Restart is different from reconnect:

-   **Reconnect:** Restore the current active room and its latest
    interaction state.
-   **Restart:** Clear all ritual interaction state and begin a fresh
    interaction session.
-   **Leave/end:** End the room according to the product's end-session
    policy.
-   **Expiry:** End the room and schedule deletion of temporary data.

For the initial release, make Restart a clearly labelled action with a
confirmation dialog. It should notify the other participant and reset
the shared ritual state atomically.

A restart should not create a new room or new invitation. It resets the
interaction session within the existing authorized room, provided the
room is still valid.

If either participant can restart unilaterally, communicate this clearly
to the other participant. Alternatively, require both participants to
confirm. This is a product decision; the recommended safer default is
mutual confirmation.

## 6. Ritual interaction model

There is no predefined sequence, step number, or mandatory order. The
ritual tray exposes the objects permitted for the current participant.

  Object       Sister                 Brother
  ------------ ---------------------- ----------------------
  Chandan      Can apply to brother   Can receive
  Misti        Can offer or receive   Can offer or receive
  Dhan-Durba   Can offer or receive   Can offer or receive

The backend must enforce these permissions. Hiding an object in the UI
is not authorization.

The exact semantics of each object should be represented in a central
permission policy, not scattered across components.

Example:

``` ts
type Role = 'BROTHER' | 'SISTER';
type RitualObject = 'CHANDAN' | 'MISTI' | 'DHAN_DURBA';
type RitualAction = 'APPLY' | 'OFFER' | 'RECEIVE';

const permissions = {
  BROTHER: {
    CHANDAN: ['RECEIVE'],
    MISTI: ['OFFER', 'RECEIVE'],
    DHAN_DURBA: ['OFFER', 'RECEIVE'],
  },
  SISTER: {
    CHANDAN: ['APPLY'],
    MISTI: ['OFFER', 'RECEIVE'],
    DHAN_DURBA: ['OFFER', 'RECEIVE'],
  },
} satisfies Record<Role, Record<RitualObject, RitualAction[]>>;
```

Adjust these permissions to match the final product's cultural
interaction design. The server remains authoritative.

## 7. Drag-and-drop and synchronized rendering

The browser handles pointer movement locally. Do not broadcast every
pointer movement.

When the user drops an object:

1.  Frontend checks that the drop target is valid.
2.  Frontend converts the position to normalized coordinates.
3.  Frontend submits one interaction event.
4.  NestJS authenticates and authorizes the event.
5.  The server validates room status, participant role, object
    permission and target.
6.  The server persists or records the accepted event in the temporary
    session state.
7.  The server broadcasts the accepted event to both participants.
8.  Both clients render the same interaction.

Use normalized coordinates so the action works across different screen
sizes:

``` ts
const normalized = {
  x: pointerX / videoElementWidth,
  y: pointerY / videoElementHeight,
};
```

The coordinates should be relative to a defined, unmirrored target-video
coordinate system. Apply visual mirroring only during rendering.

Suggested event contract:

``` ts
interface RitualInteractionSubmitted {
  eventId: string;
  roomId: string;
  object: 'CHANDAN' | 'MISTI' | 'DHAN_DURBA';
  action: 'APPLY' | 'OFFER';
  targetParticipantId: string;
  position: {
    x: number; // 0 to 1
    y: number; // 0 to 1
  };
}
```

The backend derives the sender identity from the authenticated socket.
Never trust a client-supplied sender ID.

For the first release, use manual placement. Face detection is not
required.

## 8. Realtime architecture

Use two independent realtime connections:

### LiveKit

Responsible for:

-   Local camera and microphone publishing.
-   Remote audio/video subscription.
-   Network adaptation.
-   TURN relay.
-   Media reconnection.
-   Participant media status.

### Socket.IO through NestJS

Responsible for:

-   Room presence.
-   Participant join/leave notifications.
-   Ritual interaction events.
-   Shared interaction state.
-   Restart coordination.
-   State synchronization after reconnect.

Use the Socket.IO Redis adapter when running multiple NestJS instances.

### Client-to-server events

  Event                         Purpose
  ----------------------------- -------------------------------------
  `room:join`                   Join an authorized room
  `room:leave`                  Leave room
  `participant:ready`           Update readiness
  `ritual:interaction:submit`   Submit a completed drag/drop action
  `session:restart:request`     Request a fresh interaction session
  `session:restart:confirm`     Confirm restart
  `session:end`                 End the session
  `client:sync`                 Request current room state

### Server-to-client events

  Event                           Purpose
  ------------------------------- --------------------------
  `room:snapshot`                 Authoritative room state
  `participant:joined`            Sibling joined
  `participant:left`              Sibling left
  `participant:reconnected`       Sibling reconnected
  `room:status`                   Room lifecycle update
  `ritual:interaction:accepted`   Validated interaction
  `ritual:interaction:rejected`   Rejected interaction
  `session:restart:requested`     Notify other participant
  `session:restarted`             Shared state reset
  `session:ended`                 Session ended
  `system:error`                  Application error

### Event envelope

``` ts
interface RealtimeEvent<T> {
  eventId: string;
  type: string;
  roomId: string;
  payload: T;
  clientTimestamp: number;
}
```

The server should assign an authoritative event sequence or revision.
Use an idempotency key to prevent duplicate interactions when clients
retry after network problems.

### Revision counter

A room-state revision is useful, but it is not a ceremony step.

Increment it whenever an authoritative shared-state mutation succeeds. A
reconnecting client sends its last known revision. If it is stale, the
server sends a full room snapshot.

For a two-person ephemeral room, the revision counter is a lightweight
consistency mechanism, not a requirement for a complex event-sourcing
system.

## 9. Revised database schema

The previous `CeremonyStep` model should be removed. There is no ordered
ceremony.

Keep the room, participants and interaction records.

``` prisma
enum SiblingRole {
  BROTHER
  SISTER
}

enum RoomStatus {
  WAITING
  CONNECTED
  ACTIVE
  COMPLETED
  EXPIRED
}

enum RitualObject {
  CHANDAN
  MISTI
  DHAN_DURBA
}

enum RitualAction {
  APPLY
  OFFER
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  REVOKED
  EXPIRED
}

model User {
  id        String   @id @default(cuid())
  googleId  String   @unique
  email     String   @unique
  name      String
  image     String?
  createdAt DateTime @default(now())

  memberships RoomParticipant[]
  invitationsCreated RoomInvitation[] @relation("InvitationCreator")
}

model Room {
  id        String     @id @default(cuid())
  code      String     @unique
  status    RoomStatus @default(WAITING)

  revision  Int        @default(0)
  expiresAt DateTime
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  participants RoomParticipant[]
  invitation   RoomInvitation?
  interactions RitualInteraction[]

  @@index([status, expiresAt])
}

model RoomParticipant {
  id        String      @id @default(cuid())
  roomId    String
  userId    String
  role      SiblingRole
  joinedAt  DateTime    @default(now())
  leftAt    DateTime?

  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@unique([roomId, userId])
  @@unique([roomId, role])
  @@index([userId])
}

model RoomInvitation {
  id              String           @id @default(cuid())
  roomId          String           @unique
  creatorId       String
  invitedEmail    String
  invitedRole     SiblingRole
  tokenHash       String           @unique
  status          InvitationStatus @default(PENDING)
  expiresAt       DateTime
  acceptedAt      DateTime?
  createdAt       DateTime         @default(now())

  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
  creator User @relation("InvitationCreator", fields: [creatorId], references: [id])

  @@index([invitedEmail, status])
  @@index([expiresAt])
}

model RitualInteraction {
  id              String       @id @default(cuid())
  roomId          String
  eventId         String
  sequence        Int
  senderId        String
  targetId        String
  object          RitualObject
  action          RitualAction
  positionX       Float
  positionY       Float
  createdAt       DateTime     @default(now())

  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@unique([roomId, eventId])
  @@unique([roomId, sequence])
  @@index([roomId, createdAt])
}
```

Implementation notes:

-   Validate that `invitedEmail` differs from the creator's email.
-   Validate that the invited role is opposite the creator's role.
-   Enforce exactly two room participants.
-   Enforce room membership before reading or mutating room data.
-   Enforce invitation redemption transactionally.
-   Consider a database-level partial unique index or transaction logic
    to prevent a user from holding multiple active room memberships, if
    that is a product rule.
-   Add a separate temporary session-state record only if the
    interaction state becomes more complex than the interaction log.
-   The interaction log is temporary and must be deleted with the room.

## 10. Restart and temporary retention

### Restart

Recommended default: mutual confirmation.

``` text
Participant A requests restart
          |
          v
Participant B receives prompt
          |
     B confirms?
       /    \
     No      Yes
     |        |
  Continue   Server atomically:
             - clears interaction state
             - resets room revision/state
             - broadcasts session:restarted
             - both clients render fresh tray
```

If the product later chooses unilateral restart, implement it explicitly
and notify the other participant. Do not silently reset the other
person's screen.

### Reconnection

A temporary network interruption should preserve the current room and
accepted interactions during a grace period.

After reconnect:

-   Reauthenticate the socket.
-   Recheck room membership.
-   Restore the LiveKit connection.
-   Fetch the authoritative room snapshot.
-   Reconcile local state.

### Data retention

-   No video or audio recording.
-   No camera snapshots.
-   No permanent ritual history.
-   Room and interaction data expire automatically.
-   Redis presence keys use TTL.
-   A scheduled cleanup worker deletes expired PostgreSQL records.
-   Keep only the minimum account data required for authentication.

A practical starting policy is a short active-room expiry with a
reconnection grace period, followed by cleanup. The exact duration
should be configurable.

## 11. LiveKit integration

Use LiveKit Cloud for the first production release.

The NestJS backend should generate a short-lived LiveKit access token
only after verifying room membership.

``` ts
const token = new AccessToken(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
  {
    identity: participant.id,
    ttl: '10m',
  },
);

token.addGrant({
  roomJoin: true,
  room: `bhaifota_${room.id}`,
  canPublish: true,
  canSubscribe: true,
  canPublishData: false,
});
```

Keep API secrets on the backend. Since Socket.IO carries application
interactions, disable LiveKit data publishing initially.

Frontend packages:

``` bash
pnpm add livekit-client @livekit/components-react
```

Provide camera and microphone controls, device selection, connection
status, audio-only fallback and reconnect handling.

## 12. NestJS module structure

``` text
apps/api/src/
├── auth/
├── users/
├── rooms/
├── invitations/
├── participants/
├── media/
├── ritual/
├── realtime/
├── cleanup/
└── common/
```

Responsibilities:

  Module         Responsibility
  -------------- ------------------------------------------------------
  Auth           Google identity verification and application session
  Users          User profiles
  Rooms          Creation, joining, lifecycle and expiry
  Invitations    Email invitation and token redemption
  Participants   Membership and role validation
  Media          LiveKit token generation
  Ritual         Permission policy and interaction validation
  Realtime       Socket.IO gateway and state broadcasting
  Cleanup        Expiry and data deletion

The WebSocket gateway should delegate business logic to services. It
should not contain the ritual permission rules itself.

## 13. API endpoints

  Method   Endpoint                              Purpose
  -------- ------------------------------------- ----------------------------
  POST     `/api/v1/auth/google`                 Google authentication
  GET      `/api/v1/users/me`                    Current user
  POST     `/api/v1/rooms`                       Create room and invitation
  GET      `/api/v1/rooms/:id`                   Read authorized room
  POST     `/api/v1/invitations/:token/accept`   Redeem invitation
  POST     `/api/v1/rooms/:id/media-token`       Generate LiveKit token
  POST     `/api/v1/rooms/:id/ready`             Update readiness
  POST     `/api/v1/rooms/:id/restart`           Request/confirm restart
  POST     `/api/v1/rooms/:id/end`               End room
  GET      `/api/v1/rooms/:id/state`             Fetch authoritative state

All room endpoints require authenticated membership. Invitation
redemption is the exception: it requires a valid invitation token and
authenticated Google identity.

## 14. Frontend structure

``` text
apps/web/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   ├── dashboard/
│   ├── connect/
│   ├── invite/[token]/
│   └── room/[code]/
├── components/
│   ├── auth/
│   ├── invitation/
│   ├── connection/
│   ├── media/
│   └── ritual/
├── hooks/
├── stores/
├── lib/
│   ├── api/
│   ├── socket/
│   └── livekit/
└── types/
```

Suggested ritual interface:

``` text
RitualStage
├── ParticipantVideoGrid
│   ├── LocalVideo
│   └── RemoteVideo
├── RitualOverlay
├── RitualTray
│   ├── Chandan
│   ├── Misti
│   └── DhanDurba
├── DropTarget
├── MediaControls
└── RoomControls
```

Use Zustand for local room state and TanStack Query for API data. The
server remains the source of truth.

## 15. Infrastructure and deployment

``` text
                   Cloudflare
                DNS / WAF / CDN
                       |
              Next.js application
                       |
                 NestJS API
                       |
           ┌───────────┴───────────┐
           |                       |
      PostgreSQL                 Redis
           |
     Temporary records

Browser <------ WebRTC ------> LiveKit Cloud

Browser <---- Socket.IO -----> NestJS
                                |
                           Redis adapter
```

Recommendations:

-   Managed PostgreSQL.
-   Managed Redis.
-   Horizontally scalable NestJS instances.
-   LiveKit Cloud for media.
-   Transactional email provider for invitations.
-   Separate development, staging and production environments.
-   Sentry for errors.
-   OpenTelemetry for traces.
-   Load testing before the festival.

Do not treat WebSocket load tests as video load tests. Test media
capacity separately.

## 16. Implementation roadmap

  Phase   Deliverable
  ------- ---------------------------------------------------------------
  1       Monorepo, Prisma, PostgreSQL, Redis and Google authentication
  2       Room creation, role reservation and email invitations
  3       Invitation redemption and strict access authorization
  4       LiveKit integration and two-person video
  5       Socket.IO connection and room-state synchronization
  6       Manual ritual tray and drag-and-drop interactions
  7       Restart, reconnection, expiry and cleanup
  8       Security, mobile testing, load testing and deployment

### First vertical slice

Build this before spending time on the visual design:

1.  Sister signs in and creates a room.
2.  Brother receives an email invitation.
3.  Brother signs in using the invited Google account.
4.  Both enter the same private room.
5.  Both establish video/audio connections.
6.  Sister drags Chandan onto the brother's video.
7.  Brother sees the synchronized interaction.
8.  Brother offers Misti.
9.  Sister sees the synchronized interaction.
10. Both restart and verify that the shared interaction state is
    cleared.

This validates the core product.

## 17. Production test checklist

-   [ ] A non-invited Google account cannot join.
-   [ ] A forwarded invitation cannot be redeemed by another account.
-   [ ] An expired invitation cannot be redeemed.
-   [ ] Two brothers cannot occupy one room.
-   [ ] A participant cannot access another room by guessing its ID.
-   [ ] Room codes do not bypass email authorization.
-   [ ] A brother cannot initiate Chandan application.
-   [ ] Duplicate ritual events are not rendered twice.
-   [ ] Reconnection restores the latest state.
-   [ ] Restart clears shared interaction state on both screens.
-   [ ] Restart cannot race with an in-flight ritual event.
-   [ ] Room expiry triggers media disconnection and cleanup.
-   [ ] Camera and microphone can be disabled independently.
-   [ ] The experience works on mobile and low-bandwidth connections.

------------------------------------------------------------------------

## 18. Final architecture decisions

  Decision                  Final choice
  ------------------------- -------------------------------------------
  Product model             Private two-person virtual gathering
  Authentication            Google OAuth
  Participant access        Verified email invitation
  Room identifier           Six-character code, optional reference
  Roles                     Brother and Sister
  Video/audio               LiveKit Cloud
  Application realtime      Socket.IO
  Ritual model              Manual, freeform interactions
  Ritual sequence           No predefined sequence
  Interaction permissions   Role-based
  Shared state              Server-authoritative
  Revision                  Lightweight state synchronization counter
  Restart                   Fresh interaction state
  Reconnection              Restore current active room state
  Persistence               Temporary room and interaction records
  Recording                 Disabled
  Cleanup                   Automatic expiry and deletion

## 19. The central product philosophy

The application should not tell siblings how to celebrate Bhaifota.

It should simply bring them together, give them the familiar ritual
objects, and let them celebrate in their own way.

**The technology should disappear into the experience.**

The most important engineering objective is therefore not a complicated
ceremony engine. It is reliable private pairing, stable video
communication, low-latency synchronized interactions and a beautiful,
culturally meaningful interface.
