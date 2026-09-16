# MMM-DexcomOne

A [MagicMirror²](https://magicmirror.builders/) module that shows your current glucose reading from your Dexcom account: the value, the trend arrow, the change since the previous reading, how long ago it was taken, and a small chart of the last few hours.

It reads straight from Dexcom's servers with your regular Dexcom account. You don't need a developer account, a Nightscout server, or anything running on your phone.

Tested with a Dexcom ONE+ in Spain. It should work with any Dexcom sensor whose readings reach Dexcom's cloud.

## Features

- Large glucose value with trend arrow (↑ ↗ → ↘ ↓ and double arrows)
- Change since the previous reading and time since the last reading
- The value changes color when you are below or above your range, and pulses on an urgent low
- Readings older than 15 minutes are struck through and greyed out, so an old value is never mistaken for a current one
- Chart of the last 3 hours with your target range shaded
- mg/dL or mmol/L
- Aligns itself to the left, center or right depending on the region you place it in
- Adjustable size with a single `scale` option
- No dependencies

## Requirements

- MagicMirror² running on Node.js 18 or later
- A Dexcom account whose sensor readings are uploaded to Dexcom's cloud

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/afsenovilla/MMM-DexcomOne.git
```

There is nothing to install with npm.

## Configuration

Add the module to the `modules` array in `~/MagicMirror/config/config.js`:

```js
{
  module: "MMM-DexcomOne",
  position: "bottom_left",
  config: {
    accountId: "12345678-90ab-cdef-1234-567890abcdef",
    password: "your-dexcom-password",
    region: "ous",
    scale: 0.5,
    showGraph: false
  }
},
```

You can use `username` instead of `accountId`. The username can be your email, your phone number with the country code (for example `+34600111222`), or your Dexcom username. Using `accountId` is the most reliable option.

### Finding your account ID

1. Sign in to Dexcom's account management website for your region. In Europe this is [myaccount.dexcom.eu](https://myaccount.dexcom.eu).
2. Open your profile.
3. The ID at the end of the URL is your account ID, for example `https://myaccount.dexcom.eu/profile/12345678-90ab-cdef-1234-567890abcdef`.

### Options

| Option | Default | Description |
|---|---|---|
| `accountId` | `""` | Your Dexcom account ID. If set, `username` is not needed. |
| `username` | `""` | Email, phone number with country code, or Dexcom username. |
| `password` | `""` | Your Dexcom password. |
| `region` | `"ous"` | `"ous"` for accounts outside the US (including Europe), `"us"` for the US, `"jp"` for Japan. |
| `units` | `"mg/dL"` | `"mg/dL"` or `"mmol/L"`. |
| `low` | `70` | Below this value the reading is shown as low. Always in mg/dL. |
| `high` | `180` | Above this value the reading is shown as high. Always in mg/dL. |
| `urgentLow` | `55` | At or below this value the reading pulses. Always in mg/dL. |
| `staleMinutes` | `15` | Minutes after which a reading is considered out of date. |
| `updateInterval` | `150000` | How often to fetch new readings, in milliseconds (2.5 minutes). |
| `historyMinutes` | `180` | How far back the chart goes, in minutes. |
| `historyCount` | `36` | Maximum number of readings to fetch. |
| `showGraph` | `true` | Show the chart below the value. |
| `showErrors` | `false` | Show the last connection error on the mirror. Errors are always written to the log. |
| `align` | `"auto"` | `"auto"` follows the region: left in `*_left`, right in `*_right`, centered in center, third and bar regions. Use `"left"`, `"center"` or `"right"` to force it. |
| `scale` | `1` | Overall size of the module. `0.5` is half size, `1.5` is 50% larger. Text, arrow and chart all scale together. |

## Updating

```bash
cd ~/MagicMirror/modules/MMM-DexcomOne
git pull
```

Then restart MagicMirror.

## How it works

The module uses the same Dexcom web services as the Dexcom source in [Nightscout Clock](https://github.com/ktomy/nightscout-clock):

1. `AuthenticatePublisherAccount` gets your account ID from your username (skipped when `accountId` is set).
2. `LoginPublisherAccountById` opens a session.
3. `ReadPublisherLatestGlucoseValues` fetches the latest readings.

The session is reused between updates and renewed automatically when it expires. All requests are made by MagicMirror's server on your own device. Your credentials are only sent to Dexcom.

## Troubleshooting

Check MagicMirror's log for lines starting with `[MMM-DexcomOne]`:

```bash
pm2 logs MagicMirror --lines 50 | grep DexcomOne
```

- **Invalid username or password.** Check that you can sign in to Dexcom's account management website with the same details, or use `accountId` instead of `username`.
- **No session returned.** Check `region` and your password.
- **The module keeps showing "Cargando glucosa…" (loading).** Readings are coming back empty. Make sure your Dexcom app is uploading readings. On some accounts, enabling sharing with at least one follower in the Dexcom app may be required.

You can test your account from the Raspberry Pi without MagicMirror:

```bash
BASE="https://shareous1.dexcom.com/ShareWebServices/Services"
APP="d89443d2-327c-4a6f-89e5-496bbb0317db"
ACCOUNT="your-account-id"
PASS="your-password"

SESSION=$(curl -s -X POST "$BASE/General/LoginPublisherAccountById" \
  -H "Content-Type: application/json" \
  -d "{\"accountId\":\"$ACCOUNT\",\"password\":\"$PASS\",\"applicationId\":\"$APP\"}" | tr -d '"')

curl -s "$BASE/Publisher/ReadPublisherLatestGlucoseValues?sessionId=$SESSION&minutes=60&maxCount=3"
```

If the second command prints your latest readings, the module will work with the same details.

## Security

Your password is stored in plain text in `config.js`. Keep that file private and never commit it to a public repository. The module's own files contain no credentials.

## Disclaimer

This is a personal project. It is not affiliated with, endorsed by, or supported by Dexcom. It uses an unofficial web service that Dexcom may change at any time.

Do not use this module to make treatment decisions, and do not rely on it for alerts. Always use your official Dexcom app or receiver.

## Acknowledgements

- [Nightscout Clock](https://github.com/ktomy/nightscout-clock) by ktomy, whose Dexcom data source this module follows.
- [pydexcom](https://github.com/gagebenne/pydexcom) by gagebenne, for documenting the Dexcom web service.

## License

[MIT](LICENSE)
