export interface Location {
  id: string;
  name: string;       // e.g. "Oficina Central"
  lat: number;
  lng: number;
  radiusMeters: number; // Geofence radius in meters
}

export interface User {
  id: string;
  name: string;
  phone: string; // Format: 521XXXXXXXXXX
  role: 'admin' | 'employee';
  code: string; // Unique code for check-in/out
  active: boolean;
  locationId?: string; // Assigned geofence location
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string; // Denormalized for easier display
  timestamp: string; // ISO String
  type: 'check-in' | 'check-out';
  location?: {
    lat: number;
    lng: number;
  };
  locationName?: string; // Geofence location name (denormalized)
}
