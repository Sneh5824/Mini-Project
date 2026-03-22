# Blip

Timed, anonymous, real-time rooms for chat and collaborative coding.

Blip creates short-lived sessions with no accounts and no data persistence after expiry.

## Highlights

- Anonymous identities generated automatically (for example: Silent Panda, Logical Owl)
- Two room modes: Chat and Coding
- Shared code editor in coding rooms (Monaco)
- Real-time messaging, participant sync, and code sync via Socket.IO
- Timed expiry with automatic data deletion from Redis
- Host controls: share problem links, end room manually

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React, Tailwind CSS |
| Realtime | Socket.IO |
| Editor | `@monaco-editor/react` |
| Backend | Node.js, Express |
| Session Store | Redis |

## Architecture

- Frontend (`frontend`) renders room UI, editor, chat, and timer
- Backend (`backend`) manages room lifecycle and Socket.IO events
- Redis stores ephemeral room state during active sessions
- Room expiry removes all room-related keys

## Prerequisites

- Node.js 18+
- npm 9+
- Redis 6+ (local install or Docker)

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd "Mini Project"

cd backend
npm install

cd ../frontend
npm install
```

### 2. Start Redis

Choose one option:

Option A: Docker

```bash
docker compose up -d
```

Option B: Local Redis service

```bash
redis-server
```

### 3. Start backend

```bash
cd backend
npm run dev
```

Backend runs on [http://localhost:5001](http://localhost:5001).

### 4. Start frontend

```bash
cd frontend
npm run dev
```

Frontend runs on [http://localhost:3000](http://localhost:3000).

## Environment Notes

- Backend expects Redis to be reachable before room operations work
- If backend exits on startup, verify Redis is running and connection settings match your machine

## Project Structure

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
|   |   |-- ChatPanel.jsx
|   |   |-- CodeEditor.jsx
|   |   |-- ParticipantList.jsx
|   |   |-- SnapExpired.jsx
|   |   `-- Timer.jsx
|   |-- lib/
|   |   |-- identity.js
|   |   `-- socket.js
|   |-- pages/
|   |   |-- index.js
|   |   `-- room/[roomId].js
|   `-- styles/globals.css
|-- docker-compose.yml
`-- README.md
```

## Core Features

1. Room creation with configurable duration
2. Anonymous join by room ID
3. Real-time chat for all room types
4. Real-time collaborative coding in coding rooms
5. Participant list with host indicator
6. Problem link sharing (host)
7. Automatic room expiry and cleanup

## REST API

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/rooms` | Create a room |
| GET | `/api/rooms/:roomId` | Validate room / fetch room status |
| GET | `/health` | Health check |

## Socket Events

Client to Server:

| Event | Payload |
| --- | --- |
| `join_room` | `{ roomId, guestId, displayName }` |
| `send_message` | `{ roomId, guestId, displayName, content }` |
| `code_update` | `{ roomId, code }` |
| `share_problem` | `{ roomId, guestId, displayName, link }` |
| `end_room` | `{ roomId, guestId }` |

Server to Client:

| Event | Description |
| --- | --- |
| `room_joined` | Initial room payload (room, participants, messages, code) |
| `receive_message` | New chat message |
| `code_updated` | Updated shared code |
| `participants_update` | Participant list changed |
| `user_joined` | Join system notification |
| `user_left` | Leave system notification |
| `problem_shared` | Problem link broadcast |
| `room_expired` | Room reached expiry and was deleted |
| `room_error` | Join or room operation failure |

## Redis Keys

| Key Pattern | Type | Purpose |
| --- | --- | --- |
| `room:{roomId}` | String | Room metadata |
| `participants:{roomId}` | List | Participants |
| `messages:{roomId}` | List | Message history for active room |
| `code:{roomId}` | String | Current shared code |

All keys for a room are removed when the room expires or is ended.

## Typical Demo Flow

1. Open [http://localhost:3000](http://localhost:3000)
2. Create a room (Chat or Coding)
3. Copy the generated room ID
4. Join from another tab/device using that room ID
5. Chat and collaborate in real-time
6. Let timer expire or end room as host

## Troubleshooting

### `npm run dev` fails in backend

- Ensure Redis is running
- Reinstall dependencies in `backend`:

```bash
cd backend
npm ci
npm run dev
```

### `npm run dev` fails in frontend

- Reinstall dependencies in `frontend`:

```bash
cd frontend
npm ci
npm run dev
```

### VS Code shows `Unknown at rule @tailwind` warnings

- This is a linting/editor warning, not a runtime error
- Add `.vscode/settings.json`:

```json
{
	"css.lint.unknownAtRules": "ignore"
}
```

## License

For academic and personal project use.
