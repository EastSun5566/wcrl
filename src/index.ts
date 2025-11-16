#!/usr/bin/env node

import { chromium } from 'playwright';
import { cac } from 'cac';
import { writeFile } from 'fs/promises';
import ora from 'ora';
import chalk from 'chalk';

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function createMatchRegex(pattern: string) {
  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '___DOUBLE___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLE___/g, '.*');
  return new RegExp('^' + escaped + '$');
}

interface CrawlResult {
  url: string;
  title: string;
  content: string;
  timestamp: string;
}

interface CrawlOptions {
  url: string;
  selector?: string;
  output?: string;
  max?: number;
  match?: string;
}
async function crawl(options: CrawlOptions) {
  const {
    url,
    selector = 'body',
    output = 'output.json',
    max = 10,
    match = url.endsWith('/') ? url + '**' : url + '/**'
  } = options;

  const spinner = ora('Starting crawler...').start();
  const results: CrawlResult[] = [];
  const visited = new Set<string>();
  const queue: string[] = [url];
  const regex = createMatchRegex(match);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // block unnecessary resources
  await context.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      route.abort().catch(console.error);
    } else {
      route.continue().catch(console.error);
    }
  });

  try {
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
          timeout: 30000 
        });

        try {
          await page.waitForSelector(selector, { timeout: 5000 });
        } catch {
          // noop
        }

        const data = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          return {
            title: document.title,
            content: element?.textContent.trim() ?? '',
          };
        }, selector);

        results.push({
          url: currentUrl,
          title: data.title,
          content: data.content,
          timestamp: new Date().toISOString(),
        });

        if (results.length < max) {
          // collect all links
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
              .map(a => (a as HTMLAnchorElement).href)
              .filter(href => href.startsWith('http'));
          });

          for (const link of links) {
            if (regex.test(link) && !visited.has(link) && !queue.includes(link)) {
              queue.push(link);
            }
          }
        }

        await page.close();
      } catch (error) {
        spinner.warn(chalk.yellow(`Failed to crawl ${currentUrl}: ${String(error)}`));
      }
    }

    await writeFile(output, JSON.stringify(results, null, 2));
    spinner.succeed(chalk.green(`✓ Crawled ${String(results.length)} pages → ${output}`));
    
    console.log(chalk.blue('\nResults:'));
    results.forEach((r, i) => {
      console.log(chalk.gray(`  ${String(i + 1)}. ${r.title} (${r.url})`));
    });

  } finally {
    await browser.close();
  }
}

const cli = cac('wcrl');

cli
  .command('<url>', 'URL to start crawling')
  .option('-s, --selector <selector>', 'CSS selector to extract content', { default: 'body' })
  .option('-o, --output <file>', 'Output JSON file', { default: 'output.json' })
  .option('-m, --max <number>', 'Maximum pages to crawl', { default: '10' })
  .option('--match <pattern>', 'URL pattern to match (supports * and **)')
  .example('wcrl https://example.com')
  .example('wcrl https://docs.com -s "article" -m 50')
  .example('wcrl https://blog.com --match "https://blog.com/posts/**"')
  .action(async (url: string, options: {
    selector: string;
    output: string;
    max: string;
    match: string;
  }) => {
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
      });
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

cli.help();
cli.version('0.0.1');

cli.parse();
