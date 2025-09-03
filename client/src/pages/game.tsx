import { useLocation } from 'wouter';
import { LobbyView } from '@/components/lobby-view';
import { GameTableView } from '@/components/game-table-view';
import { SettlementView } from '@/components/settlement-view';
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
    startNewRound 
  } = useGameSocket();
  
  // Redirect to home if not in a room
  if (!roomCode || !playerId) {
    setLocation('/');
    return null;
  }
  
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      
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
              onClick={() => setLocation('/')}
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
          
          {gameState.phase === 'lobby' && (
            <LobbyView 
              gameState={gameState} 
              onStartGame={startGame} 
            />
          )}
          
          {gameState.phase === 'playing' && (
            <GameTableView
              gameState={gameState}
              playerId={playerId}
              onCall={call}
              onDropCards={dropCards}
              onDrawFromDeck={drawFromDeck}
              onDrawFromTable={drawFromTable}
            />
          )}
          
          {gameState.phase === 'settlement' && (
            <SettlementView
              gameState={gameState}
              onStartNewRound={startNewRound}
            />
          )}
          
        </div>
      </main>
      
    </div>
  );
}
