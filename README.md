# 💬 Unsent — A Chat Application

A real-time chat application where you can talk one-on-one or in groups, reply to specific messages, edit or delete what you've sent, share files, and see who's online and typing.

🔗 **Live demo:** [unsent-a-chat-application.onrender.com](https://unsent-a-chat-application.onrender.com/)

<img width="1208" height="964" alt="image" src="https://github.com/user-attachments/assets/6da077f5-5c3c-4370-bc38-9175afebba45" />

---

## ✨ Features

- 🔐 **Secure authentication** — sign up, log in and log out with JWT-based sessions and bcrypt-hashed passwords
- 🏠 **Chat rooms** — all your conversations listed in one sidebar
- 👥 **Group chats** — create a named room and add multiple participants
- 🧑‍🤝‍🧑 **Direct messages** — start a private one-on-one conversation
- ➕ **Easy room creation** — pick a room name, choose Group or Direct, and select participants from the user list
- ⚡ **Real-time messaging** — messages arrive instantly over WebSockets, no refresh needed
- ✏️ **Edit messages** — fix typos in messages you've already sent
- 🗑️ **Delete messages** — remove messages you no longer want in the chat (attached files are removed from cloud storage too)
- ⌨️ **Typing indicator** — see when someone is typing a message
- 🟢 **Online presence** — see how many people are online in a room
- ↩️ **Reply to messages** — quote a specific message and respond to it, with a quick cancel option
- 📎 **File attachments** — share images, PDFs and text files (up to 10 MB), stored in the cloud with Cloudinary

---

## 🛠️ Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js, Express 5 |
| Database | MongoDB with Mongoose |
| Real-time | Socket.IO |
| Authentication | JSON Web Tokens (jsonwebtoken), bcrypt |
| File uploads | Multer (in-memory) + Cloudinary |
| Deployment | Render |

---

## 📁 Project Structure

```
Unsent-A-chat-application/
├── backend/
│   ├── server.js            # Entry point: HTTP server + Socket.IO
│   ├── scripts/             # One-off scripts (e.g. migrate-uploads.js)
│   └── src/
│       ├── app.js           # Express app, routes, static frontend
│       ├── config/          # MongoDB and Cloudinary setup
│       ├── controllers/     # auth, rooms, messages, uploads
│       ├── middlewares/     # JWT auth (HTTP + socket), upload handling
│       ├── models/          # User, Room, Message
│       ├── routes/
│       ├── sockets/         # Real-time event handlers
│       └── utils/           # Attachment validation
├── frontend/                # Client UI (plain HTML, CSS and JavaScript)
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later recommended) and npm
- A MongoDB database (local or MongoDB Atlas)
- A free [Cloudinary](https://cloudinary.com/) account for file storage

### 1. Clone the repository

```bash
git clone https://github.com/TanviMalewar/Unsent-A-chat-application.git
cd Unsent-A-chat-application
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

```env
# Server
PORT=3000

# MongoDB (local or Atlas connection string)
MONGO_URI=mongodb://localhost:27017/unsent

# Secret used to sign login tokens (use a long random string)
JWT_SECRET=replace_with_a_long_random_string

# Cloudinary (Dashboard > Settings > API Keys)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the server:

```bash
npm start        # production
npm run dev      # development with auto-reload (nodemon)
```

### 3. Cloudinary setup

1. Create a free account at [cloudinary.com](https://cloudinary.com/) and copy your cloud name, API key and API secret into `.env`.
2. In the Cloudinary dashboard, open **Settings → Security** and tick **Allow delivery of PDF and ZIP files**. New accounts block this by default, and without it PDF attachments return a `401` error.

Uploaded files are stored under `unsent/<userId>/` in your Cloudinary media library.

### 4. Open the app

The frontend is plain HTML, CSS and JavaScript, so there is nothing to install or build. With the backend running, open `http://localhost:3000` (or whichever `PORT` you set) in your browser.

---

## ☁️ Deployment (Render)

1. Create a **Web Service** from this repository with the root directory set to `backend`.
2. Set the build command to `npm install` and the start command to `npm start`.
3. Add every variable from the `.env` example above in the service's **Environment** tab. The `.env` file itself is not committed, so Render will not have it.

Render's free-tier disk is wiped on every redeploy, which is why uploads go to Cloudinary instead of the server's own `uploads` folder.

### Migrating older local uploads (optional)

If you have attachments from before the move to Cloudinary, run this once from `backend/` with the old `uploads/` folder still in place:

```bash
node scripts/migrate-uploads.js
```

It uploads each file that a message references and updates the stored links. Files that were only ever on a server whose disk has since been wiped cannot be recovered.

---

## 🧭 How to Use

1. Sign up or log in.
2. Click **+ New Room**.
3. Enter a room name, choose **Group** or **Direct**, and select participants.
4. Click **Create**, then pick the room from the sidebar.
5. Type a message and hit **Send**, or use 📎 to attach a file.
6. Edit or delete your own messages, or reply to any message to keep conversations organised.

---

## 🗺️ Future Improvements

- Message search
- Push notifications
- Read receipts and emoji reactions
- Rate limiting on login and registration

---

## 👩‍💻 Author

**Tanvi Malewar** — [@TanviMalewar](https://github.com/TanviMalewar)
