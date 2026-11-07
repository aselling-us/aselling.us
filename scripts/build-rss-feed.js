import { XMLBuilder, XMLValidator } from 'fast-xml-parser';
import fs from 'fs';
const builder = new XMLBuilder({
  format: true,            // Pretty print
  ignoreAttributes: false,
  attributeNamePrefix: '',
});


export function buildHeader({ domain, email, timestamp }) {
    return `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="1.0" xmlns="http://www.w3.org/2005/Atom">
        <channel>
        <title>Arjan Singh Ellingson</title>
        <link>http://${domain}</link>
        <description>Arjan Ellingson: Portfolio &amp; Archive</description>
        <updated>${timestamp}</updated>
        <id>http://${domain}</id>
        <author>
            <name>Arjan Singh Ellingson</name>
            <email>${email}</email>
        </author>
        `
    };

const FOOTER = `
    </channel>
    </rss>
    `;


const lb = 



const data = {
  bookstore: {
    book: [
      { id: '1', title: 'JavaScript Basics', author: 'John Doe' },
      { id: '2', title: 'TypeScript Deep Dive', author: 'Jane Smith' },
    ],
  },
};

export function buildFeed({ domain, email, timestamp, data }) {
  const header = buildHeader({ domain, email, timestamp });
  return `${header}\n${builder.build(data)}\n${FOOTER}`;
}

export { XMLValidator };


const xmlContent = buildFeed({
  domain: process.env.DOMAIN_ROOT,
  email: process.env.EMAIL,
  timestamp: new Date().toISOString(),
  data,
});

fs.writeFileSync('output.xml', xmlContent, 'utf-8');
console.log('XML file successfully written!');