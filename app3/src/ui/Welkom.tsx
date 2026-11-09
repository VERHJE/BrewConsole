import type { JSX } from 'preact';
import { href } from '../core/router.ts';
import { CupSteam } from './icons.tsx';

export function Welkom({ onSkip }: { onSkip: () => void }): JSX.Element {
  return (
    <section class="welkom">
      <div class="welkom-art"><CupSteam /></div>
      <p class="welkom-mark" aria-hidden="true">Brew Console</p>
      <h1>Welkom bij Brew Console</h1>
      <p class="welkom-lead">Je zet koffie stap voor stap, met een timer, en de app leert van wat je proeft.</p>
      <ol class="welkom-steps">
        <li><span class="welkom-n" aria-hidden="true">1</span><div><strong>Voeg een zak toe</strong><span>Plak de tekst van de zak of een webshoppagina, of scan de QR-code.</span></div></li>
        <li><span class="welkom-n" aria-hidden="true">2</span><div><strong>Zet een kop</strong><span>Je krijgt een recept voor jouw zak en een timer die je door het zetsel leidt.</span></div></li>
        <li><span class="welkom-n" aria-hidden="true">3</span><div><strong>Proef en waardeer</strong><span>Daarmee wordt het advies van de volgende kop beter.</span></div></li>
      </ol>
      <p><a class="btn primary" href={href('zakken', 'nieuw')}>Voeg je eerste zak toe</a></p>
      <p><button class="btn" type="button" onClick={onSkip}>Zonder zak beginnen</button></p>
      <div class="card welkom-oud">
        <strong>Heb je een back-up van de vorige versie?</strong>
        <p class="meta">Lees die in via Meer → Gegevens. Je zakken en koppen komen dan mee.</p>
        <a class="btn" href={href('meer', 'gegevens')}>Back-up inlezen</a>
      </div>
      <p class="meta">Alles blijft op je toestel. Er wordt niets verstuurd tenzij je zelf synchronisatie aanzet.</p>
    </section>
  );
}
