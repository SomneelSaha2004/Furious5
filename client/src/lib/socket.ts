export interface SocketMessage {
  type: string;
  data: any;
}

export class GameSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers = new Map<string, (data: any) => void>();
  
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
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data);
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
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const gameSocket = new GameSocket();
