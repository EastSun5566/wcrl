#!/usr/bin/env node

import { writeFile } from 'fs/promises';
import { chromium } from 'playwright';
import { cac } from 'cac';
import ora from 'ora';
import chalk from 'chalk';

import { createContentProcessor } from './processor.js';
import {
  isValidUrl,
  createMatchRegex,
} from './utils.js';
import type {
  CrawlOptions,
  CrawlResult,
} from './types.js';

async function crawl(options: CrawlOptions) {
  const {
    url,
    selector = 'body',
    output = 'output.json',
    max = 10,
    match = url.endsWith('/') ? url + '**' : url + '/**',
    format = 'json',
  } = options;

  const spinner = ora('Starting crawler...').start();
  const results: CrawlResult[] = [];
  const visited = new Set<string>();
  const queue: string[] = [url];
  const regex = createMatchRegex(match);
  const processor = createContentProcessor();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    // Block unnecessary resources
    await context.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort().catch(console.error);
      } else {
        route.continue().catch(console.error);
      }
    });

    while (queue.length > 0 && results.length < max) {
      const currentUrl = queue.shift();
      if (!currentUrl) continue;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      spinner.text = `Crawling (${String(results.length + 1)}/${String(max)}): ${currentUrl}`;

      try {
        const page = await context.newPage();

        await page.goto(currentUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        // Wait for selector
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
        } catch {
          // noop
        }

        // Process content
        const html = await page.content();
        const processed = processor.process(html, currentUrl, selector);

        results.push({
          url: currentUrl,
          title: processed.metadata['title'] ?? 'Untitled',
          html,
          cleanedHtml: processed.cleanedHtml,
          markdown: processed.markdown,
          content: processed.content,
          links: processed.links,
          media: processed.media,
          metadata: processed.metadata,
          timestamp: new Date().toISOString(),
        });

        // Add new links to queue
        if (results.length < max) {
          for (const link of processed.links.internal) {
            if (regex.test(link.href) && !visited.has(link.href) && !queue.includes(link.href)) {
              queue.push(link.href);
            }
          }
        }

        await page.close();
      } catch (error) {
        spinner.warn(chalk.yellow(`Failed to crawl ${currentUrl}: ${String(error)}`));
      }
    }

    // Write output
    if (format === 'markdown') {
      const mdContent = results
        .map((r) => {
          return `# ${r.title}\n\n**URL:** ${r.url}\n\n${r.markdown}\n\n---\n`;
        })
        .join('\n');
      await writeFile(output.replace('.json', '.md'), mdContent);
      spinner.succeed(chalk.green(`✓ Crawled ${String(results.length)} pages → ${output.replace('.json', '.md')}`));
    } else {
      await writeFile(output, JSON.stringify(results, null, 2));
      spinner.succeed(chalk.green(`✓ Crawled ${String(results.length)} pages → ${output}`));
    }

    // Display results
    console.log(chalk.cyan('\nResults:'));
    results.forEach(({ title, url, links, media }, index) => {
      console.log(chalk.gray(`  ${String(index + 1)}. ${title}`));
      console.log(chalk.gray(`     ${url}`));
      console.log(chalk.gray(`     Links: ${links.internal.length.toString()} internal, ${links.external.length.toString()} external`));
      console.log(chalk.gray(`     Media: ${media.images.length.toString()} images, ${media.videos.length.toString()} videos`));
    });

    const totalSize = JSON.stringify(results).length;
    const avgContentLength = Math.round(
      results.reduce((sum, r) => sum + r.content.length, 0) / results.length,
    );

    console.log(chalk.cyan('\nStatistics:'));
    console.log(chalk.gray(`  Total size: ${(totalSize / 1024).toFixed(2)} KB`));
    console.log(chalk.gray(`  Average content: ${avgContentLength.toString()} characters`));
    console.log(chalk.gray(`  Total links: ${results.reduce((sum, r) => sum + r.links.internal.length + r.links.external.length, 0).toString()}`));
    console.log(chalk.gray(`  Total images: ${results.reduce((sum, r) => sum + r.media.images.length, 0).toString()}`));
  } finally {
    await context.close();
    await browser.close();
  }
}

const cli = cac('wcrl');

cli
  .command('<url>', 'URL to start crawling')
  .option('-s, --selector <selector>', 'CSS selector to extract content', { default: 'body' })
  .option('-o, --output <file>', 'Output file', { default: 'output.json' })
  .option('-m, --max <number>', 'Maximum pages to crawl', { default: '10' })
  .option('--match <pattern>', 'URL pattern to match (supports * and **)')
  .option('-f, --format <format>', 'Output format: json or markdown', { default: 'json' })
  .example('wcrl https://example.com')
  .example('wcrl https://example.com --format markdown')
  .example('wcrl https://example.com -selector "article" -max 50')
  .example('wcrl https://blog.com --match "https://blog.com/posts/**"')
  .action(
    async (
      url: string,
      options: {
        selector: string;
        output: string;
        max: string;
        match: string;
        format: 'json' | 'markdown';
      },
    ) => {
      if (!isValidUrl(url)) {
        console.error(chalk.red(`Error: Invalid URL: ${url}`));
        process.exit(1);
      }

      try {
        await crawl({
          url,
          selector: options.selector,
          output: options.output,
          max: parseInt(options.max),
          match: options.match,
          format: options.format,
        });
      } catch (error) {
        console.error(chalk.red('Error:'), error);
        process.exit(1);
      }
    },
  );

cli.help();
cli.version('0.1.0');

cli.parse();
