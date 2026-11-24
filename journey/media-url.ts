/**
 * Public pictures uploaded before November 2026 were saved with an external media address that no longer
 * serves files. The same picture is served by the school's own server at /backend-api/media/public/<id>/file.<ext>.
 */
const legacy=/^https:\/\/[^/]+\/public\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(file\.(?:webp|jpe?g|png))$/i;
export function mediaSrc(url:unknown){const text=String(url??'');const m=text.match(legacy);return m?`/backend-api/media/public/${m[1].toLowerCase()}/${m[2]}`:text;}
