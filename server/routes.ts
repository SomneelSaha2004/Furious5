import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import type { GameState } from "@shared/game-types";
import {
  JoinRoomSchema,
  CreateRoomSchema,
  DropCardsSchema,
  DrawFromTableSchema,
  GameStateSchema,
  ErrorSchema,
  type DropCardsData
} from "@shared/game-types";
import {
  createGame,
  joinGame,
  startRound,
  applyDrop,
  drawFromDeck,
  drawFromTable,
  settleOnCall,
  checkInvariants
} from "@shared/game-engine";

interface ExtendedWebSocket extends WebSocket {
  playerId?: string;
  roomCode?: string;
  playerName?: string;
}

interface SocketMessage {
  type: string;
  data: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time game communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track active connections by room
  const roomConnections = new Map<string, Set<ExtendedWebSocket>>();
  
  function generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `FF-${result}`;
  }
  
  function broadcastToRoom(roomCode: string, message: any, excludeSocket?: ExtendedWebSocket): void {
    const connections = roomConnections.get(roomCode);
    if (!connections) return;
    
    const messageStr = JSON.stringify(message);
    for (const socket of Array.from(connections)) {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
      }
    }
  }
  
  function sendToSocket(socket: ExtendedWebSocket, message: any): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
  
  function sendError(socket: ExtendedWebSocket, code: string, message: string): void {
    sendToSocket(socket, {
      type: 'error',
      data: { code, message }
    });
  }
  
  async function updatePlayerConnection(roomCode: string, playerId: string, connected: boolean): Promise<void> {
    try {
      const gameState = await storage.getRoom(roomCode);
      if (!gameState) return;
      
      const playerIndex = gameState.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return;
      
      const updatedPlayers = [...gameState.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        connected
      };
      
      const updatedState: GameState = {
        ...gameState,
        players: updatedPlayers,
        version: gameState.version + 1
      };
      
      await storage.updateRoom(roomCode, updatedState);
      
      broadcastToRoom(roomCode, {
        type: 'state:update',
        data: updatedState
      });
      
    } catch (error) {
      console.error('Error updating player connection:', error);
    }
  }
  
  wss.on('connection', (socket: ExtendedWebSocket) => {
    console.log('New WebSocket connection');
    
    socket.on('message', async (data) => {
      try {
        const message: SocketMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'room:create': {
            const parsed = CreateRoomSchema.parse(message.data);
            const roomCode = generateRoomCode();
            const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const gameState = createGame(roomCode, parsed.playerName, playerId);
            await storage.createRoom(gameState);
            
            socket.playerId = playerId;
            socket.roomCode = roomCode;
            socket.playerName = parsed.playerName;
            
            // Add socket to room connections
            if (!roomConnections.has(roomCode)) {
              roomConnections.set(roomCode, new Set());
            }
            roomConnections.get(roomCode)!.add(socket);
            
            sendToSocket(socket, {
              type: 'room:created',
              data: { roomCode, playerId }
            });
            
            sendToSocket(socket, {
              type: 'state:update',
              data: gameState
            });
            
            break;
          }
          
          case 'room:join': {
            const parsed = JoinRoomSchema.parse(message.data);
            const gameState = await storage.getRoom(parsed.roomCode);
            
            if (!gameState) {
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            if (gameState.phase !== 'lobby') {
              sendError(socket, 'GAME_IN_PROGRESS', 'Game already in progress');
              break;
            }
            
            const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            try {
              const updatedState = joinGame(gameState, parsed.playerName, playerId);
              await storage.updateRoom(parsed.roomCode, updatedState);
              
              socket.playerId = playerId;
              socket.roomCode = parsed.roomCode;
              socket.playerName = parsed.playerName;
              
              // Add socket to room connections
              if (!roomConnections.has(parsed.roomCode)) {
                roomConnections.set(parsed.roomCode, new Set());
              }
              roomConnections.get(parsed.roomCode)!.add(socket);
              
              sendToSocket(socket, {
                type: 'room:joined',
                data: { roomCode: parsed.roomCode, playerId }
              });
              
              // Broadcast updated state to all players in room
              broadcastToRoom(parsed.roomCode, {
                type: 'state:update',
                data: updatedState
              });
              
            } catch (error) {
              sendError(socket, 'JOIN_FAILED', (error as Error).message);
            }
            
            break;
          }
          
          case 'game:start': {
            if (!socket.roomCode) {
              sendError(socket, 'NOT_IN_ROOM', 'Not in a room');
              break;
            }
            
            const gameState = await storage.getRoom(socket.roomCode);
            if (!gameState) {
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            try {
              const updatedState = startRound(gameState);
              checkInvariants(updatedState);
              await storage.updateRoom(socket.roomCode, updatedState);
              
              broadcastToRoom(socket.roomCode, {
                type: 'state:update',
                data: updatedState
              });
              
            } catch (error) {
              sendError(socket, 'START_FAILED', (error as Error).message);
            }
            
            break;
          }
          
          case 'turn:call': {
            if (!socket.roomCode || !socket.playerId) {
              sendError(socket, 'NOT_IN_GAME', 'Not in a game');
              break;
            }
            
            const gameState = await storage.getRoom(socket.roomCode);
            if (!gameState) {
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            try {
              const updatedState = settleOnCall(gameState, socket.playerId);
              checkInvariants(updatedState);
              await storage.updateRoom(socket.roomCode, updatedState);
              
              broadcastToRoom(socket.roomCode, {
                type: 'state:update',
                data: updatedState
              });
              
            } catch (error) {
              sendError(socket, 'CALL_FAILED', (error as Error).message);
            }
            
            break;
          }
          
          case 'turn:drop': {
            if (!socket.roomCode || !socket.playerId) {
              sendError(socket, 'NOT_IN_GAME', 'Not in a game');
              break;
            }
            
            const parsed: DropCardsData = DropCardsSchema.parse(message.data);
            const gameState = await storage.getRoom(socket.roomCode);
            
            if (!gameState) {
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            try {
              const updatedState = applyDrop(gameState, socket.playerId, parsed.drop);
              checkInvariants(updatedState);
              await storage.updateRoom(socket.roomCode, updatedState);
              
              broadcastToRoom(socket.roomCode, {
                type: 'state:update',
                data: updatedState
              });
              
            } catch (error) {
              sendError(socket, 'DROP_FAILED', (error as Error).message);
            }
            
            break;
          }
          
          case 'turn:drawDeck': {
            if (!socket.roomCode || !socket.playerId) {
              sendError(socket, 'NOT_IN_GAME', 'Not in a game');
              break;
            }
            
            const gameState = await storage.getRoom(socket.roomCode);
            if (!gameState) {
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            try {
              const updatedState = drawFromDeck(gameState, socket.playerId);
              checkInvariants(updatedState);
              await storage.updateRoom(socket.roomCode, updatedState);
              
              broadcastToRoom(socket.roomCode, {
                type: 'state:update',
                data: updatedState
              });
              
            } catch (error) {
              sendError(socket, 'DRAW_FAILED', (error as Error).message);
            }
            
            break;
          }
          
          case 'turn:drawFromTable': {
            if (!socket.roomCode || !socket.playerId) {
              sendError(socket, 'NOT_IN_GAME', 'Not in a game');
              break;
            }
            
            const parsed = DrawFromTableSchema.parse(message.data);
            const gameState = await storage.getRoom(socket.roomCode);
            
            if (!gameState) {
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            try {
              const updatedState = drawFromTable(gameState, socket.playerId, parsed.cardIndex);
              checkInvariants(updatedState);
              await storage.updateRoom(socket.roomCode, updatedState);
              
              broadcastToRoom(socket.roomCode, {
                type: 'state:update',
                data: updatedState
              });
              
            } catch (error) {
              sendError(socket, 'DRAW_FAILED', (error as Error).message);
            }
            
            break;
          }
          
          case 'round:new': {
            if (!socket.roomCode) {
              sendError(socket, 'NOT_IN_ROOM', 'Not in a room');
              break;
            }
            
            const gameState = await storage.getRoom(socket.roomCode);
            if (!gameState) {
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            try {
              const updatedState = startRound({
                ...gameState,
                phase: 'playing',
                settlement: null
              });
              checkInvariants(updatedState);
              await storage.updateRoom(socket.roomCode, updatedState);
              
              broadcastToRoom(socket.roomCode, {
                type: 'state:update',
                data: updatedState
              });
              
            } catch (error) {
              sendError(socket, 'NEW_ROUND_FAILED', (error as Error).message);
            }
            
            break;
          }
          
          default:
            sendError(socket, 'UNKNOWN_MESSAGE', `Unknown message type: ${message.type}`);
        }
        
      } catch (error) {
        console.error('Error handling message:', error);
        sendError(socket, 'PARSE_ERROR', 'Invalid message format');
      }
    });
    
    socket.on('close', async () => {
      console.log('WebSocket connection closed');
      
      if (socket.roomCode && socket.playerId) {
        // Remove from room connections
        const connections = roomConnections.get(socket.roomCode);
        if (connections) {
          connections.delete(socket);
          if (connections.size === 0) {
            roomConnections.delete(socket.roomCode);
          }
        }
        
        // Update player connection status
        await updatePlayerConnection(socket.roomCode, socket.playerId, false);
      }
    });
    
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  return httpServer;
}
