# AI Summarizer

An AI-powered web application that transforms lengthy text into clear, concise, and meaningful summaries. Built with React, Node.js, Express, MongoDB, and Google's Gemini API.

## Live Demo

**[Visit AI Summarizer](https://ai-summarizer-wine-eight.vercel.app)**

## Features

- **AI-Powered Summarization:** Generate concise summaries using the Gemini API.
- **Google Authentication:** Securely sign in using your Google account.
- **Summary History:** Automatically save generated summaries to your account.
- **View Previous Summaries:** Revisit and load previously generated summaries.
- **Delete History:** Remove summaries you no longer need.
- **Welcome Emails:** Process welcome email requests asynchronously using RabbitMQ and Resend.
- **Responsive UI:** Use the application across desktop, tablet, and mobile devices.
- **Error and Loading Handling:** Clear feedback while summaries are being generated or when something goes wrong.

## Tech Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend user interface |
| Vite | Frontend development and build tool |
| Node.js | JavaScript runtime |
| Express.js | Backend API |
| MongoDB Atlas | Database |
| Mongoose | MongoDB object modeling |
| Google Gemini API | AI text summarization |
| Passport.js | Google OAuth authentication |
| Express Session | User session management |
| RabbitMQ | Asynchronous email message queue |
| Resend | Email delivery |
| Vercel | Frontend deployment |
| Render | Backend deployment |
| CloudAMQP | Hosted RabbitMQ |

## Project Structure

```text
summarizer/
│
├── docs/
│   └── PROJECT_DOCUMENTATION.md
│
├── public/
│
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── server/
│   ├── config/
│   │   └── rabbitmq.js
│   ├── models/
│   │   ├── user.js
│   │   └── summary.js
│   ├── routes/
│   ├── server.js
│   ├── worker.js
│   ├── package.json
│   └── .env
│
├── package.json
├── .gitignore
└── README.md
```

*Note: The structure above is a simplified overview. Your actual project may contain additional files.*

## Getting Started

Follow these steps to run the project locally.

### 1. Clone the repository

```bash
git clone https://github.com/Ather0786/ai-summarizer.git
```

### 2. Navigate to the project

```bash
cd ai-summarizer
```

### 3. Install frontend dependencies

```bash
npm install
```

### 4. Install backend dependencies

```bash
cd server
npm install
```

### 5. Configure environment variables

Create a `.env` file inside the `server` folder and configure the required variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=your_session_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

RABBITMQ_URL=amqp://localhost:5672
CLIENT_URL=http://localhost:5173

RESEND_API_KEY=your_resend_api_key
NODE_ENV=development
```

Create a `.env` file in the project root for the frontend:

```env
VITE_API_URL=http://localhost:5000
```

**Important:** Replace the placeholder values with your own credentials. Never commit `.env` files or expose API keys, OAuth secrets, or database credentials on GitHub.

### 6. Start the application

Start the backend from the `server` directory:

```bash
npm start
```

This starts the Express server and initializes the email worker.

Open another terminal in the project root and start the frontend:

```bash
npm run dev
```

Open the local URL displayed by Vite, usually:

```text
http://localhost:5173
```

Make sure MongoDB and RabbitMQ are configured and accessible before testing the complete application.

## Application Workflow

1. The user signs in using Google Authentication.
2. The frontend sends text to the Express backend.
3. The backend sends the text to the Gemini API.
4. Gemini generates a concise summary.
5. The backend returns the summary to the frontend.
6. The summary and original text are stored in MongoDB.
7. The user can view or delete saved summaries from their history.
8. For a newly registered user, a welcome-email message is published to RabbitMQ and processed by the email worker.

## Deployment

The application uses the following services:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas
- **Message Broker:** CloudAMQP
- **Email Delivery:** Resend

Live application: **https://ai-summarizer-wine-eight.vercel.app**

## Documentation

For detailed explanations of the architecture, authentication, database models, API workflow, RabbitMQ, email processing, deployment, and troubleshooting, see:

[`docs/PROJECT_DOCUMENTATION.md`](docs/PROJECT_DOCUMENTATION.md)

## Future Improvements

- Support summarization of PDF and document files.
- Add multiple summary lengths and styles.
- Improve email delivery with a verified custom domain.
- Implement retry handling and a dead-letter queue for failed email messages.
- Add more AI model options.
- Improve automated testing and monitoring.

## Author

**Kaif Ather**

GitHub: [Ather0786](https://github.com/Ather0786)

---

*AI Summarizer — Simplify reading. Save time. Stay informed.*