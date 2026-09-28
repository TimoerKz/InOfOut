# Supabase aansluiten

1. Maak een nieuw project aan op [Supabase](https://supabase.com).
2. Open de SQL Editor, plak de inhoud van `supabase/migrations/001_initial_schema.sql` en voer die uit.
3. Open **Connect** en kopieer de Project URL en de Publishable key.
4. Kopieer `.env.example` naar `.env.local`, en vul beide waarden in.
5. Herstart de lokale server met `npm run dev -- --hostname 127.0.0.1 --port 3000`.

Gebruik nooit de `service_role`-sleutel in de browser of in `.env.local`. De publieksleutel mag wel in de app staan; de toegangsregels in de database beschermen de gegevens.

## Hierna

De volgende implementatiestap is de groepsaanmaak- en uitnodigingsstroom: een eigenaar maakt een groep en deelt een unieke uitnodigingslink. Pas dan leest en schrijft de kalender echte gegevens uit deze database.
