-- ============================================================
-- SUSPECT — Migration 003: Questions, Rounds, Round Questions
-- Run this in Supabase SQL Editor. This is ADDITIVE ONLY —
-- it does not touch rooms/players data or drop anything.
-- ============================================================

-- ---------------------------------------------------------
-- QUESTIONS  (the question bank — not secret content, just
-- game data. What's secret is which player gets which one.)
-- ---------------------------------------------------------
create table if not exists questions (
  id serial primary key,
  category text not null,
  normal_question text not null,
  suspect_question text not null
);

alter table questions enable row level security;

drop policy if exists "questions_select_all" on questions;
create policy "questions_select_all" on questions
  for select using (true);

-- Seed data (safe to re-run — skips if already seeded)
insert into questions (category, normal_question, suspect_question)
select * from (values
  ('FUNNY', 'What''s the dumbest thing you''ve ever done at a party?', 'What''s the dumbest thing you''ve ever done on vacation?'),
  ('FUNNY', 'What''s the weirdest food combination you actually enjoy?', 'What''s the weirdest food combination you refuse to try?'),
  ('FUNNY', 'What''s a rumor you''ve heard about yourself?', 'What''s a rumor you''ve started about someone else?'),
  ('FUNNY', 'What''s the most useless talent you have?', 'What''s the most useless talent you wish you had?'),
  ('FUNNY', 'What''s the worst haircut you''ve ever had?', 'What''s the worst haircut you''ve ever given someone?'),
  ('FUNNY', 'What''s a movie everyone loves that you secretly hate?', 'What''s a movie everyone hates that you secretly love?'),
  ('FUNNY', 'What''s your go-to excuse for being late?', 'What''s your go-to excuse for leaving early?'),
  ('FUNNY', 'What''s the most embarrassing song on your playlist?', 'What''s the most embarrassing song you know all the words to?'),
  ('PARTY', 'What''s your go-to karaoke song?', 'What''s a song you''d never sing at karaoke, even for money?'),
  ('PARTY', 'What''s the best party you''ve ever been to?', 'What''s the worst party you''ve ever been to?'),
  ('PARTY', 'What''s your signature dance move?', 'What''s the worst dance move you''ve ever seen someone else do?'),
  ('PARTY', 'What''s a party game you''re secretly amazing at?', 'What''s a party game you''re secretly terrible at?'),
  ('PARTY', 'What''s something you always bring to a party?', 'What''s something you always forget to bring to a party?'),
  ('PARTY', 'What''s your favorite party snack?', 'What''s a party snack you think is completely overrated?'),
  ('FRIENDS', 'Who in this room gives the best advice?', 'Who in this room gives advice nobody asked for?'),
  ('FRIENDS', 'What''s a nickname a friend gave you?', 'What''s a nickname you gave a friend?'),
  ('FRIENDS', 'Who''s the friend you''d call at 3am for an emergency?', 'Who''s the friend you''d never call at 3am, no matter what?'),
  ('FRIENDS', 'What''s your friend group''s unofficial tradition?', 'What''s a tradition your friend group quietly abandoned?'),
  ('FRIENDS', 'Who''s the most reliable person in this room?', 'Who''s the most unpredictable person in this room?'),
  ('FRIENDS', 'What''s the best gift a friend has ever given you?', 'What''s the worst gift a friend has ever given you?'),
  ('EMBARRASSING', 'What''s the most embarrassing thing that''s happened to you in public?', 'What''s the most embarrassing thing that''s happened to you at work or school?'),
  ('EMBARRASSING', 'What''s a text you sent to the wrong person?', 'What''s a text you almost sent to the wrong person?'),
  ('EMBARRASSING', 'What''s an outfit you thought was cool but definitely wasn''t?', 'What''s an outfit someone else wore that you were too polite to comment on?'),
  ('EMBARRASSING', 'What''s the most embarrassing thing in your search history?', 'What''s the most embarrassing app on your phone?'),
  ('EMBARRASSING', 'What''s a nickname from school you hope nobody remembers?', 'What''s a nickname from school you secretly wish had stuck?'),
  ('EMBARRASSING', 'What''s the most embarrassing thing on your camera roll?', 'What''s the most embarrassing photo someone else has of you?'),
  ('DATING', 'What''s the worst pickup line you''ve ever heard?', 'What''s the worst pickup line you''ve ever used?'),
  ('DATING', 'What''s a green flag that instantly wins you over?', 'What''s a red flag you tend to ignore anyway?'),
  ('DATING', 'What''s the most awkward first date you''ve been on?', 'What''s the most awkward first date someone else has told you about?'),
  ('DATING', 'What''s your idea of a perfect first date?', 'What''s your idea of a first date gone terribly wrong?'),
  ('DATING', 'What''s the most romantic gesture you''ve ever received?', 'What''s the most romantic gesture you''ve ever attempted?'),
  ('CHAOS', 'What''s a rule you''d break if you knew you''d never get caught?', 'What''s a rule you already break and think nobody notices?'),
  ('CHAOS', 'If this group got stranded on an island, who would take charge?', 'If this group got stranded on an island, who would cause the most drama?'),
  ('CHAOS', 'What''s the pettiest revenge you''ve ever taken on someone?', 'What''s the pettiest revenge you''ve ever fantasized about but never carried out?'),
  ('CHAOS', 'What''s a small lie that spiraled into total chaos?', 'What''s a small mistake that spiraled into total chaos?'),
  ('RANDOM', 'What''s a skill you wish you''d learned as a kid?', 'What''s a skill you wish you''d never learned?'),
  ('RANDOM', 'What''s the strangest job you''ve ever considered taking?', 'What''s the strangest job you''ve actually had?'),
  ('RANDOM', 'What''s the most useless item you own but refuse to throw away?', 'What''s the most useful item you own that nobody else notices?'),
  ('RANDOM', 'What''s a habit you have that other people find strange?', 'What''s a habit someone else has that you find strange?'),
  ('RANDOM', 'What''s the last thing you Googled at 2am?', 'What''s the last thing that kept you up until 2am?'),
  ('RANDOM', 'What''s a fear you''ve never told anyone about?', 'What''s a fear you pretend not to have?')
) as v(category, normal_question, suspect_question)
where not exists (select 1 from questions);

-- ---------------------------------------------------------
-- ROUNDS  (metadata only — not secret; the assigned question
-- text lives in round_questions, not here)
-- ---------------------------------------------------------
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  round_number int not null,
  question_id int not null references questions(id),
  status text not null default 'question'
    check (status in ('question','answering','voting','reveal')),
  created_at timestamptz not null default now()
);

alter table rounds enable row level security;

drop policy if exists "rounds_select_all" on rounds;
create policy "rounds_select_all" on rounds
  for select using (true);

drop policy if exists "rounds_insert_host_only" on rounds;
create policy "rounds_insert_host_only" on rounds
  for insert with check (
    exists (
      select 1 from rooms r
      where r.id = rounds.room_id and r.host_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- ROUND_QUESTIONS  (the private, per-player question text —
-- this is the actual privacy boundary of the game)
-- ---------------------------------------------------------
create table if not exists round_questions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  question_text text not null,
  is_suspect boolean not null default false,
  unique (round_id, player_id)
);

alter table round_questions enable row level security;

-- A player can only ever read their OWN assigned question.
drop policy if exists "round_questions_select_own" on round_questions;
create policy "round_questions_select_own" on round_questions
  for select using (
    exists (
      select 1 from players p
      where p.id = round_questions.player_id and p.user_id = auth.uid()
    )
  );

-- Only the host of the room (via round -> room) can write these rows,
-- since the host is the client performing the assignment on start.
drop policy if exists "round_questions_insert_host_only" on round_questions;
create policy "round_questions_insert_host_only" on round_questions
  for insert with check (
    exists (
      select 1 from rounds rd
      join rooms rm on rm.id = rd.room_id
      where rd.id = round_questions.round_id and rm.host_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- ROOMS: point at the current round
-- ---------------------------------------------------------
alter table rooms
  add column if not exists current_round_id uuid references rounds(id);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table round_questions;
