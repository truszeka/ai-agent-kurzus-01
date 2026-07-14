# ROI: miért éri meg?

A megtérülésnek két oldala van. A **Hard ROI** közvetlenül pénzben mérhető, a
**Soft ROI** nehezebben számszerűsíthető, de valós üzleti érték.

| Típus | Mit ad |
|---|---|
| Hard ROI | Megspórolt elemző-órák: a rutinkérdésekhez nem kell külön adatelemző. |
| Soft ROI | Gyorsabb döntés és önkiszolgálás: nincs várakozás az elemzőre, azonnal van válasz. |

## Hard ROI — számpélda (5 fős iroda)

| Tétel | Érték |
|---|---|
| Rutin adatkérdés / fő / hét | 3 |
| Érintett kollégák | 5 |
| Kérdések / hét | 15 |
| Elemzői idő / megválaszolt kérdés | 15 perc |
| Megspórolt elemzői idő / hét | 225 perc ≈ 3,75 óra |
| Megspórolt idő / hónap (4,33 hét) | ≈ 16,25 óra |
| Elemzői órabér (teljes munkáltatói költséggel) | 9 000 Ft/óra |
| **Havi megtakarítás** | **≈ 146 000 Ft** |
| **Éves megtakarítás** | **≈ 1 750 000 Ft** |

## Érzékenységvizsgálat

Az alap számpélda (15 kérdés/hét, 15 perc/kérdés) egyetlen becslés — érdemes
megnézni, mi történik pesszimistább vagy optimistább feltételezésekkel:

| Forgatókönyv | Kérdés/hét | Elemzői idő/kérdés | Havi megtakarítás | Éves megtakarítás |
|---|---|---|---|---|
| Pesszimista | 8 | 10 perc | ≈ 52 000 Ft | ≈ 624 000 Ft |
| Alap | 15 | 15 perc | ≈ 146 000 Ft | ≈ 1 750 000 Ft |
| Optimista | 25 | 20 perc | ≈ 325 000 Ft | ≈ 3 900 000 Ft |

Még a pesszimista forgatókönyvben is jelentős, pozitív a megtakarítás — a
business case nem múlik a becslés pontosságán.

## Agent futtatási költsége (nettó ROI)

A fenti megtakarítás bruttó szám: nem tartalmazza az agent üzemeltetésének
(LLM API-hívások) költségét. Ezt is le kell vonni, hogy nettó képet kapjunk.

| Tétel | Érték |
|---|---|
| Becsült token/kérdés (input + output) | ≈ 2 500 |
| Becsült API-költség / kérdés | ≈ 5 Ft |
| Kérdés / hónap (alap eset, 4,33 hét) | ≈ 65 |
| **Agent költség / hónap** | **≈ 350 Ft** |

| Forgatókönyv | Havi megtakarítás (bruttó) | Havi agent költség | **Havi nettó megtakarítás** |
|---|---|---|---|
| Pesszimista | 52 000 Ft | ≈ 190 Ft | **≈ 51 800 Ft** |
| Alap | 146 000 Ft | ≈ 350 Ft | **≈ 145 650 Ft** |
| Optimista | 325 000 Ft | ≈ 585 Ft | **≈ 324 400 Ft** |

Az agent futtatási költsége minden forgatókönyvben elhanyagolható a
megspórolt elemzői időhöz képest (< 0,5%), a nettó megtakarítás gyakorlatilag
megegyezik a bruttóval.

## Soft ROI

- Nincs várakozás az elemzőre → a döntés percek, nem napok alatt megszületik.
- Önkiszolgálás: bárki feltehet egy kérdést, nem kell megtanulni SQL-t.
- Az elemző felszabaduló idejét magasabb hozzáadott értékű munkára fordíthatja.
