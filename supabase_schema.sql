create table if not exists game_table (
  id text primary key,
  status text not null,
  version int not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

revoke insert, update, delete on game_table from anon, authenticated;
grant select on game_table to anon, authenticated;

alter table game_table replica identity full;

do $$
begin
  alter publication supabase_realtime add table game_table;
exception
  when duplicate_object then null;
end $$;

insert into game_table (id, status, version, state)
values (
  'main',
  'lobby',
  0,
  '{
    "status": "lobby",
    "devices": [],
    "players": [],
    "game": {
      "settings": { "chipCount": 7, "maxChips": 10, "targetScore": 15 },
      "table": { "bank": [], "nobles": [], "rows": [], "reserved": [] },
      "activePlayerIndex": 0,
      "history": ["Waiting for players"],
      "turnActions": { "main": false, "noble": false },
      "undoSnapshot": null
    }
  }'::jsonb
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
