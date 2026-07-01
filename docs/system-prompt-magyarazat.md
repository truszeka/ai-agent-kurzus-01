## 1. Utasítás sorrend
Egyértelmű prioritási sorrendet ad, ezért kisebb az utasításütközés esélye.

## 2. Hallucináció elleni védelem
Kötelezővé teszi, hogy minden állítás SQL eredményből származzon.

## 3. Prompt Injection védelem
Megakadályozza, hogy a felhasználó felülírja a rendszerutasításokat vagy kikérje a system promptot.

## 4. Tool Policy
Egyértelművé teszi, hogy minden válasz előtt kötelező a runSql használata.

## 5. Hibakezelés
Meghatározza az üres találatok kezelését, így jobb felhasználói élményt ad.

## 6. Output Contract
Rögzíti a válasz szerkezetét, ezért egységesebb válaszok születnek.

## 7. Quality Gate
Beépített ellenőrzőlista csökkenti a hibák számát.

## 8. Karbantarthatóság
Logikailag elkülönített fejezetekből áll, ezért könnyen bővíthető.

## 9. Enterprise szemlélet
A prompt követi a modern agent-eknél alkalmazott mintákat: szerep, prioritás, biztonság, tool policy, output contract, quality gate.

## 10. Várható eredmény
- stabilabb SQL generálás
- kevesebb hallucináció
- egységes válaszok
- jobb biztonság
- könnyebb továbbfejlesztés