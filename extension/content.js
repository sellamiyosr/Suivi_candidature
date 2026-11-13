(() => {
  function text(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function firstText(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        const t = text(el);
        if (t) return t;
      } catch {
        /* sélecteur invalide : ignorer */
      }
    }
    return '';
  }

  function meta(selector) {
    return document.querySelector(selector)?.getAttribute('content')?.trim() || '';
  }

  function detectPlatform(hostname) {
    if (hostname.includes('linkedin.com')) return 'LinkedIn';
    if (hostname.includes('indeed.')) return 'Indeed';
    if (hostname.includes('welcometothejungle.')) return 'Welcome to the Jungle';
    return hostname.replace(/^www\./, '') || 'Web';
  }

  /** Schema.org JobPosting (JSON-LD) — source la plus fiable quand présente */
  function getJsonLdJobs() {
    const jobs = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const raw = JSON.parse(script.textContent || 'null');
        const items = Array.isArray(raw) ? raw : [raw];
        for (const item of items) {
          if (!item) continue;
          if (item['@type'] === 'JobPosting') {
            jobs.push(item);
          } else if (Array.isArray(item['@graph'])) {
            item['@graph'].forEach((g) => {
              if (g && g['@type'] === 'JobPosting') jobs.push(g);
            });
          }
        }
      } catch {
        /* JSON invalide */
      }
    });
    return jobs;
  }

  function locationFromJsonLd(job) {
    if (!job) return '';
    const loc = job.jobLocation;
    if (!loc) return '';
    const places = Array.isArray(loc) ? loc : [loc];
    const parts = [];
    for (const place of places) {
      const addr = place.address || place;
      if (typeof addr === 'string') {
        parts.push(addr);
        continue;
      }
      const city = addr.addressLocality || '';
      const region = addr.addressRegion || '';
      const country = addr.addressCountry?.name || addr.addressCountry || '';
      const line = [city, region, country].filter(Boolean).join(', ');
      if (line) parts.push(line);
      else if (place.name) parts.push(place.name);
    }
    return parts.join(' · ');
  }

  function descriptionFromHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return text(div);
  }

  function skillsFromJsonLd(job) {
    if (!job) return '';
    const raw = job.skills || job.skillsRequired || job.qualifications || '';
    if (Array.isArray(raw)) {
      return raw
        .map((s) => (typeof s === 'string' ? s : s?.name || s?.value || ''))
        .filter(Boolean)
        .join(', ');
    }
    if (typeof raw === 'string') {
      return descriptionFromHtml(raw) || raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  function contactFromJsonLd(job) {
    if (!job) return { contactName: '', contactEmail: '', contactLinkedin: '' };
    const org = job.hiringOrganization || {};
    const app = job.applicationContact || job.contactPoint || {};
    const contact = Array.isArray(app) ? app[0] : app;
    let contactEmail = contact.email || org.email || '';
    if (Array.isArray(contactEmail)) contactEmail = contactEmail[0] || '';
    const contactName = contact.name || contact.contactType || '';
    const sameAs = [].concat(org.sameAs || [], contact.sameAs || []);
    const contactLinkedin =
      sameAs.find((u) => /linkedin\.com\/(in|company)\//i.test(String(u))) || '';
    return {
      contactName: typeof contactName === 'string' ? contactName : '',
      contactEmail: typeof contactEmail === 'string' ? contactEmail : '',
      contactLinkedin: typeof contactLinkedin === 'string' ? contactLinkedin : ''
    };
  }

  function fromJsonLd() {
    const job = getJsonLdJobs()[0];
    if (!job) return null;
    const contact = contactFromJsonLd(job);
    return {
      jobTitle: job.title || '',
      company: job.hiringOrganization?.name || '',
      location: locationFromJsonLd(job),
      description:
        descriptionFromHtml(job.description) ||
        (typeof job.description === 'string' ? job.description.replace(/<[^>]+>/g, ' ') : ''),
      reference:
        (typeof job.identifier === 'string' ? job.identifier : job.identifier?.value) ||
        job.jobId ||
        '',
      skills: skillsFromJsonLd(job),
      ...contact
    };
  }

  function extractEmails(corpus) {
    const found = [];
    const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let m;
    while ((m = re.exec(corpus))) {
      const email = m[0].toLowerCase();
      if (/noreply|no-reply|donotreply|do-not-reply|example\.|sentry|wixpress|linkedin\.com$|indeed\.|godaddy|wordpress/i.test(email)) {
        continue;
      }
      if (!found.includes(email)) found.push(email);
    }
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      const email = (a.getAttribute('href') || '')
        .replace(/^mailto:/i, '')
        .split('?')[0]
        .trim()
        .toLowerCase();
      if (email && !found.includes(email) && !/noreply|no-reply/i.test(email)) {
        found.push(email);
      }
    });
    return found;
  }

  function extractLinkedInProfiles() {
    const found = [];
    const add = (url) => {
      if (!url) return;
      const clean = url.split('?')[0].replace(/\/$/, '');
      if (!/linkedin\.com\/in\//i.test(clean)) return;
      if (!found.includes(clean)) found.push(clean);
    };
    document.querySelectorAll('a[href*="linkedin.com/in/"]').forEach((a) => {
      add(a.href);
    });
    const corpus = document.body?.innerText || '';
    const re = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w%-]+\/?/gi;
    let m;
    while ((m = re.exec(corpus))) add(m[0]);
    return found;
  }

  function extractContactName(corpus, description) {
    const fromUi =
      firstText([
        '.hirer-card__hirer-information .jobs-poster__name',
        '.jobs-poster__name',
        '.job-details-people-who-can-help__section-content strong',
        '[data-testid="hiring-team-name"]',
        '.hiring-team__name',
        '[class*="recruiter" i] [class*="name" i]',
        '[class*="contact-name" i]'
      ]);
    if (fromUi && fromUi.length < 80) return fromUi;

    const textCorp = `${description || ''}\n${(corpus || '').slice(0, 12000)}`;
    const patterns = [
      /(?:contact|contacts|recruteur|recruteuse|responsable\s+rh|chargé[e]?\s+de\s+recrutement|hiring\s+manager|talent\s+acquisition)\s*[:\-–]\s*([A-ZÉÈÊÀÂÎÔÙÛÇ][\p{L}'’-]+(?:\s+[A-ZÉÈÊÀÂÎÔÙÛÇ][\p{L}'’-]+){0,3})/iu,
      /(?:envoyer|address(?:er)?|écrire|contacter)\s+(?:à|a|au)?\s*([A-ZÉÈÊÀÂÎÔÙÛÇ][\p{L}'’-]+(?:\s+[A-ZÉÈÊÀÂÎÔÙÛÇ][\p{L}'’-]+){1,2})/u
    ];
    for (const re of patterns) {
      const m = textCorp.match(re);
      if (m?.[1] && m[1].length < 60) return m[1].trim();
    }
    return '';
  }

  function extractImportantElements(description) {
    if (!description) return '';
    const lines = description
      .split(/[\n•●▪►\-–]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 20 && l.length < 220);
    const keywords =
      /requis|exigé|obligatoire|must|required|compétence|experience|expérience|stack|maîtrise|anglais|bac\s*\+|stage|alternance/i;
    const picked = lines.filter((l) => keywords.test(l)).slice(0, 8);
    return picked.join('\n');
  }

  function extractContactsAndSkills(description) {
    const pageText = document.body?.innerText || '';
    const corpus = `${description || ''}\n${pageText.slice(0, 20000)}`;
    const emails = extractEmails(corpus);
    const linkedins = extractLinkedInProfiles();
    // Éviter le profil LinkedIn de l'offre elle-même (jobs)
    const contactLinkedin = linkedins.find((u) => !/\/jobs\//i.test(u)) || '';
    return {
      contactName: extractContactName(pageText, description),
      contactEmail: emails[0] || '',
      contactLinkedin,
      importantElements: extractImportantElements(description),
      skills: '' // complété côté API (/match/keywords) dans le popup
    };
  }

  function referenceFromUrl(url) {
    try {
      const u = new URL(url);
      const params = u.searchParams;
      const keys = [
        'currentJobId',
        'jobId',
        'jobid',
        'jk',
        'ref',
        'reference',
        'id',
        'vacancyId',
        'offerId'
      ];
      for (const key of keys) {
        const v = params.get(key);
        if (v && /^[\w-]{5,}$/.test(v)) return v;
      }
      // LinkedIn /jobs/view/123456
      const linkedIn = u.pathname.match(/\/jobs\/view\/(\d+)/);
      if (linkedIn) return linkedIn[1];
      // Indeed /viewjob?jk=xxx already handled ; /rc/clk?jk=
      const indeedPath = u.pathname.match(/\/([^/]{10,})$/);
      if (u.hostname.includes('indeed.') && params.get('vjk')) return params.get('vjk');
      // WTTJ /companies/.../jobs/slug-id
      const wttj = u.pathname.match(/\/jobs\/[^/]*-([a-f0-9]{8,})$/i);
      if (wttj) return wttj[1];
      if (indeedPath && /^\d{6,}$/.test(indeedPath[1])) return indeedPath[1];
    } catch {
      /* ignore */
    }
    return '';
  }

  function referenceFromPageText() {
    const body = (document.body?.innerText || '').slice(0, 15000);
    const patterns = [
      /r[eé]f(?:[eé]rence)?\s*[:#]\s*([A-Z0-9][\w-]{3,})/i,
      /(?:job\s*id|offer\s*id|id\s*offre)\s*[:#]?\s*([A-Z0-9][\w-]{4,})/i,
      /#(\d{6,})\b/
    ];
    for (const re of patterns) {
      const m = body.match(re);
      if (m) return m[1];
    }
    return '';
  }

  function cleanLocation(raw) {
    if (!raw) return '';
    let value = raw.replace(/\s+/g, ' ').trim();
    // LinkedIn : "Entreprise · Paris, Île-de-France · Il y a 2 jours · 120 candidats"
    const parts = value.split(/\s*[·|•]\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const locLike = parts.find((p) =>
        /(paris|lyon|lille|france|remote|télétravail|hybrid|présentiel|île-de-france|idf|,)/i.test(p)
      );
      if (locLike && !/il y a|candidat|employé|follower|abonné/i.test(locLike)) {
        return locLike;
      }
      // 2e segment souvent la ville
      if (parts[1] && !/il y a|candidat|employé/i.test(parts[1])) {
        return parts[1];
      }
    }
    return value.slice(0, 200);
  }

  function extractLinkedIn() {
    const jobTitle =
      firstText([
        '.job-details-jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__job-title a',
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title',
        'h1.t-24',
        'h1'
      ]);

    const company =
      firstText([
        '.job-details-jobs-unified-top-card__company-name a',
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__company-name',
        'a.job-card-container__company-name'
      ]);

    const locationRaw =
      firstText([
        '.job-details-jobs-unified-top-card__tertiary-description-container',
        '.job-details-jobs-unified-top-card__primary-description-container',
        '.jobs-unified-top-card__primary-description',
        '.jobs-unified-top-card__bullet',
        '.job-details-jobs-unified-top-card__bullet',
        'span.tvm__text--low-emphasis'
      ]);

    const description =
      firstText([
        '#job-details',
        '.jobs-description__content',
        '.jobs-box__html-content',
        '.jobs-description-content__text',
        '.jobs-description__container',
        'article.jobs-description__container',
        '.jobs-description'
      ]);

    return {
      jobTitle,
      company,
      location: cleanLocation(locationRaw),
      description,
      reference: ''
    };
  }

  function extractIndeed() {
    const jobTitle =
      firstText([
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        'h1.jobsearch-JobInfoHeader-title',
        'h2.jobsearch-JobInfoHeader-title',
        'h1'
      ]);

    const company =
      firstText([
        '[data-company-name="true"]',
        '[data-testid="inlineHeader-companyName"]',
        '[data-testid="jobsearch-CompanyInfoContainer"] a',
        '.jobsearch-InlineCompanyRating a',
        '[data-testid="simpler-company-name"]'
      ]);

    const location =
      firstText([
        '[data-testid="inlineHeader-companyLocation"]',
        '[data-testid="job-location"]',
        '[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
        '.jobsearch-JobInfoHeader-subtitle > div',
        '[data-testid="simpler-jobLocation"]'
      ]);

    const description =
      firstText([
        '#jobDescriptionText',
        '.jobsearch-jobDescriptionText',
        '[data-testid="jobsearch-JobComponent-description"]',
        '#jobDescriptionText .jobsearch-JobComponent-description'
      ]);

    return { jobTitle, company, location: cleanLocation(location), description, reference: '' };
  }

  function extractWttj() {
    const jobTitle =
      firstText(['h1', '[data-testid="job-header-title"]']) || meta('meta[property="og:title"]');

    const company =
      firstText([
        '[data-testid="job-header-organization"]',
        'a[href*="/companies/"]',
        '[class*="company-name"]'
      ]) || meta('meta[property="og:site_name"]');

    const location =
      firstText([
        '[data-testid="job-header-location"]',
        '[data-testid="job-location"]',
        'i[name="location"] + span',
        '[class*="JobHeader"] [class*="location"]',
        'li:has(i[name="location"])'
      ]);

    const description =
      firstText([
        '[data-testid="job-section-description"]',
        '[data-testid="job-section-missions"]',
        'section[data-testid*="description"]',
        'article',
        'main'
      ]) || meta('meta[property="og:description"]');

    return {
      jobTitle,
      company,
      location: cleanLocation(location),
      description: description.slice(0, 8000),
      reference: ''
    };
  }

  function extractGeneric() {
    const ogTitle = meta('meta[property="og:title"]');
    const title = ogTitle || document.title || firstText(['h1']);
    let jobTitle = title;
    let company = meta('meta[property="og:site_name"]');

    if (title.includes(' - ')) {
      const parts = title.split(' - ').map((p) => p.trim());
      jobTitle = parts[0];
      company = company || parts[1] || '';
    } else if (title.includes(' | ')) {
      const parts = title.split(' | ').map((p) => p.trim());
      jobTitle = parts[0];
      company = company || parts[1] || '';
    }

    const location =
      firstText([
        '[itemprop="jobLocation"]',
        '[itemprop="address"]',
        '[class*="job-location" i]',
        '[class*="JobLocation" i]',
        '[data-testid*="location" i]',
        '[aria-label*="localisation" i]',
        '[aria-label*="location" i]'
      ]) || '';

    const description =
      firstText([
        '[itemprop="description"]',
        '[class*="job-description" i]',
        '[class*="JobDescription" i]',
        '[id*="job-description" i]',
        '[id*="description" i]',
        'article',
        'main'
      ]) ||
      meta('meta[property="og:description"]') ||
      meta('meta[name="description"]');

    return {
      jobTitle,
      company,
      location: cleanLocation(location),
      description: (description || '').slice(0, 8000),
      reference: ''
    };
  }

  /* ---------- Type de contrat, mode de travail, début, durée, domaine, logo ---------- */

  const CONTRACT_PATTERNS = [
    ['ALTERNANCE', /\b(alternance|alternant[e]?|apprenti(?:e|ssage)?|contrat\s+pro(?:fessionnalisation)?|work[- ]study|apprenticeship)\b/i],
    ['STAGE', /\b(stage|stagiaire|internship|intern|pfe|projet\s+de\s+fin\s+d['’]?[ée]tudes?)\b/i],
    ['CDD', /\b(cdd|fixed[- ]term|contrat\s+[àa]\s+dur[ée]e\s+d[ée]termin[ée]e|temporary\s+contract)\b/i],
    ['CDI', /\b(cdi|permanent\s+contract|contrat\s+[àa]\s+dur[ée]e\s+ind[ée]termin[ée]e)\b/i],
    ['FREELANCE', /\b(freelance|ind[ée]pendant|portage\s+salarial|contractor)\b/i]
  ];

  /** Renvoie le type dont le mot-clé apparaît le plus tôt dans le texte. */
  function earliestContract(textValue) {
    if (!textValue) return '';
    let best = '';
    let bestIndex = Infinity;
    for (const [type, re] of CONTRACT_PATTERNS) {
      const m = textValue.match(re);
      if (m && m.index < bestIndex) {
        bestIndex = m.index;
        best = type;
      }
    }
    return best;
  }

  function detectContractType(ldJob, title, header, description) {
    const fromText =
      earliestContract(title) || earliestContract(header) || earliestContract((description || '').slice(0, 4000));
    if (fromText) return fromText;
    const types = [].concat(ldJob?.employmentType || []).map((t) => String(t).toUpperCase());
    if (types.some((t) => t.includes('INTERN'))) return 'STAGE';
    if (types.some((t) => t.includes('TEMPORARY'))) return 'CDD';
    if (types.some((t) => t.includes('CONTRACTOR'))) return 'FREELANCE';
    if (types.some((t) => t.includes('FULL_TIME'))) return 'CDI';
    return '';
  }

  const HYBRID_RE =
    /\b(hybride?|t[ée]l[ée]travail\s+(?:partiel|possible|occasionnel|flexible)|\d\s*(?:j|jours?|days?)\s*(?:\/\s*semaine\s*)?(?:de\s+)?(?:t[ée]l[ée]travail|remote)|remote\s+partiel|partial(?:ly)?\s+remote|flex\s*office)\b/i;
  const REMOTE_RE =
    /(full[- ]?remote|100\s?%\s*(?:t[ée]l[ée]travail|remote|[àa]\s+distance)|t[ée]l[ée]travail\s+(?:complet|total|int[ée]gral)|enti[èe]rement\s+[àa]\s+distance|\bremote\b|[àa]\s+distance|t[ée]l[ée]travail)/i;
  const ONSITE_RE = /\b(sur\s+site|on[- ]?site|pr[ée]sentiel|in[- ]office)\b/i;

  function workModeIn(textValue) {
    if (!textValue) return '';
    if (HYBRID_RE.test(textValue)) return 'HYBRIDE';
    const onsite = ONSITE_RE.test(textValue);
    const remote = REMOTE_RE.test(textValue);
    if (onsite && remote) return 'HYBRIDE';
    if (remote) return 'TELETRAVAIL';
    if (onsite) return 'SUR_SITE';
    return '';
  }

  function detectWorkMode(ldJob, header, locationText, description) {
    if (String(ldJob?.jobLocationType || '').toUpperCase().includes('TELECOMMUTE')) return 'TELETRAVAIL';
    return workModeIn(header) || workModeIn(locationText) || workModeIn((description || '').slice(0, 6000));
  }

  const DURATION_VALUE =
    '(\\d{1,2}\\s*(?:[àa\\-–]|ou|to)\\s*\\d{1,2}\\s*(?:mois|months?)|\\d{1,2}\\s*(?:mois|months?|semaines|weeks)|\\d\\s*(?:ans?|years?))';

  function detectDuration(corpus) {
    if (!corpus) return '';
    const patterns = [
      new RegExp(`dur[ée]e\\s*(?:du\\s+stage|du\\s+contrat|de\\s+la\\s+mission|de\\s+l['’]alternance)?\\s*[:\\-–]?\\s*(?:de\\s+)?${DURATION_VALUE}`, 'i'),
      new RegExp(`duration\\s*[:\\-–]?\\s*${DURATION_VALUE}`, 'i'),
      new RegExp(`(?:stage|alternance|cdd|mission|contrat|internship)\\s+(?:de\\s+|d['’]une\\s+dur[ée]e\\s+de\\s+)?${DURATION_VALUE}`, 'i'),
      /(\d{1,2})[- ]month\s+(?:internship|contract|mission)/i
    ];
    for (const re of patterns) {
      const m = corpus.match(re);
      if (m?.[1]) {
        const v = m[1].replace(/\s+/g, ' ').trim();
        return /^\d{1,2}$/.test(v) ? `${v} mois` : v;
      }
    }
    return '';
  }

  const MONTHS =
    '(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre|january|february|march|april|may|june|july|august|september|october|november|december)';

  function detectStartDate(ldJob, corpus) {
    if (ldJob?.jobStartDate) {
      const d = String(ldJob.jobStartDate).slice(0, 10);
      const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
    }
    if (!corpus) return '';
    const value = `(d[èe]s\\s+que\\s+possible|asap|imm[ée]diat(?:ement)?|\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}|(?:\\d{1,2}(?:er)?\\s+)?${MONTHS}(?:\\s+\\d{4})?)`;
    const patterns = [
      new RegExp(`(?:date\\s+de\\s+d[ée]but|d[ée]but\\s+(?:du\\s+stage|de\\s+(?:la\\s+)?mission|du\\s+contrat|de\\s+l['’]alternance|souhait[ée])|d[ée]marrage|start(?:ing)?\\s+date|prise\\s+de\\s+poste|[àa]\\s+pourvoir|d[ée]but)\\s*[:\\-–]?\\s*(?:le\\s+|en\\s+|courant\\s+|[àa]\\s+partir\\s+d[ue]\\s+|d[èe]s\\s+)?${value}`, 'i'),
      new RegExp(`(?:[àa]\\s+partir\\s+d[ue]|d[èe]s|starting(?:\\s+in)?|from)\\s+((?:\\d{1,2}(?:er)?\\s+)?${MONTHS}\\s+\\d{4})`, 'i')
    ];
    for (const re of patterns) {
      const m = corpus.match(re);
      if (m?.[1]) {
        const v = m[1].replace(/\s+/g, ' ').trim();
        return v.charAt(0).toUpperCase() + v.slice(1);
      }
    }
    return '';
  }

  const DOMAIN_PATTERNS = [
    ['Data / IA', /\b(data|donn[ée]es|machine\s+learning|ml|ia|ai|intelligence\s+artificielle|deep\s+learning|llm|nlp|genai|computer\s+vision|big\s+data|bi|power\s+bi|analytics|data\s+scien\w*)\b/i],
    ['Cybersécurité', /\b(cyber\w*|s[ée]curit[ée]\s+(?:informatique|des\s+syst[èe]mes)|soc|pentest\w*|siem)\b/i],
    ['DevOps / Cloud', /\b(devops|cloud|sre|kubernetes|aws|azure|gcp|infrastructure)\b/i],
    ['Mobile', /\b(mobile|android|ios|flutter|react\s+native|swift)\b/i],
    ['Systèmes embarqués', /\b(embarqu\w*|embedded|firmware|iot|fpga)\b/i],
    ['Réseaux / Télécom', /\b(r[ée]seaux?|network\w*|t[ée]l[ée]com\w*|5g)\b/i],
    ['Test / QA', /\b(qa|testeur|test\s+automation|qualit[ée]\s+logicielle)\b/i],
    ['ERP / CRM', /\b(sap|erp|crm|salesforce|odoo)\b/i],
    ['Gestion de projet / Produit', /\b(chef\s+de\s+projet|project\s+manager|product\s+(?:owner|manager)|scrum\s+master|pmo)\b/i],
    ['Design / UX', /\b(ux|ui\s+designer|product\s+designer)\b/i],
    ['Développement logiciel', /\b(d[ée]veloppe\w*|developer|software|full[- ]?stack|front[- ]?end|back[- ]?end|web|angular|react|java|spring|node(?:\.?js)?|php|\.net|python|ing[ée]nieur\s+logiciel)\b/i]
  ];

  function domainIn(textValue) {
    if (!textValue) return '';
    for (const [label, re] of DOMAIN_PATTERNS) {
      if (re.test(textValue)) return label;
    }
    return '';
  }

  function detectDomain(ldJob, title, skills, description) {
    const ld = ldJob?.industry || ldJob?.occupationalCategory;
    if (typeof ld === 'string' && ld.trim() && ld.length < 80) return ld.trim();
    return domainIn(title) || domainIn(skills) || domainIn((description || '').slice(0, 1500));
  }

  function usableImg(img) {
    if (!img) return '';
    const src = img.currentSrc || img.src || img.getAttribute('data-delayed-url') || '';
    if (!/^https?:\/\//i.test(src)) return '';
    if (/ghost|placeholder|spacer|blank\.gif/i.test(src)) return '';
    const w = img.naturalWidth || img.width || 0;
    if (w && w < 12) return '';
    return src;
  }

  function firstImg(selectors) {
    for (const sel of selectors) {
      try {
        for (const img of document.querySelectorAll(sel)) {
          const src = usableImg(img);
          if (src) return src;
        }
      } catch {
        /* sélecteur invalide : ignorer */
      }
    }
    return '';
  }

  function detectLogo(hostname, ldJob, company) {
    const org = ldJob?.hiringOrganization;
    let ldLogo = org?.logo;
    if (ldLogo && typeof ldLogo === 'object') ldLogo = ldLogo.url || ldLogo.contentUrl || '';
    if (typeof ldLogo === 'string' && /^https?:\/\//i.test(ldLogo)) return ldLogo;

    let siteLogo = '';
    if (hostname.includes('linkedin.com')) {
      siteLogo = firstImg([
        '.job-details-jobs-unified-top-card__container--two-pane a[href*="/company/"] img',
        '.jobs-unified-top-card a[href*="/company/"] img',
        '.job-details-jobs-unified-top-card__company-logo img',
        '.jobs-search__job-details--container a[href*="/company/"] img',
        '.jobs-company__box img',
        'a[href*="/company/"] img.evi-image',
        'a[href*="/company/"] img'
      ]);
    } else if (hostname.includes('indeed.')) {
      siteLogo = firstImg([
        '[data-testid="jobsearch-CompanyAvatar-image"]',
        'img.jobsearch-CompanyAvatar-image',
        '[data-testid="jobsearch-JobInfoHeader-logo"] img',
        'img.jobsearch-JobInfoHeader-logo'
      ]);
    } else if (hostname.includes('welcometothejungle.')) {
      siteLogo = firstImg([
        '[data-testid="job-header-organization-logo"] img',
        'a[href*="/companies/"] img',
        'header img'
      ]);
    }
    if (siteLogo) return siteLogo;

    // Générique : une image dont le texte alternatif contient le nom de l'entreprise ou "logo"
    const name = (company || '').toLowerCase().trim();
    const imgs = Array.from(document.querySelectorAll('img[alt]'));
    const byName = name
      ? imgs.find((img) => (img.alt || '').toLowerCase().includes(name) && usableImg(img) && (img.naturalWidth || img.width || 0) <= 400)
      : null;
    if (byName) return usableImg(byName);
    const byLogo = imgs.find(
      (img) => /logo/i.test(img.alt || '') && (!name || (img.alt || '').toLowerCase().includes(name)) && usableImg(img)
    );
    return byLogo ? usableImg(byLogo) : '';
  }

  function headerText(hostname) {
    if (hostname.includes('linkedin.com')) {
      return [
        firstText(['.job-details-jobs-unified-top-card__container--two-pane', '.jobs-unified-top-card', '.job-details-jobs-unified-top-card__primary-description-container']),
        firstText(['.job-details-preferences-and-skills', '.job-details-fit-level-preferences', '.jobs-unified-top-card__job-insight'])
      ].join(' · ');
    }
    if (hostname.includes('indeed.')) {
      return firstText(['#jobDetailsSection', '[data-testid="jobsearch-OtherJobDetailsContainer"]', '.jobsearch-JobInfoHeader-subtitle']);
    }
    if (hostname.includes('welcometothejungle.')) {
      return firstText(['[data-testid="job-metadata-block"]', '[data-testid="job-header"]', 'header']);
    }
    return '';
  }

  function pick(...values) {
    for (const v of values) {
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return '';
  }

  const hostname = location.hostname.toLowerCase();
  const jsonLd = fromJsonLd();
  let data;

  if (hostname.includes('linkedin.com')) {
    data = extractLinkedIn();
  } else if (hostname.includes('indeed.')) {
    data = extractIndeed();
  } else if (hostname.includes('welcometothejungle.')) {
    data = extractWttj();
  } else {
    data = extractGeneric();
  }

  const fallback = extractGeneric();
  const jobUrl = location.href;

  const locationValue = pick(
    data.location,
    jsonLd?.location,
    fallback.location
  );

  let descriptionValue = pick(
    data.description,
    jsonLd?.description,
    fallback.description
  );
  // Couper les descriptions énormes (LinkedIn / main)
  if (descriptionValue.length > 8000) {
    descriptionValue = descriptionValue.slice(0, 8000);
  }

  const referenceValue = pick(
    data.reference,
    jsonLd?.reference,
    referenceFromUrl(jobUrl),
    referenceFromPageText()
  );

  const contacts = extractContactsAndSkills(descriptionValue);

  const ldJob = getJsonLdJobs()[0] || null;
  const jobTitleValue = pick(data.jobTitle, jsonLd?.jobTitle, fallback.jobTitle);
  const companyValue = pick(data.company, jsonLd?.company, fallback.company);
  const skillsValue = pick(jsonLd?.skills, data.skills, contacts.skills);
  const header = headerText(hostname);
  const metaCorpus = `${header}\n${descriptionValue}`;

  return {
    jobTitle: jobTitleValue,
    company: companyValue,
    jobUrl,
    location: locationValue,
    contractType: detectContractType(ldJob, jobTitleValue, header, descriptionValue),
    workMode: detectWorkMode(ldJob, header, locationValue, descriptionValue),
    startDate: detectStartDate(ldJob, metaCorpus),
    duration: detectDuration(metaCorpus),
    domain: detectDomain(ldJob, jobTitleValue, skillsValue, descriptionValue),
    companyLogoUrl: detectLogo(hostname, ldJob, companyValue),
    description: descriptionValue,
    platform: detectPlatform(hostname),
    reference: referenceValue,
    skills: skillsValue,
    importantElements: contacts.importantElements || '',
    contactName: pick(jsonLd?.contactName, contacts.contactName),
    contactEmail: pick(jsonLd?.contactEmail, contacts.contactEmail),
    contactLinkedin: pick(jsonLd?.contactLinkedin, contacts.contactLinkedin)
  };
})();
