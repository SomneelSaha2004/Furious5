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
  lastPing?: number;
  disconnectTimer?: NodeJS.Timeout;
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

  function scheduleDisconnect(socket: ExtendedWebSocket): void {
    // Clear any existing timer
    if (socket.disconnectTimer) {
      clearTimeout(socket.disconnectTimer);
    }
    
    // Set a 1-minute grace period before marking as disconnected
    socket.disconnectTimer = setTimeout(async () => {
      if (socket.roomCode && socket.playerId) {
        console.log(`Player ${socket.playerId} marked as disconnected after grace period`);
        await updatePlayerConnection(socket.roomCode, socket.playerId, false);
      }
    }, 60000); // 60 second grace period
  }

  function cancelDisconnect(socket: ExtendedWebSocket): void {
    if (socket.disconnectTimer) {
      clearTimeout(socket.disconnectTimer);
      socket.disconnectTimer = undefined;
    }
  }
  
  wss.on('connection', (socket: ExtendedWebSocket) => {
    console.log('New WebSocket connection');
    
    // Initialize ping tracking
    socket.lastPing = Date.now();
    
    // Handle ping/pong for connection health
    socket.on('pong', () => {
      socket.lastPing = Date.now();
      cancelDisconnect(socket);
    });
    
    socket.on('message', async (data) => {
      try {
        const message: SocketMessage = JSON.parse(data.toString());
        
        // Update last activity timestamp for any message
        socket.lastPing = Date.now();
        cancelDisconnect(socket);
        
        switch (message.type) {
          case 'ping': {
            // Respond to ping with pong
            sendToSocket(socket, { type: 'pong', data: {} });
            break;
          }
          case 'room:create': {
            const parsed = CreateRoomSchema.parse(message.data);
            const roomCode = generateRoomCode();
            const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log(`Creating room ${roomCode} for player ${parsed.playerName} (${playerId})`);
            
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
            
            console.log(`Sending room:created event for ${roomCode}`);
            sendToSocket(socket, {
              type: 'room:created',
              data: { roomCode, playerId }
            });
            
            console.log(`Sending initial state update for ${roomCode}`);
            sendToSocket(socket, {
              type: 'state:update',
              data: gameState
            });
            
            break;
          }
          
          case 'room:join': {
            const parsed = JoinRoomSchema.parse(message.data);
            console.log(`Player attempting to join room: ${parsed.roomCode} as ${parsed.playerName}`);
            
            const gameState = await storage.getRoom(parsed.roomCode);
            
            if (!gameState) {
              console.log(`Room not found: ${parsed.roomCode}`);
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            if (gameState.phase !== 'lobby') {
              console.log(`Game already in progress in room: ${parsed.roomCode}`);
              sendError(socket, 'GAME_IN_PROGRESS', 'Game already in progress');
              break;
            }
            
            // Check if player is already in this room (prevent duplicate joins)
            if (gameState.players.some(p => p.name === parsed.playerName)) {
              console.log(`Player ${parsed.playerName} already in room ${parsed.roomCode}`);
              sendError(socket, 'PLAYER_ALREADY_EXISTS', 'A player with that name is already in the room');
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
              
              console.log(`Player ${parsed.playerName} successfully joined room ${parsed.roomCode}`);
              
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
              console.log(`Failed to join room: ${(error as Error).message}`);
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
              const updatedState = applyDrop(gameState, socket.playerId, parsed.drop as any);
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
              const player = gameState.players.find(p => p.id === socket.playerId);
              const updatedState = drawFromDeck(gameState, socket.playerId);
              checkInvariants(updatedState);
              await storage.updateRoom(socket.roomCode, updatedState);
              
              // Send notification to all players
              broadcastToRoom(socket.roomCode, {
                type: 'notification',
                data: {
                  message: `${player?.name || 'Player'} drew from deck`,
                  type: 'info'
                }
              });
              
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
              const player = gameState.players.find(p => p.id === socket.playerId);
              const cardTaken = gameState.tableDrop?.cards[parsed.cardIndex];
              
              const updatedState = drawFromTable(gameState, socket.playerId, parsed.cardIndex);
              checkInvariants(updatedState);
              await storage.updateRoom(socket.roomCode, updatedState);
              
              // Send notification to all players with card details
              if (cardTaken) {
                const cardName = cardTaken.r === 1 ? 'A' : 
                                cardTaken.r === 11 ? 'J' : 
                                cardTaken.r === 12 ? 'Q' : 
                                cardTaken.r === 13 ? 'K' : 
                                cardTaken.r.toString();
                const suit = cardTaken.s === 'H' ? '♥' : 
                            cardTaken.s === 'D' ? '♦' : 
                            cardTaken.s === 'C' ? '♣' : '♠';
                
                broadcastToRoom(socket.roomCode, {
                  type: 'notification',
                  data: {
                    message: `${player?.name || 'Player'} drew ${cardName}${suit} from pile`,
                    type: 'info'
                  }
                });
              }
              
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
          
          case 'game:getState': {
            if (!socket.roomCode) {
              sendError(socket, 'NOT_IN_ROOM', 'Not in a room');
              break;
            }
            
            const gameState = await storage.getRoom(socket.roomCode);
            if (!gameState) {
              sendError(socket, 'ROOM_NOT_FOUND', 'Room not found');
              break;
            }
            
            console.log(`Sending current game state for room ${socket.roomCode}`);
            sendToSocket(socket, {
              type: 'state:update',
              data: gameState
            });
            
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
        
        // Start grace period instead of immediately disconnecting
        scheduleDisconnect(socket);
      }
    });
    
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Periodic health check for all connections
  setInterval(() => {
    roomConnections.forEach((connections, roomCode) => {
      connections.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          // Send ping to client
          socket.ping();
          
          // Check if we haven't heard from this socket in too long
          const timeSinceLastPing = Date.now() - (socket.lastPing || 0);
          if (timeSinceLastPing > 30000) { // 30 seconds
            console.log(`No response from ${socket.playerId} in ${timeSinceLastPing}ms, scheduling disconnect`);
            scheduleDisconnect(socket);
          }
        }
      });
    });
  }, 10000); // Check every 10 seconds
  
  // HTTP endpoints as backup for room operations
  app.post('/api/rooms', async (req, res) => {
    try {
      const parsed = CreateRoomSchema.parse(req.body);
      const roomCode = generateRoomCode();
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`HTTP: Creating room ${roomCode} for player ${parsed.playerName} (${playerId})`);
      
      const gameState = createGame(roomCode, parsed.playerName, playerId);
      await storage.createRoom(gameState);
      
      res.json({ 
        success: true, 
        roomCode, 
        playerId,
        gameState 
      });
      
    } catch (error) {
      console.error('HTTP: Error creating room:', error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post('/api/rooms/:roomCode/join', async (req, res) => {
    try {
      const { roomCode } = req.params;
      const parsed = JoinRoomSchema.parse(req.body);
      
      console.log(`HTTP: Player attempting to join room: ${roomCode} as ${parsed.playerName}`);
      
      const gameState = await storage.getRoom(roomCode);
      
      if (!gameState) {
        console.log(`HTTP: Room not found: ${roomCode}`);
        return res.status(404).json({ 
          success: false, 
          error: 'Room not found' 
        });
      }
      
      if (gameState.phase !== 'lobby') {
        console.log(`HTTP: Game already in progress in room: ${roomCode}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Game already in progress' 
        });
      }
      
      // Check if player is already in this room (prevent duplicate joins)
      if (gameState.players.some(p => p.name === parsed.playerName)) {
        console.log(`HTTP: Player ${parsed.playerName} already in room ${roomCode}`);
        return res.status(400).json({ 
          success: false, 
          error: 'A player with that name is already in the room' 
        });
      }
      
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const updatedState = joinGame(gameState, parsed.playerName, playerId);
      await storage.updateRoom(roomCode, updatedState);
      
      console.log(`HTTP: Player ${parsed.playerName} successfully joined room ${roomCode}`);
      
      // Also broadcast to WebSocket connections if any exist
      broadcastToRoom(roomCode, {
        type: 'state:update',
        data: updatedState
      });
      
      res.json({ 
        success: true, 
        playerId,
        gameState: updatedState 
      });
      
    } catch (error) {
      console.error('HTTP: Error joining room:', error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get('/api/rooms/:roomCode', async (req, res) => {
    try {
      const { roomCode } = req.params;
      const gameState = await storage.getRoom(roomCode);
      
      if (!gameState) {
        return res.status(404).json({ 
          success: false, 
          error: 'Room not found' 
        });
      }
      
      res.json({ 
        success: true, 
        gameState 
      });
      
    } catch (error) {
      console.error('HTTP: Error getting room:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  return httpServer;
}
