# Upload setup

Local inspection found endpoint, region, bucket and public media URL present, with storage keys and scanner URL/token absent. This is not a live Render configuration audit. Never paste access keys or scanner tokens into chat or commit them.

Backend Render environment:

```text
S3_ENDPOINT=https://e5bdc26493f286935ffeba5efc03fdec.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=pathway-files
S3_ACCESS_KEY=<R2 Access Key ID>
S3_SECRET_KEY=<R2 Secret Access Key>
PUBLIC_MEDIA_BASE=https://spring-poetry-e28b.ojemenosedestiny.workers.dev
SCANNER_URL=<authenticated HTTPS scan endpoint>
SCANNER_TOKEN=<scanner bearer token>
```

Confirm the Worker address in Cloudflare before using it. Bind MEDIA_BUCKET to pathway-files and deploy backend/ops/public-media-worker.mjs; it serves only approved public/ objects. Keep the bucket private. In R2 API token creation select object read/write limited to pathway-files; use the generated S3 credentials rather than the general Cloudflare API token.

Set the bucket CORS policy to backend/ops/r2-cors.json. Browser uploads are signed PUT requests from the canonical domain. Set a bucket lifecycle rule to expire abandoned quarantine/ objects after one day; do not expire approved private/public objects.

Frontend Render environment:

```text
PATHWAY_UPLOAD_ORIGIN=https://e5bdc26493f286935ffeba5efc03fdec.r2.cloudflarestorage.com
PATHWAY_MEDIA_ORIGIN=https://spring-poetry-e28b.ojemenosedestiny.workers.dev
```

SCANNER_URL must perform a real antivirus scan of raw POST bytes, authenticate with SCANNER_TOKEN and return clean:true only after a successful clean scan. It must reject unauthorised, oversized and unscannable requests. Do not point it to the public media Worker or a placeholder that always returns clean:true.

The SCAN outbox job requires a running worker using the same backend settings. If intentionally using the embedded worker, set RUN_WORKER_IN_API=true; processing pauses while that web service sleeps. A dedicated worker is the other supported option. Do not assume the presence of an environment variable locally means it exists on Render.

After configuration, redeploy backend (and separate worker if used), then frontend. Upload a small JPG from Admin Media, wait for APPROVED, verify its public URL, and select it in Create slide. Do not save an empty image field. Actual storage, scan and delivery must all succeed; no approval bypass is used.
