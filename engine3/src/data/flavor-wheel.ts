// GEGENEREERD door engine3/scripts/gen-flavor-wheel.mjs uit SCA_FLAVOR_WHEEL in brewconsole_v2_2.html.
// Niet met de hand wijzigen.
import type { WheelCategory } from '../types.ts';

export interface WheelTag { readonly tag: string; readonly hint: string | null }
export interface WheelSubgroup { readonly label: string | null; readonly tags: readonly WheelTag[] }
export interface WheelCategoryDef { readonly key: WheelCategory; readonly name: string; readonly subgroups: readonly WheelSubgroup[] }

export const FLAVOR_WHEEL: readonly WheelCategoryDef[] = [
  {
    "key": "fruitig",
    "name": "Fruitig",
    "subgroups": [
      {
        "label": "Bessen",
        "tags": [
          {
            "tag": "Bramen",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Framboos",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Bosbes",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Aardbei",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Cassis / zwarte bes",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Rode bes",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Rozenbottel",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Bessen (algemeen)",
            "hint": "heel_fruitig"
          }
        ]
      },
      {
        "label": "Gedroogd fruit",
        "tags": [
          {
            "tag": "Rozijn",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Pruimedant",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Vijg",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Tamarinde",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Dadel",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Gedroogd fruit (algemeen)",
            "hint": "heel_fruitig"
          }
        ]
      },
      {
        "label": "Overig fruit",
        "tags": [
          {
            "tag": "Kokosnoot",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Kers",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Granaatappel",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Ananas",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Druif",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Appel",
            "hint": "fresh_clean"
          },
          {
            "tag": "Peer",
            "hint": "fresh_clean"
          },
          {
            "tag": "Kiwi",
            "hint": "fruitig_clean"
          }
        ]
      },
      {
        "label": "Steenfruit",
        "tags": [
          {
            "tag": "Perzik",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Abrikoos",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Pruim",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Nectarine",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Steenfruit (algemeen)",
            "hint": "fruitig_clean"
          }
        ]
      },
      {
        "label": "Tropisch fruit",
        "tags": [
          {
            "tag": "Mango",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Passievrucht",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Lychee",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Guave",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Papaya",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Banaan (overrijp)",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Watermeloen",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Meloen",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Jackfruit",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Tropisch fruit (algemeen)",
            "hint": "fruitig_clean"
          }
        ]
      },
      {
        "label": "Citrusfruit",
        "tags": [
          {
            "tag": "Grapefruit",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Sinaasappel",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Citroen",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Limoen",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Mandarijn",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Citrusfruit (algemeen)",
            "hint": "fruitig_clean"
          }
        ]
      }
    ]
  },
  {
    "key": "zuur_gefermenteerd",
    "name": "Zuur / Gefermenteerd",
    "subgroups": [
      {
        "label": "Zuur",
        "tags": [
          {
            "tag": "Zure aromatiek",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Azijnzuur",
            "hint": null
          },
          {
            "tag": "Boterzuur",
            "hint": null
          },
          {
            "tag": "Isovaleriaanzuur",
            "hint": null
          },
          {
            "tag": "Citroenzuur",
            "hint": "fruitig_clean"
          },
          {
            "tag": "Appelzuur",
            "hint": "fruitig_clean"
          }
        ]
      },
      {
        "label": "Alcohol / gefermenteerd",
        "tags": [
          {
            "tag": "Wijnachtig",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Whiskey-achtig",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Gefermenteerd",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Overrijp",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Kombucha",
            "hint": "heel_fruitig"
          },
          {
            "tag": "Kauwgom",
            "hint": "heel_fruitig"
          }
        ]
      },
      {
        "label": "Lactic / melkzuur",
        "tags": [
          {
            "tag": "Yoghurt-achtig",
            "hint": "vol_rond"
          }
        ]
      }
    ]
  },
  {
    "key": "groen_plantaardig",
    "name": "Groen / Plantaardig",
    "subgroups": [
      {
        "label": "Olie & rauw",
        "tags": [
          {
            "tag": "Olijfolie",
            "hint": null
          },
          {
            "tag": "Rauw",
            "hint": null
          }
        ]
      },
      {
        "label": "Groen / plantaardig",
        "tags": [
          {
            "tag": "Onrijp",
            "hint": null
          },
          {
            "tag": "Erwtenpeul",
            "hint": null
          },
          {
            "tag": "Fris / vers",
            "hint": "fresh_clean"
          },
          {
            "tag": "Donkergroen",
            "hint": null
          },
          {
            "tag": "Plantaardig",
            "hint": null
          },
          {
            "tag": "Hooiachtig",
            "hint": null
          },
          {
            "tag": "Kruidachtig",
            "hint": null
          },
          {
            "tag": "Tomaat",
            "hint": null
          },
          {
            "tag": "Groene paprika",
            "hint": null
          }
        ]
      },
      {
        "label": "Bonig",
        "tags": [
          {
            "tag": "Bonig",
            "hint": null
          }
        ]
      }
    ]
  },
  {
    "key": "overig",
    "name": "Overig",
    "subgroups": [
      {
        "label": "Papierachtig / muf",
        "tags": [
          {
            "tag": "Verschaald",
            "hint": null
          },
          {
            "tag": "Kartonachtig",
            "hint": null
          },
          {
            "tag": "Papierachtig",
            "hint": null
          },
          {
            "tag": "Houtachtig",
            "hint": null
          },
          {
            "tag": "Beschimmeld",
            "hint": null
          },
          {
            "tag": "Stoffig / muf",
            "hint": null
          },
          {
            "tag": "Aards / muf",
            "hint": null
          },
          {
            "tag": "Dierlijk",
            "hint": null
          },
          {
            "tag": "Vlezig / bouillonachtig",
            "hint": null
          },
          {
            "tag": "Fenolisch",
            "hint": null
          }
        ]
      },
      {
        "label": "Chemisch",
        "tags": [
          {
            "tag": "Bitter",
            "hint": null
          },
          {
            "tag": "Zout",
            "hint": null
          },
          {
            "tag": "Medicinaal",
            "hint": null
          },
          {
            "tag": "Petroleum",
            "hint": null
          },
          {
            "tag": "Rokerig-chemisch",
            "hint": null
          },
          {
            "tag": "Rubberachtig",
            "hint": null
          }
        ]
      }
    ]
  },
  {
    "key": "geroosterd",
    "name": "Geroosterd",
    "subgroups": [
      {
        "label": "Tabak",
        "tags": [
          {
            "tag": "Pijptabak",
            "hint": "vol_rond"
          },
          {
            "tag": "Tabak",
            "hint": "vol_rond"
          }
        ]
      },
      {
        "label": "Verbrand",
        "tags": [
          {
            "tag": "Scherp / bijtend",
            "hint": null
          },
          {
            "tag": "Askleurig",
            "hint": null
          },
          {
            "tag": "Rokerig",
            "hint": "vol_rond"
          },
          {
            "tag": "Donker geroosterd",
            "hint": "vol_rond"
          },
          {
            "tag": "Geroosterd",
            "hint": "vol_rond"
          }
        ]
      },
      {
        "label": "Graanachtig",
        "tags": [
          {
            "tag": "Graan",
            "hint": "vol_rond"
          },
          {
            "tag": "Mout",
            "hint": "vol_rond"
          },
          {
            "tag": "Koekjes / biscuit",
            "hint": "vol_rond"
          }
        ]
      }
    ]
  },
  {
    "key": "specerijen",
    "name": "Specerijen",
    "subgroups": [
      {
        "label": "Scherp & peper",
        "tags": [
          {
            "tag": "Scherp / pikant",
            "hint": null
          },
          {
            "tag": "Peper",
            "hint": null
          }
        ]
      },
      {
        "label": "Bruine kruiden",
        "tags": [
          {
            "tag": "Anijs",
            "hint": "zoet"
          },
          {
            "tag": "Nootmuskaat",
            "hint": "zoet"
          },
          {
            "tag": "Kaneel",
            "hint": "zoet"
          },
          {
            "tag": "Kruidnagel",
            "hint": "zoet"
          },
          {
            "tag": "Gember",
            "hint": "zoet"
          },
          {
            "tag": "Kardemom",
            "hint": "zoet"
          },
          {
            "tag": "Zoethout / drop",
            "hint": "zoet"
          },
          {
            "tag": "Specerijen (algemeen)",
            "hint": null
          }
        ]
      }
    ]
  },
  {
    "key": "notig_cacao",
    "name": "Notig / Cacao",
    "subgroups": [
      {
        "label": "Notig",
        "tags": [
          {
            "tag": "Pinda's",
            "hint": "vol_rond"
          },
          {
            "tag": "Hazelnoot",
            "hint": "vol_rond"
          },
          {
            "tag": "Amandel",
            "hint": "vol_rond"
          },
          {
            "tag": "Cashewnoot",
            "hint": "vol_rond"
          },
          {
            "tag": "Marsepein",
            "hint": "vol_rond"
          },
          {
            "tag": "Macadamianoot",
            "hint": "vol_rond"
          },
          {
            "tag": "Praliné",
            "hint": "vol_rond"
          },
          {
            "tag": "Notig (algemeen)",
            "hint": "vol_rond"
          }
        ]
      },
      {
        "label": "Cacao",
        "tags": [
          {
            "tag": "Chocolade",
            "hint": "vol_rond"
          },
          {
            "tag": "Pure chocolade",
            "hint": "vol_rond"
          },
          {
            "tag": "Cacaonibs",
            "hint": "vol_rond"
          },
          {
            "tag": "Melkchocolade",
            "hint": "vol_rond"
          }
        ]
      }
    ]
  },
  {
    "key": "zoet",
    "name": "Zoet",
    "subgroups": [
      {
        "label": "Bruine suiker",
        "tags": [
          {
            "tag": "Melasse",
            "hint": "zoet"
          },
          {
            "tag": "Ahornsiroop",
            "hint": "zoet"
          },
          {
            "tag": "Gekarameliseerd",
            "hint": "zoet"
          },
          {
            "tag": "Honing",
            "hint": "zoet"
          },
          {
            "tag": "Toffee / botertoffee",
            "hint": "zoet"
          },
          {
            "tag": "Rietsuiker",
            "hint": "zoet"
          }
        ]
      },
      {
        "label": "Vanille & zoet",
        "tags": [
          {
            "tag": "Vanille",
            "hint": "zoet"
          },
          {
            "tag": "Vanilline",
            "hint": "zoet"
          },
          {
            "tag": "Algeheel zoet",
            "hint": "zoet"
          },
          {
            "tag": "Zoete aromatiek",
            "hint": "zoet"
          },
          {
            "tag": "Witte chocolade",
            "hint": "zoet"
          }
        ]
      }
    ]
  },
  {
    "key": "bloemig",
    "name": "Bloemig",
    "subgroups": [
      {
        "label": "Thee",
        "tags": [
          {
            "tag": "Zwarte thee",
            "hint": "fresh_clean"
          },
          {
            "tag": "Groene thee",
            "hint": "fresh_clean"
          }
        ]
      },
      {
        "label": "Bloemig",
        "tags": [
          {
            "tag": "Kamille",
            "hint": "fresh_clean"
          },
          {
            "tag": "Roos",
            "hint": "fresh_clean"
          },
          {
            "tag": "Jasmijn",
            "hint": "fresh_clean"
          },
          {
            "tag": "Hibiscus",
            "hint": "fresh_clean"
          },
          {
            "tag": "Lavendel",
            "hint": "fresh_clean"
          },
          {
            "tag": "Sinaasappelbloesem",
            "hint": "fresh_clean"
          },
          {
            "tag": "Bergamot",
            "hint": "fresh_clean"
          },
          {
            "tag": "Viooltje",
            "hint": "fresh_clean"
          },
          {
            "tag": "Vlierbloesem",
            "hint": "fresh_clean"
          },
          {
            "tag": "Citroengras",
            "hint": "fresh_clean"
          },
          {
            "tag": "Bloemig (algemeen)",
            "hint": "fresh_clean"
          }
        ]
      }
    ]
  }
];

export const TAG_CATEGORY: ReadonlyMap<string, WheelCategory> = new Map(
  FLAVOR_WHEEL.flatMap(c => c.subgroups.flatMap(sg => sg.tags.map(t => [t.tag, c.key] as const)))
);
