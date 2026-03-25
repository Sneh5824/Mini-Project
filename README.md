# Blip

Blip is a real-time, anonymous, timed collaboration platform for fast chat and coding sessions.

No sign-up, no accounts, and room data is removed automatically when time runs out.

## Highlights

- Anonymous identities with random display names
- Two room modes:
  - Chat
  - Coding (shared Monaco editor)
- Rich real-time chat:
  - replies and reactions
  - typing indicators
  - image/file attachments
  - voice notes
  - URL link preview side panel (resizable)
- Public join flow:
  - system-provided public rooms (`PUB10M`, `PUB20M`)
  - no invitation code needed
  - no host role in public rooms
  - room names are randomly generated
- Private room controls:
  - invite link copy
  - host export snapshot
  - host end room
- Fully responsive UI improvements for mobile and desktop

## USP (Unique Selling Proposition)

Blip's strongest differentiator is privacy-first, zero-friction collaboration with timed ephemeral rooms.

- Instant anonymous entry:
  users can collaborate without account creation or onboarding friction.
- Time-boxed by architecture:
  rooms and room data are automatically destroyed after expiry, enforcing ephemeral communication.
- Dual collaboration surface in one product:
  real-time chat and live coding workspace are available in the same room experience.
- Built-in hostless public mode:
  system-managed public rooms (`PUB10M`, `PUB20M`) allow open community collaboration without invitations.
- Lightweight but feature-rich communication:
  attachments, voice notes, reactions, replies, typing indicators, and link previews are included by default.

## Public Room Model

Public rooms are not user-created.

The backend maintains two rotating public chat rooms:

- `PUB10M` (10 minutes)
- `PUB20M` (20 minutes)

When they expire, they are recreated automatically with fresh random names.

## Applications of This Project

Blip is useful in scenarios where fast, temporary collaboration is needed without account setup.

- DSA practice groups: share problem links, discuss approaches, and quickly spin up coding rooms.
- Pair programming sessions: collaborate on code in real time for interviews or debugging.
- Classroom labs and workshops: create short, controlled-time discussion/coding spaces.
- Hackathon coordination: use public rooms for open brainstorming and private rooms for team work.
- Interview prep: simulate timed coding rounds with live chat and synchronized editor.
- Community Q and A corners: time-boxed public chat rooms for quick help sessions.

### Real-World Application and Usage

Blip can be used in real environments where teams need instant, low-overhead collaboration.

- Universities and colleges:
  live coding labs, exam practice discussions, mentor office-hour help rooms.
- EdTech and coding bootcamps:
  session-based learning cohorts with temporary rooms for each topic or batch.
- Developer communities:
  open help rooms for debugging and concept discussion without permanent account requirements.
- Interview preparation platforms:
  timed mock interview rooms with coding editor + chat for candidate and mentor.
- Internal engineering teams:
  ad-hoc incident war rooms, quick architecture reviews, and short debugging swarms.
- Hackathons and events:
  temporary team channels and public topic rooms during constrained event windows.

### Why This Fits Real-Time Workflows

- Fast setup:
  users can start collaborating in seconds.
- Time bounded sessions:
  ideal for standups, reviews, interview rounds, and classroom slots.
- Data minimization:
  automatic cleanup helps for privacy-focused and temporary discussions.
- Multi-device support:
  works across mobile and desktop for practical on-the-go collaboration.

## Advantages

- Low friction onboarding:
  no signup, no profiles, instant entry.
- Ephemeral by design:
  data is deleted automatically on room expiry.
- Real-time collaboration:
  chat, typing, reactions, cursor sync, and code sync happen live.
- Flexible usage model:
  both private invite-based rooms and public hostless rooms are supported.
- Better communication quality:
  supports attachments, voice notes, and rich link previews.
- Mobile + desktop friendly:
  responsive UI with adaptive layouts and controls.
- Lightweight architecture:
  simple Node + Socket.IO + Redis stack that is easy to run locally.

## Future Improvements

- Public room continuity:
  auto-move users to fresh cycle when a public room expires.
- Capacity and sharding:
  max users per public room with overflow room balancing.
- Abuse prevention:
  message rate limits, spam filtering, and temporary mute policies.
- Better moderation:
  report/hide tools for public rooms.
- Presence enhancements:
  richer online status, idle indicators, and room activity heat.
- Persistent optional exports:
  optional downloadable summaries for non-sensitive workflows.
- Production deployment hardening:
  timer recovery strategy, health probes, centralized logging, metrics.
- Authentication extension (optional mode):
  support org-based verified rooms while preserving anonymous default mode.

## Potential Academic Scope

This project can be extended as a mini-project or major-project base in areas like:

- real-time systems design
- scalable WebSocket architecture
- ephemeral data lifecycle and cleanup policies
- collaborative editing UX patterns
- distributed cache usage with Redis

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React, Tailwind CSS |
| Realtime | Socket.IO |
| Editor | @monaco-editor/react |
| Backend | Node.js, Express |
| Data | Redis |

## Repository Structure

```text
.
|-- backend/
|   |-- package.json
|   |-- redisClient.js
|   |-- server.js
|   |-- sessionManager.js
|   `-- socket.js
|-- frontend/
|   |-- components/
|   |-- lib/
|   |-- pages/
|   `-- styles/
|-- docker-compose.yml
`-- README.md
```

## Local Setup

### 1. Clone

```bash
git clone https://github.com/Sneh5824/Mini-Project.git
cd "Mini Project"
```

### 2. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Start Redis

Docker:

```bash
docker compose up -d
```

Or local:

```bash
redis-server
```

### 4. Start backend

```bash
cd backend
npm run dev
```

Backend: http://localhost:5001

### 5. Start frontend

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:3000

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/rooms` | Create private room |
| GET | `/api/rooms/:roomId` | Fetch room metadata / validate room |
| GET | `/api/public-rooms` | List active system public rooms |
| POST | `/api/run` | Execute code snippet (supported languages) |
| GET | `/health` | Health check |

## Socket Events

### Client -> Server

| Event | Purpose |
| --- | --- |
| `join_room` | Join active room |
| `send_message` | Send text/attachment/reply message |
| `typing_status` | Update typing indicator |
| `toggle_reaction` | React/unreact to message |
| `code_update` | Sync coding editor text |
| `cursor_update` | Broadcast collaborative cursor/selection |
| `share_problem` | Share coding problem link |
| `end_room` | End room (host-only private rooms) |

### Server -> Client

| Event | Purpose |
| --- | --- |
| `room_joined` | Initial room payload |
| `receive_message` | New message delivered |
| `typing_update` | Typing status changes |
| `reaction_updated` | Message reaction updates |
| `code_updated` | Shared code changes |
| `cursor_updated` | Remote cursor update |
| `cursor_removed` | Remove remote cursor |
| `participants_update` | Participant list updates |
| `user_joined` | Join system message |
| `user_left` | Leave system message |
| `problem_shared` | Problem link update |
| `room_expired` | Room expired and cleaned up |
| `room_error` | Room operation error |

## Redis Key Schema

| Key | Type | Description |
| --- | --- | --- |
| `room:{roomId}` | String | Room metadata |
| `participants:{roomId}` | List | Current participants |
| `messages:{roomId}` | List | Chat history while room is active |
| `code:{roomId}` | String | Shared code content |

## Notes

- Public room IDs are fixed for routing convenience, but names are random per cycle.
- Room data is ephemeral and deleted on expiry.
- Some external links may block iframe preview due to browser security headers.

## Troubleshooting

### Backend does not start

- Ensure Redis is running
- Reinstall and retry:

```bash
cd backend
npm ci
npm run dev
```

### Frontend does not start

```bash
cd frontend
npm ci
npm run dev
```

### Tailwind at-rule warning in VS Code

This is editor lint noise only. Add:

```json
{
  "css.lint.unknownAtRules": "ignore"
}
```

## License

Academic and personal project use.
