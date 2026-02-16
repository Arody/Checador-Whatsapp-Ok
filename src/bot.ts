import { connectToWhatsApp, getSocket, getQR, getStatus, disconnect, deleteSession, ConnectionStatus } from './lib/whatsapp/client';
import http from 'http';

const PORT = 3001;

// Simple keep-alive for the process
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Internal API Server ---
const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: getStatus() }));
    } else if (req.url === '/qr' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ qr: getQR() }));
    } else if (req.url === '/disconnect' && req.method === 'POST') {
        await disconnect();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    } else if (req.url === '/connect' && req.method === 'POST') {
        if (getStatus() === 'disconnected') {
            connectToWhatsApp();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    } else if (req.url === '/session/delete' && req.method === 'POST') {
        try {
            await deleteSession();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Session deleted' }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Failed to delete session' }));
        }
    } else {
        res.writeHead(404);
        res.end();
    }
});

async function main() {
    console.log('🤖 Starting Checador WhatsApp Bot...');
    
    server.listen(PORT, () => {
        console.log(`🔌 Internal Bot API listening on port ${PORT}`);
    });

    try {
        await connectToWhatsApp();
    } catch (error) {
        console.error('Failed to start bot:', error);
    }
}

main();
