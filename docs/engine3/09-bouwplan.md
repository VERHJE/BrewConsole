# 09 · Bouwplan Engine 3

Vastgesteld 5 nov 2026. Elke stap heeft een opleverpunt, tests en een poort. Een stap is pas af als de poort gehaald is. Daarna volgt de volgende.

## Vaste poort voor elke stap

1. `npm run e3:check` is groen (typecheck, tests, build). Dit draait ook in CI.
2. De engine in `engine3/src/` blijft zuiver: geen DOM, opslag, netwerk, klok of toeval. De test op de bronbestanden bewaakt dat; elk nieuw engine-bestand komt in die lijst.
3. Vanaf stap 3 geldt ook de meetopstelling (06): geen enkele wereld meer dan 1 punt 'precies goed' slechter dan Engine 2, en 'tegen het oordeel in' blijft 0 %.
4. Niets verzinnen: waar een bron niets zegt, blijft het null of een gemarkeerde aanname.
5. Doc, `bouwbesluiten_v4.md` en CI worden meegenomen in dezelfde commit.

## Stappen

| # | Stap | Oplevering | Poort (naast de vaste poort) |
|---|---|---|---|
| 0a | Synchronisatie: versleuteling en blokken | `engine3/sync/crypto.ts`, `blocks.ts` | verkeerde zin, gewijzigd blok of verwisseld blok-id faalt; twee toestellen in willekeurige volgorde komen op hetzelfde logboek uit (fast-check) |
| 0b | Synchronisatie: server | `engine3/sync/server.ts` (Request → Response, opslag als interface), geheugenopslag, Cloudflare-ingang + `wrangler.toml` | token vereist; blokken onveranderlijk; geen inhoud zichtbaar; draait in Node zonder Cloudflare |
| 0c | Synchronisatie: client | `engine3/sync/client.ts` (fetch en opslag meegegeven) | push en pull tegen de servercode in één proces; offline wachten; opnieuw sturen geeft geen dubbelen |
| 0d | Uitrollen | stappen voor Jelle in `docs/engine3/08` | Jelle rolt uit en doet één echte rondgang (iPhone → Worker → tweede browser) |
| 1 | Logboek → toestand | `learn()` met per zak, techniek en hoeveelheid de feiten (zetsels, werkelijke waarden, oordelen, proeven) | dezelfde toestand bij elke volgorde en dubbeling; Jelles migratie (lokaal) geeft de verwachte tellingen |
| 2 | Recept | `plan()` bouwt het gietschema uit `TECHNIQUES` (Kasuya met Hario-momenten, 40/60-verdeling en wachten op doorlopen; temperatuur per branding) | elke techniek geeft bij de referentiehoeveelheid precies het brongetal terug; schalen volgt de bron |
| 3 | Sterkte | module gelijk aan Engine 2 (dosis uit TDS-voorkeur en oordelen) | meetopstelling: gelijk aan Engine 2 binnen 1 punt in alle zes werelden |
| 4 | Tijd en molen | Bayesiaanse klik- en tijdvoorspelling met −11 % doorloop per klik en een term per hoeveelheid | nieuwe doorloopmaatstaf (06): einde binnen 2:50–4:10 bij Kasuya; beter dan niets doen |
| 5 | Techniekkeuze | `SELECTION_RULES` toepassen; afwijking van Kasuya is altijd een proef; een gewonnen proef wint | simulator met verborgen beste techniek per zak (06): hoe snel de proef die vindt |
| 6 | Zakherkenning | `parseBeanText` overgezet naar TypeScript, plus QR; AI alleen met toestemming en via de Worker | dezelfde 35 van 45 trefwoorden als de huidige app op de acht voorbeeldzakken |
| 7 | Smaakprofiel | blinde keuzevakjes en herkende notities over alle zakken; stuurt het recept niet | herleidbaar uit het logboek; geen invloed op `plan()` |
| 8 | Samenstellen | publieke API vastzetten (`e3-contract-1.0`), bundel, en wisselen tussen Engine 2 en 3 in de bestaande app | schakelaar naar Engine 3 geeft op de eigen koppen geen slechter advies dan Engine 2 |

## Volgorde en afhankelijkheden

- 0a → 0b → 0c → 0d. De synchronisatie staat los van de rekenlogica en kan daarom eerst.
- 1 → 2 → 3 → 4 → 5. Elke stap bouwt op de toestand en het recept van de vorige.
- 6 en 7 hangen alleen van stap 1 af en kunnen tussendoor, als een stap op meetdata moet wachten.
- 8 kan pas als 0 t/m 5 af zijn. 6 en 7 mogen later volgen.

## Wat Jelle moet leveren

| Wanneer | Wat |
|---|---|
| Stap 0d | Gratis Cloudflare-account; één keer uitrollen; wachtwoordzin kiezen en bewaren |
| Vóór stap 4 | Meetplan voor eigen data (07): 3 + 3 zetsels op 15 en 30 g, één maalgraadproef met 3 klikken verschil, en 'Gieten op doorlopen' aanzetten |
| Stap 6 | Eventueel meer voorbeeldzakken |
| Stap 6, AI | Anthropic Console-account met uitgavenlimiet (pas dan nodig) |

## Werkwijze

- Per stap één commit of een korte reeks, altijd op `claude/app-review-improvements-wvsruc`; een PR alleen op verzoek.
- Na elke stap een korte stand van zaken met de uitkomst van de poort.
- Wijkt de bouw af van dit plan, dan komt dat eerst in dit bestand te staan.
