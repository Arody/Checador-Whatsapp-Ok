import { WASocket, proto } from '@whiskeysockets/baileys';
import { getUserByPhone, addLog, getLastLogForUser, getLocationById, getLogs } from '../db';
import { AttendanceLog } from '../types';
import { getUserMonthlyReport } from '../services/timeTracking';
import fs from 'fs-extra';
import path from 'path';

const DEBUG_FILE = path.join(process.cwd(), 'data', 'debug.log');
const TIMEZONE = 'America/Mexico_City';

// In-memory sessions: phone -> action info
interface SessionState {
  type: 'check-in' | 'check-out';
  code: string;
}
const validatedSessions = new Map<string, SessionState>();

function logDebug(txt: string) {
  const entry = `[${new Date().toLocaleString('es-MX', { timeZone: TIMEZONE })}] ${txt}\n`;
  try { fs.appendFileSync(DEBUG_FILE, entry); } catch (_) { /* ignore */ }
  console.log(txt);
}

// GPS tolerance buffer in meters (accounts for phone GPS inaccuracy)
const GPS_TOLERANCE_METERS = 30;

/**
 * Normalize Mexican phone numbers to consistent format: 52XXXXXXXXXX (12 digits).
 * WhatsApp can send either 521XXXXXXXXXX (13 digits, old mobile format)
 * or 52XXXXXXXXXX (12 digits). We strip the extra '1' to get a consistent key.
 */
function normalizePhone(raw: string): string {
  const clean = raw.replace(/\+/g, '');
  // Mexican mobile with extra '1': 521 + 10 digits = 13 chars
  if (clean.startsWith('521') && clean.length === 13) {
    return '52' + clean.substring(3);
  }
  return clean;
}

// Haversine formula: returns distance in meters between two lat/lng points
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function handleMessage(sock: WASocket, msg: proto.IWebMessageInfo) {
  if (!msg.key || !msg.key.remoteJid) return;

  // WhatsApp now sends LID (Linked Identity) as remoteJid.
  // The real phone number is in remoteJidAlt (e.g. "5219613685458@s.whatsapp.net").
  const rawJid = msg.key.remoteJid;
  const altJid = (msg.key as any).remoteJidAlt as string | undefined;

  // Use altJid (real phone) if the primary is a LID, otherwise use rawJid
  const isLid = rawJid.endsWith('@lid');
  const phoneJid = (isLid && altJid) ? altJid : rawJid;
  const remoteJid = phoneJid; // Use this for sending replies
  const rawPhone = phoneJid.split('@')[0];
  const phone = normalizePhone(rawPhone); // Always use normalized phone

  logDebug(`📨 JID: ${rawJid} | Alt: ${altJid || 'N/A'} | Raw: ${rawPhone} | Normalizado: ${phone} | PushName: ${msg.pushName}`);

  try {
    const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const locationMessage = msg.message?.locationMessage;
    const liveLocationMessage = msg.message?.liveLocationMessage;

    // --- Caso 0: Rechazar Ubicación en Tiempo Real ---
    if (liveLocationMessage) {
      logDebug(`🚫 Ubicación en tiempo real rechazada de ${phone}`);
      if (validatedSessions.has(phone)) {
        await sock.sendMessage(remoteJid, {
          text: '❌ No aceptamos ubicación en tiempo real.\n\nPor favor, envía tu *Ubicación actual*:\n1. Toca el clip (📎)\n2. Ubicación\n3. *Enviar mi ubicación actual*'
        });
      }
      return;
    }

    // --- Caso 1: Recepción de Ubicación (Completar proceso) ---
    if (locationMessage) {
      if (!validatedSessions.has(phone)) {
        // Si manda ubicación sin sesión previa válida, ignoramos silenciosamente
        logDebug(`📍 Ubicación ignorada de ${phone} (sin sesión activa)`);
        return;
      }

      const session = validatedSessions.get(phone)!;
      const user = await getUserByPhone(phone); // Re-verificar usuario por seguridad
      
      if (!user) {
        logDebug(`❌ Usuario no encontrado al procesar ubicación: ${phone}`);
        return;
      }

      const userLat = locationMessage.degreesLatitude || 0;
      const userLng = locationMessage.degreesLongitude || 0;

      // --- GEOFENCE VALIDATION ---
      let locationName: string | undefined;
      if (user.locationId) {
        const assignedLocation = await getLocationById(user.locationId);
        if (assignedLocation) {
          const distance = haversineDistance(userLat, userLng, assignedLocation.lat, assignedLocation.lng);
          const effectiveRadius = assignedLocation.radiusMeters + GPS_TOLERANCE_METERS;
          logDebug(`📏 Distancia de ${user.name} a "${assignedLocation.name}": ${Math.round(distance)}m (radio: ${assignedLocation.radiusMeters}m + ${GPS_TOLERANCE_METERS}m tolerancia = ${effectiveRadius}m)`);
          logDebug(`📍 User: (${userLat}, ${userLng}) | Ref: (${assignedLocation.lat}, ${assignedLocation.lng})`);

          if (distance > effectiveRadius) {
            await sock.sendMessage(remoteJid, {
              text: `⚠️ *Ups! No estás en tu zona de trabajo.*\n\nHola ${user.name}, intentas registrarte en *${assignedLocation.name}*, pero tu ubicación actual está fuera del área permitida.\n\nPor favor acércate a la zona de trabajo e inténtalo de nuevo. ¡Gracias!`
            });
            logDebug(`🚫 Geofence rechazado para ${user.name}: ${Math.round(distance)}m > ${effectiveRadius}m`);
            return;
          }
          locationName = assignedLocation.name;
        }
      }

      const log: AttendanceLog = {
        id: Math.random().toString(36).substring(7),
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
        type: session.type, // Usar el tipo capturado del prefijo (E/S)
        location: {
          lat: userLat,
          lng: userLng
        },
        locationName,
      };

      await addLog(log);
      validatedSessions.delete(phone); // Limpiar sesión

      const actionText = session.type === 'check-in' ? 'ENTRADA' : 'SALIDA';
      const hora = new Date().toLocaleTimeString('es-MX', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
      
      logDebug(`✅ ${actionText} registrada para ${user.name}${locationName ? ` en ${locationName}` : ''}`);

      await sock.sendMessage(remoteJid, {
        text: `✅ *¡${actionText} REGISTRADA CON ÉXITO!*\n\nHola ${user.name}, hemos guardado tu registro a las *${hora}*.\n\n¡Que tengas un excelente día! ✨`
      });
      return;
    }

    // --- Caso 2: Respuesta de Botones (Selección de Acción) ---
    const buttonResponse = msg.message?.buttonsResponseMessage?.selectedButtonId || msg.message?.templateButtonReplyMessage?.selectedId;
    
    if (buttonResponse) {
      const user = await getUserByPhone(phone);
      if (!user) return; // Should likely be registered if they got buttons, but safety check

      // Validate active
      if (!user.active) {
         logDebug(`🚫 Usuario inactivo intenta registrar via botón: ${user.name}`);
         return;
      }

      const type = buttonResponse === 'check-in' ? 'check-in' : 'check-out';
      
      // Re-use logic for validation (check existing logs)
      const allowed = await validateCycle(user, type, remoteJid, sock);
      if (!allowed) return;

      validatedSessions.set(phone, { type, code: user.code });
      logDebug(`✅ Botón "${buttonResponse}" seleccionado por ${user.name}. Esperando ubicación.`);
      
      const actionLabel = type === 'check-in' ? 'Entrada' : 'Salida';
      await sock.sendMessage(remoteJid, {
        text: `👍 Entendido ${user.name}, registremos tu *${actionLabel}*.\n\n📍 Por favor compárteme tu *Ubicación Actual* para confirmar que estás en zona.`
      });
      return;
    }

    // --- Caso 3: Recepción de Texto (Código o Comandos) ---
    if (!messageContent) return;

    const text = messageContent.trim();
    const cleanText = text.toUpperCase();

    // A. Check for EXACT code match (trigger buttons) - STRICT SECURITY
    // We fetch user by phone FIRST. Beause if phone doesn't match db, we ignore code.
    const userByPhone = await getUserByPhone(phone);
    
    // Security Check: Phone must exist AND be active
    if (!userByPhone || !userByPhone.active) {
        // Silent ignore for security
        return;
    }

    // Security Check: Code must match EXACTLY what is in DB for this phone user
    if (userByPhone.code.toUpperCase() === cleanText) {
        logDebug(`🔘 Usuario ${userByPhone.name} envió código correcto. Enviando botones.`);
        
        // Send Buttons
        await sock.sendMessage(remoteJid, {
            text: `¡Hola ${userByPhone.name}! 👋\nEs un gusto saludarte. ¿Qué deseas registrar hoy?`,
            footer: 'Selecciona una opción abajo 👇',
            buttons: [
                { buttonId: 'check-in', buttonText: { displayText: '📥 Entrada' }, type: 1 },
                { buttonId: 'check-out', buttonText: { displayText: '📤 Salida' }, type: 1 }
            ],
            headerType: 1,
            viewOnce: true
        } as any);
        return;
    }

    // B. Legacy/Fallback: Check for Prefix E/S or I (Info)
    const prefix = cleanText.charAt(0);

    // --- Caso 4: Reporte Mensual (I + Código) ---
    if (prefix === 'I') {
      const codeSent = text.substring(1).trim();
      const userByPhone = await getUserByPhone(phone);

      if (!userByPhone || !userByPhone.active) return;

      if (codeSent === userByPhone.code) {
        const logs = await getLogs();
        const report = getUserMonthlyReport(logs, userByPhone.id);

        if (report.totalHours === 0) {
          await sock.sendMessage(remoteJid, {
            text: `📅 *Reporte Mensual: ${report.monthName}*\n\nHola ${userByPhone.name}, aún no tienes horas registradas este mes.`
          });
          return;
        }

        let message = `📅 *Reporte Mensual: ${report.monthName}*\n`;
        message += `👤 ${userByPhone.name}\n\n`;
        message += `*Desglose por día:*\n`;

        report.days.forEach(day => {
          // Format Date: 2024-05-20 -> Lun 20
          const dateObj = new Date(day.date + 'T12:00:00'); // Safe middle of day
          const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', timeZone: TIMEZONE });
          message += `• ${dateStr}:  *${day.hours} hrs*\n`;
        });

        message += `\n📊 *TOTAL MES: ${report.totalHours} hrs*`;

        await sock.sendMessage(remoteJid, { text: message });
        logDebug(`✅ Reporte mensual enviado a ${userByPhone.name}`);
      } else {
        logDebug(`❌ Código erróneo para reporte de ${userByPhone?.name}`);
      }
      return;
    }

    if (prefix !== 'E' && prefix !== 'S') {
      return; 
    }

    const codeSent = text.substring(1).trim(); 
    
    // Security Check: Code matching for legacy flow
    if (codeSent === userByPhone.code) {
      const type = prefix === 'E' ? 'check-in' : 'check-out';
      
      const allowed = await validateCycle(userByPhone, type, remoteJid, sock);
      if (!allowed) return;

      validatedSessions.set(phone, { type, code: codeSent });
      
      logDebug(`✅ Código válido (${type}) de ${userByPhone.name}. Esperando ubicación.`);

      const actionLabel = type === 'check-in' ? 'Entrada' : 'Salida';

      await sock.sendMessage(remoteJid, {
        text: `✅ Código aceptado, ${userByPhone.name}.\nVamos a registrar tu *${actionLabel}*.\n\n📍 Por favor envíame tu *Ubicación Actual* ahora.`
      });
      
    } else {
      logDebug(`❌ Código erróneo de ${userByPhone.name}: Recibido "${codeSent}" vs Esperado "${userByPhone.code}"`);
      // Silent ignore
    }

  } catch (err) {
    logDebug(`💥 Error procesando mensaje de ${phone}: ${err}`);
  }
}


// Helper to validate the cycle rules (double check-in, etc)
async function validateCycle(user: any, type: 'check-in' | 'check-out', remoteJid: string, sock: any): Promise<boolean> {
    const now = new Date();
    const mexicoDate = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
    const todayStr = mexicoDate.toISOString().split('T')[0];

    const lastLog = await getLastLogForUser(user.id);
    
    if (type === 'check-in') {
      const lastLogDate = lastLog ? new Date(new Date(lastLog.timestamp).toLocaleString('en-US', { timeZone: TIMEZONE })).toISOString().split('T')[0] : null;

      if (lastLog && lastLog.type === 'check-in' && lastLogDate === todayStr) {
           const lastTime = new Date(lastLog.timestamp).toLocaleTimeString('es-MX', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
           await sock.sendMessage(remoteJid, {
              text: `❌ *Ya tienes una ENTRADA hoy*.\n\nRegistrada a las: ${lastTime}.\nDebes registrar tu *Salida* (S) primero.`
           });
           logDebug(`🚫 Intento de doble ENTRADA (mismo día) rechazado para ${user.name}`);
           return false;
      }
    } else if (type === 'check-out') {
      if (!lastLog) {
           await sock.sendMessage(remoteJid, { text: `❌ *No tienes una Entrada registrada*.\n\nPrimero debes registrar tu *Entrada* (E).` });
           return false;
      }
      
      if (lastLog.type === 'check-out') {
           const lastTime = new Date(lastLog.timestamp).toLocaleTimeString('es-MX', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
           const lastLogDate = new Date(new Date(lastLog.timestamp).toLocaleString('en-US', { timeZone: TIMEZONE })).toISOString().split('T')[0];
           
           if (lastLogDate === todayStr) {
               await sock.sendMessage(remoteJid, {
                  text: `❌ *Ya registraste tu SALIDA de hoy*.\n\nRegistrada a las: ${lastTime}.`
               });
               logDebug(`🚫 Intento de doble SALIDA (mismo día) rechazado para ${user.name}`);
               return false;
           }
           if (lastLogDate !== todayStr) {
               await sock.sendMessage(remoteJid, {
                  text: `❌ *No tienes una Entrada activa hoy*.\n\nTu último registro fue una Salida el ${lastLogDate}.\nRegistra tu *Entrada* (E) primero.`
               });
               return false;
           }
      }
    }
    return true;
}
