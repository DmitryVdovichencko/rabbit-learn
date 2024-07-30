//Dependencies
import { AMQPClient } from "@cloudamqp/amqp-client";
import {} from "dotenv/config";

async function startPublisher() {
  try {
    // Коннектимся к серверу RabbitMQ
    const cloudAMQPURL = process.env.CLOUDAMQP_URL;
    const connection = new AMQPClient(
      "amqp://rmuser:rmpassword@localhost:5672"
    );
    await connection.connect();
    const channel = await connection.channel();

    console.log("[✅] Connection over channel established");

    // Объявляем exchange с типом direct
    await channel.exchangeDeclare("emails", "direct");
    // Создаем очередь email.notifications
    await channel.queue("email.notifications");
    // Привязываем очередь email.notifications к маршрутизатору exchange с параметром routingKey = notification
    await channel.queueBind("email.notifications", "emails", "notification");

    // Создаем очередь email.resetpassword
    await channel.queue("email.resetpassword");
    // Привязываем очередь email.resetpassword к маршрутизатору exchange с параметром routingKey = resetpassword
    await channel.queueBind("email.resetpassword", "emails", "resetpassword");

    // Publish a message to the exchange 
    async function sendToQueue(
      routingKey: string,
      email: string,
      name: string,
      body: string
    ) {
      const message = { email, name, body };
      const jsonMessage = JSON.stringify(message);

      //amqp-client function expects: publish(exchange, routingKey, message, options)
      await channel.basicPublish("emails", routingKey, jsonMessage);
      console.log("[📥] Message sent to queue", message);
    }

    //Send some messages to the queue
    sendToQueue(
      "notification",
      "example@example.com",
      "John Doe",
      "Your order has been received"
    );
    sendToQueue(
      "notification",
      "example@example.com",
      "Jane Doe",
      "The product is back in stock"
    );
    sendToQueue(
      "resetpassword",
      "example@example.com",
      "Willem Dafoe",
      "Here is your new password"
    );

    setTimeout(() => {
      //Close the connection
      connection.close();
      console.log("[❎] Connection closed");
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error(error);

    //Retry after 3 second
    setTimeout(() => {
      startPublisher();
    }, 3000);
  }
}

//Last but not least, we have to start the publisher and catch any errors
startPublisher();
