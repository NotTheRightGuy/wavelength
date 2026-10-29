import { supabase } from './supabase'
import type { RoomState } from './types'

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const api = {
  createRoom: (mode: 'teams' | 'free', winning: number, laps: number, timer: number | null) =>
    rpc<string>('create_room', { p_mode: mode, p_winning: winning, p_laps: laps, p_timer: timer }),
  joinRoom: (code: string, name: string, color: string, members: string[]) =>
    rpc<string>('join_room', { p_code: code, p_name: name, p_color: color, p_members: members }),
  joinAsViewer: (code: string) => rpc<string>('join_as_viewer', { p_code: code }),
  updateSeat: (seat: string, name: string, members: string[]) => rpc<void>('update_seat', { p_seat: seat, p_name: name, p_members: members }),
  kickSeat: (seat: string) => rpc<void>('kick_seat', { p_seat: seat }),
  transferHost: (room: string, session: string) => rpc<void>('transfer_host', { p_room: room, p_session: session }),
  updateRoomSettings: (room: string, winning: number, laps: number, timer: number | null) =>
    rpc<void>('update_room_settings', { p_room: room, p_winning: winning, p_laps: laps, p_timer: timer }),
  startGame: (room: string) => rpc<void>('start_game', { p_room: room }),
  pickCard: (round: string, card: number) => rpc<void>('pick_card', { p_round: round, p_card: card }),
  finishSpin: (round: string) => rpc<void>('finish_spin', { p_round: round }),
  submitClue: (round: string, clue: string) => rpc<void>('submit_clue', { p_round: round, p_clue: clue }),
  lockDial: (round: string, dial: number) => rpc<void>('lock_dial', { p_round: round, p_dial: dial }),
  lockLr: (round: string, guess: 'left' | 'right') => rpc<void>('lock_lr', { p_round: round, p_guess: guess }),
  revealRound: (round: string) => rpc<void>('reveal_round', { p_round: round }),
  nextTurn: (room: string) => rpc<void>('next_turn', { p_room: room }),
  rematch: (room: string) => rpc<void>('rematch', { p_room: room }),
  getTarget: (round: string) => rpc<number | null>('get_target', { p_round: round }),
  getRoomState: (code: string) => rpc<RoomState | null>('get_room_state', { p_code: code }),
}
