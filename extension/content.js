(() => {
  function text(el) {
    return el?.textContent?.replace(/\s+/g, ' ').trim() || '';
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

  function extractLinkedIn() {
    const jobTitle =
      text(document.querySelector('.job-details-jobs-unified-top-card__job-title h1')) ||
      text(document.querySelector('.job-details-jobs-unified-top-card__job-title')) ||
      text(document.querySelector('h1'));

    const company =
      text(document.querySelector('.job-details-jobs-unified-top-card__company-name a')) ||
      text(document.querySelector('.job-details-jobs-unified-top-card__company-name'));

    const location =
      text(document.querySelector('.job-details-jobs-unified-top-card__primary-description-container')) ||
      text(document.querySelector('.job-details-jobs-unified-top-card__bullet'));

    const description =
      text(document.querySelector('#job-details')) ||
      text(document.querySelector('.jobs-description__content'));

    const refMatch = location.match(/#?(\d{6,})/);
    return {
      jobTitle,
      company,
      location: location.split('·')[0]?.trim() || location,
      description,
      reference: refMatch ? refMatch[1] : ''
    };
  }

  function extractIndeed() {
    const jobTitle =
      text(document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')) ||
      text(document.querySelector('h1.jobsearch-JobInfoHeader-title')) ||
      text(document.querySelector('h1'));

    const company =
      text(document.querySelector('[data-company-name="true"]')) ||
      text(document.querySelector('[data-testid="inlineHeader-companyName"]')) ||
      text(document.querySelector('.jobsearch-InlineCompanyRating a'));

    const location =
      text(document.querySelector('[data-testid="inlineHeader-companyLocation"]')) ||
      text(document.querySelector('.jobsearch-JobInfoHeader-subtitle > div'));

    const description =
      text(document.querySelector('#jobDescriptionText')) ||
      text(document.querySelector('.jobsearch-jobDescriptionText'));

    return { jobTitle, company, location, description, reference: '' };
  }

  function extractWttj() {
    const jobTitle =
      text(document.querySelector('h1')) ||
      meta('meta[property="og:title"]');

    const company =
      text(document.querySelector('[data-testid="job-header-organization"]')) ||
      text(document.querySelector('a[href*="/companies/"]')) ||
      meta('meta[property="og:site_name"]');

    const location =
      text(document.querySelector('[data-testid="job-header-location"]')) ||
      text(document.querySelector('[class*="location"]'));

    const description =
      text(document.querySelector('[data-testid="job-section-description"]')) ||
      text(document.querySelector('section')) ||
      meta('meta[property="og:description"]');

    return { jobTitle, company, location, description, reference: '' };
  }

  function extractGeneric() {
    const ogTitle = meta('meta[property="og:title"]');
    const title = ogTitle || document.title || text(document.querySelector('h1'));
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

    return {
      jobTitle,
      company,
      location: '',
      description: meta('meta[property="og:description"]') || meta('meta[name="description"]'),
      reference: ''
    };
  }

  const hostname = location.hostname.toLowerCase();
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

  // Compléter avec le générique si champs vides
  const fallback = extractGeneric();
  return {
    jobTitle: data.jobTitle || fallback.jobTitle || '',
    company: data.company || fallback.company || '',
    jobUrl: location.href,
    location: data.location || '',
    description: data.description || fallback.description || '',
    platform: detectPlatform(hostname),
    reference: data.reference || ''
  };
})();
