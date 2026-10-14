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

  return {
    jobTitle: pick(data.jobTitle, jsonLd?.jobTitle, fallback.jobTitle),
    company: pick(data.company, jsonLd?.company, fallback.company),
    jobUrl,
    location: locationValue,
    description: descriptionValue,
    platform: detectPlatform(hostname),
    reference: referenceValue,
    skills: pick(jsonLd?.skills, data.skills, contacts.skills),
    importantElements: contacts.importantElements || '',
    contactName: pick(jsonLd?.contactName, contacts.contactName),
    contactEmail: pick(jsonLd?.contactEmail, contacts.contactEmail),
    contactLinkedin: pick(jsonLd?.contactLinkedin, contacts.contactLinkedin)
  };
})();
