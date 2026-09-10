# Guia del panell d'administració (per a voluntaris)

Aquest panell permet gestionar les fitxes dels gats sense necessitat de
compte de GitHub ni coneixements tècnics. Els canvis que fas hi apareixen
publicats al lloc web en qüestió de segons.

Adreça del panell: **https://admin.animalsvidadigna.org**

## Iniciar sessió

El panell no fa servir contrasenyes. Cada vegada que hi entres:

1. Vés a https://admin.animalsvidadigna.org/login i escriu el teu correu
   electrònic.
2. Rebràs un correu amb un **codi de 6 xifres**. Introdueix-lo a la pantalla
   següent.
3. El codi és vàlid durant **5 minuts** i tens **3 intents** per introduir-lo
   correctament. Si s'exhaureix el temps o els intents, torna a la pantalla
   d'inici i demana un codi nou.

Només poden iniciar sessió les persones amb un correu autoritzat prèviament
pel mantenidor del lloc (secció "No rebo el codi" més avall).

## La llista de gats

En entrar veuràs la llista de tots els gats — publicats i esborranys. Cada
fila mostra la miniatura de la imatge de portada (o "Sense foto" si encara
no en té), el nom en català, el nom en castellà, l'estat, si està publicat i
quan es va actualitzar per última vegada. Pots filtrar la llista per estat
amb el desplegable "Filtra per estat" a la part superior.

## Crear un gat

Fes clic a **Nou gat**. S'obre un formulari buit. Pots desar-lo com a
esborrany (sense marcar "Publicat (visible al lloc web)") per anar-lo
completant més tard — no serà visible al lloc web fins que el publiquis. El
botó per desar diu **"Crea el gat"**; en un gat ja existent diu **"Desa els
canvis"**.

## Què vol dir cada camp

| Camp | Què hi poses |
|---|---|
| Nom (CA) / Nom (ES) | Nom del gat en català i castellà. |
| Slug (CA) / Slug (ES) | Part de la URL (`/cat/<slug>`). Es genera sol a partir del nom, però el pots editar. |
| Raça (CA) / Raza (ES) | Opcional. |
| Estat | Disponible, Adoptat, En tractament o No disponible. Controla el que veu la gent visitant el lloc. |
| Gènere | Mascle o Femella. |
| Mida | Petit, Mitjà o Gran. |
| Estat de salut | Sa, En tractament o Necessitats especials. |
| Edat (anys) | Opcional. |
| Pes (kg) | Opcional. |
| Personalitat | Selecciona totes les etiquetes que apliquin (Juganer, Tranquil, Tímid, Afectuós, Independent, Social, Curiós, Protector). |
| Es porta bé amb | Nens, Altres gats, Gossos, Gent gran — selecciona les que apliquin. |
| Vacunat / Microxipat / Esterilitzat | Marca les caselles que corresponguin. |
| Data de rescat / Data d'adopció | Opcional. |
| Descripció curta (CA) / Descripción corta (ES) | Frase que apareix a les targetes de la llista de gats. |
| Necessitats especials (CA) / Necesidades especiales (ES) | Text lliure, opcional. |
| Observacions (CA) / Observaciones (ES) | Text lliure, opcional. |
| Descripció (CA) — Markdoc / Descripción (ES) — Markdoc | Text llarg de la fitxa del gat. S'escriu en Markdoc (text amb un marcatge senzill, similar a Markdown); pots fer clic a "Mostra la vista prèvia" per veure com quedarà abans de desar. |
| Meta títol (CA) / Meta título (ES) | Per a cercadors (Google) — opcional, si el deixes buit s'utilitza el nom i la descripció curta. |
| Meta descripció (CA) / Meta descripción (ES) | Per a cercadors (Google) — opcional, si el deixes buit s'utilitza el nom i la descripció curta. |
| Ordre | Nombre que determina la posició del gat dins les llistes (més baix = més amunt). |
| Destacat | Si el marques, el gat pot aparèixer a la secció "Gats destacats" de la pàgina d'inici. |
| Publicat (visible al lloc web) | Mentre no ho marquis, el gat és un esborrany invisible al lloc públic. |

## Fotos

Cada gat pot tenir diverses fotos: una **imatge de portada** i una
**galeria**. Aquesta secció apareix a sota del formulari, quan edites un gat
ja creat (no quan encara l'estàs creant).

**Què passa quan puges una foto gran:** el navegador la redimensiona
automàticament abans de pujar-la — cap costat superarà els **2000 píxels**.
No cal que redimensionis res tu mateix/a abans de pujar-la; això sí, fotos
molt grans (mòbils moderns en fan de 4000 px o més) triguen uns segons més a
processar-se. Mentre es processa i es puja veuràs l'estat de cada foto
("comprimint…", "pujant…", "fet" o un missatge d'error). Per pujar-ne, fes
clic al camp **"Afegeix fotos"**.

**Enquadrament recomanat:** fotos horitzontals o quadrades funcionen millor
que les verticals molt allargades, perquè el lloc web les retalla a
proporcions concretes a les targetes i la portada. Procura que el gat ocupi
bona part del quadre, amb bona llum i sense gent al voltant si és possible.

**Text alternatiu (alt) en català i castellà:** cada foto té dos camps de
text alternatiu, un per idioma. Aquest text no es veu normalment — el
llegeixen els lectors de pantalla (persones amb discapacitat visual) i els
cercadors com Google. Escriu una descripció breu i concreta de la imatge,
per exemple "En Bigotis ajagut al sofà" en comptes de "foto1" o deixar-ho
buit. **S'hauria d'omplir sempre**, però el sistema no t'obliga a fer-ho: pots
desar una foto sense text alternatiu, així que és responsabilitat teva
recordar-ho.

**Imatge de portada:** és la foto que apareix a la llista de gats i a la
capçalera de la fitxa. Fes clic al botó **"Fes portada"** de la foto que
vulguis; quan ja n'és la portada, el mateix botó mostra **"És la portada"**.
Aquest canvi es desa immediatament, sense necessitat de prémer cap altre
botó.

**Ordre de la galeria:** les fotos **no es reordenen arrossegant-les**. Cada
foto té dos botons, **"Mou … amunt"** i **"Mou … avall"**, per canviar-ne la
posició. Un cop tinguis l'ordre (i els textos alternatius) com vulguis, has
de prémer el botó **"Desa l'ordre i els textos alternatius"** perquè els
canvis es guardin — si no el prems, en tornar a carregar la pàgina els
perdràs. L'ordre que estableixis aquí és el que veuran les persones
visitants a la fitxa del gat.

## Publicar / despublicar

L'interruptor **Publicat (visible al lloc web)** controla si el gat és
visible al lloc web públic. Despublicar un gat no l'esborra — només l'amaga
temporalment (per exemple, mentre acabes d'editar-lo, o si cal retirar-lo un
temps).

## Esborrar

A la pàgina d'edició d'un gat, el botó **"Elimina el gat"** demana
confirmació abans d'esborrar res. Esborrar un gat és **irreversible**:
s'elimina la fitxa i totes les seves fotos de manera definitiva, no hi ha
paperera. Si dubtes, despublica en lloc d'esborrar.

## No rebo el codi

1. Revisa la carpeta de **correu brossa / spam**.
2. Confirma que estàs escrivint exactament el correu electrònic que et va
   donar accés el mantenidor del lloc — un correu no autoritzat no rep mai
   cap codi, i el panell no ho indica per motius de seguretat.
3. Si continues sense rebre'l, contacta amb el mantenidor del lloc perquè
   comprovi que el teu correu és a la llista de persones autoritzades.

## On apareixen els canvis

Els canvis que fas i desas al panell són **immediats**, no cal cap
aprovació ni pull request. Els trobaràs a:

- La llista de gats: `https://animalsvidadigna.org/cats` (i `/es/cats` en
  castellà).
- La fitxa individual: `https://animalsvidadigna.org/cat/<slug>` (i
  `/es/cat/<slug>`).
- La pàgina d'inici, secció "Gats destacats", si el gat té marcat
  **Destacat** i està **Publicat**.

---

## Resumen en castellano

Este panel (**https://admin.animalsvidadigna.org**) permite gestionar las
fichas de los gatos sin cuenta de GitHub. Inicias sesión con tu correo: se
te envía un **código de 6 dígitos**, válido durante **5 minutos**, con **3
intentos**. Desde la lista de gatos puedes crear uno nuevo, rellenar sus
datos (nombre, estado, edad, personalidad, salud...) en catalán y castellano,
y subir fotos — el navegador las redimensiona automáticamente a un máximo de
2000 px. Las fotos de la galería se reordenan con los botones de subir y
bajar (no arrastrando), y hay que pulsar "Desa l'ordre i els textos
alternatius" para que el orden y los textos alternativos se guarden. Cada
foto debería llevar un texto alternativo en ambos idiomas (accesibilidad y
buscadores), aunque el sistema no lo exige. El interruptor "Publicat (visible
al lloc web)" decide si el gato es visible; borrarlo es irreversible, así
que si tienes dudas, despublica en lugar de borrar. Los cambios se ven al
instante en `/cats`, `/cat/<slug>` y la portada (si el gato está destacado).
Si no recibes el código, revisa spam y confirma con el mantenedor del sitio
que tu correo está autorizado.
