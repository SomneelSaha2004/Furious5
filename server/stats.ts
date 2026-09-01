import { sql, eq, desc } from "drizzle-orm";
import { db } from "./db";
import { users, roundHistory } from "@shared/schema";
import type { GameState } from "@shared/game-types";

export async function persistSettlement(state: GameState): Promise<void> {
  const payouts = state.settlement?.payouts;
  if (!payouts) return;

  const entries = state.players
    .map((player, idx) => ({ userId: player.userId, payout: payouts[idx] }))
    .filter((entry): entry is { userId: string; payout: number } => Boolean(entry.userId));

  await Promise.all(
    entries.map(async ({ userId, payout }) => {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(roundHistory).values({
            userId,
            roomCode: state.roomCode,
            roundNumber: state.roundNumber,
            payout,
          });

          if (payout > 0) {
            await tx
              .update(users)
              .set({
                chipsWon: sql`${users.chipsWon} + ${payout}`,
                roundsWon: sql`${users.roundsWon} + 1`,
              })
              .where(eq(users.id, userId));
          } else if (payout < 0) {
            await tx
              .update(users)
              .set({ chipsLost: sql`${users.chipsLost} + ${-payout}` })
              .where(eq(users.id, userId));
          }
        });
      } catch (error) {
        console.error(`Failed to persist settlement for user ${userId}:`, error);
      }
    }),
  );
}

export async function getRecentRounds(userId: string, limit = 5) {
  return db
    .select({
      roomCode: roundHistory.roomCode,
      roundNumber: roundHistory.roundNumber,
      payout: roundHistory.payout,
      createdAt: roundHistory.createdAt,
    })
    .from(roundHistory)
    .where(eq(roundHistory.userId, userId))
    .orderBy(desc(roundHistory.createdAt))
    .limit(limit);
}
