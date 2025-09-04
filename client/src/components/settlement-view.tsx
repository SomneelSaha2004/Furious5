import { Button } from '@/components/ui/button';
import type { GameState } from '@shared/game-types';

interface SettlementViewProps {
  gameState: GameState;
  onStartNewRound: () => void;
}

export function SettlementView({ gameState, onStartNewRound }: SettlementViewProps) {
  if (!gameState.settlement) return null;
  
  const { settlement } = gameState;
  const caller = gameState.players[settlement.callerIdx];
  const callerTotal = settlement.totals[settlement.callerIdx];
  const wasSuccessful = settlement.payouts[settlement.callerIdx] > 0;
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="settlement-title">
            Round Settlement
          </h2>
          <div className="text-lg text-muted-foreground">
            <span className="font-medium" data-testid="caller-name">{caller.name}</span> called with{' '}
            <span className="font-bold" data-testid="caller-total">{callerTotal}</span> points
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {wasSuccessful ? (
              <span className="text-primary font-medium">✓ Successful Call!</span>
            ) : (
              <span className="text-destructive font-medium">✗ Failed Call</span>
            )}
          </div>
        </div>

        {/* Settlement Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {gameState.players.map((player, index) => (
            <div key={player.id} className="bg-muted rounded-lg p-6">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  index === settlement.callerIdx 
                    ? (wasSuccessful ? 'bg-primary' : 'bg-destructive')
                    : 'bg-secondary'
                }`}>
                  <span className={`font-bold text-lg ${
                    index === settlement.callerIdx 
                      ? (wasSuccessful ? 'text-primary-foreground' : 'text-destructive-foreground')
                      : 'text-secondary-foreground'
                  }`}>
                    {player.name[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="font-medium text-lg mb-1" data-testid={`player-name-${index}`}>
                  {player.name}
                  {index === settlement.callerIdx && ' (Caller)'}
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  Hand: <span className="font-bold" data-testid={`player-total-${index}`}>
                    {settlement.totals[index]}
                  </span> points
                </div>
                <div className={`text-2xl font-bold ${
                  settlement.payouts[index] > 0 ? 'text-primary' : 
                  settlement.payouts[index] < 0 ? 'text-destructive' : 
                  'text-muted-foreground'
                }`} data-testid={`player-payout-${index}`}>
                  {settlement.payouts[index] > 0 ? '+' : ''}{settlement.payouts[index]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {index === settlement.callerIdx ? 
                    (wasSuccessful ? 'Successful call' : 'Failed call') :
                    settlement.payouts[index] > 0 ? 'Received payment' :
                    settlement.payouts[index] < 0 ? 'Paid out' :
                    'No change'
                  }
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Running Totals */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
            Running Totals
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {gameState.players.map((player, index) => (
              <div key={player.id} className="text-center">
                <div className="font-medium text-sm text-foreground" data-testid={`total-player-name-${index}`}>
                  {player.name}
                </div>
                <div className={`text-xl font-bold ${
                  player.chipDelta > 0 ? 'text-primary' : 
                  player.chipDelta < 0 ? 'text-destructive' : 
                  'text-foreground'
                }`} data-testid={`total-chips-${index}`}>
                  {player.chipDelta > 0 ? '+' : ''}{player.chipDelta}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex space-x-4 justify-center">
          <Button
            onClick={onStartNewRound}
            data-testid="button-new-round"
          >
            <i className="fas fa-play mr-2" />
            Start New Round
          </Button>
        </div>
      </div>
    </div>
  );
}
