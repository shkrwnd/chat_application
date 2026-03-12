# Chat Room App — Implementation Plan

## Tech Stack
- **Backend**: Node.js (plain JS) + Express + Socket.IO + SQLite (better-sqlite3)
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Structure**: `server/` + `client/` directories

---

## Architecture

### Database Schema (SQLite)
```sql
users    (id, username, password_hash, created_at)
rooms    (id, name, description, created_by, created_at)
messages (id, room_id, user_id, username, content, created_at)
```

### REST API
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/rooms` | List all rooms |
| POST | `/api/rooms` | Create room (auth required) |
| GET | `/api/rooms/:id/messages` | Message history (auth required) |

### Socket.IO Events
| Direction | Event | Payload |
|-----------|-------|---------|
| Client→Server | `join_room` | `{ roomId }` |
| Client→Server | `leave_room` | `{ roomId }` |
| Client→Server | `send_message` | `{ roomId, content }` |
| Client→Server | `typing_start` | `{ roomId }` |
| Client→Server | `typing_stop` | `{ roomId }` |
| Server→Client | `message` | `{ id, roomId, userId, username, content, createdAt }` |
| Server→Client | `user_joined` | `{ userId, username }` |
| Server→Client | `user_left` | `{ userId, username }` |
| Server→Client | `active_users` | `[{ userId, username }]` |
| Server→Client | `typing` | `{ username, isTyping }` |

---

## File Structure

### `server/` (plain JS)
```
server/
├── src/
│   ├── index.js          ← Express + Socket.IO bootstrap, CORS
│   ├── db.js             ← SQLite init, schema creation, query helpers
│   ├── auth.js           ← JWT middleware (verifyToken)
│   ├── routes/
│   │   ├── auth.js       ← POST /register, POST /login
│   │   └── rooms.js      ← GET/POST /rooms, GET /rooms/:id/messages
│   └── socket/
│       └── handlers.js   ← all Socket.IO event handlers (join, leave, message, typing)
└── package.json
```

### `client/`
```
client/
├── src/
│   ├── main.tsx
│   ├── App.tsx                         ← Router setup, context providers
│   ├── api/
│   │   ├── client.ts                   ← Axios instance + JWT interceptor
│   │   └── index.ts                    ← Barrel export
│   ├── components/
│   │   ├── index.ts
│   │   ├── ui/                         ← Primitive, dependency-free building blocks
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── avatar.tsx              ← Colored circle with initials
│   │   │   ├── badge.tsx               ← Unread count chip
│   │   │   ├── toast.tsx               ← Error / success notifications
│   │   │   └── index.ts
│   │   ├── shared/                     ← Content panels consumed by ChatLayout
│   │   │   ├── Sidebar.tsx             ← Left panel: room list + create button
│   │   │   ├── Header.tsx              ← Top bar: room name + member count
│   │   │   ├── UserList.tsx            ← Right panel: active users + online dots
│   │   │   └── index.ts
│   │   ├── chat/                       ← Composes ui/ primitives
│   │   │   ├── MessageList.tsx         ← Scrollable message history
│   │   │   ├── Message.tsx             ← Single message (avatar, username, timestamp)
│   │   │   ├── MessageInput.tsx        ← Text input + send button
│   │   │   ├── TypingIndicator.tsx     ← "X is typing..."
│   │   │   └── index.ts
│   │   └── rooms/                      ← Composes ui/ primitives
│   │       ├── RoomItem.tsx            ← Room entry + unread badge
│   │       ├── CreateRoomModal.tsx     ← Modal: name + description fields
│   │       └── index.ts
│   ├── context/
│   │   ├── AuthContext.tsx             ← JWT in localStorage, user state
│   │   ├── SocketContext.tsx           ← socket.io-client lifecycle
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts                  ← useContext(AuthContext)
│   │   ├── useSocket.ts                ← useContext(SocketContext)
│   │   └── index.ts
│   ├── layouts/
│   │   ├── AuthLayout.tsx              ← Centered card shell for login/signup
│   │   ├── ChatLayout.tsx              ← 3-panel grid shell (sidebar | main | users)
│   │   └── index.ts
│   ├── pages/
│   │   ├── LoginPage.tsx               ← /login — form inside AuthLayout
│   │   ├── SignupPage.tsx              ← /signup — form inside AuthLayout; redirects to /login on success
│   │   ├── ChatPage.tsx                ← / (protected) — ChatLayout; shows empty state when no room selected
│   │   ├── NotFoundPage.tsx            ← * catch-all 404 page
│   │   └── index.ts
│   ├── routes/
│   │   ├── ProtectedRoute.tsx          ← Redirects to /login if not authed
│   │   └── index.tsx                   ← createBrowserRouter: /, /login, /signup, *
│   ├── services/
│   │   ├── authService.ts              ← register(), login(), logout()
│   │   ├── roomService.ts              ← getRooms(), createRoom()
│   │   ├── messageService.ts           ← getMessages(roomId, limit)
│   │   └── index.ts
│   ├── types/
│   │   ├── auth.types.ts               ← User, LoginPayload, RegisterPayload
│   │   ├── chat.types.ts               ← Message, TypingEvent
│   │   ├── room.types.ts               ← Room, RoomMember
│   │   └── index.ts
│   └── utils/
│       ├── auth.utils.ts               ← getToken(), setToken(), clearToken()
│       ├── formatters.ts               ← formatTimestamp(), formatDate()
│       ├── cn.ts                       ← clsx + tailwind-merge helper
│       └── index.ts
│           (all utils are pure functions — no API calls, no side effects)
├── index.html
├── vite.config.ts                      ← Proxy /api → localhost:3001
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Pages

### `/login` — LoginPage
- Rendered inside `AuthLayout` (centered card, dark background)
- Fields: **Username**, **Password**
- Primary CTA: **Log in** button (calls `authService.login`, stores JWT, redirects to `/`)
- Footer link: "Don't have an account? **Sign up**" → navigates to `/signup`
- Shows inline error on bad credentials

### `/signup` — SignupPage
- Rendered inside `AuthLayout`
- Fields: **Username**, **Password**, **Confirm Password**
- Client-side validation: passwords must match, username min 3 chars
- Primary CTA: **Create account** button (calls `authService.register`, then redirects to `/login`)
- Footer link: "Already have an account? **Log in**" → navigates to `/login`
- Shows inline error on duplicate username or validation failure

### `/` — ChatPage *(protected)*
- Rendered inside `ChatLayout` (3-panel: Sidebar | Chat area | User list)
- If no room is selected: center panel shows an empty state ("Select a room to start chatting")
- If a room is selected: loads message history, joins socket room, shows MessageList + MessageInput
- Room state managed here and passed down via props / context

### `*` — NotFoundPage
- Simple centered message: "404 — Page not found" with a link back to `/`

---

## Implementation Steps

| # | Step | Details |
|---|------|---------|
| 1 | Server scaffolding | `package.json`, install deps, `src/index.js` with Express + Socket.IO + CORS |
| 2 | Database layer | `db.js` — schema creation, query helpers |
| 3 | Auth routes | `/api/auth/register` (hash pw, store user), `/api/auth/login` (verify, return JWT) |
| 4 | Room routes | List rooms, create room, fetch message history with pagination |
| 5 | Socket handlers | `socket/handlers.js` — join/leave, send_message (persist + broadcast), typing, active_users |
| 6 | Client scaffolding | Vite + React + TypeScript + Tailwind, `vite.config.ts` proxy to :3001, `tsconfig.json` |
| 7 | Types | `types/` — auth.types.ts, chat.types.ts, room.types.ts |
| 8 | Utils + API client | `utils/cn.ts`, `utils/formatters.ts`, `utils/auth.utils.ts`, `api/client.ts` (axios + JWT interceptor) |
| 9 | Services | `services/authService.ts`, `roomService.ts`, `messageService.ts` |
| 10 | UI primitives | `components/ui/` — button, input, modal, avatar, badge, toast (no external deps) |
| 11 | AuthContext + hooks | JWT in localStorage, useAuth hook, auto-attach header |
| 12 | SocketContext + hooks | Connect on login, disconnect on logout, useSocket hook |
| 13 | Routes | ProtectedRoute, createBrowserRouter — routes: `/`, `/login`, `/signup`, `*` |
| 14 | Layouts | AuthLayout (centered card), ChatLayout (3-panel grid shell) |
| 15 | Auth pages | LoginPage (/login), SignupPage (/signup → redirects to /login on success), NotFoundPage (*) |
| 16 | Chat page | ChatPage (/) — room selection state; empty state when no room selected |
| 17 | Shared components | Sidebar (RoomItem + unread badges, CreateRoomModal), Header, UserList |
| 18 | Chat components | MessageList, Message, MessageInput, TypingIndicator |
| 19 | Polish | Dark theme, scroll-to-bottom, timestamps, error toasts, loading states |

---

## Features

### Required ✅
- User registration and login with JWT auth
- Create and join chat rooms
- Real-time messaging via Socket.IO
- Active users list per room

### Bonus ✅
- **Message persistence** — SQLite survives server restarts
- **Typing indicators** — debounced, shows who is typing
- **Unread message badges** — count per room in sidebar
- **Beautiful dark UI** — Discord-inspired design with Tailwind
- **Message history** — loaded on room join
- **Online indicators** — green dot on active users

---

## How to Run

```bash
# Terminal 1: Start server
cd server
npm install
node src/index.js   # runs on :3001

# Terminal 2: Start client
cd client
npm install
npm run dev         # runs on :5173, proxies /api to :3001
```

Open http://localhost:5173 in two browser tabs to test multi-user scenarios.
