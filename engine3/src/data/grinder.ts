// Engine 3 · de molen als data: Timemore Chestnut C3S Pro (38 mm conisch, S2C 660).
//
// Wat hier staat is óf gemeten (eigen logboek / molenmodel uit punt 4) óf een gemarkeerde
// aanname. De externe bronnen spreken elkaar tegen over de grootte van een klik; daarom
// gebruikt de engine ze alleen als beginpunt en richtlijn, en leert hij het effect van een klik
// uit Jelles eigen zetsels.

export interface GrinderSource { readonly title: string; readonly url: string; readonly says: string }

export const GRINDER_C3S_PRO = {
  id: 'TIMEMORE_C3S_PRO',
  name: 'Timemore Chestnut C3S Pro',
  /** Klikken tellen vanaf de nulstand (messen dicht). */
  countsFromZero: true,
  sources: [
    { title: 'BrewTuner, Timemore C3S Pro', url: 'https://brewtuner.io/grinders/timemore-c3s-pro', says: 'V60: 18 klikken (bereik 14–22), Chemex 24 (20–28), AeroPress 16 (13–20); 38 mm conisch, S2C 660; geen micron per klik; FAQ noemt voor V60 11–14 klikken als begin (tegenspraak op dezelfde pagina).' },
    { title: 'The Basic Barista, Timemore C3 grind size chart', url: 'https://thebasicbarista.com/blogs/article/timemore-c3-grind-size-chart', says: 'C3/C3S: V60 11–18 klikken (913–1494 micron), 36 klikken in totaal, 83 micron per klik.' },
    { title: 'Slow Pour Supply, Chestnut C-series vergelijking', url: 'https://www.slowpoursupply.co/pages/timemore-chestnut-c-series-model-comparison', says: 'C3S Pro: 0,0833 mm per klik, 12 klikken per omwenteling.' },
    { title: 'Balance Journal, Timemore Chestnut C3 review', url: 'https://balancejournal.co/food-drink/timemore-chestnut-c3-review', says: 'C3S Pro: 20 micron per klik (tegenspraak met 83 micron).' },
    { title: 'Coffeemaster, Timemore Chestnut C3S Pro grind settings', url: 'https://coffeemaster.app/guides/timemore-chestnut-c3s-pro-grind-settings', says: 'Ring met 26 standen (0–25), elke klik is een stand, 0 = messen raken elkaar, lager is fijner. V60 16–17 (2:45–3:30, 15 g op 250 ml), Chemex 19–20 (3:30–4:30, 30 g op 500 ml), French press 23–25. Micron per klik niet lineair: ongeveer 15 rond 11–13, ongeveer 50 in de V60/Chemex-zone (16–21). Chemex is dus ongeveer 3 klikken grover dan de V60.' },
    { title: 'Beean, grinder setting converter', url: 'https://beeancoffee.com/grinder-setting-converter/', says: 'Lijst bevat de C3S Pro, maar de pagina toont geen micron per klik.' }
  ] as readonly GrinderSource[],
  /** Micron per klik: de bronnen noemen 83, 20 en (Coffeemaster, niet lineair) ongeveer 15 rond klik 11–13 en ongeveer 50 rond 16–21. Niet gebruikt in de berekening. */
  micronPerClickClaims: [83, 20, 50] as readonly number[],
  v60ClickRangeClaims: [{ lo: 14, hi: 22, source: 'BrewTuner' }, { lo: 11, hi: 18, source: 'The Basic Barista' }] as readonly { lo: number; hi: number; source: string }[],
  /** Bewaking voor het advies: de unie van de V60-bereiken (11–22) met 3 klikken marge. Aanname. */
  adviceWindow: { lo: 8, hi: 25 },
  /** Stand waarmee een eerste zetsel begint zolang er niets gelogd is: Jelles gebruikelijke stand (16, 17 van 20 zetsels). */
  defaultStartClick: 16,
  /**
   * Chemex: beginpunt 15 (besluit Jelle, 9 nov 2026, op grond van zijn eigen zetsels): BrewTuner noemt 24 (bereik 20–28), maar dat is
   * relatief aan hun V60 van 18, en een andere lijst noemt 17–19. Op klik 14 liep een Chemex van 400 g bij Jelle door in 3:24 en 3:41
   * (staart 129 en 147 s na de laatste giet). Venster = Jelles V60-bereik (11–18) tot 22, met marge.
   */
  chemex: {
    defaultStartClick: 15,
    /** Dosis waarbij de beginklik 15 hoort: Jelles eigen Chemex-zetsels (21 tot 23 g op 400 g, klik 14, bed droog in 3:24 en 3:41). */
    refDoseG: 22,
    /**
     * Klikken grover per verdubbeling van de dosis. Natuurkunde: doorlooptijd ~ bedhoogte / korreldiameter²; voor gelijke tijd moet de maling bij
     * dubbele dosis ×√2 grover, ofwel 9 tot 13 klikken bij 20 µm per klik. Jelles twee punten (21 tot 23 g op klik 14 en Hedricks 40 g op klik 22) geven
     * ongeveer 9. Aanname; het model bijsturen kan met eigen koppen.
     */
    clicksPerDoubling: 9,
    adviceWindow: { lo: 11, hi: 30 }
  },
  /**
   * Omrekening Comandante C40 → Timemore C3S Pro voor Hedricks 900 µm (30 klikken op de C40): Beean en Brewfolio 21 klikken, Coffeemaster 23.
   * Micron per klik: 83 µm geeft Jelles V60 op klik 15 ongeveer 400 µm (te fijn voor een filter); Coffeemaster noemt voor 16 tot 21 ongeveer 50 µm
   * (niet lineair), waarbij klik 21 ongeveer 900 µm is, klik 16 ongeveer 650 µm. Aanwijzing, geen bewijs.
   */
  hedrickConversion: { c40Clicks: 30, micron: 900, c3sProClicks: [21, 23] as readonly number[] }
} as const;

/**
 * Doorloop na de laatste giet (tail, in s vanaf de start van de laatste giet) en het effect van een klik.
 * Herkomst: het molenmodel uit punt 4 (rapport), dat dit uit de natuurkunde en Jelles zetsels afleidde.
 * Op Jelles back-up (aantallen): 17 zetsels met bed droog en klik; gemiddelde 73 s (klik 16, n = 10) en 79 s (klik 17, n = 7),
 * spreiding van ln(tail) 0,23 over 240, 300 en 350 g water. Het effect van een klik is daarin nog niet los te zien.
 */
export const GRIND_PRIORS = {
  refClick: 16,
  refWaterG: 300,
  /** ln(78 s) bij klik 16, 300 g water, Kasuya. */
  interceptLn: Math.log(78),
  interceptSdKasuya: 0.25,
  /** Andere technieken hebben een andere laatste giet: de bron zegt er niets over, dus breed. */
  interceptSdOther: 0.5,
  /** −11 % doorloop per klik grover (×0,886), natuurkundige verwachting uit punt 4. */
  perClickLn: Math.log(0.886),
  perClickSd: 0.04,
  /** Effect van ln(water/300) op de doorloop: geen bron, dus gecentreerd op nul en breed. */
  waterLnMean: 0,
  waterLnSd: 0.5,
  /** Verschil tussen zakken (ln): aanname, vergelijkbaar met Engine 2 (K = 3). */
  beanSd: 0.12,
  /** Ruis per zetsel (ln): uit het molenmodel. */
  noiseSd: 0.167,
  /** Een zetsel van 30 zetsels geleden telt half. */
  forgetHalfLife: 30
} as const;
