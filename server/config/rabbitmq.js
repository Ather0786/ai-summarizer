const amqp = require("amqplib");

let connection;
let channel;

async function connectRabbitMQ() {
  try {
    console.log("Connecting to RabbitMQ...");

    connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost:5672"
    );
    console.log("RabbitMQ connected successfully");

    channel = await connection.createChannel();
    console.log("RabbitMQ channel created successfully");

    // Create the welcome email queue
    await channel.assertQueue("welcome_emails", {
      durable: true,
    });

    console.log("Welcome email queue is ready");

    return channel;
  } catch (error) {
    console.error("RabbitMQ connection failed:", error);
    throw error;
  }
}

function getChannel() {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  return channel;
}

module.exports = {
  connectRabbitMQ,
  getChannel,
};