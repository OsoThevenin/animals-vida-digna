# Animals Vida Digna - Web de l'Associació

Aquest repositori conté el codi font de la web de l'Associació Animals Vida Digna, una protectora de gats dedicada al rescat, rehabilitació i adopció de gats abandonats.

La web utilitza Next.js juntament amb Payload CMS 3.0 per gestionar el contingut dinàmic, com els voluntaris de l'associació, i està preparada per créixer amb col·leccions futures.

### Desenvolupament Local

#### Crear l'arxiu d'entorn de desenvolupament local

```bash
cp .env.example .env.development.local
```

#### Executar l'script per iniciar la base de dades, que utilitza docker per configurar Postgres

```bash
./start-database.sh
```

_Nota: Pots canviar la cadena de connexió a l'arxiu .env.development.local per apuntar a una base de dades diferent, també voldràs canviar-la a l'script start-database.sh._

#### Crea un secret per a Payload, potser utilitzant `openssl rand -base64 32`, i configura aquest valor a l'arxiu .env.development.local.

#### Instal·lar les dependències

```bash
pnpm i
```

#### Crear l'arxiu de migració de la base de dades

```bash
pnpm run payload migrate:create initial
```

#### Executar la migració per crear les taules de la base de dades

```bash
pnpm run payload migrate
```

#### Iniciar el servidor de desenvolupament

```bash
pnpm dev
```

### Estructura de la Web

- **Pàgina Principal**: Mostra informació sobre l'associació, colònies felines, adopcions, i formes de col·laborar.
- **La Nostra Història**: Explica els orígens i evolució de l'associació.
- **Coneix l'Equip**: Mostra els voluntaris de l'associació carregats dinàmicament des del CMS.

### Tecnologies

- Next.js
- Payload CMS 3.0
- TailwindCSS
- PostgreSQL
