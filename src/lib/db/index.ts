import fs from 'fs-extra';
import path from 'path';
import { User, AttendanceLog, Location } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.json');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

// --- User Operations ---

export async function getUsers(): Promise<User[]> {
  try {
    if (!fs.existsSync(USERS_FILE)) await fs.writeJson(USERS_FILE, []);
    return await fs.readJson(USERS_FILE);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

export async function saveUser(user: User): Promise<void> {
  const users = await getUsers();
  const existingIndex = users.findIndex((u) => u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  await fs.writeJson(USERS_FILE, users, { spaces: 2 });
}

export async function deleteUser(id: string): Promise<void> {
  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== id);
  await fs.writeJson(USERS_FILE, filtered, { spaces: 2 });
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const users = await getUsers();
  
  /**
   * Extract the 10-digit base number from a Mexican phone.
   * Handles: +521XXXXXXXXXX, 521XXXXXXXXXX, 52XXXXXXXXXX, XXXXXXXXXX
   */
  function extractBase(raw: string): string {
    const clean = raw.replace(/\+/g, '');
    if (clean.startsWith('521') && clean.length === 13) {
      return clean.substring(3); // 521 + 10 digits
    }
    if (clean.startsWith('52') && clean.length === 12) {
      return clean.substring(2); // 52 + 10 digits
    }
    if (clean.length === 10) {
      return clean; // Already 10 digits
    }
    return clean; // Fallback: return as-is
  }

  const incomingBase = extractBase(phone);
  
  return users.find((u) => {
    const userBase = extractBase(u.phone);
    return userBase === incomingBase;
  });
}


// --- Log Operations ---

export async function getLogs(): Promise<AttendanceLog[]> {
    try {
      if (!fs.existsSync(LOGS_FILE)) await fs.writeJson(LOGS_FILE, []);
      return await fs.readJson(LOGS_FILE);
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  }

export async function addLog(log: AttendanceLog): Promise<void> {
  const logs = await getLogs();
  logs.push(log);
  await fs.writeJson(LOGS_FILE, logs, { spaces: 2 });
}

export async function getLastLogForUser(userId: string): Promise<AttendanceLog | undefined> {
  const logs = await getLogs();
  // Sort by timestamp desc
  const userLogs = logs.filter(l => l.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return userLogs[0];
}

export async function deleteLog(id: string): Promise<void> {
  const logs = await getLogs();
  const filtered = logs.filter((l) => l.id !== id);
  await fs.writeJson(LOGS_FILE, filtered, { spaces: 2 });
}

// --- Location Operations ---

export async function getLocations(): Promise<Location[]> {
  try {
    if (!fs.existsSync(LOCATIONS_FILE)) await fs.writeJson(LOCATIONS_FILE, []);
    return await fs.readJson(LOCATIONS_FILE);
  } catch (error) {
    console.error('Error reading locations:', error);
    return [];
  }
}

export async function saveLocation(location: Location): Promise<void> {
  const locations = await getLocations();
  const existingIndex = locations.findIndex((l) => l.id === location.id);
  if (existingIndex >= 0) {
    locations[existingIndex] = location;
  } else {
    locations.push(location);
  }
  await fs.writeJson(LOCATIONS_FILE, locations, { spaces: 2 });
}

export async function deleteLocation(id: string): Promise<void> {
  const locations = await getLocations();
  const filtered = locations.filter((l) => l.id !== id);
  await fs.writeJson(LOCATIONS_FILE, filtered, { spaces: 2 });
}

export async function getLocationById(id: string): Promise<Location | undefined> {
  const locations = await getLocations();
  return locations.find((l) => l.id === id);
}
