import { rpc } from './amqp.js';

async function makeRpcCall() {
    const serviceName = 'userService';
    const methodName = 'getUser';
    const params = { userId: 123 };

    try {
        const response = await rpc(serviceName, methodName, params);
        console.log('RPC Response:', response);
    } catch (error) {
        console.error('RPC Error:', error.message);
    }
}

makeRpcCall();
