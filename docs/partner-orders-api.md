# Uzabulk partner orders API (read-only)

Share this with the other team’s backend developers. Call only from **their server** — never from a browser or mobile app.

## Base URL

```text
https://<ADMIN_API_HOST>/authenticationservice/api/v1/partner
```

Local example: `http://localhost:<admin-port>/authenticationservice/api/v1/partner`

## Auth

Every request must include:

```http
apikey: <ORDERS_API_KEY>
```

This is **not** a staff JWT and **not** the storefront store `api_key`. Ask Uzabulk for the partner key out-of-band (password manager / secure channel).

## List orders

`POST /orders`

Headers:

- `apikey: <ORDERS_API_KEY>`
- `Content-Type: application/json`

Body (all fields optional except pagination defaults):

```json
{
  "page": 1,
  "limit": 20,
  "orderBy": "date_created_utc",
  "order": -1,
  "search": "",
  "orderStatus": "pending",
  "paymentMethod": "",
  "deliveryType": "",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "vendor": "",
  "customer": ""
}
```

Success shape (same family as admin APIs):

```json
{
  "status": "success",
  "status_code": 200,
  "message": "...",
  "data": [ /* sanitized orders */ ],
  "totalcount": 123
}
```

Example:

```bash
curl -X POST "$BASE/orders" \
  -H "apikey: YOUR_PARTNER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"page":1,"limit":20}'
```

## Order detail

`GET /order/:_id`

```bash
curl -X GET "$BASE/order/<ORDER_OBJECT_ID>" \
  -H "apikey: YOUR_PARTNER_KEY"
```

Success: `{ "status": "success", "status_code": 200, "message": "...", "data": { /* sanitized order */ } }`

## Errors

- Missing `apikey` → unauthorized (store API key required style)
- Invalid `apikey` → unauthorized
- Unknown order id → validation / invalid order

Do not retry with an admin user Bearer token; this API uses the partner key only.

## Rules

- Read-only (no status updates via this API)
- HTTPS in production
- If the key leaks, ask Uzabulk to rotate `ORDERS_API_KEY`
- Optional server-side store scope: if Uzabulk sets `ORDERS_STORE_ID`, results are limited to that store
