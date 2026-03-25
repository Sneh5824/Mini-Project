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

## Public Room Model

Public rooms are not user-created.

The backend maintains two rotating public chat rooms:

- `PUB10M` (10 minutes)
- `PUB20M` (20 minutes)

When they expire, they are recreated automatically with fresh random names.

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
