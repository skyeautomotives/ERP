-- Phase 8 prep: credit note / debit note numbering (mirrors every other
-- numbering column added so far).

alter table public.company_settings
  add column credit_note_prefix text not null default 'CN',
  add column credit_note_padding int not null default 5,
  add column next_credit_note_number int not null default 1,
  add column debit_note_prefix text not null default 'DN',
  add column debit_note_padding int not null default 5,
  add column next_debit_note_number int not null default 1;
