# Maha Passport: Department Data API

For the IT teams of departments (municipal tax, town planning, MSEDCL, IGR, water supply) that want to send records automatically instead of uploading files.

## How it works

- Your system **pushes** new and changed records to Maha Passport over HTTPS, on any schedule (hourly, nightly, or as events happen).
- Each department gets its own **API key** from the Maha Passport administrator. A key can only **send** records for its own department. It cannot read any data.
- Records are identified by your own reference number (consumer number, OC number, property number, …). Sending the same reference again **updates** the record, so retries are safe.
- Every record is validated. Accepted records go to matching; rejected ones come back with the reason, and nothing else in the request is affected.
- Every call is recorded in the audit log under your system's name.

## Authentication

Send the key in the `X-API-Key` header. Keep it in a secrets store, never in source code or URLs. If it is exposed, ask the administrator to revoke it and issue a new one.

```
X-API-Key: mp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Endpoints

Base URL: `https://<maha-passport-domain>/api`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/fields/{source}` | Field list for your department, with required flags and types |
| `POST` | `/v1/records/{source}` | Send 1 to 5,000 records |

`{source}` is one of `tax`, `oc`, `elec`, `igr`, `water`, and must match your key.

## Fields

`*` = required. Dates may be `YYYY-MM-DD` or `DD-MM-YYYY`. Numbers are plain integers (commas allowed).

| Source | Fields |
|---|---|
| `tax` | `taxNo`\*, `owner`\*, `address`\*, `ward`, `usage`\* (`residential` / `commercial` / `mixed`), `assessedArea`\* (sq ft), `annualTax`, `lastPaid` (date), `arrears` |
| `oc` | `ocNo`\*, `date`\*, `address`\*, `ward`, `owner`, `builtUpArea`\* (sq ft), `units` |
| `elec` | `consumerNo`\*, `name`, `address`\*, `ward`, `category`\* (tariff text, e.g. `LT-I Residential`, `LT-II Commercial`), `since` (date), `avgMonthlyUnits` |
| `igr` | `docNo`\*, `date`\*, `buyer`\*, `seller`, `address`\* |
| `water` | `connNo`\*, `name`, `address`\*, `ward`, `since` (date) |

Give the address as completely as possible: house or shop number, road, locality, ward. Marathi or English both work.

## Example

```bash
curl -X POST https://<domain>/api/v1/records/elec \
  -H "X-API-Key: $MAHA_PASSPORT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      { "consumerNo": "410123456789", "name": "Sunil Patil",
        "address": "H.No. 64, School Road, Station Area", "ward": 1,
        "category": "LT-II Commercial", "since": "2026-09-20", "avgMonthlyUnits": 620 }
    ]
  }'
```

Response:

```json
{
  "received": 1,
  "accepted": 1,
  "inserted": 1,
  "updated": 0,
  "rejected": 0,
  "casesRefreshed": 0,
  "errors": []
}
```

A rejected record is reported by its position in your array:

```json
{ "index": 2, "ref": null, "errors": ["consumerNo is required"] }
```

## Status codes

| Code | Meaning | What to do |
|---|---|---|
| 200 | Processed. Check `rejected` and `errors`. | Fix and resend only the rejected records. |
| 400 | Body is not `{"records": [...]}` or has more than 5,000 records | Fix the request format or split the batch. |
| 401 | Key missing, wrong or revoked | Check the key; contact the administrator. |
| 403 | Key belongs to another department | Use the endpoint for your own `source`. |
| 429 | More than 120 requests per minute | Wait and retry with backoff. |
| 5xx | Server problem | Retry later with exponential backoff; resending is safe. |

## Recommended schedule

- Send changes since your last successful run (new connections, tariff changes, new OCs, new registrations).
- For the first load, send the full register in batches of up to 5,000.
- Run at least daily. Matching runs after the data arrives; officers act only after site verification.

## Departments that cannot call an API

They can keep sending Excel or CSV files through the **Department Data** page, or a data officer can enter single records with the form. All three channels feed the same validation and matching, and each record shows how it arrived.
