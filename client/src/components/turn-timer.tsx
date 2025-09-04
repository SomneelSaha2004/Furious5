import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TurnTimerProps {
  isActive: boolean;
  duration?: number; // in seconds
  onTimeout?: () => void;
}

export function TurnTimer({ isActive, duration = 30, onTimeout }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration);
      return;
    }
    
    setTimeLeft(duration);
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isActive, duration, onTimeout]);
  
  if (!isActive) return null;
  
  const progress = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 10;
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 bg-card border rounded-lg p-4 shadow-lg",
      "animate-in slide-in-from-bottom-2 fade-in-0",
      isUrgent && "animate-pulse border-destructive"
    )} data-testid="turn-timer">
      <div className="text-center">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Your Turn
        </div>
        <div className={cn(
          "text-2xl font-bold mb-2",
          isUrgent ? "text-destructive" : "text-foreground"
        )} data-testid="timer-seconds">
          {timeLeft}
        </div>
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000 ease-linear rounded-full",
              isUrgent ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
            data-testid="timer-progress"
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          seconds left
        </div>
      </div>
    </div>
  );
}