
# Riktlinjer som gör det enklare för oss

## Allmänt:
- Använd om möjligt befintliga funktioner för API-anrop för att hantera meddelande, användare och databasanrop (se [api.js](https://github.com/stoffe-fe23/versionhantering-grupp4-slutprojekt/wiki/Script-functions-%E2%80%90-api)).
- Vid visuella ändringar, tänk på att webbplatsen skall fungera och se OK ut i både darkmode och lightmode-läge. ("darkmode" klass på body-tagen = dark mode aktivt)
- Webbplatsen skall ha två vyer: desktop och mobile. Design-ändringar bör ha mobile-first upplägg i åtanke.


## Vid ändring i befintliga filer:
- Använd ej Prettier (eller liknande) kodformaterare, de gör det besvärligt att se vad som faktiskt har ändrats.
- Om en ny funktion läggs till, skriv en kort kommentar över den vad den gör.
- Om en större/utbrytbar feature läggs till, överväg att lägga den i separata js/css-filer istället och länka in.
- Använd 4 mellanslags indrag (4 spaces indentation). Använd block-formatering enligt:
``` javascript
if (something) {
    doSomething();
}
else {
    doSomethingElse();
}
```
![Set indentation to 4 spaces here](https://github.com/stoffe-fe23/versionhantering-grupp4-slutprojekt/blob/main/images/doc-indentation.png?raw=true)

## Vid skapande av nya filer:
- **Nya CSS-filer:** skall ligga i css-mappen.
- **Nya javascript-filer:** skapas som moduler i modules-mappen och importeras in i main.js (eller befintlig modul vid behov).
- **Nya html-filer:** Webbplatsen är uppbyggd runt single-page design. Så undvik detta.


