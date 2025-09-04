import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@shared/game-types';
import { gameSocket } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

interface UseGameSocketReturn {
  gameState: GameState | null;
  playerId: string | null;
  roomCode: string | null;
  isConnected: boolean;
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  call: () => void;
  dropCards: (cards: any[], kind: string) => void;
  drawFromDeck: () => void;
  drawFromTable: (cardIndex: number) => void;
  startNewRound: () => void;
  requestGameState: () => void;
  clearRoom: () => void;
}

export function useGameSocket(): UseGameSocketReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => 
    localStorage.getItem('furious-five-player-id')
  );
  const [roomCode, setRoomCode] = useState<string | null>(() => 
    localStorage.getItem('furious-five-room-code')
  );
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  
  // Persist to localStorage when states change
  useEffect(() => {
    if (playerId) {
      localStorage.setItem('furious-five-player-id', playerId);
    } else {
      localStorage.removeItem('furious-five-player-id');
    }
  }, [playerId]);
  
  useEffect(() => {
    if (roomCode) {
      localStorage.setItem('furious-five-room-code', roomCode);
      console.log('Saved roomCode to localStorage:', roomCode);
    } else {
      localStorage.removeItem('furious-five-room-code');
      console.log('Removed roomCode from localStorage');
    }
  }, [roomCode]);
  
  useEffect(() => {
    // Set up message handlers
    gameSocket.on('room:created', (data) => {
      console.log('Room created:', data);
      console.log('Setting roomCode to:', data.roomCode);
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      toast({
        title: "Room Created",
        description: `Room code: ${data.roomCode}. Click "Go to Lobby" to join.`,
        duration: 5000,
      });
    });
    
    gameSocket.on('room:joined', (data) => {
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      toast({
        title: "Room Joined",
        description: `Joined room: ${data.roomCode}`,
      });
    });
    
    gameSocket.on('state:update', (data: GameState) => {
      console.log('Received state update:', data);
      setGameState(data);
    });

    gameSocket.on('notification', (data) => {
      toast({
        description: data.message,
        duration: 3000,
      });
    });
    
    gameSocket.on('error', (data) => {
      toast({
        title: "Error",
        description: data.message,
        variant: "destructive",
      });
    });
    
    // Monitor connection status
    const checkConnection = () => {
      setIsConnected(gameSocket.isConnected());
    };
    
    const interval = setInterval(checkConnection, 1000);
    
    return () => {
      clearInterval(interval);
      gameSocket.off('room:created');
      gameSocket.off('room:joined');
      gameSocket.off('state:update');
      gameSocket.off('notification');
      gameSocket.off('error');
    };
  }, [toast]);
  
  const createRoom = useCallback((playerName: string) => {
    console.log('Creating room for player:', playerName);
    console.log('Socket connected:', gameSocket.isConnected());
    if (!gameSocket.isConnected()) {
      toast({
        title: "Connection Error",
        description: "Not connected to server. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    gameSocket.send('room:create', { playerName });
  }, [toast]);
  
  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    gameSocket.send('room:join', { roomCode, playerName });
  }, []);
  
  const startGame = useCallback(() => {
    gameSocket.send('game:start');
  }, []);
  
  const call = useCallback(() => {
    gameSocket.send('turn:call');
  }, []);
  
  const dropCards = useCallback((cards: any[], kind: string) => {
    gameSocket.send('turn:drop', {
      drop: { kind, cards }
    });
  }, []);
  
  const drawFromDeck = useCallback(() => {
    gameSocket.send('turn:drawDeck');
  }, []);
  
  const drawFromTable = useCallback((cardIndex: number) => {
    gameSocket.send('turn:drawFromTable', { cardIndex });
  }, []);
  
  const startNewRound = useCallback(() => {
    gameSocket.send('round:new');
  }, []);
  
  const requestGameState = useCallback(() => {
    console.log('Requesting current game state...');
    if (roomCode && playerId) {
      gameSocket.send('game:getState', { roomCode, playerId });
    }
  }, [roomCode, playerId]);
  
  const clearRoom = useCallback(() => {
    console.log('Clearing room and player data...');
    // Clear localStorage first, then set state to null
    localStorage.removeItem('furious-five-room-code');
    localStorage.removeItem('furious-five-player-id');
    setRoomCode(null);
    setPlayerId(null);
    setGameState(null);
  }, []);
  
  return {
    gameState,
    playerId,
    roomCode,
    isConnected,
    createRoom,
    joinRoom,
    startGame,
    call,
    dropCards,
    drawFromDeck,
    drawFromTable,
    startNewRound,
    requestGameState,
    clearRoom,
  };
}
