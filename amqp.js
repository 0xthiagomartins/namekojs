import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const AMQP_URL = process.env.CLOUDAMQP_URL;

let connection = null;

async function initMqConnection() {
    if (!connection) {
        connection = await amqp.connect(AMQP_URL);
        console.log('Connected to AMQP Broker');
    }
    return connection;
}

export async function rpc(serviceName, methodName, params) {
    const conn = await initMqConnection();
    const channel = await conn.createChannel();

    const exchange = 'nameko-rpc';
    const routingKey = `${serviceName}.${methodName}`;

    await channel.assertExchange(exchange, 'topic', { durable: true });

    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });

    await channel.bindQueue(replyQueue, exchange, replyQueue);

    const correlationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const payload = {
        args: params,
        kwargs: {}
    };

    const messageProperties = {
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        correlationId: correlationId,
        replyTo: replyQueue,
    };

    console.log('Sending payload:', JSON.stringify(payload));
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), messageProperties);
    console.log(`Message sent to exchange '${exchange}' with routing key '${routingKey}'`);

    return new Promise((resolve, reject) => {
        channel.consume(replyQueue, (msg) => {
            if (msg) {
                const msgCorrelationId = msg.properties.correlationId;
                if (msgCorrelationId === correlationId) {
                    const response = JSON.parse(msg.content.toString());
                    resolve(response);
                    channel.close();
                }
            }
        }, { noAck: true }).catch((err) => {
            reject(new Error('Error consuming messages: ' + err.message));
        });
    });
}
