import { Card } from './card';
import { PlayerHand } from './player-hand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GameState, Player, Card as CardType } from '@shared/game-types';
import { canDrawFromTable, sumPoints, sortCardsForDisplay } from '@shared/game-engine';

interface GameTableViewProps {
  gameState: GameState;
  playerId: string;
  onCall: () => void;
  onDropCards: (cards: CardType[], kind: string) => void;
  onDrawFromDeck: () => void;
  onDrawFromTable: (cardIndex: number) => void;
}

export function GameTableView({ 
  gameState, 
  playerId, 
  onCall, 
  onDropCards, 
  onDrawFromDeck, 
  onDrawFromTable 
}: GameTableViewProps) {
  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.players[gameState.turnIdx]?.id === playerId;
  const currentTurnPlayer = gameState.players[gameState.turnIdx];
  
  const canDrawFromTableNow = isMyTurn && 
    (gameState.turnStage === 'start' || gameState.turnStage === 'dropped') && 
    gameState.tableDrop;
  
  const getPlayerPosition = (playerIndex: number, totalPlayers: number) => {
    const myIndex = gameState.players.findIndex(p => p.id === playerId);
    if (myIndex === -1) return playerIndex;
    
    // Adjust positions so current player is at bottom
    const adjustedIndex = (playerIndex - myIndex + totalPlayers) % totalPlayers;
    return adjustedIndex;
  };
  
  const renderOtherPlayer = (player: Player, index: number) => {
    const position = getPlayerPosition(index, gameState.players.length);
    const isCurrentTurn = gameState.players[gameState.turnIdx]?.id === player.id;
    
    // Position classes based on adjusted index
    let positionClass = '';
    switch (position) {
      case 1:
        positionClass = 'absolute top-0 left-1/4 transform -translate-x-1/2';
        break;
      case 2:
        positionClass = 'absolute top-0 right-1/4 transform translate-x-1/2';
        break;
      case 3:
        positionClass = 'absolute left-0 top-1/2 transform -translate-y-1/2';
        break;
      case 4:
        positionClass = 'absolute right-0 top-1/2 transform -translate-y-1/2';
        break;
      default:
        return null; // Don't render current player here
    }
    
    return (
      <div key={player.id} className={cn(
        'player-position bg-card/90 backdrop-blur rounded-lg p-4',
        isCurrentTurn && 'current-turn ring-2 ring-accent ring-opacity-75',
        positionClass
      )}>
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-full mx-auto mb-2 flex items-center justify-center">
            <span className="text-primary-foreground font-bold">
              {player.name[0]?.toUpperCase()}
            </span>
          </div>
          <div className="text-sm font-medium" data-testid={`player-name-${index}`}>
            {player.name}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {player.hand.length} cards
          </div>
          <div className="flex items-center justify-center space-x-1">
            <div className="chip-stack w-6 h-6 flex items-center justify-center">
              <span className="text-xs font-bold text-accent-foreground">
                {player.chipDelta >= 0 ? '+' : ''}{player.chipDelta}
              </span>
            </div>
          </div>
        </div>
        
        {/* Player's face-down cards */}
        <div className={cn(
          "flex mt-3 justify-center",
          position === 3 || position === 4 ? "flex-col space-y-1 items-center" : "space-x-1"
        )}>
          {Array.from({ length: player.hand.length }).map((_, cardIndex) => (
            <Card
              key={cardIndex}
              card={{ r: 1, s: 'C' }} // Placeholder
              faceDown={true}
              size="sm"
            />
          ))}
        </div>
      </div>
    );
  };
  
  const getDropKindDisplay = (kind: string) => {
    switch (kind) {
      case 'single': return 'Single';
      case 'pair': return 'Pair';
      case 'trips': return 'Triple';
      case 'quads': return 'Quad';
      case 'straight': return 'Straight';
      default: return 'Unknown';
    }
  };
  
  return (
    <div className="table-felt rounded-xl shadow-2xl p-8 min-h-[600px] relative">
      
      {/* Game Status Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-card/90 backdrop-blur rounded-lg px-4 py-2">
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Turn:</span>
              <span className="font-bold ml-1" data-testid="current-turn-player">
                {currentTurnPlayer?.name}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-card/90 backdrop-blur rounded-lg px-4 py-2">
          <div className="flex items-center space-x-2">
            <i className="fas fa-layer-group text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Deck:</span>
            <span className="font-bold" data-testid="deck-count">{gameState.deck.length}</span>
          </div>
        </div>
      </div>

      {/* Players Around Table */}
      <div className="absolute inset-8 flex items-center justify-center">
        
        {/* Render other players */}
        {gameState.players.map((player, index) => {
          if (player.id === playerId) return null;
          return renderOtherPlayer(player, index);
        })}

        {/* Center Table Drop Area */}
        <div className="bg-card/80 backdrop-blur rounded-xl p-6 shadow-lg max-w-md">
          <div className="text-center mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Table Drop
            </h3>
            {gameState.tableDrop && (
              <div className="text-xs text-muted-foreground">
                {getDropKindDisplay(gameState.tableDrop.kind)}
                {gameState.tableDrop.cards.length > 1 && ` (${gameState.tableDrop.cards.length})`}
              </div>
            )}
          </div>
          
          {/* Current table drop cards */}
          {gameState.tableDrop ? (
            <div className="flex justify-center space-x-2 mb-4">
              {sortCardsForDisplay(gameState.tableDrop.cards, gameState.tableDrop.kind).map((card, index) => (
                <Card
                  key={`${card.r}-${card.s}-${index}`}
                  card={card}
                  size="md"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No cards on table
            </div>
          )}

          {/* Draw from table buttons */}
          {canDrawFromTableNow && gameState.tableDrop && (
            <div className="flex space-x-2 flex-wrap gap-1">
              {gameState.tableDrop.cards.map((card, originalIndex) => {
                const canDraw = canDrawFromTable(gameState.tableDrop, originalIndex);
                if (!canDraw) return null;
                
                return (
                  <Button
                    key={originalIndex}
                    variant="secondary"
                    size="sm"
                    onClick={() => onDrawFromTable(originalIndex)}
                    data-testid={`button-draw-table-${originalIndex}`}
                  >
                    Take {card.r === 1 ? 'A' : 
                          card.r === 11 ? 'J' : 
                          card.r === 12 ? 'Q' : 
                          card.r === 13 ? 'K' : 
                          card.r}{card.s === 'H' ? '♥' : card.s === 'D' ? '♦' : card.s === 'C' ? '♣' : '♠'}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Current Player's Hand (bottom) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        {currentPlayer && (
          <PlayerHand
            gameState={gameState}
            playerId={playerId}
            onCall={onCall}
            onDropCards={onDropCards}
            onDrawFromDeck={onDrawFromDeck}
          />
        )}
      </div>

    </div>
  );
}
