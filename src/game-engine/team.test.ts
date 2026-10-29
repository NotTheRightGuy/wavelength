import { describe, expect, it } from 'vitest'
import scenarios from './fixtures/team-turns.json'
import { applyTurn, newTeamGame, type TeamGame } from './team'

const at = (g: Partial<TeamGame>): TeamGame => ({ ...newTeamGame(2), ...g })

describe('applyTurn (playing)', () => {
  it('adds dial points and passes the turn', () => {
    const g = applyTurn(newTeamGame(3), { dialPoints: 3, bonusTeams: [] })
    expect(g.scores).toEqual([3, 0, 0])
    expect(g.activeTeam).toBe(1)
  })
  it('wraps the turn order', () => {
    const g = applyTurn(at({ activeTeam: 1 }), { dialPoints: 0, bonusTeams: [] })
    expect(g.activeTeam).toBe(0)
  })
  it('awards +1 to teams that guessed left/right correctly, never to the active team', () => {
    const g = applyTurn(newTeamGame(3), { dialPoints: 2, bonusTeams: [0, 1, 2] })
    expect(g.scores).toEqual([2, 1, 1])
  })
  it('gives a catch-up turn when scoring 4 while still behind', () => {
    const g = applyTurn(at({ scores: [0, 5] }), { dialPoints: 4, bonusTeams: [] })
    expect(g.scores).toEqual([4, 5])
    expect(g.activeTeam).toBe(0)
    expect(g.phase).toBe('playing')
  })
  it('passes the turn after a 4 that is not behind', () => {
    const g = applyTurn(at({ scores: [0, 3] }), { dialPoints: 4, bonusTeams: [] })
    expect(g.activeTeam).toBe(1)
  })
  it('catch-up still applies when another team is over the winning score', () => {
    const g = applyTurn(at({ scores: [5, 11] }), { dialPoints: 4, bonusTeams: [] })
    expect(g.phase).toBe('playing')
    expect(g.activeTeam).toBe(0)
  })
  it('finishes with a single winner at the winning score', () => {
    const g = applyTurn(at({ scores: [2, 7], activeTeam: 1, winningScore: 10 }), { dialPoints: 3, bonusTeams: [] })
    expect(g.phase).toBe('finished')
    expect(g.winners).toEqual([1])
  })
  it('throws once finished', () => {
    const done = at({ phase: 'finished', winners: [0] })
    expect(() => applyTurn(done, { dialPoints: 2, bonusTeams: [] })).toThrow()
  })
})

describe('sudden death', () => {
  const tiedGame = () => applyTurn(at({ scores: [6, 10], activeTeam: 0 }), { dialPoints: 4, bonusTeams: [] })

  it('starts when leaders tie at or above the winning score', () => {
    const g = tiedGame()
    expect(g.phase).toBe('sudden_death')
    expect(g.sdTied).toEqual([0, 1])
    expect(g.activeTeam).toBe(0)
  })
  it('lets each tied team play once then picks the best gain', () => {
    let g = tiedGame()
    g = applyTurn(g, { dialPoints: 4, bonusTeams: [] })
    expect(g.activeTeam).toBe(1)
    g = applyTurn(g, { dialPoints: 2, bonusTeams: [] })
    expect(g.phase).toBe('finished')
    expect(g.winners).toEqual([0])
  })
  it('repeats while the gains are equal', () => {
    let g = tiedGame()
    g = applyTurn(g, { dialPoints: 3, bonusTeams: [] })
    g = applyTurn(g, { dialPoints: 3, bonusTeams: [] })
    expect(g.phase).toBe('sudden_death')
    expect(g.sdTied).toEqual([0, 1])
    expect(g.activeTeam).toBe(0)
  })
  it('ignores bonus points for teams that are not in the tie-break', () => {
    const sd: TeamGame = {
      ...newTeamGame(3),
      scores: [10, 10, 2],
      activeTeam: 0,
      winningScore: 10,
      phase: 'sudden_death',
      sdTied: [0, 1],
      sdPending: [0, 1],
      sdStart: [10, 10, 2],
    }
    const g = applyTurn(sd, { dialPoints: 2, bonusTeams: [2] })
    expect(g.scores[2]).toBe(2)
  })
})

describe('fixtures', () => {
  it.each(scenarios)('$name', ({ teams, winning, turns, expect: want }) => {
    let g = newTeamGame(teams, winning)
    for (const [dialPoints, bonusTeams] of turns as [number, number[]][]) g = applyTurn(g, { dialPoints, bonusTeams })
    expect(g.scores).toEqual(want.scores)
    expect(g.activeTeam).toBe(want.active)
    expect(g.phase).toBe(want.phase)
    expect(g.winners).toEqual(want.winners)
  })
})
