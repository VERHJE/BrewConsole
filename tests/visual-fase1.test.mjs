// Visuele en UX-audit "Calm Precision", fase 1 (vóór release): de pure delen.
// - VA-05: getal en eenheid nooit over twee regels (keepUnitsTogether).
// - VA-10: één woordenlijst voor smaak en gietstijl (PROFILE_INFO, profileLabel).
// - VA-04: welke melding op het receptscherm bovenaan komt (prepNoteOrder).
// De schermtests (layout, focus, formulier) staan in kernflow.smoke.test.mjs.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();
const j = (x) => JSON.parse(JSON.stringify(x)); // objecten uit de vm-sandbox

describe('VA-05: getal en eenheid blijven bij elkaar', () => {
  test('"Giet tot 240 g": alleen "240 g" wordt niet-afbrekend, de tekst blijft gelijk', () => {
    const html = api.keepUnitsTogether('Giet tot 240 g');
    assert.equal(html, 'Giet tot <span class="nobr">240 g</span>');
    assert.equal(html.replace(/<[^>]+>/g, ''), 'Giet tot 240 g');
  });
  test('ook in de subregel: plus-grammen, seconden en meerdere getallen', () => {
    assert.equal(api.keepUnitsTogether('+40 g in ~7 s · Bloom'), '<span class="nobr">+40 g</span> in <span class="nobr">~7 s</span> · Bloom');
    assert.equal(api.keepUnitsTogether('Daarna giet tot 120 g'), 'Daarna giet tot <span class="nobr">120 g</span>');
  });
  test('geen eenheid → niets ingepakt; woorden die met een eenheidsletter beginnen blijven ongemoeid', () => {
    assert.equal(api.keepUnitsTogether('Laten doorlopen'), 'Laten doorlopen');
    assert.equal(api.keepUnitsTogether('Wacht · 0:18'), 'Wacht · 0:18');
    assert.equal(api.keepUnitsTogether('3 gieten'), '3 gieten');
  });
  test('tekst wordt eerst ge-escaped', () => {
    assert.equal(api.keepUnitsTogether('<b>5 g</b>'), '&lt;b&gt;<span class="nobr">5 g</span>&lt;/b&gt;');
  });
});

describe('VA-10: één woordenlijst', () => {
  const FORBIDDEN = /Fresh & Clean|Heel fruitig|Fruitig & Clean|^Klassiek$|Robuust & vol|Evenwichtig & flexibel|Snel & puur/;
  test('geen oude of Engelse profielnaam meer in PROFILE_INFO', () => {
    for (const [k, v] of Object.entries(api.PROFILE_INFO)) assert.doesNotMatch(v.name, FORBIDDEN, k);
  });
  test('smaak- en stijlkeuzes heten precies zoals hun profiel (één bron)', () => {
    for (const c of api.TASTE_CHOICES){
      assert.equal(api.PROFILE_INFO[c.profile].name, c.label, c.profile);
      if (c.goal) assert.equal(api.BREW_GOALS[c.goal].label, c.label, c.goal);
    }
    for (const c of api.STYLE_CHOICES) assert.equal(api.PROFILE_INFO[c.profile].name, c.label, c.profile);
  });
  test('een gietstijl met smaakdoel heet "smaak · stijl"; zonder doel alleen de stijl', () => {
    assert.equal(api.profileLabel('fresh_clean', 'bright'), 'Helder & fris · Hoffmann');
    assert.equal(api.profileLabel('fresh_clean', null), 'Hoffmann');
    assert.equal(api.profileLabel('robuust', 'rich'), 'Rond & vol · April');
    assert.equal(api.profileLabel('snel_puur', null), 'Snel (Perger 80/20)');
  });
  test('een smaak heet naar de smaak; een afwijkend doel wordt erbij genoemd', () => {
    assert.equal(api.profileLabel('heel_fruitig', 'bright'), 'Helder & fris');
    assert.equal(api.profileLabel('klassiek', null), 'Gebalanceerd');
    assert.equal(api.profileLabel('vol_rond', null), 'Gebalanceerd');
    assert.equal(api.profileLabel('zoet', 'rich'), 'Rond & vol');
    assert.equal(api.profileLabel('klassiek', 'bright'), 'Gebalanceerd · doel Helder & fris');
  });
  test('zonder gekozen doel (boon, advies) krijgt een stijl de smaakrichting die erbij hoort', () => {
    assert.equal(api.profileDirectionLabel('fruitig_clean'), 'Helder & fris · Rao');
    assert.equal(api.profileDirectionLabel('heel_fruitig'), 'Helder & fris');
    assert.equal(api.profileDirectionLabel('vol_rond'), 'Gebalanceerd');
    assert.equal(api.profileDirectionLabel('evenwichtig_flex'), 'Basisrecept');
  });
  test('onbekende sleutel → nooit de sleutel zelf op het scherm', () => {
    assert.equal(api.profileLabel('bestaat_niet', null), 'Gebalanceerd');
  });
});

describe('VA-04: hoogstens één melding bovenaan, in een vaste volgorde', () => {
  test('de stap die je zelf koos staat voorop; de tweelingnotitie en het feit uit je data achteraan', () => {
    const order = j(api.prepNoteOrder());
    assert.equal(order[0], 'prep-next-adjust');
    assert.deepEqual(order.slice(-2), ['prep-history-insight', 'prep-twin-note']);
    assert.ok(order.indexOf('prep-check-note') < order.indexOf('prep-water-tip'));
  });
  test('de uitnodiging voor de blinde proef komt na de watertip', () => {
    const order = j(api.prepNoteOrder());
    assert.equal(order.indexOf('ab-trial'), order.indexOf('prep-water-tip') + 1);
  });
});
