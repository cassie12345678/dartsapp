export type SegmentType = "S" | "D" | "T" | "BULL" | "MISS";
export type DartScore = {
  type: SegmentType;
  number?: number;
  points: number;
  label: string;
};

export type Player = {
  id: string;
  name: string;
  remaining: number;
  legsWon: number;
  dartsThrown: number;
  totalScored: number;
  checkouts: number;
  checkoutAttempts: number;
  highestFinish: number;
  count180: number;
};

export type Turn = {
  playerId: string;
  playerName: string;
  darts: DartScore[];
  total: number;
  bust: boolean;
  checkout: boolean;
  previousRemaining: number;
  newRemaining: number;
  createdAt: string;
};

export const initialPlayers = (): Player[] => [
  createPlayer("p1", "Speler 1"),
  createPlayer("p2", "Speler 2")
];

export function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    remaining: 501,
    legsWon: 0,
    dartsThrown: 0,
    totalScored: 0,
    checkouts: 0,
    checkoutAttempts: 0,
    highestFinish: 0,
    count180: 0
  };
}

export function scoreFromHit(type: SegmentType, number?: number): DartScore {
  if (type === "MISS") return { type, points: 0, label: "Miss" };
  if (type === "BULL") return { type, points: 50, label: "Bull" };
  const n = number ?? 0;
  const mult = type === "D" ? 2 : type === "T" ? 3 : 1;
  return { type, number: n, points: n * mult, label: `${type}${n}` };
}

export function isDoubleOutDart(dart: DartScore): boolean {
  return dart.type === "D" || dart.type === "BULL";
}

export function applyTurn(player: Player, darts: DartScore[]): { player: Player; turn: Omit<Turn, "playerName" | "createdAt"> } {
  const total = darts.reduce((sum, d) => sum + d.points, 0);
  const previousRemaining = player.remaining;
  const newRemaining = previousRemaining - total;
  const lastScoringDart = [...darts].reverse().find(d => d.points > 0);
  const checkoutAttempt = previousRemaining <= 170;
  const checkout = newRemaining === 0 && !!lastScoringDart && isDoubleOutDart(lastScoringDart);
  const bust = newRemaining < 0 || newRemaining === 1 || (newRemaining === 0 && !checkout);

  const countedScore = bust ? 0 : total;
  const updated: Player = {
    ...player,
    remaining: checkout ? 501 : bust ? previousRemaining : newRemaining,
    dartsThrown: player.dartsThrown + darts.length,
    totalScored: player.totalScored + countedScore,
    checkoutAttempts: player.checkoutAttempts + (checkoutAttempt ? 1 : 0),
    checkouts: player.checkouts + (checkout ? 1 : 0),
    highestFinish: checkout ? Math.max(player.highestFinish, previousRemaining) : player.highestFinish,
    count180: player.count180 + (total === 180 ? 1 : 0),
    legsWon: player.legsWon + (checkout ? 1 : 0)
  };

  return {
    player: updated,
    turn: {
      playerId: player.id,
      darts,
      total,
      bust,
      checkout,
      previousRemaining,
      newRemaining: updated.remaining
    }
  };
}

export function average(player: Player): string {
  if (player.dartsThrown === 0) return "0.0";
  return ((player.totalScored / player.dartsThrown) * 3).toFixed(1);
}

export function checkoutPercentage(player: Player): string {
  if (player.checkoutAttempts === 0) return "0%";
  return `${Math.round((player.checkouts / player.checkoutAttempts) * 100)}%`;
}

export function checkoutSuggestion(score: number): string {
  const table: Record<number, string> = {
    170: "T20 T20 Bull", 167: "T20 T19 Bull", 164: "T20 T18 Bull", 161: "T20 T17 Bull",
    160: "T20 T20 D20", 158: "T20 T20 D19", 157: "T20 T19 D20", 156: "T20 T20 D18",
    155: "T20 T19 D19", 154: "T20 T18 D20", 153: "T20 T19 D18", 152: "T20 T20 D16",
    151: "T20 T17 D20", 150: "T20 T18 D18", 149: "T20 T19 D16", 148: "T20 T16 D20",
    147: "T20 T17 D18", 146: "T20 T18 D16", 145: "T20 T15 D20", 144: "T20 T20 D12",
    141: "T20 T19 D12", 140: "T20 T20 D10", 138: "T20 T18 D12", 136: "T20 T20 D8",
    132: "Bull Bull D16", 130: "T20 T20 D5", 128: "T18 T18 D10", 126: "T19 T19 D6",
    125: "T20 T19 D4", 124: "T20 T16 D8", 121: "T20 T11 D14", 120: "T20 20 D20",
    100: "T20 D20", 80: "T20 D10", 60: "20 D20", 40: "D20", 32: "D16", 24: "D12", 16: "D8", 8: "D4", 2: "D1"
  };
  if (table[score]) return table[score];
  if (score > 170 || score < 2) return "Geen checkout";
  if (score % 2 === 0 && score <= 40) return `D${score / 2}`;
  return "Setup-score spelen";
}
