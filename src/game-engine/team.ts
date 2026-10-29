import { DEFAULT_WINNING_SCORE, LR_BONUS } from './constants'

export type Phase = 'playing' | 'sudden_death' | 'finished'

export interface TeamGame {
  scores: number[]
  activeTeam: number
  winningScore: number
  phase: Phase
  sdStart: number[]
  sdPending: number[]
  sdTied: number[]
  winners: number[]
}

export interface TurnOutcome {
  dialPoints: number
  /** Indexes of teams whose left/right guess was correct. */
  bonusTeams: number[]
}

export function newTeamGame(teamCount: number, winningScore = DEFAULT_WINNING_SCORE): TeamGame {
  return {
    scores: Array(teamCount).fill(0),
    activeTeam: 0,
    winningScore,
    phase: 'playing',
    sdStart: [],
    sdPending: [],
    sdTied: [],
    winners: [],
  }
}

function enterSuddenDeath(g: TeamGame, leaders: number[]): TeamGame {
  return { ...g, phase: 'sudden_death', sdTied: leaders, sdPending: [...leaders], sdStart: [...g.scores], activeTeam: leaders[0] }
}

function advanceSuddenDeath(g: TeamGame, scores: number[]): TeamGame {
  const pending = g.sdPending.filter((t) => t !== g.activeTeam)
  if (pending.length > 0) return { ...g, scores, sdPending: pending, activeTeam: pending[0] }
  const gains = g.sdTied.map((t) => ({ t, gain: scores[t] - g.sdStart[t] }))
  const best = Math.max(...gains.map((x) => x.gain))
  const leaders = gains.filter((x) => x.gain === best).map((x) => x.t)
  if (leaders.length === 1) return { ...g, scores, phase: 'finished', winners: leaders, sdPending: [] }
  return enterSuddenDeath({ ...g, scores }, leaders)
}

export function applyTurn(g: TeamGame, o: TurnOutcome): TeamGame {
  if (g.phase === 'finished') throw new Error('game is finished')
  const scores = [...g.scores]
  scores[g.activeTeam] += o.dialPoints
  for (const t of o.bonusTeams) {
    if (t === g.activeTeam) continue
    if (g.phase === 'sudden_death' && !g.sdTied.includes(t)) continue
    scores[t] += LR_BONUS
  }
  if (g.phase === 'sudden_death') return advanceSuddenDeath(g, scores)

  const bestOther = Math.max(...scores.filter((_, i) => i !== g.activeTeam))
  if (o.dialPoints === 4 && scores[g.activeTeam] < bestOther) return { ...g, scores } // catch-up turn

  const top = Math.max(...scores)
  if (top >= g.winningScore) {
    const leaders = scores.flatMap((s, i) => (s === top ? [i] : []))
    if (leaders.length === 1) return { ...g, scores, phase: 'finished', winners: leaders }
    return enterSuddenDeath({ ...g, scores }, leaders)
  }
  return { ...g, scores, activeTeam: (g.activeTeam + 1) % scores.length }
}
