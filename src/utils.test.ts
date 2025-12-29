import { test, describe } from 'node:test';
import assert from 'node:assert';

import {
  isValidUrl,
  createMatchRegex,
  getBaseDomain,
  normalizeUrl,
  isExternal,
} from './utils.js';

describe('utils', () => {
  describe('isValidUrl', () => {
    test('should return true for valid URLs', () => {
      assert.strictEqual(isValidUrl('https://example.com'), true);
      assert.strictEqual(isValidUrl('http://example.com'), true);
      assert.strictEqual(isValidUrl('https://example.com/path'), true);
      assert.strictEqual(isValidUrl('https://example.com/path?query=1'), true);
    });

    test('should return false for invalid URLs', () => {
      assert.strictEqual(isValidUrl('not-a-url'), false);
      assert.strictEqual(isValidUrl(''), false);
      assert.strictEqual(isValidUrl('example.com'), false);
    });
  });

  describe('createMatchRegex', () => {
    test('should create regex for exact match', () => {
      const regex = createMatchRegex('https://example.com/page');
      assert.strictEqual(regex.test('https://example.com/page'), true);
      assert.strictEqual(regex.test('https://example.com/other'), false);
    });

    test('should handle single wildcard (*)', () => {
      const regex = createMatchRegex('https://example.com/*');
      assert.strictEqual(regex.test('https://example.com/page'), true);
      assert.strictEqual(regex.test('https://example.com/other'), true);
      assert.strictEqual(regex.test('https://example.com/path/nested'), false);
    });

    test('should handle double wildcard (**)', () => {
      const regex = createMatchRegex('https://example.com/**');
      assert.strictEqual(regex.test('https://example.com/page'), true);
      assert.strictEqual(regex.test('https://example.com/path/nested'), true);
      assert.strictEqual(regex.test('https://example.com/path/deeply/nested'), true);
    });

    test('should escape dots in URL', () => {
      const regex = createMatchRegex('https://example.com');
      assert.strictEqual(regex.test('https://exampleXcom'), false);
    });
  });

  describe('getBaseDomain', () => {
    test('should extract domain from URL', () => {
      assert.strictEqual(getBaseDomain('https://example.com'), 'example.com');
      assert.strictEqual(getBaseDomain('https://example.com/path'), 'example.com');
    });

    test('should remove www prefix', () => {
      assert.strictEqual(getBaseDomain('https://www.example.com'), 'example.com');
    });

    test('should handle subdomains', () => {
      assert.strictEqual(getBaseDomain('https://blog.example.com'), 'blog.example.com');
    });

    test('should return empty string for invalid URL', () => {
      assert.strictEqual(getBaseDomain('not-a-url'), '');
    });
  });

  describe('normalizeUrl', () => {
    test('should resolve relative URLs', () => {
      assert.strictEqual(
        normalizeUrl('/path', 'https://example.com'),
        'https://example.com/path',
      );
      assert.strictEqual(
        normalizeUrl('./path', 'https://example.com/base/'),
        'https://example.com/base/path',
      );
    });

    test('should remove hash fragments', () => {
      assert.strictEqual(
        normalizeUrl('https://example.com/page#section', 'https://example.com'),
        'https://example.com/page',
      );
    });

    test('should handle absolute URLs', () => {
      assert.strictEqual(
        normalizeUrl('https://other.com/path', 'https://example.com'),
        'https://other.com/path',
      );
    });

    test('should return original href for invalid URLs', () => {
      assert.strictEqual(
        normalizeUrl('javascript:void(0)', 'https://example.com'),
        'javascript:void(0)',
      );
    });
  });

  describe('isExternal', () => {
    test('should return true for external URLs', () => {
      assert.strictEqual(isExternal('https://other.com', 'example.com'), true);
    });

    test('should return false for internal URLs', () => {
      assert.strictEqual(isExternal('https://example.com/path', 'example.com'), false);
    });

    test('should handle www prefix in URL', () => {
      assert.strictEqual(isExternal('https://www.example.com/path', 'example.com'), false);
    });

    test('should handle subdomains', () => {
      assert.strictEqual(isExternal('https://blog.example.com', 'example.com'), false);
      assert.strictEqual(isExternal('https://example.com', 'blog.example.com'), true);
    });

    test('should return false for invalid URLs', () => {
      assert.strictEqual(isExternal('not-a-url', 'example.com'), false);
    });
  });
});
