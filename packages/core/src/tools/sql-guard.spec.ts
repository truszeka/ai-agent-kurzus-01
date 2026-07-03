import { describe, expect, it } from 'vitest';
import { assertSafeSelect, SqlGuardError } from './sql-guard';

describe('assertSafeSelect', () => {
  describe('elfogadott lekérdezések', () => {
    it('should accept a simple SELECT with LIMIT', () => {
      expect(() => assertSafeSelect('SELECT id, name FROM products LIMIT 20')).not.toThrow();
    });

    it('should accept the beginner-plants sample query (system-prompt.md 11.1)', () => {
      const query = `
        SELECT
          id,
          name,
          latin_name,
          category,
          COALESCE(sale_price, price) AS effective_price,
          stock,
          light,
          watering,
          difficulty,
          current_height_cm,
          pet_safe,
          kid_safe,
          rating,
          reviews_count
        FROM products
        WHERE difficulty = 'kezdő'
        ORDER BY rating DESC NULLS LAST, reviews_count DESC NULLS LAST
        LIMIT 20;
      `;
      expect(() => assertSafeSelect(query)).not.toThrow();
    });

    it('should accept an aliased products table', () => {
      expect(() => assertSafeSelect('SELECT p.id FROM products p LIMIT 10')).not.toThrow();
    });

    it('should accept a query at the maximum allowed LIMIT', () => {
      expect(() => assertSafeSelect('SELECT id FROM products LIMIT 50')).not.toThrow();
    });

    it('should accept a trailing semicolon', () => {
      expect(() => assertSafeSelect('SELECT id FROM products LIMIT 10;')).not.toThrow();
    });

    it('should accept case-insensitive keywords', () => {
      expect(() => assertSafeSelect('select id from products limit 10')).not.toThrow();
    });
  });

  describe('elutasított lekérdezések', () => {
    it('should reject an empty query', () => {
      expect(() => assertSafeSelect('')).toThrow(SqlGuardError);
    });

    it('should reject a query without LIMIT', () => {
      expect(() => assertSafeSelect('SELECT id FROM products')).toThrow(/LIMIT/);
    });

    it('should reject a LIMIT above the maximum', () => {
      expect(() => assertSafeSelect('SELECT id FROM products LIMIT 100')).toThrow(/LIMIT/);
    });

    it('should reject a LIMIT of zero', () => {
      expect(() => assertSafeSelect('SELECT id FROM products LIMIT 0')).toThrow(/LIMIT/);
    });

    it('should reject a query that does not start with SELECT', () => {
      expect(() => assertSafeSelect('UPDATE products SET price = 0')).toThrow(/SELECT/);
    });

    it('should reject INSERT', () => {
      expect(() => assertSafeSelect('INSERT INTO products (name) VALUES (\'x\')')).toThrow(
        SqlGuardError,
      );
    });

    it('should reject a SELECT that smuggles a DROP after a semicolon', () => {
      expect(() =>
        assertSafeSelect('SELECT id FROM products LIMIT 10; DROP TABLE products;'),
      ).toThrow(/egy SQL utasítás/);
    });

    it('should reject a DELETE hidden inside a subquery-looking string', () => {
      expect(() =>
        assertSafeSelect('SELECT id FROM products WHERE 1=1; DELETE FROM products'),
      ).toThrow(SqlGuardError);
    });

    it('should reject comment-based obfuscation with --', () => {
      expect(() => assertSafeSelect("SELECT id FROM products LIMIT 10 -- ; DROP TABLE products")).toThrow(
        /komment/,
      );
    });

    it('should reject comment-based obfuscation with /* */', () => {
      expect(() => assertSafeSelect('SELECT id FROM products /* sneaky */ LIMIT 10')).toThrow(
        /komment/,
      );
    });

    it('should reject queries referencing another table', () => {
      expect(() => assertSafeSelect('SELECT id FROM users LIMIT 10')).toThrow(/products/);
    });

    it('should reject a table name that merely starts with "products"', () => {
      expect(() => assertSafeSelect('SELECT id FROM products_backup LIMIT 10')).toThrow(/products/);
    });

    it('should reject JOINs to other tables', () => {
      expect(() =>
        assertSafeSelect('SELECT p.id FROM products p JOIN orders o ON o.product_id = p.id LIMIT 10'),
      ).toThrow(/JOIN/);
    });

    it('should reject ALTER', () => {
      expect(() => assertSafeSelect('SELECT 1; ALTER TABLE products DROP COLUMN price')).toThrow(
        SqlGuardError,
      );
    });

    it('should reject GRANT', () => {
      expect(() => assertSafeSelect('SELECT id FROM products LIMIT 10 GRANT ALL')).toThrow(
        SqlGuardError,
      );
    });

    it('should reject a prompt-injection style request disguised as SQL', () => {
      expect(() =>
        assertSafeSelect("SELECT id FROM products LIMIT 10; TRUNCATE TABLE products;"),
      ).toThrow(SqlGuardError);
    });
  });
});
