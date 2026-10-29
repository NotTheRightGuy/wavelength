export type Mode = 'teams' | 'free'
export type RoundPhase = 'card_pick' | 'spin' | 'clue' | 'dial' | 'lr' | 'reveal'

export interface SeatView { id: string; position: number; name: string; color: string; members: string[]; turns_taken: number; score: number; session_id?: string }
export interface CardView { id: number; left_label: string; right_label: string }
export interface GuessView { round_id: string; seat_id: string; dial: number | null; lr: 'left' | 'right' | null }
export interface RoundResult {
  target: number; dial_points: number; psychic_points: number
  entries: { seat_id: string; dial: number | null; points: number; lr: 'left' | 'right' | null; lr_correct: boolean }[]
}
export interface RoundView {
  id: string; room_id: string; number: number; seat_id: string; psychic_name: string; phase: RoundPhase
  card_options: number[]; card_id: number | null; clue: string | null; dial_deadline: string | null; result: RoundResult | null
}
export interface RoomView {
  id: string; code: string; mode: Mode; winning_score: number; laps: number; timer_secs: number | null
  status: 'lobby' | 'playing' | 'finished'
  game: {
    phase?: 'playing' | 'sudden_death' | 'finished'; winners?: string[]; active?: string
    sd_tied?: string[]; sd_pending?: string[]; sd_start?: Record<string, number>
  }
}
export interface RoomState {
  room: RoomView; is_host: boolean; my_seat: string | null
  seats: SeatView[]; round: RoundView | null; cards: CardView[]; guesses: GuessView[]
  locked_count: number | null
}
