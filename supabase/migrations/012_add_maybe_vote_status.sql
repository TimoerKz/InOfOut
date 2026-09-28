-- InOfOut: third attendance response for people who are not sure yet.
alter type public.vote_status add value if not exists 'maybe';
