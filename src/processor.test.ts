import { test, describe } from 'node:test';
import assert from 'node:assert';

import { createContentProcessor } from './processor.js';

describe('processor', () => {
  describe('ContentProcessor', () => {
    test('should extract metadata from HTML', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
            <meta property="og:title" content="OG Title">
          </head>
          <body>Content</body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'body');

      assert.strictEqual(result.metadata['title'], 'Test Page');
      assert.strictEqual(result.metadata['description'], 'Test description');
      assert.strictEqual(result.metadata['og:title'], 'OG Title');
    });

    test('should extract internal and external links', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <body>
            <a href="https://example.com/page1">Internal Link 1</a>
            <a href="/page2">Internal Link 2</a>
            <a href="https://other.com/page">External Link</a>
          </body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'body');

      assert.strictEqual(result.links.internal.length, 2);
      assert.strictEqual(result.links.external.length, 1);
      assert.strictEqual(result.links.internal[0]!.text, 'Internal Link 1');
      assert.strictEqual(result.links.external[0]!.text, 'External Link');
    });

    test('should extract images and videos', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <body>
            <img src="/image.jpg" alt="Test Image">
            <video src="/video.mp4"></video>
          </body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'body');

      assert.strictEqual(result.media.images.length, 1);
      assert.strictEqual(result.media.videos.length, 1);
      assert.strictEqual(result.media.images[0]!.src, 'https://example.com/image.jpg');
      assert.strictEqual(result.media.images[0]!.alt, 'Test Image');
    });

    test('should skip data URLs for images', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <body>
            <img src="data:image/png;base64,123" alt="Base64 Image">
            <img src="/real-image.jpg" alt="Real Image">
          </body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'body');

      assert.strictEqual(result.media.images.length, 1);
      assert.strictEqual(result.media.images[0]!.src, 'https://example.com/real-image.jpg');
    });

    test('should remove unwanted elements', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <head><script>console.log('test')</script></head>
          <body>
            <nav>Navigation</nav>
            <header>Header</header>
            <main>Main content</main>
            <footer>Footer</footer>
            <aside>Sidebar</aside>
          </body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'body');

      assert.strictEqual(result.cleanedHtml.includes('Navigation'), false);
      assert.strictEqual(result.cleanedHtml.includes('Header'), false);
      assert.strictEqual(result.cleanedHtml.includes('Footer'), false);
      assert.strictEqual(result.cleanedHtml.includes('Sidebar'), false);
      assert.strictEqual(result.cleanedHtml.includes('Main content'), true);
    });

    test('should convert HTML to markdown', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <body>
            <h1>Heading</h1>
            <p>Paragraph with <strong>bold</strong> text.</p>
          </body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'body');

      assert.strictEqual(result.markdown.includes('# Heading'), true);
      assert.strictEqual(result.markdown.includes('**bold**'), true);
    });

    test('should extract text content', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <body>
            <h1>Title</h1>
            <p>Some text content.</p>
          </body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'body');

      assert.strictEqual(result.content.includes('Title'), true);
      assert.strictEqual(result.content.includes('Some text content.'), true);
    });

    test('should respect custom selector', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <body>
            <div class="header">Header content</div>
            <article>Article content</article>
          </body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'article');

      assert.strictEqual(result.content.includes('Article content'), true);
      assert.strictEqual(result.content.includes('Header content'), false);
    });

    test('should clean attributes except whitelisted ones', async () => {
      const processor = createContentProcessor();
      const html = `
        <html>
          <body>
            <a href="/link" class="btn" id="link1" data-track="yes">Link</a>
            <img src="/img.jpg" alt="Image" class="large">
          </body>
        </html>
      `;

      const result = processor.process(html, 'https://example.com', 'body');

      assert.strictEqual(result.cleanedHtml.includes('href='), true);
      assert.strictEqual(result.cleanedHtml.includes('src='), true);
      assert.strictEqual(result.cleanedHtml.includes('alt='), true);
      assert.strictEqual(result.cleanedHtml.includes('class='), false);
      assert.strictEqual(result.cleanedHtml.includes('id='), false);
      assert.strictEqual(result.cleanedHtml.includes('data-track='), false);
    });
  });
});
