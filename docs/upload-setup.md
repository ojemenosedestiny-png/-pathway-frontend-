# Upload setup

Uploads no longer require an antivirus service. JPG, PNG and WebP images are validated and re-encoded; private PDFs are rebuilt without document-level scripts, forms or page annotations. This processing does not provide antivirus detection. Keep storage credentials secret.

Backend Render environment:

```text
S3_ENDPOINT=https://e5bdc26493f286935ffeba5efc03fdec.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=pathway-files
S3_ACCESS_KEY=<R2 Access Key ID>
S3_SECRET_KEY=<R2 Secret Access Key>
PUBLIC_MEDIA_BASE=https://spring-poetry-e28b.ojemenosedestiny.workers.dev
```

Confirm the Worker address in Cloudflare before using it. Bind MEDIA_BUCKET to pathway-files and deploy backend/ops/public-media-worker.mjs; it serves only approved public/ objects. Keep the bucket private. In R2 API token creation select object read/write limited to pathway-files; use the generated S3 credentials rather than the general Cloudflare API token.

Set the bucket CORS policy to backend/ops/r2-cors.json. Browser uploads are signed PUT requests from the canonical domain. Set a bucket lifecycle rule to expire abandoned quarantine/ objects after one day; do not expire approved private/public objects.

Frontend Render environment:

```text
PATHWAY_UPLOAD_ORIGIN=https://e5bdc26493f286935ffeba5efc03fdec.r2.cloudflarestorage.com
PATHWAY_MEDIA_ORIGIN=https://spring-poetry-e28b.ojemenosedestiny.workers.dev
```

Supported uploads are JPG, PNG and WebP photographs (up to 10 MB / 25 megapixels), and private unencrypted PDFs (up to 10 MB / 200 pages). Public media accepts images only. Images become metadata-free WebP up to 2400 pixels per side. PDF rebuilding removes interactive annotations, forms, signatures and document scripts; upload a flat copy if these features matter. Word files, archives and videos are not accepted.

Validation runs inline during upload completion, so these uploads do not need a scanner or background worker. Old SCAN jobs use the same validation path. SCANNER_URL and SCANNER_TOKEN are unused for uploads and may be removed. Storage, bucket CORS and public-media delivery are still required. No new chargeable service is needed.

After configuring R2 and deploying backend then frontend, upload a small JPG from Admin Media, verify its approved public URL, and select it in Create slide. Upload a PDF from a student account and confirm it remains private and pending staff review. Do not save an empty image field.
