# Application and workspace origin error

The live backend trusts `https://newworldpathwayuniversity.com`. Deliberately invalid, unauthenticated refresh requests reached CSRF rejection from that origin, while the www and legacy Render origins returned ORIGIN rejection. An empty application payload with a valid CSRF token from the canonical origin reached VALIDATION (400), with no application created.

Production frontend requests to the known www and legacy Render hosts now redirect permanently to the canonical HTTPS origin, preserving paths and queries. Backend origin and CSRF restrictions remain enabled. Health probes remain available on the Render hostname. Existing browser tabs should be reopened at the canonical address after deployment.

The Docker runtime also omitted five new static files. Its COPY list now includes the exam directory, service information and application-data notice with their scripts.

Validation passed: frontend build; canonical-host regression checks; frontend deployment checks; public admissions browser journey at three widths; workspace authentication/MFA browser journey; Docker image build; smoke checks inside the built production image for every omitted file and the legacy-host redirect. These checks do not establish that every possible site error is absent. No production application, payment or student account was created by validation.
