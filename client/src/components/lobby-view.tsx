import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { GameState } from '@shared/game-types';

interface LobbyViewProps {
  gameState: GameState;
  onStartGame: () => void;
}

export function LobbyView({ gameState, onStartGame }: LobbyViewProps) {
  const { toast } = useToast();
  const canStart = gameState.players.length >= 2;
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="lobby-title">
            Game Lobby
          </h2>
          <p className="text-muted-foreground">Waiting for players to join...</p>
        </div>

        {/* Players List */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Players ({gameState.players.length}/5)
          </h3>
          <div className="space-y-3">
            {gameState.players.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between bg-muted p-3 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">
                      {player.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium" data-testid={`player-name-${index}`}>
                    {player.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    player.connected ? 'bg-primary' : 'bg-muted-foreground'
                  }`} />
                  <span className="text-sm text-muted-foreground">
                    {player.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Rules Summary */}
        <div className="mb-8 bg-secondary p-4 rounded-md">
          <h4 className="font-semibold text-foreground mb-2">Quick Rules</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Start with 5 cards, goal is to get hand total &lt; 5 points</li>
            <li>• Drop combinations: pairs, trips, quads, straights (3+), or singles</li>
            <li>• Call when your hand total is less than 5 to end the round</li>
            <li>• Points: Ace=1, Face value 2-10, Jack=11, Queen=12, King=13</li>
          </ul>
        </div>

        {/* Room Code Display */}
        <div className="mb-6 text-center">
          <h4 className="font-semibold text-foreground mb-3">Share Room Code</h4>
          <div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-4">
            <div className="text-3xl font-mono font-bold text-primary mb-2" data-testid="room-code-display">
              {gameState.roomCode}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Share this code with friends so they can join your game
            </p>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(gameState.roomCode);
                toast({
                  title: "Room code copied!",
                  description: "Share this code with friends to join your game",
                });
              }}
              data-testid="button-copy-code"
              className="w-full"
            >
              <i className="fas fa-copy mr-2" />
              Copy Room Code
            </Button>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            className="flex-1"
            disabled={!canStart}
            onClick={onStartGame}
            data-testid="button-start-game"
          >
            <i className="fas fa-play mr-2" />
            {canStart ? 'Start Game' : `Need ${2 - gameState.players.length} more players`}
          </Button>
        </div>
      </div>
    </div>
  );
}
