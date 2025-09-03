// Game-specific schemas for Furious Five card game

export interface User {
  id: string;
  username: string;
}

export interface InsertUser {
  username: string;
  password: string;
}
