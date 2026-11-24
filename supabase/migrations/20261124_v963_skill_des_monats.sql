-- v963 · Charles 24.11.2026: „Ist es technisch machbar, ein YouTube-Video in die Akademie einzubinden? … den Skill des Monats dort
-- auch integrieren … die Kinder haben das zum Nachschauen, können es zu Hause nachmachen und wir würden es dann auch im Training
-- live trainieren.“ Freigegeben: Skill des Monats oben auf dem Trainingsplatz, verknüpft mit einem Technik-Abzeichen; Video als
-- YouTube-Link oder eigener Clip (video/<name>.mp4 im Repo). Die Tabelle skill_woche bleibt (gleiche Rechte, gleiche Federn-Quelle
-- skillwoche); neu ist nur die optionale Verknüpfung mit einem Abzeichen.
alter table public.skill_woche add column if not exists abzeichen text;
alter table public.skill_woche drop constraint if exists skill_woche_abzeichen_ok;
alter table public.skill_woche add constraint skill_woche_abzeichen_ok check (abzeichen is null or abzeichen ~ '^ab2?_[a-z]+$');
alter table public.skill_woche drop constraint if exists skill_woche_video_ok;
alter table public.skill_woche add constraint skill_woche_video_ok check (video_url is null or video_url ~ '^https://' or video_url ~ '^video/[A-Za-z0-9._-]+\.mp4$');
comment on column public.skill_woche.abzeichen is 'v963: Kennung des Technik-Abzeichens, das zum Skill des Monats gehört (z. B. ab2_cruyff) – das Kind meldet es in der Akademie, die Eltern geben es frei.';
