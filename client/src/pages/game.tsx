import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { LobbyView } from '@/components/lobby-view';
import { GameTableView } from '@/components/game-table-view';
import { SettlementView } from '@/components/settlement-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { useGameSocket } from '@/hooks/use-game-socket';

export default function Game() {
  const [, setLocation] = useLocation();
  const { 
    gameState, 
    playerId, 
    roomCode, 
    isConnected,
    startGame,
    call,
    dropCards,
    drawFromDeck,
    drawFromTable,
    startNewRound,
    requestGameState,
    joinRoom,
    clearRoom
  } = useGameSocket();
  
  // Simplified: Just show what we have or redirect home
  useEffect(() => {
    if (!roomCode && !playerId) {
      // No room info, go home
      const timer = setTimeout(() => setLocation('/'), 1000);
      return () => clearTimeout(timer);
    }
  }, [roomCode, playerId, setLocation]);
  
  // Redirect to home if not in a room (with delay to allow socket to connect)
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!roomCode || !playerId) {
        setShouldRedirect(true);
      }
    }, 2000); // Give 2 seconds for connection to establish
    
    return () => clearTimeout(timer);
  }, [roomCode, playerId]);
  
  useEffect(() => {
    if (shouldRedirect) {
      setLocation('/');
    }
  }, [shouldRedirect, setLocation]);
  
  // Show loading while checking connection
  if (!roomCode || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4" />
          <p className="text-muted-foreground">Connecting to game...</p>
        </div>
      </div>
    );
  }
  
  // Try to fetch room state via HTTP if WebSocket isn't working
  const [httpGameState, setHttpGameState] = useState<GameState | null>(null);
  
  useEffect(() => {
    if (!gameState && roomCode) {
      // Try fetching room state via HTTP
      const fetchRoomState = async () => {
        try {
          console.log('Fetching room state via HTTP for room:', roomCode);
          const response = await fetch(`/api/rooms/${roomCode}`);
          const data = await response.json();
          
          if (data.success && data.gameState) {
            console.log('Successfully fetched room state via HTTP');
            setHttpGameState(data.gameState);
          } else {
            console.log('HTTP fetch failed:', data.error);
          }
        } catch (error) {
          console.error('Error fetching room state via HTTP:', error);
        }
      };
      
      // Wait a bit for WebSocket, then try HTTP
      const timer = setTimeout(fetchRoomState, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, roomCode]);

  // Use WebSocket game state if available, otherwise use HTTP state, otherwise mock state
  const effectiveGameState = gameState || httpGameState || {
    roomCode: roomCode || 'FF-TEST',
    players: [
      { id: playerId || 'player1', name: 'You', hand: [], score: 0, isReady: false },
    ],
    phase: 'lobby' as const,
    currentPlayerId: null,
    deck: [],
    tableCards: [],
    lastAction: null,
    roundNumber: 1,
    winner: null,
    currentPlayerIndex: 0,
  };

  if (!gameState && !httpGameState) {
    console.log('No gameState available. roomCode:', roomCode, 'playerId:', playerId);
    console.log('Using mock state for testing...');
  } else if (!gameState && httpGameState) {
    console.log('Using HTTP-fetched game state');
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Theme Toggle */}
      <div className="fixed top-6 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Game Header */}
      <header className="bg-card border-b border-border p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-cards text-primary text-2xl" />
              <h1 className="text-2xl font-bold text-foreground">Furious Five</h1>
            </div>
            <div className="bg-muted px-3 py-1 rounded-md">
              <span className="text-sm text-muted-foreground">Room:</span>
              <span className="font-mono font-bold ml-1" data-testid="room-code">
                {roomCode}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-primary' : 'bg-destructive'
              }`} data-testid="connection-indicator" />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <button 
              className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-md text-secondary-foreground font-medium transition-colors"
              onClick={() => {
                // Use the clearRoom function from the hook to properly clear all state
                clearRoom();
                console.log('Cleared room state and leaving game');
                setLocation('/');
              }}
              data-testid="button-leave-game"
            >
              <i className="fas fa-arrow-left mr-2" />
              Leave Game
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Game Area */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto h-full">
          
          {effectiveGameState.phase === 'lobby' && (
            <LobbyView 
              gameState={effectiveGameState} 
              onStartGame={startGame} 
            />
          )}
          
          {effectiveGameState.phase === 'playing' && (
            <GameTableView
              gameState={effectiveGameState}
              playerId={playerId}
              onCall={call}
              onDropCards={dropCards}
              onDrawFromDeck={drawFromDeck}
              onDrawFromTable={drawFromTable}
            />
          )}
          
          {effectiveGameState.phase === 'settlement' && (
            <SettlementView
              gameState={effectiveGameState}
              onStartNewRound={startNewRound}
            />
          )}
          
        </div>
      </main>
      
    </div>
  );
}
