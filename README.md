[README.md](https://github.com/user-attachments/files/32416513/README.md)
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
- 🗑️ **Delete messages** — remove messages you no longer want in the chat
- ⌨️ **Typing indicator** — see when someone is typing a message
- 🟢 **Online presence** — see how many people are online in a room
- ↩️ **Reply to messages** — quote a specific message and respond to it, with a quick cancel option
- 📎 **File attachments** — attach and share files directly in chat

---

## 🛠️ Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js, Express 5 |
| Database | MongoDB with Mongoose |
| Real-time | Socket.IO |
| Authentication | JSON Web Tokens (jsonwebtoken), bcrypt |
| File uploads | Multer |
| Deployment | Render |

---

## 📁 Project Structure

```
Unsent-A-chat-application/
├── backend/      # Express server, REST API, MongoDB models, Socket.IO logic
├── frontend/     # Client UI (plain HTML, CSS and JavaScript)
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later recommended) and npm
- A MongoDB database (local or MongoDB Atlas)

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

Create a `.env` file in `backend/`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Start the server:

```bash
npm start        # production
npm run dev      # development with auto-reload (nodemon)
```

### 3. Open the app

The frontend is plain HTML, CSS and JavaScript, so there is nothing to install or build. With the backend running, open `http://localhost:5000` (or whichever `PORT` you set) in your browser.


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
- Use a cloud storage
- Message search
- Push notifications
- Read receipts and emoji reactions

---

## 👩‍💻 Author

**Tanvi Malewar** — [@TanviMalewar](https://github.com/TanviMalewar)
