# Reposta

Compara las gasolineras cercanas en España y decide dónde merece la pena repostar. No ordena solo por precio: tiene en cuenta la distancia y una estimación del combustible que gastas en el desvío.

Abres la web, eliges el combustible, ves el mapa y la lista, y sales hacia la estación con la app de mapas del móvil.

## Qué hace

- Busca gasolineras en un radio con la API de [Precioil](https://api.precioil.es/), sin descargar todas las de España.
- Muestra el precio directamente sobre el mapa, con una escala relativa a los resultados actuales: barato, medio o caro. Color, icono y texto van juntos; nunca solo el color.
- Ordena por opción recomendada, precio o distancia, y filtra por distancia, abiertas, marca y precio máximo.
- Estima si un desvío compensa según los litros que vas a echar, el consumo y, si quieres, la ida y vuelta.
- Indica cuándo se actualizó cada precio y atenúa los que tienen más de 24 horas.
- Ficha de la estación con el histórico de 7, 30 y 90 días integrado, y comparación de hasta tres estaciones.
- Precio medio provincial cuando Precioil lo publica.
- Geolocalización opcional y búsqueda de ciudad, calle o código postal en España.
- Tema claro, oscuro o según el sistema.
- Instalable como PWA. Los precios no se guardan en la caché del service worker.

## Interfaz

- **Móvil:** el mapa ocupa toda la pantalla. Arriba flotan la búsqueda (con el botón de ubicación dentro) y los combustibles. Los resultados viven en un panel inferior con tres posiciones —recogido, medio y completo— que se arrastra, se lanza con un gesto o se cambia tocando el asa. Respeta las safe areas del iPhone.
- **Escritorio (≥ 768 px):** mapa a la izquierda y panel de 380–420 px a la derecha.
- **Mapa ↔ lista:** tocar un marcador o una tarjeta selecciona la estación en los dos sitios, abre su ficha y desplaza el mapa lo justo para que el marcador quede visible fuera de los paneles. “Buscar en esta zona” aparece solo cuando mueves tú el mapa. Escape cierra la ficha, la comparación y los ajustes.
- **Marcadores:** HTML propio (`L.divIcon`) con el precio, una marca de nivel y un pie que apunta a la coordenada exacta. Estados: barato, medio, caro, recomendado, cerrado y seleccionado. Los grupos muestran el precio más barato que contienen. No hay imágenes, así que no dependen de rutas de assets ni del base path de GitHub Pages.
- **Sistema de diseño:** tokens en `src/index.css` (colores claro/oscuro, cuatro radios, tres elevaciones, seis tamaños de texto) y componentes en `src/components/ui`: `Button`, `Chip`/`ChipSelect`, `Price`, `BandBadge`, `StateMessage` y `BottomSheet`. Las animaciones duran 150–260 ms y respetan `prefers-reduced-motion`.
- **Estados:** cada estado vacío o de error explica qué pasa, qué puedes hacer y ofrece la acción. Los errores de la API se traducen a mensajes útiles; el detalle técnico (estado HTTP, mensaje de Precioil) queda en “Detalles técnicos”.

## Stack

React, TypeScript estricto, Vite, Tailwind CSS, Leaflet con teselas Esri Canvas (gris claro y oscuro, sin clave), Lucide, Zustand y Zod. Los tests usan Vitest y Testing Library.

No hay backend propio. En producción es un sitio estático.

## Arquitectura

```text
src/
  api/precioil/     cliente, esquemas y endpoints
  api/geocode.ts    búsqueda de lugares (Photon / OpenStreetMap)
  api/cache.ts      caché en memoria con deduplicación
  components/ui/    piezas reutilizables: botones, chips, precio, estados, panel inferior
  features/         mapa y marcadores, lista, ficha, histórico, comparación, ajustes
  stores/           preferencias locales y sesión de búsqueda
  utils/            distancia, horario, escala de precio y calculateBestStation
  services/         geolocalización y analytics.track
```

`calculateBestStation` es una función pura:

1. La referencia es la gasolinera con precio más cercana.
2. El desvío son los kilómetros de más respecto a esa referencia.
3. Esos kilómetros se convierten a litros con el consumo indicado y se valoran al precio de la referencia.
4. El coste neto es `litros × precio oficial + coste del desvío`.
5. Gana el coste neto más bajo.

El precio por litro es el dato de Precioil. El desvío se muestra siempre como estimación.

## Desarrollo

```bash
npm install
cp .env.example .env
npm run dev
```

La aplicación queda en `http://127.0.0.1:4179`.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

En Git Bash para Windows, exporta `MSYS_NO_PATHCONV=1` antes de pasar `VITE_BASE_PATH=/repo/`: si no, convierte la ruta en `C:/Program Files/Git/repo/` y el build apunta a assets inexistentes.

## API key de Precioil

1. Entra en [https://api.precioil.es/](https://api.precioil.es/) y solicita acceso.
2. Pide una **browser key**, no una server key. La clave del frontend acaba dentro del JavaScript.
3. Autoriza el origin donde se publica la web, por ejemplo `https://usuario.github.io`.
4. Para desarrollo, autoriza también `http://127.0.0.1:4179` y `http://localhost:4179` si Precioil distingue el puerto.
5. Guárdala en `VITE_PRECIOIL_API_KEY`. La cabecera que se envía es `X-API-Key`. Nunca va en la query.

La documentación viva está en el [Swagger](https://api.precioil.es/api-docs/). Este cliente usa los contratos comprobados en octubre de 2026:

| Uso | Endpoint |
| --- | --- |
| Cercanas | `GET /estaciones/radio` con `fields=current` |
| Ficha | `GET /estaciones/detalles/{idEstacion}` |
| Histórico | `GET /estaciones/historico/{idEstacion}?fechaInicio&fechaFin` |
| Provincias y media | `GET /provincias`, `GET /precios/medios/provincia/{idProvincia}` |

Los precios del radio llegan como número (`Diesel`, `Gasolina95`, `Gasolina98`, `GLP`…). En el detalle, los mismos campos pueden llegar como texto. El histórico devuelve eventos con `idFuelType`, no una serie diaria: la gráfica reconstruye el precio de cada día.

Hoy algunos endpoints responden sin clave. Una clave inválida responde `401`. No cuentes con el acceso anónimo: en GitHub Pages configura la browser key. CORS permite el origen del navegador y la cabecera `X-API-Key`. Si la clave está restringida por origin, Precioil la rechaza fuera de ese dominio aunque CORS sea abierto: responde `403 api_key_origin_not_allowed`, la lista queda vacía y el mapa sin marcadores. Es lo primero que hay que revisar si en GitHub Pages no aparecen gasolineras (el detalle técnico se ve en “Detalles técnicos” del mensaje de error). El origin cuenta con el puerto: `vite preview` en otro puerto que no sea 4179 también recibe 403.

La búsqueda de direcciones usa [Photon](https://photon.komoot.io/), el geocodificador público de OpenStreetMap mantenido por Komoot. No hay geocodificador propio. Las consultas van con debounce, límite de resultados y caché. La ubicación solo sale del navegador hacia Precioil (para el radio) y, si ya hay un origen, hacia Photon como sesgo de la búsqueda.

## GitHub Pages

El workflow `.github/workflows/pages.yml` instala dependencias con `npm ci`, pasa lint, tests y build, y despliega `dist` con GitHub Actions. En las pull requests solo verifica; despliega al hacer push a `main`.

El proyecto usa npm: `package-lock.json` es el lockfile que lee el CI y `pnpm-lock.yaml` está ignorado. Si cambias dependencias, actualiza `package-lock.json` (`npm install`, o `npm install --package-lock-only` si trabajas con otro gestor).

1. En el repositorio: Settings → Pages → Source: GitHub Actions.
2. Crea el secreto `VITE_PRECIOIL_API_KEY` con la browser key.
3. En Precioil, autoriza el origin público (`https://usuario.github.io` o el dominio del repositorio).
4. Haz push a `main`.

El base path del build es `/` si el repositorio se llama `*.github.io` y `/nombre-del-repo/` en caso contrario. La interfaz no usa rutas del servidor: la ficha, la comparación y los ajustes son paneles en la misma página, así que Pages no necesita un fallback SPA.

## Privacidad

No hay cuentas, cookies propias ni analítica externa. `analytics.track` solo avisa a suscriptores en memoria, para poder conectar más adelante una herramienta como Plausible sin reescribir la interfaz.

La última búsqueda, el combustible y los ajustes de estimación se guardan en `localStorage` de este navegador. Si la última búsqueda fue “Tu ubicación” y el permiso ya está concedido, al abrir se vuelve a pedir la posición para no enseñar gasolineras de otro sitio; sin permiso no se pide nada al cargar.

## Limitaciones

- El catálogo visible son los combustibles habituales en España que Precioil devuelve como campos de estación. El listado `/fuel-types` incluye muchos productos de otros países que no aparecen en estas fichas.
- La media de la estación (`*_media`) no se presenta como media provincial. Para eso se usa `/precios/medios/provincia`.
- La API consultada no devuelve servicios de la estación (tienda, lavado). Si en el futuro llega un campo `servicios`, la ficha lo muestra.
- El horario se interpreta en Europa/Madrid. Si el texto no sigue el formato `L-V: 07:30-22:00`, el estado queda como no confirmado y el filtro “Abiertas” no la oculta.
- “Abierta ahora” y el ahorro del desvío son ayudas, no datos oficiales.
- Las teselas de Esri y Photon son servicios gratuitos con políticas de uso. Un tráfico muy alto puede exigir otro proveedor de mapas. Las teselas de CARTO dejaron de servirse sin API key (devuelven una marca de agua) y por eso se sustituyeron.
- La browser key es visible para quien descarga la web. Su única protección es la restricción de origin en Precioil.

## Roadmap

La estructura deja sitio, sin implementarlos aún, para favoritos, alertas de precio, rutas, ahorro mensual, comparación de marcas, compartir una estación y un proveedor de analítica respetuoso.
