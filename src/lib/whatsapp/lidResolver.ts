import fs from 'fs-extra';
import path from 'path';

const PERSIST_PATH = path.join(process.cwd(), 'data', 'lid_map.json');

// In-memory LID → Phone JID map
// Key: LID (e.g. "ABC123@lid"), Value: Phone JID (e.g. "5219611234567@s.whatsapp.net")
const lidMap = new Map<string, string>();

// --- Persistence ---

export async function loadFromDisk(): Promise<void> {
  try {
    if (await fs.pathExists(PERSIST_PATH)) {
      const data = await fs.readJson(PERSIST_PATH);
      if (data && typeof data === 'object') {
        for (const [lid, phone] of Object.entries(data)) {
          if (typeof phone === 'string') {
            lidMap.set(lid, phone);
          }
        }
      }
      console.log(`📇 LID Map cargado: ${lidMap.size} contactos`);
    }
  } catch (error) {
    console.error('Error loading LID map from disk:', error);
  }
}

async function saveToDisk(): Promise<void> {
  try {
    const obj: Record<string, string> = {};
    lidMap.forEach((phone, lid) => {
      obj[lid] = phone;
    });
    await fs.writeJson(PERSIST_PATH, obj, { spaces: 2 });
  } catch (error) {
    console.error('Error saving LID map to disk:', error);
  }
}

// --- Contact Registration ---

export function registerContact(lid: string, phoneJid: string): void {
  if (!lid || !phoneJid) return;
  // Only store if the lid is actually a LID and phoneJid is a real phone
  if (lid.endsWith('@lid') && phoneJid.endsWith('@s.whatsapp.net')) {
    const existed = lidMap.has(lid);
    lidMap.set(lid, phoneJid);
    if (!existed) {
      console.log(`📇 Nuevo LID registrado: ${lid} → ${phoneJid}`);
    }
  }
}

/**
 * Process contacts.upsert events from Baileys.
 * Each contact may have: id (could be LID or phone), lid, name, notify, etc.
 */
export function handleContactsUpsert(contacts: any[]): void {
  let newCount = 0;
  for (const contact of contacts) {
    const id = contact.id as string | undefined;       // Could be phone JID or LID
    const lid = contact.lid as string | undefined;      // Explicit LID field

    // Case 1: id is a phone JID and lid is provided
    if (id && id.endsWith('@s.whatsapp.net') && lid) {
      if (!lidMap.has(lid)) newCount++;
      registerContact(lid, id);
    }

    // Case 2: id is a LID and there's no phone JID in the contact
    // (We can't resolve this one, but at least we know the LID exists)

    // Case 3: Some Baileys versions put the phone in a different field
    const verifiedName = contact.verifiedName as string | undefined;
    const phone = contact.phone as string | undefined;
    if (lid && phone) {
      const phoneJid = phone.replace(/\+/g, '') + '@s.whatsapp.net';
      if (!lidMap.has(lid)) newCount++;
      registerContact(lid, phoneJid);
    }
  }

  if (newCount > 0) {
    console.log(`📇 ${newCount} nuevos contactos LID registrados (total: ${lidMap.size})`);
    saveToDisk(); // Persist after batch update
  }
}

// --- Resolution ---

/**
 * Resolve a JID to a phone JID using all available strategies.
 * Returns the phone JID (e.g. "5219611234567@s.whatsapp.net") or null if unresolved.
 */
export function resolveJid(rawJid: string): string | null {
  // Not a LID — return as-is (it's already a phone JID)
  if (!rawJid.endsWith('@lid')) {
    return rawJid;
  }

  // Look up in our LID map
  const resolved = lidMap.get(rawJid);
  if (resolved) {
    return resolved;
  }

  return null; // Unresolved
}

/**
 * Get the current size of the LID map (for diagnostics).
 */
export function getMapSize(): number {
  return lidMap.size;
}
