import bcrypt from "bcryptjs";
import { readJsonFile, writeJsonFile } from "./data-dir";
import type { User } from "@/types/domain";

interface StoredUser extends User {
  passwordHash: string;
}

const FILE = "users.json";
const DEMO_EMAIL = "demo@jiwonnote.app";

function readAll(): StoredUser[] {
  return readJsonFile<StoredUser[]>(FILE, []);
}

function writeAll(users: StoredUser[]): void {
  writeJsonFile(FILE, users);
}

function generateId(): string {
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return readAll().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): StoredUser | undefined {
  return readAll().find((u) => u.id === id);
}

export async function createUser(email: string, password: string, name: string): Promise<StoredUser> {
  const users = readAll();
  const passwordHash = await bcrypt.hash(password, 10);
  const user: StoredUser = { id: generateId(), email, name, passwordHash };
  users.push(user);
  writeAll(users);
  return user;
}

export async function verifyPassword(user: StoredUser, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export function toPublicUser(user: StoredUser): User {
  return { id: user.id, email: user.email, name: user.name };
}

/** 데모 계정 버튼용 — 없으면 최초 1회 생성 */
export async function ensureDemoUser(): Promise<StoredUser> {
  const existing = findUserByEmail(DEMO_EMAIL);
  if (existing) return existing;
  return createUser(DEMO_EMAIL, "demo-session-only", "김지원");
}
