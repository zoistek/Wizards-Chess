create schema if not exists chess_test;
revoke all on schema chess_test from public, anon, authenticated;
grant usage on schema chess_test to service_role;
create table chess_test.games (
 code text primary key check(code ~ '^[A-F0-9]{12}$'),
 white_hash text, black_hash text, white_name text, black_name text,
 fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 moves jsonb not null default '[]'::jsonb,
 turn text not null default 'w' check(turn in ('w','b')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table chess_test.games enable row level security;
revoke all on chess_test.games from public, anon, authenticated;
grant select,insert,update,delete on chess_test.games to service_role;
create index games_created_at_idx on chess_test.games(created_at);
-- Only the Edge Function's server credential can call this transaction boundary.
create or replace function public.wc_test_action(
 p_action text, p_code text, p_hash text, p_name text default 'Player',
 p_color text default 'w', p_seq integer default null, p_move jsonb default null,
 p_fen text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare g chess_test.games; chosen text; side text;
begin
 if p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid player token'; end if;
 if p_action='create' then
  if (select count(*) from chess_test.games where created_at>now()-interval '10 minutes' and (white_hash=p_hash or black_hash=p_hash))>=20 then raise exception 'Please wait before creating more challenges'; end if;
  chosen=case when p_color='random' then case when random()<0.5 then 'w' else 'b' end else p_color end;
  if chosen not in ('w','b') then raise exception 'Invalid colour'; end if;
  insert into chess_test.games(code,white_hash,black_hash,white_name,black_name)
  values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),case when chosen='w' then p_hash end,case when chosen='b' then p_hash end,case when chosen='w' then p_name end,case when chosen='b' then p_name end) returning * into g;
  return to_jsonb(g);
 end if;
 select * into g from chess_test.games where code=p_code for update;
 if not found or g.updated_at<now()-interval '7 days' then raise exception 'Challenge not found or expired'; end if;
 side=case when g.white_hash=p_hash then 'w' when g.black_hash=p_hash then 'b' else 'spectator' end;
 if p_action='join' and side='spectator' then
  if g.white_hash is null then update chess_test.games set white_hash=p_hash,white_name=p_name,updated_at=now() where code=p_code returning * into g;
  elsif g.black_hash is null then update chess_test.games set black_hash=p_hash,black_name=p_name,updated_at=now() where code=p_code returning * into g;
  end if;
 elsif p_action='move' then
  if side='spectator' then raise exception 'Spectators cannot move'; end if;
  if g.white_hash is null or g.black_hash is null or g.turn<>side or p_seq is distinct from jsonb_array_length(g.moves) then raise exception 'Game changed. Reconnect and try again'; end if;
  if p_move is null or p_fen is null then raise exception 'Missing validated move'; end if;
  update chess_test.games set moves=g.moves||jsonb_build_array(p_move||jsonb_build_object('seq',p_seq+1,'color',side)),fen=p_fen,turn=case side when 'w' then 'b' else 'w' end,updated_at=now() where code=p_code returning * into g;
 elsif p_action not in ('join','state') then raise exception 'Unknown action';
 end if;
 return to_jsonb(g);
end $$;
revoke all on function public.wc_test_action(text,text,text,text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.wc_test_action(text,text,text,text,text,integer,jsonb,text) to service_role;
