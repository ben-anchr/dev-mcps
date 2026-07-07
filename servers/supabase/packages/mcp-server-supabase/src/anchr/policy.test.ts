import { describe, expect, it } from 'vitest';
import {
  assertSqlAllowed,
  classifySql,
  loadPolicyFromFile,
  PolicyViolationError,
  summarizeSql,
} from './policy.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const policy = {
  version: 1 as const,
  splitSqlTools: true,
  projects: {
    prod_abc: { sql: 'deny' as const },
    dev_xyz: { sql: 'read' as const, tools: ['execute_sql_read', 'list_tables'] },
    staging: { sql: 'write' as const },
  },
  default: { sql: 'deny' as const },
};

describe('classifySql', () => {
  it('treats SELECT as read', () => {
    expect(classifySql('SELECT * FROM users')).toBe('read');
  });

  it('treats INSERT as write', () => {
    expect(classifySql('INSERT INTO users VALUES (1)')).toBe('write');
  });

  it('treats WITH…SELECT as read', () => {
    expect(classifySql('WITH cte AS (SELECT 1) SELECT * FROM cte')).toBe('read');
  });

  it('treats WITH…INSERT as write', () => {
    expect(
      classifySql('WITH cte AS (SELECT 1) INSERT INTO t SELECT * FROM cte')
    ).toBe('write');
  });
});

describe('assertSqlAllowed', () => {
  it('blocks unknown projects', () => {
    expect(() => assertSqlAllowed(policy, 'unknown', 'SELECT 1')).toThrow(
      PolicyViolationError
    );
  });

  it('blocks writes on read-only project', () => {
    expect(() =>
      assertSqlAllowed(policy, 'dev_xyz', 'DELETE FROM users')
    ).toThrow(/Write SQL blocked/);
  });

  it('allows reads on read-only project', () => {
    expect(assertSqlAllowed(policy, 'dev_xyz', 'SELECT 1')).toBe('read');
  });

  it('blocks all SQL on deny project', () => {
    expect(() => assertSqlAllowed(policy, 'prod_abc', 'SELECT 1')).toThrow(
      /denied/
    );
  });
});

describe('summarizeSql', () => {
  it('collapses whitespace', () => {
    expect(summarizeSql('SELECT\n  *\nFROM   t')).toBe('SELECT * FROM t');
  });
});

describe('loadPolicyFromFile', () => {
  it('parses valid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'anchr-policy-'));
    const path = join(dir, 'policy.json');
    writeFileSync(path, JSON.stringify(policy));
    expect(loadPolicyFromFile(path).projects.dev_xyz.sql).toBe('read');
  });
});
