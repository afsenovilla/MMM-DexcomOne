# MMM-DexcomOne

Muestra tu glucosa actual, la flecha de tendencia, la variación desde la lectura anterior
y una mini gráfica de las últimas 3 horas en MagicMirror².

Lee los datos igual que la fuente "Dexcom" de [Nightscout Clock](https://github.com/ktomy/nightscout-clock):
con tu usuario y contraseña de Dexcom, contra los servidores de Dexcom (`shareous1.dexcom.com` en Europa).

Requiere Node 18 o superior (usa `fetch` nativo, sin dependencias).

## Instalación

```bash
cd ~/MagicMirror/modules
git clone https://github.com/afsenovilla/MMM-DexcomOne.git
```

Para actualizar: `cd ~/MagicMirror/modules/MMM-DexcomOne && git pull` y reinicia MagicMirror.

## Configuración

```js
{
  module: "MMM-DexcomOne",
  position: "top_right",
  config: {
    username: "+34600111222",     // email o móvil con prefijo
    password: "********",
    region: "ous",                // equivale a "Non-US" en el reloj
    units: "mg/dL",
    low: 70,
    high: 180
  }
},
```

## Opciones

| Opción | Por defecto | Descripción |
|---|---|---|
| `username` | `""` | Email, teléfono o usuario de Dexcom |
| `password` | `""` | Contraseña de Dexcom |
| `accountId` | `""` | UUID de la cuenta. Si lo pones, no hace falta `username` |
| `region` | `"ous"` | `ous` (fuera de EE. UU.), `us` o `jp` |
| `units` | `"mg/dL"` | `mg/dL` o `mmol/L` |
| `low` / `high` / `urgentLow` | `70` / `180` / `55` | Umbrales en mg/dL |
| `staleMinutes` | `15` | A partir de aquí la lectura se muestra tachada |
| `updateInterval` | `150000` | Cada cuánto se consulta (ms) |
| `showGraph` | `true` | Mini gráfica de las últimas horas |

## Cómo encontrar tu accountId

Inicia sesión en la web de gestión de cuentas de Dexcom de tu región (en Europa, myaccount.dexcom.eu).
El código con guiones al final de la URL del perfil es tu `accountId`.

## Probar las credenciales

```bash
curl -s -X POST https://shareous1.dexcom.com/ShareWebServices/Services/General/AuthenticatePublisherAccount \
  -H "Content-Type: application/json" \
  -d '{"accountName":"tu@email.com","password":"****","applicationId":"d89443d2-327c-4a6f-89e5-496bbb0317db"}'
```

Si devuelve un UUID, las credenciales y la región son correctas.

> Uso personal e informativo. No sustituye a la app oficial ni a sus alarmas.
