export interface SocketMessage {
  type: string;
  data: any;
}

export class GameSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5
  private reconnectDelay = 1000;
  private messageHandlers = new Map<string, (data: any) => void>();
  private pingInterval: number | null = null;
  private lastPong = Date.now();
  private reconnectTimer: number | null = null;
  
  constructor() {
    this.connect();
  }
  
  private connect(): void {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.lastPong = Date.now();
      this.startHeartbeat();
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data);
        
        // Handle pong responses
        if (message.type === 'pong') {
          this.lastPong = Date.now();
          return;
        }
        
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
          handler(message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping to server
        this.send('ping');
        
        // Check if we've received a recent pong
        const timeSinceLastPong = Date.now() - this.lastPong;
        if (timeSinceLastPong > 25000) { // 25 seconds without pong
          console.log('No pong received, connection may be dead');
          this.ws.close(); // This will trigger reconnection
        }
      }
    }, 8000); // Send ping every 8 seconds
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = window.setTimeout(() => {
        this.connect();
      }, Math.min(this.reconnectDelay * this.reconnectAttempts, 10000)); // Cap at 10 seconds
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
  
  public send(type: string, data: any = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.error('WebSocket is not connected');
    }
  }
  
  public on(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }
  
  public off(type: string): void {
    this.messageHandlers.delete(type);
  }
  
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  public close(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const gameSocket = new GameSocket();
