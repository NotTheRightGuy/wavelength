import { writeFileSync } from 'node:fs'
import { CARDS } from '../src/data/cards'

const esc = (s: string) => s.replace(/'/g, "''")
const rows = CARDS.map((c) => `  ('${esc(c.left)}', '${esc(c.right)}')`).join(',\n')
writeFileSync('supabase/migrations/0004_cards_seed.sql', `insert into cards (left_label, right_label) values\n${rows};\n`)
