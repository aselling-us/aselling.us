import { describe, it, expect } from 'vitest';
import { XMLValidator } from 'fast-xml-parser';
import { buildFeed } from './build-rss-feed.js';
import { buildFeed, XMLValidator } from './build-rss-feed.js';

const sampleData = {
  bookstore: {
    book: [
      { id: '1', title: 'JavaScript Basics', author: 'John Doe' },
      { id: '2', title: 'TypeScript Deep Dive', author: 'Jane Smith' },
    ],
  },
};

const base = {
  domain: 'aselling.us',
  email: 'test@example.com',
  timestamp: '2026-11-07T18:57:00.000Z',
  data: sampleData,
};

const render = () => buildFeed({ ...base});

describe('buildFeed', () => {
  it('produces valid XML', () => {
    const result = XMLValidator.validate(render(), { allowBooleanAttributes: true });
    expect(result).toBe(true);
  });
  


});