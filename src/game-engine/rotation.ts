export function memberForTurn(members: string[], turnsTaken: number): string {
  return members[turnsTaken % members.length]
}
