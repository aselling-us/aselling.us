const LETTERBOXD_USER = 'aselling';


async function fetchXml(url:string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': `${process.env.DOMAIN_ROOT} media snapshot (${process.env.EMAIL})` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function fetchFilms() {
  const xml = await fetchXml(`https://letterboxd.com/${LETTERBOXD_USER}/rss/`);
    console.log(JSON.stringify(xml, null, 2));
}

fetchFilms()