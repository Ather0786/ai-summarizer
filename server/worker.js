require("dotenv").config();

const amqp = require("amqplib");
const nodemailer = require("nodemailer");

const QUEUE_NAME = "welcome_emails";

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function startWorker() {
  try {
    console.log("Starting email worker...");

    // Connect to RabbitMQ
    const connection = await amqp.connect("amqp://localhost:5672");
    console.log("Worker connected to RabbitMQ");

    const channel = await connection.createChannel();

    // Make sure the queue exists
    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
    });

    console.log("Waiting for welcome email messages...");

    // Receive messages from the queue
    channel.consume(QUEUE_NAME, async (message) => {
      if (message === null) return;

      try {
        const user = JSON.parse(message.content.toString());

        console.log("Received welcome email request");
        console.log("Sending email to:", user.email);

        // Send welcome email
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: user.email,
          subject: "Welcome to AI Summarizer!",
          text: `Hello ${user.name},

Welcome to AI Summarizer!

We're excited to have you on board.

AI Summarizer makes it easy to turn lengthy text into clear, concise, and meaningful summaries, helping you save time and focus on what matters most.

Here's what you can do with your account:

• Generate summaries: Turn lengthy content into easy-to-understand summaries.
• Save your work: Access your previous summaries through your history.
• Save time: Get the key information without reading every word.

You're all set! Head over to AI Summarizer and create your first summary.

Thank you for choosing us. We hope you enjoy using AI Summarizer!

Best regards,
The AI Summarizer Team

Simplify reading. Save time. Stay informed.`,
        });

        console.log("Welcome email sent successfully");

        // Tell RabbitMQ the message was processed
        channel.ack(message);

      } catch (error) {
        console.error("Email processing failed:", error);

        // Remove the failed message from the queue
        channel.nack(message, false, false);
      }
    });

  } catch (error) {
    console.error("Worker failed to start:", error);
  }
}

startWorker();