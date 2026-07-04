import { NextRequest, NextResponse } from "next/server";
import { JWTPayload, verifyToken } from "./security";

const OFFICE_LOCATION = {
  latitude: 21.190391,
  longitude: 72.887242,
  radius: 30,
};

export interface AuthResult {
  user?: JWTPayload;
  response?: NextResponse;
}

export function requireAuth(request: NextRequest): AuthResult {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      ),
    };
  }

  const user = verifyToken(authHeader.substring(7));
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      ),
    };
  }

  return { user };
}

export function requireAdmin(request: NextRequest): AuthResult {
  const auth = requireAuth(request);
  if (auth.response || !auth.user) return auth;

  if (auth.user.role !== "admin") {
    return {
      response: NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      ),
    };
  }

  return auth;
}

export function canAccessEmployee(user: JWTPayload, employeeName?: string): boolean {
  return user.role === "admin" || (!!employeeName && user.name === employeeName);
}

export function forbiddenResponse() {
  return NextResponse.json(
    { error: "Forbidden - You can only access your own records" },
    { status: 403 }
  );
}

export function sanitizeEmployee<T extends { password?: string }>(employee: T) {
  const { password, ...safeEmployee } = employee;
  return safeEmployee;
}

export function parseLocation(location: string): { latitude: number; longitude: number } | null {
  const match = location.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function isWithinOfficeRadius(latitude: number, longitude: number): boolean {
  const distance = calculateDistance(
    OFFICE_LOCATION.latitude,
    OFFICE_LOCATION.longitude,
    latitude,
    longitude
  );

  return distance <= OFFICE_LOCATION.radius;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadius = 6371e3;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
