# INTECS — Public API

Read-only HTTP API for retrieving a unit's fuel, muster, autolube, and ansul
records over a date range.

---

## Base URL

```
https://api.intecs.flowmeter.qimxmining.cloud
```

## Authentication

Every request must include your API key in the `x-api-key` header:

```
x-api-key: <your-api-key>
```

Requests without a valid key are rejected with **`403 Forbidden`**. Keep the
key secret; contact the API owner to obtain or rotate it.

Each API key is **scoped to a single tenant**. You can only read units that
belong to your tenant; requesting a unit outside it returns **`404 Not Found`**
(the same response as a unit that doesn't exist), so keys cannot probe for other
tenants' units.

There is a request rate limit (throttle) applied per key. If you exceed it you
will receive **`429 Too Many Requests`** — retry after a short backoff.

---

## Endpoint

### `GET /unit`

Returns the data records for a single unit within a date range.

#### Query parameters

| Parameter   | Required | Description |
|-------------|----------|-------------|
| `unitId`    | yes      | The unit identifier, e.g. `HT144`. |
| `dateStart` | yes      | Start of the range. Accepts a date (`YYYY-MM-DD`) or a full ISO timestamp. A bare date is treated as `00:00:00.000Z` of that day. |
| `dateEnd`   | yes      | End of the range. A bare date is treated as `23:59:59.999Z` of that day. |
| `limit`     | no       | Max items **per dataset** in one response. Default `500`, maximum `5000`. See [Pagination](#pagination). |
| `nextToken` | no       | Continuation token from a previous response. See [Pagination](#pagination). |

#### Example request

```bash
curl -s "https://api.intecs.flowmeter.qimxmining.cloud/unit?unitId=HT144&dateStart=2026-06-01&dateEnd=2026-06-02" \
  -H "x-api-key: <your-api-key>"
```

> On Windows PowerShell, use `curl.exe` (not the `curl` alias) and keep the URL
> quoted because it contains `&`.

---

## Response

The example below shows one fully-populated record per dataset. In practice
fields that are `null` or zero-valued readings are omitted (see
[Omitted fields](#omitted-fields--important)), so most records are smaller.

```jsonc
{
  "unit": {
    "id_unit": "HT144",
    "tenant": "INTECS",
    "subtenant": "Amman",
    "last_lon": 117.12,
    "last_lat": -3.45
  },
  "range": {
    "dateStart": "2026-06-01T00:00:00.000Z",
    "dateEnd": "2026-06-02T23:59:59.999Z"
  },
  "counts": {
    "fuelData": 500,
    "musterData": 12,
    "autolubeData": 3,
    "ansulData": 1
  },
  "fuelData": [
    {
      "id": "8469e46f-03fe-4074-a677-aea9ee264192",
      "id_unit": "HT144",
      "tenant": "INTECS",
      "subtenant": "Amman",
      "createdAt": "2026-06-01T01:57:00.868Z",
      "uptime": 38211,
      "status_gps": "A",
      "lon": 117.123456,
      "lat": -3.456789,
      "alt": 412.5,
      "speed": 24.7,
      "angle": 138.2,
      "flowrate_differential": { "dataname": "flowrate differential", "datavalue": 12.4, "dataunit": "L/min" },
      "total_differential":    { "dataname": "total differential", "datavalue": 1840.6, "dataunit": "L" },
      "accumulated_total_differential": { "dataname": "accumulated total differential", "datavalue": 982314.7, "dataunit": "L" },
      "flowrate_a": { "dataname": "flowrate a", "datavalue": 30.1, "dataunit": "L/min" },
      "flowrate_b": { "dataname": "flowrate b", "datavalue": 17.7, "dataunit": "L/min" },
      "temperature_a": { "dataname": "temperature a", "datavalue": 31.5, "dataunit": "C" },
      "temperature_b": { "dataname": "temperature b", "datavalue": 30.8, "dataunit": "C" },
      "error_code": { "dataname": "error code", "datavalue": 2, "dataunit": "/" },
      "atg_1": { "id_sensor": "ATG-1", "level": 78.4 },
      "atg_2": { "id_sensor": "ATG-2", "level": 76.9 },
      "accumulated_level_sensor": { "dataname": "accumulated level sensor", "datavalue": 154200.3, "dataunit": "L" },
      "atg_current_a": 12.1,
      "atg_current_b": 11.8,
      "stick_level_1": 79.0,
      "stick_level_2": 77.2,
      "tank_volume_liter": 9450.5,
      "tank_volume_percent": 78.4,
      "pitch_angle": 1.2,
      "roll_angle": -0.6,
      "remaining_distance": 142.3
    }
    // … more fuelData records
  ],
  "musterData": [
    {
      "id": "b1c2d3e4-0000-4a11-9f00-1122334455aa",
      "id_unit": "HT144",
      "tenant": "INTECS",
      "subtenant": "Amman",
      "createdAt": "2026-06-01T02:10:12.000Z",
      "status": "OK",
      "detail_array": ["zone-1:ok", "zone-2:ok"],
      "battery_voltage": "12.6",
      "pressure": "4.2",
      "type": "periodic"
    }
    // … more musterData records
  ],
  "autolubeData": [
    {
      "id": "c2d3e4f5-1111-4b22-8e11-2233445566bb",
      "id_unit": "HT144",
      "tenant": "INTECS",
      "subtenant": "Amman",
      "createdAt": "2026-06-01T03:05:44.000Z",
      "events": { "pressureSwitch": true, "lowLevel": false, "faultLamp": false }
    }
    // … more autolubeData records
  ],
  "ansulData": [
    {
      "id": "d3e4f5a6-2222-4c33-9d22-3344556677cc",
      "id_unit": "HT144",
      "tenant": "INTECS",
      "subtenant": "Amman",
      "createdAt": "2026-06-01T04:20:00.000Z",
      "events": { "eventId": "EVT-1007", "eventDate": "2026-06-01T04:19:58.000Z", "eventDesc": "discharge test" }
    }
  ],
  "nextToken": "eyJkIjoiLi4uIn0"   // or null when there is no more data
}
```

- `counts` are the item counts **in this response**, not totals for the whole
  range. To get totals, sum the counts across all pages.
- All records are ordered by `createdAt` **ascending** (oldest first).

### Omitted fields — important

To keep responses small, the API **omits empty data** rather than sending it:

- Any field whose value is `null` is left out entirely.
- Any sensor reading object whose `datavalue` is `0` (e.g. a flowmeter or
  temperature reading) is left out entirely.

**Treat a missing field as "no value" (null / zero).** Do not assume every
field is present on every record.

---

## Datasets

### `fuelData` (telemetry)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Record id |
| `id_unit` | string | Unit id |
| `tenant`, `subtenant` | string | Ownership |
| `createdAt` | string (ISO) | Timestamp of the reading |
| `uptime` | number | |
| `status_gps` | string | GPS fix status |
| `lon`, `lat`, `alt`, `speed`, `angle` | number | Position / motion |
| `flowrate_differential`, `total_differential`, `accumulated_total_differential`, `flowrate_a`, `flowrate_b`, `temperature_a`, `temperature_b`, `accumulated_level_sensor` | object | Reading: `{ dataname, datavalue, dataunit }`. Omitted when `datavalue` is `0`. |
| `error_code` | object | `{ dataname, datavalue, dataunit }`. Omitted when `datavalue` is `0`. |
| `atg_1`, `atg_2` | object | `{ id_sensor, level }` |
| `atg_current_a`, `atg_current_b`, `stick_level_1`, `stick_level_2` | number | Tank gauging |
| `tank_volume_liter`, `tank_volume_percent` | number | Tank volume |
| `pitch_angle`, `roll_angle`, `remaining_distance` | number | |

### `musterData`

| Field | Type |
|-------|------|
| `id`, `id_unit`, `tenant`, `subtenant` | string |
| `createdAt` | string (ISO) |
| `status` | string |
| `detail_array` | string[] |
| `battery_voltage` | string |
| `pressure` | string |
| `type` | string |

### `autolubeData`

| Field | Type | Notes |
|-------|------|-------|
| `id`, `id_unit`, `tenant`, `subtenant` | string | |
| `createdAt` | string (ISO) | |
| `events` | object | `{ pressureSwitch, lowLevel, faultLamp }` (booleans) |

### `ansulData`

| Field | Type | Notes |
|-------|------|-------|
| `id`, `id_unit`, `tenant`, `subtenant` | string | |
| `createdAt` | string (ISO) | |
| `events` | object | `{ eventId, eventDate, eventDesc }` |

---

## Pagination

A single response holds up to `limit` items **per dataset**. When more data
exists in the requested range, the response includes a non-null `nextToken`.

To fetch the rest, repeat the **same request** with the `nextToken` appended.
**Keep `unitId`, `dateStart`, `dateEnd`, and `limit` identical across pages** —
only `nextToken` changes. Stop when `nextToken` is `null`.

```bash
# Page 1
curl -s "https://api.intecs.flowmeter.qimxmining.cloud/unit?unitId=HT144&dateStart=2026-06-01&dateEnd=2026-06-02" \
  -H "x-api-key: <key>"
#   -> "nextToken": "eyJkIjoi..."

# Page 2 (same params + the token)
curl -s "https://api.intecs.flowmeter.qimxmining.cloud/unit?unitId=HT144&dateStart=2026-06-01&dateEnd=2026-06-02&nextToken=eyJkIjoi..." \
  -H "x-api-key: <key>"
#   -> "nextToken": null   (done)
```

### Example: fetch everything (JavaScript)

```js
async function fetchAll(unitId, dateStart, dateEnd, apiKey) {
  const base = 'https://api.intecs.flowmeter.qimxmining.cloud/unit'
  const all = { fuelData: [], musterData: [], autolubeData: [], ansulData: [] }
  let nextToken = null

  do {
    const url = new URL(base)
    url.searchParams.set('unitId', unitId)
    url.searchParams.set('dateStart', dateStart)
    url.searchParams.set('dateEnd', dateEnd)
    if (nextToken) url.searchParams.set('nextToken', nextToken)

    const res = await fetch(url, { headers: { 'x-api-key': apiKey } })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const page = await res.json()

    for (const key of Object.keys(all)) all[key].push(...page[key])
    nextToken = page.nextToken
  } while (nextToken)

  return all
}
```

> A larger `limit` returns more per response (fewer round-trips) but each
> request takes longer. `500`–`1000` is a good balance for dense fuel data.

---

## Errors

| Status | Meaning | Cause |
|--------|---------|-------|
| `400 Bad Request` | `{ "error": "Missing required query parameter(s): ..." }` | A required parameter is missing. |
| `400 Bad Request` | `{ "error": "Invalid nextToken" }` | The `nextToken` is malformed or was tampered with. |
| `403 Forbidden` | `{ "message": "Forbidden" }` | Missing or invalid API key. |
| `403 Forbidden` | `{ "error": "API key is not provisioned for a tenant" }` | The key is valid but not mapped to a tenant. Contact the API owner. |
| `404 Not Found` | `{ "error": "Unit '<id>' not found" }` | No such unit **in your tenant** (either it doesn't exist or belongs to another tenant). |
| `429 Too Many Requests` | — | Rate limit exceeded. Back off and retry. |
| `502 Bad Gateway` | `{ "error": "Failed to fetch unit data", ... }` | Upstream data error. Retry; if it persists, contact the API owner. |

---

## Notes & limits

- The API is **read-only** (`GET` only).
- A unit with no data in the range returns `200` with empty arrays and
  `nextToken: null`.
- Date ranges are inclusive of both ends.
