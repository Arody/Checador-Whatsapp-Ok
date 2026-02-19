import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  ConnectionState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import path from 'path';
import pino from 'pino';
import fs from 'fs-extra';
import { handleMessage } from '@/lib/whatsapp/messageHandler';
import * as lidResolver from '@/lib/whatsapp/lidResolver';

const AUTH_FOLDER = path.join(process.cwd(), 'wa_auth');

export type ConnectionStatus = 'connected' | 'disconnected' | 'qr_ready' | 'connecting';

let sock: WASocket | undefined;
let status: ConnectionStatus = 'disconnected';
let qrCode: string = '';
let isConnecting = false; // Prevent multiple simultaneous connections

export function getStatus(): ConnectionStatus {
  return status;
}

export function getQR(): string {
  return qrCode;
}

export async function disconnect() {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      console.error('Error logging out', e);
    } finally {
      sock.end(undefined);
      status = 'disconnected';
      qrCode = '';
      sock = undefined;
      isConnecting = false;
    }
  }
}

export async function deleteSession() {
  await disconnect();
  try {
    if (fs.existsSync(AUTH_FOLDER)) {
      await fs.remove(AUTH_FOLDER);
      console.log('🗑️ Sesión eliminada correctamente.');
    }
  } catch (error) {
    console.error('Error eliminando la sesión:', error);
    throw error;
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function connectToWhatsApp() {
  // Prevent multiple connection attempts
  if (isConnecting) {
    console.log('⏳ Ya hay una conexión en progreso, ignorando...');
    return;
  }
  isConnecting = true;
  status = 'connecting';

  try {
    // Load LID map from disk before connecting
    await lidResolver.loadFromDisk();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    // Close any existing socket before creating a new one
    if (sock) {
      try { sock.end(undefined); } catch (_) { /* ignore */ }
      sock = undefined;
    }

    sock = makeWASocket({
      logger: pino({ level: 'silent' }) as any,
      // DO NOT use printQRInTerminal (deprecated in latest Baileys)
      auth: state,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 30000, // Ping every 30s to keep connection alive
      browser: ['Kadmiel Bot', 'Chrome', '1.0.0'], // Identify consistently
      retryRequestDelayMs: 2000,
    });

    const currentSock = sock; // Capture reference for closure

    sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        status = 'qr_ready';
        qrCode = qr;
        qrcode.generate(qr, { small: true });
        console.log('📱 QR Code listo — Escanea con WhatsApp');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        console.log(`🔴 Conexión cerrada. Código: ${statusCode}`);

        qrCode = '';
        isConnecting = false;

        // Close the current socket cleanly
        try { currentSock.end(undefined); } catch (_) { /* ignore */ }

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          // Logged out from phone — delete credentials and wait for manual reconnect
          console.log('🚪 Sesión cerrada desde el teléfono. Limpiando credenciales...');
          status = 'disconnected';
          try {
            if (fs.existsSync(AUTH_FOLDER)) {
              await fs.remove(AUTH_FOLDER);
              console.log('🗑️ Credenciales eliminadas.');
            }
          } catch (e) {
            console.error('Error eliminando credenciales:', e);
          }
          // Auto-reconnect to show new QR
          console.log('🔄 Reconectando para generar nuevo QR...');
          await delay(3000);
          connectToWhatsApp();

        } else if (statusCode === 440) {
          // Connection replaced — another instance took over. Wait longer.
          console.log('⚠️ Conexión reemplazada (440). Esperando 10s antes de reintentar...');
          status = 'disconnected';
          await delay(10000);
          connectToWhatsApp();

        } else if (statusCode === 408) {
          // QR timeout — restart to get new QR
          console.log('⏰ QR expirado. Regenerando...');
          status = 'disconnected';
          await delay(2000);
          connectToWhatsApp();

        } else if (statusCode === 503) {
          // Service unavailable — WhatsApp servers busy
          console.log('🌐 Servidores de WhatsApp no disponibles. Reintentando en 15s...');
          status = 'disconnected';
          await delay(15000);
          connectToWhatsApp();

        } else {
          // Unknown error — reconnect with delay
          console.log(`🔄 Reconectando en 5s (código: ${statusCode})...`);
          status = 'connecting';
          await delay(5000);
          connectToWhatsApp();
        }

      } else if (connection === 'open') {
        status = 'connected';
        qrCode = '';
        isConnecting = false;
        console.log('🟢 ¡Conectado a WhatsApp!');
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // --- LID Resolution: Listen for contact sync events ---
    sock.ev.on('contacts.upsert', (contacts) => {
      lidResolver.handleContactsUpsert(contacts);
    });

    sock.ev.on('contacts.update', (contacts) => {
      lidResolver.handleContactsUpsert(contacts);
    });

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            try {
              await handleMessage(currentSock, msg);
            } catch (err) {
              console.error('Error procesando mensaje:', err);
            }
          }
        }
      }
    });

    return sock;

  } catch (err) {
    console.error('💥 Error al conectar:', err);
    isConnecting = false;
    status = 'disconnected';
    // Retry after delay
    await delay(5000);
    connectToWhatsApp();
  }
}

export function getSocket(): WASocket | undefined {
  return sock;
}
