// Search and social metadata for every server-rendered page: one identity (NewworldPathway,
// operated by New World Emerald Private School), unique titles/descriptions, canonical URLs,
// Open Graph/Twitter tags and a linked JSON-LD graph. Facts here are only those the site already
// publishes; no accreditation, university status or partnerships are claimed.
const SITE = 'https://newworldpathwayuniversity.com';
const BRAND = 'NewworldPathway';
const ORG_ID = SITE + '/#organization';
const SITE_ID = SITE + '/#website';
const SHARE_IMAGE = { url: SITE + '/assets/social/newworldpathway-share.jpg', width: 1200, height: 630, alt: 'NewworldPathway — exam preparation and university guidance by New World Emerald Private School' };

const pages = {
  '/': { title: 'NewworldPathway | Exam Preparation and University Guidance in Abuja', description: 'WAEC, NECO, Cambridge IGCSE and A Level preparation, IJMB and SAT, with study-abroad and university application guidance from New World Emerald Private School, Kubwa, Abuja.' },
  '/about': { title: 'About NewworldPathway | New World Emerald Private School', description: 'NewworldPathway is the exam preparation and study-abroad guidance service of New World Emerald Private School in Kubwa, Abuja. Learn how we support students.' },
  '/pathways': { title: 'University Destinations and Courses | NewworldPathway', description: 'Explore university destinations and courses, including the University of Stirling and Newcastle University, with guidance on entry requirements and applications.' },
  '/exams': { title: 'WAEC, NECO, Cambridge and A Level Preparation | NewworldPathway', description: 'Preparation programmes for WAEC, NECO, Cambridge IGCSE and AS & A Level, IJMB and SAT at New World Emerald Private School, Kubwa, Abuja.' },
  '/faq': { title: 'Frequently Asked Questions | NewworldPathway', description: 'Answers about applications, exam preparation, student accounts, fees and document uploads at NewworldPathway.' },
  '/contact': { title: 'Contact NewworldPathway | Kubwa, Abuja', description: 'Phone, email and WhatsApp contacts for NewworldPathway admissions and exam preparation at New World Emerald Private School, Kubwa, Abuja.' },
  '/news': { title: 'News and Notices | NewworldPathway', description: 'School announcements, examination updates and admissions notices published by NewworldPathway.' },
  '/hostel': { title: 'Student Accommodation | NewworldPathway', description: 'Residence options, estimated accommodation fees and how students reserve a bed through the NewworldPathway student portal.' },
  '/apply': { title: 'Apply for Admission | NewworldPathway', description: 'Apply for WAEC, NECO, Cambridge, A Level, IJMB or SAT preparation at New World Emerald Private School. No account is needed to apply.' },
  '/book-consultation': { title: 'Book a Free Consultation | NewworldPathway', description: 'Request a conversation with a NewworldPathway adviser about exam preparation, A Levels or studying abroad.' },
  '/pay-fees': { title: 'School Fees | NewworldPathway', description: 'How school fees and payments work at NewworldPathway, and how to contact the school about the current fee schedule.' },
  '/other-exams': { title: 'International Examinations Directory | NewworldPathway', description: 'Reference information on international examinations such as IELTS, TOEFL, SAT, ACT and Cambridge qualifications, with links to official sources.' },
  '/service-information': { title: 'Before You Apply or Pay | NewworldPathway', description: 'How preparation enquiries, programme charges and official examination registration work at NewworldPathway before you apply or pay.' },
  '/privacy': { title: 'Application Data Information | NewworldPathway', description: 'How NewworldPathway handles the information you submit in applications and enquiries.' },
};
// Account, workspace and recovery screens: reachable, but never indexed (real protection is server-side authentication).
const privateTitles = { '/student/login': 'Student Sign In', '/admin/login': 'Staff Sign In', '/portal': 'Student Portal', '/admin': 'Staff Workspace', '/set-password': 'Set Your Password', '/forgot-password': 'Reset Your Password', '/recover-student-id': 'Recover Your Student ID', '/payment-status': 'Payment Status', '/signup': 'Create an Applicant Account', '/verify-email': 'Verify Your Email', '/applicant': 'Applicant Account' };

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (text, max = 158) => { const clean = String(text || '').replace(/\s+/g, ' ').trim(); return clean.length <= max ? clean : clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'; };

const organization = {
  '@type': 'EducationalOrganization', '@id': ORG_ID, name: BRAND, url: SITE + '/',
  logo: { '@type': 'ImageObject', url: SITE + '/assets/school-logo.png' },
  image: SHARE_IMAGE.url,
  description: 'Exam preparation and university guidance service of New World Emerald Private School in Kubwa, Abuja, Nigeria.',
  telephone: '+234 813 603 7074', email: 'info@newworldemeraldprivateschool.com',
  address: { '@type': 'PostalAddress', addressLocality: 'Kubwa', addressRegion: 'Federal Capital Territory', addressCountry: 'NG' },
  areaServed: { '@type': 'Country', name: 'Nigeria' },
  parentOrganization: { '@type': 'EducationalOrganization', name: 'New World Emerald Private School', url: 'https://newworldemeraldprivateschool.com/' },
};
const website = { '@type': 'WebSite', '@id': SITE_ID, url: SITE + '/', name: BRAND, inLanguage: 'en-NG', publisher: { '@id': ORG_ID } };

/** Metadata for a route: static pages, private screens or a dynamic record (exam or university). */
function pageMeta(route, record) {
  if (privateTitles[route]) return { title: privateTitles[route] + ' | ' + BRAND, description: 'Secure NewworldPathway account page.', robots: 'noindex, nofollow' };
  if (record) return { title: clip(record.name, 60) + ' | ' + BRAND, description: clip(record.description || pages[record.parent]?.description), robots: 'index, follow', crumb: record };
  return pages[route] ? { ...pages[route], robots: 'index, follow' } : { title: BRAND, description: pages['/'].description, robots: 'noindex, follow' };
}

/** All head tags after <title>: description, robots, canonical, social cards and JSON-LD. */
function headTags(route, record) {
  const meta = pageMeta(route, record);
  const canonical = SITE + (route === '/index.html' ? '/' : route);
  const indexable = meta.robots.startsWith('index');
  const graph = [organization, website];
  if (indexable) {
    const webpage = { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: meta.title, description: meta.description, isPartOf: { '@id': SITE_ID }, about: { '@id': ORG_ID }, inLanguage: 'en-NG' };
    if (meta.crumb) {
      webpage.breadcrumb = { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: meta.crumb.parentName, item: SITE + meta.crumb.parent },
        { '@type': 'ListItem', position: 3, name: meta.crumb.name, item: canonical },
      ] };
      if (meta.crumb.parent === '/exams') graph.push({ '@type': 'Course', '@id': canonical + '#course', name: meta.crumb.name, description: meta.description, url: canonical, provider: { '@id': ORG_ID } });
    }
    graph.push(webpage);
  }
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return [
    // Private screens are never indexed, so they get no description (it would also clash with form fields named "description").
    indexable ? `<meta name="description" content="${esc(meta.description)}">` : '',
    `<meta name="robots" content="${meta.robots}">`,
    indexable ? `<link rel="canonical" href="${esc(canonical)}">` : '',
    `<meta property="og:site_name" content="${BRAND}"><meta property="og:locale" content="en_NG"><meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.description)}"><meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:image" content="${SHARE_IMAGE.url}"><meta property="og:image:width" content="${SHARE_IMAGE.width}"><meta property="og:image:height" content="${SHARE_IMAGE.height}"><meta property="og:image:alt" content="${esc(SHARE_IMAGE.alt)}">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(meta.title)}"><meta name="twitter:description" content="${esc(meta.description)}"><meta name="twitter:image" content="${SHARE_IMAGE.url}"><meta name="twitter:image:alt" content="${esc(SHARE_IMAGE.alt)}">`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join('');
}

/** Replaces a page's <title> and inserts the metadata, removing any older description/robots/social tags. */
function applyMetadata(html, route, record) {
  const meta = pageMeta(route, record);
  return html
    .replace(/<meta name="(?:description|robots)"[^>]*>|<meta property="og:[^"]*"[^>]*>|<meta name="twitter:[^"]*"[^>]*>|<link rel="canonical"[^>]*>/g, '')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>` + headTags(route, record));
}

const indexableRoutes = Object.keys(pages);

/** Published exams and universities for detail-page titles and the sitemap, cached briefly; failures fall back to static pages. */
function catalogue(origin = process.env.SEO_CATALOGUE_ORIGIN || process.env.PATHWAY_BACKEND_ORIGIN || 'https://pathway-backend-892m.onrender.com', fetcher = globalThis.fetch, ttl = 10 * 60 * 1000) {
  let cache = { at: 0, data: null }; let pending = null;
  const read = async (resource) => { const response = await fetcher(origin + '/public/' + resource + '?take=100', { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' } }); if (!response.ok) throw new Error('catalogue ' + response.status); const rows = await response.json(); return Array.isArray(rows) ? rows : []; };
  return async function load() {
    if (cache.data && Date.now() - cache.at < ttl) return cache.data;
    pending ??= Promise.all([read('exams'), read('universities')]).then(([exams, universities]) => { cache = { at: Date.now(), data: { ok: true, exams, universities } }; return cache.data; }).catch(() => cache.data || { ok: false, exams: [], universities: [] }).finally(() => { pending = null; });
    return pending;
  };
}

async function sitemapXml(load) {
  const { exams, universities } = await load();
  const urls = [...indexableRoutes.map((route) => ({ loc: SITE + route, priority: route === '/' ? '1.0' : ['/apply', '/exams', '/pathways'].includes(route) ? '0.9' : '0.7' })),
    ...exams.map((row) => ({ loc: SITE + '/exams/' + encodeURIComponent(row.id), priority: '0.8' })),
    ...universities.map((row) => ({ loc: SITE + '/university/' + encodeURIComponent(row.id), priority: '0.8' }))];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map((u) => `<url><loc>${esc(u.loc)}</loc><priority>${u.priority}</priority></url>`).join('\n') + '\n</urlset>\n';
}

const robotsTxt = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /portal\nDisallow: /applicant\nDisallow: /backend-api/\nDisallow: /set-password\nDisallow: /forgot-password\nDisallow: /recover-student-id\nDisallow: /payment-status\nDisallow: /verify-email\n\nSitemap: ${SITE}/sitemap.xml\n`;

module.exports = { SITE, BRAND, pages, privateTitles, pageMeta, headTags, applyMetadata, catalogue, sitemapXml, robotsTxt, indexableRoutes };
