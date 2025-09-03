import type { GameState } from "@shared/game-types";
import { randomUUID } from "crypto";

export interface IStorage {
  createRoom(gameState: GameState): Promise<string>;
  getRoom(roomCode: string): Promise<GameState | undefined>;
  updateRoom(roomCode: string, gameState: GameState): Promise<void>;
  deleteRoom(roomCode: string): Promise<void>;
  listActiveRooms(): Promise<string[]>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, GameState>;
  private lastActivity: Map<string, number>;

  constructor() {
    this.rooms = new Map();
    this.lastActivity = new Map();
    
    // Clean up inactive rooms every 30 minutes
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 30 * 60 * 1000);
  }

  async createRoom(gameState: GameState): Promise<string> {
    this.rooms.set(gameState.roomCode, gameState);
    this.lastActivity.set(gameState.roomCode, Date.now());
    return gameState.roomCode;
  }

  async getRoom(roomCode: string): Promise<GameState | undefined> {
    const room = this.rooms.get(roomCode);
    if (room) {
      this.lastActivity.set(roomCode, Date.now());
    }
    return room;
  }

  async updateRoom(roomCode: string, gameState: GameState): Promise<void> {
    if (!this.rooms.has(roomCode)) {
      throw new Error('Room not found');
    }
    this.rooms.set(roomCode, gameState);
    this.lastActivity.set(roomCode, Date.now());
  }

  async deleteRoom(roomCode: string): Promise<void> {
    this.rooms.delete(roomCode);
    this.lastActivity.delete(roomCode);
  }

  async listActiveRooms(): Promise<string[]> {
    return Array.from(this.rooms.keys());
  }

  private cleanupInactiveRooms(): void {
    const now = Date.now();
    const maxInactiveTime = 2 * 60 * 60 * 1000; // 2 hours
    
    for (const [roomCode, lastActive] of this.lastActivity) {
      if (now - lastActive > maxInactiveTime) {
        this.rooms.delete(roomCode);
        this.lastActivity.delete(roomCode);
        console.log(`Cleaned up inactive room: ${roomCode}`);
      }
    }
  }
}

export const storage = new MemStorage();
