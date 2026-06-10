import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { scrapeSchemes, ScrapedScheme } from './scraper';
import { ScrapedSchemeModel } from './models/index.js';

vi.mock('axios');
vi.mock('./models/index.js', () => ({
  ScrapedSchemeModel: {
    findOneAndUpdate: vi.fn().mockResolvedValue({})
  }
}));

describe('scrapeSchemes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should scrape schemes and save them to the database', async () => {
    const mockHtml = `
      <html>
        <body>
          <a href="/scheme-1">National Health Scheme</a>
          <a href="/other">Some other link</a>
          <a href="https://ext.gov/pension-scheme">Old Age Pension Scheme</a>
        </body>
      </html>
    `;

    (axios.get as any).mockResolvedValue({ data: mockHtml });

    const schemes: ScrapedScheme[] = await scrapeSchemes();

    expect(schemes.length).toBeGreaterThan(0);
    expect(schemes.some(s => s.name.includes('Health'))).toBe(true);
    expect(schemes.some(s => s.name.includes('Pension'))).toBe(true);
    expect(ScrapedSchemeModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('should handle axios errors gracefully', async () => {
    (axios.get as any).mockRejectedValue(new Error('Network Error'));
    
    const schemes = await scrapeSchemes();
    expect(schemes).toEqual([]);
  });
});
