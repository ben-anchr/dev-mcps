import { readFileSync } from 'node:fs';
import { z } from 'zod/v4';

export const sqlAccessSchema = z.enum(['read', 'write', 'deny']);
export type SqlAccess = z.infer<typeof sqlAccessSchema>;

const projectPolicySchema = z.object({
  /** SQL access level for execute_sql / apply_migration on this project. */
  sql: sqlAccessSchema.optional(),
  /**
   * Tool names allowed for this project (e.g. `list_tables`, `execute_sql_read`).
   * Omit or use `*` to allow any tool that passes other checks.
   */
  tools: z.union([z.array(z.string()), z.literal('*')]).optional(),
});

const anchrPolicySchema = z.object({
  version: z.literal(1),
  /**
   * When true, register `execute_sql_read` and `execute_sql_write` instead of
   * a single `execute_sql` tool so MCP clients show intent in the approval UI.
   */
  splitSqlTools: z.boolean().optional(),
  projects: z.record(z.string(), projectPolicySchema),
  default: projectPolicySchema.optional(),
});

export type ProjectPolicy = z.infer<typeof projectPolicySchema>;
export type AnchrPolicy = z.infer<typeof anchrPolicySchema>;

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

export function loadPolicyFromFile(path: string): AnchrPolicy {
  const raw = readFileSync(path, 'utf8');
  return anchrPolicySchema.parse(JSON.parse(raw));
}

export function resolveProjectPolicy(
  policy: AnchrPolicy,
  projectId: string
): ProjectPolicy {
  return policy.projects[projectId] ?? policy.default ?? { sql: 'deny' };
}

export function isProjectKnown(policy: AnchrPolicy, projectId: string): boolean {
  return projectId in policy.projects;
}

export function isToolAllowedForProject(
  policy: AnchrPolicy,
  projectId: string,
  toolName: string
): boolean {
  const projectPolicy = resolveProjectPolicy(policy, projectId);
  const tools = projectPolicy.tools ?? '*';
  if (tools === '*') {
    return true;
  }
  return tools.includes(toolName);
}

export function assertProjectAllowed(
  policy: AnchrPolicy,
  projectId: string
): void {
  if (!isProjectKnown(policy, projectId)) {
    const defaultPolicy = policy.default;
    if (!defaultPolicy || defaultPolicy.sql === 'deny') {
      throw new PolicyViolationError(
        `Project ${projectId} is not in anchr-policy.json and no permissive default is configured.`
      );
    }
  }
}

export function assertToolAllowed(
  policy: AnchrPolicy,
  projectId: string,
  toolName: string
): void {
  assertProjectAllowed(policy, projectId);
  if (!isToolAllowedForProject(policy, projectId, toolName)) {
    throw new PolicyViolationError(
      `Tool ${toolName} is not allowed for project ${projectId} by anchr-policy.json.`
    );
  }
}

/** Strip line (--) and block comments for coarse classification. */
export function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

const WRITE_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|COMMENT|VACUUM|REINDEX|CLUSTER|REFRESH)\b/i;

/**
 * Coarse read/write classifier. Fail-closed: unknown or mixed statements → write.
 */
export function classifySql(sql: string): 'read' | 'write' {
  const cleaned = stripSqlComments(sql).trim();
  if (!cleaned) {
    return 'write';
  }

  // CTEs that end in SELECT are still read; WITH ... INSERT is write.
  if (WRITE_KEYWORDS.test(cleaned)) {
    return 'write';
  }

  const firstToken = cleaned.split(/\s+/)[0]?.toUpperCase() ?? '';
  if (
    firstToken === 'SELECT' ||
    firstToken === 'EXPLAIN' ||
    firstToken === 'SHOW' ||
    firstToken === 'WITH'
  ) {
    return 'read';
  }

  return 'write';
}

export function assertSqlAllowed(
  policy: AnchrPolicy,
  projectId: string,
  sql: string,
  options?: { requireWriteTool?: boolean }
): 'read' | 'write' {
  assertProjectAllowed(policy, projectId);
  const access = resolveProjectPolicy(policy, projectId).sql ?? 'deny';
  const kind = classifySql(sql);

  if (access === 'deny') {
    throw new PolicyViolationError(
      `SQL access denied for project ${projectId} by anchr-policy.json.`
    );
  }

  if (kind === 'write' && access === 'read') {
    throw new PolicyViolationError(
      `Write SQL blocked for project ${projectId} (policy: read-only). Query classified as write: ${summarizeSql(sql)}`
    );
  }

  if (options?.requireWriteTool && kind === 'read' && access === 'write') {
    // execute_sql_write with a SELECT is fine — runs as read at DB level if we pass read_only
  }

  return kind;
}

/** Short single-line preview for errors and stderr logs. */
export function summarizeSql(sql: string, maxLen = 240): string {
  const oneLine = stripSqlComments(sql).replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxLen) {
    return oneLine;
  }
  return `${oneLine.slice(0, maxLen)}…`;
}

export function filterToolsByPolicy(
  tools: Record<string, unknown>,
  policy: AnchrPolicy
): Record<string, unknown> {
  const allowedNames = new Set<string>();

  for (const projectPolicy of Object.values(policy.projects)) {
    const toolsConfig = projectPolicy.tools ?? '*';
    if (toolsConfig === '*') {
      return tools;
    }
    for (const name of toolsConfig) {
      allowedNames.add(name);
    }
  }

  if (allowedNames.size === 0) {
    return tools;
  }

  return Object.fromEntries(
    Object.entries(tools).filter(([name]) => allowedNames.has(name))
  );
}
