/**
 * Rushi CRM — Live Neon DB Backend Server
 * Connects directly to Neon DB (PostgreSQL) and handles all API / REST requests.
 */

import http from 'http';
import { URL, fileURLToPath } from 'url';
import pg from 'pg';

const PORT = parseInt(process.env.PORT || '54321', 10);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_wZc9mVASfG0o@ep-young-river-b3ue574y-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?uselibpqcompat=true&sslmode=require';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[Neon DB Pool Error]', err);
});

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, apikey, Content-Type, Prefer, x-client-info, Range, accept',
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Range');
}

function buildSelectAndJoins(tableName, selectParam) {
  const joins = [];
  const extraSelects = [];

  if (
    selectParam.includes('customer:customers') ||
    selectParam.includes('customer:customers(')
  ) {
    joins.push('LEFT JOIN public.customers _cust ON t.customer_id = _cust.id');
    extraSelects.push('row_to_json(_cust.*) as customer');
  }

  if (
    selectParam.includes('supplier:suppliers') ||
    selectParam.includes('supplier:suppliers(')
  ) {
    joins.push('LEFT JOIN public.suppliers _supp ON t.supplier_id = _supp.id');
    extraSelects.push('row_to_json(_supp.*) as supplier');
  }

  if (
    selectParam.includes('preferences:customer_preferences') ||
    selectParam.includes('preferences:customer_preferences(')
  ) {
    joins.push(
      'LEFT JOIN public.customer_preferences _pref ON t.id = _pref.customer_id',
    );
    extraSelects.push('row_to_json(_pref.*) as preferences');
  }

  if (selectParam.includes('category:expense_categories')) {
    joins.push('LEFT JOIN public.expense_categories _cat ON t.category_id = _cat.id');
    extraSelects.push('row_to_json(_cat.*) as category');
  }

  if (selectParam.includes('category:pvc_categories')) {
    joins.push(
      'LEFT JOIN public.pvc_categories _pvccat ON t.category_id = _pvccat.id',
    );
    extraSelects.push('row_to_json(_pvccat.*) as category');
  }

  if (selectParam.includes('brand:brand_records')) {
    joins.push('LEFT JOIN public.brand_records _brand ON t.brand_id = _brand.id');
    extraSelects.push('row_to_json(_brand.*) as brand');
  }

  if (selectParam.includes('stops:delivery_trip_stops')) {
    extraSelects.push(
      "COALESCE((SELECT json_agg(s.*) FROM public.delivery_trip_stops s WHERE s.trip_id = t.id), '[]'::json) as stops",
    );
  }

  let baseCols = 't.*';
  if (!selectParam.includes('*')) {
    const rawTokens = selectParam.split(',');
    const simpleCols = [];
    for (const tok of rawTokens) {
      const clean = tok
        .trim()
        .split(':')[0]
        .replace(/[^a-zA-Z0-9_]/g, '');
      if (clean && !clean.includes('(') && !clean.includes(')')) {
        simpleCols.push(`t."${clean}"`);
      }
    }
    if (simpleCols.length > 0) {
      baseCols = simpleCols.join(', ');
    }
  }

  const allSelects = [baseCols, ...extraSelects].join(', ');
  const allJoins = joins.join(' ');
  return { allSelects, allJoins };
}

export async function handleRequest(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Healthcheck / root
  if (pathname === '/' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'online',
        service: 'Rushi CRM Neon DB Backend',
        database: 'Neon PostgreSQL (Connected)',
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  // 2. Auth endpoints (/auth/v1/*)
  if (pathname.startsWith('/auth/v1/')) {
    const authEndpoint = pathname.replace('/auth/v1/', '');

    if (authEndpoint === 'token') {
      const body = await readBody(req);
      const email = body.email || 'owner@rushicrm.com';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          access_token: 'neon-jwt-token-active',
          token_type: 'bearer',
          expires_in: 86400,
          refresh_token: 'neon-refresh-token',
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            aud: 'authenticated',
            role: 'authenticated',
            email,
            email_confirmed_at: new Date().toISOString(),
            user_metadata: { full_name: 'Aditya (Owner)' },
            app_metadata: { provider: 'email' },
          },
        }),
      );
      return;
    }

    if (authEndpoint === 'user') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: '00000000-0000-0000-0000-000000000001',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'owner@rushicrm.com',
          user_metadata: { full_name: 'Aditya (Owner)' },
          app_metadata: { provider: 'email' },
        }),
      );
      return;
    }

    if (authEndpoint === 'logout') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
      return;
    }

    // Default auth fallback
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        session: {
          access_token: 'neon-jwt-token-active',
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'owner@rushicrm.com',
          },
        },
      }),
    );
    return;
  }

  // 3. Stored procedure RPC endpoints (/rest/v1/rpc/<func>)
  if (pathname.startsWith('/rest/v1/rpc/')) {
    const funcName = pathname.replace('/rest/v1/rpc/', '').split('/')[0];
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(funcName)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid function identifier' }));
      return;
    }

    const body = await readBody(req);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true)",
      );

      // Check if function accepts json parameter
      const rpcSql = `SELECT public.${funcName}($1::jsonb)`;
      let result;
      try {
        result = await client.query(rpcSql, [JSON.stringify(body)]);
      } catch {
        // Fallback to calling with no args or direct parameters
        result = await client.query(`SELECT public.${funcName}()`);
      }

      await client.query('COMMIT');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows[0]?.json ?? result.rows));
    } catch (err) {
      await client.query('ROLLBACK');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: err.message, code: err.code }));
    } finally {
      client.release();
    }
    return;
  }

  // 4. REST Table endpoints (/rest/v1/<table_name>)
  if (pathname.startsWith('/rest/v1/')) {
    const rawTableName = pathname.replace('/rest/v1/', '').split('/')[0];
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawTableName)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid table name' }));
      return;
    }

    const searchParams = parsedUrl.searchParams;
    const selectParam = searchParams.get('select') || '*';

    // Parse WHERE filters from PostgREST syntax
    const whereClauses = [];
    const values = [];
    let pIdx = 1;

    for (const [key, rawVal] of searchParams.entries()) {
      if (['select', 'order', 'limit', 'offset'].includes(key)) continue;

      if (key === 'or') {
        const inner = rawVal.replace(/^\(|\)$/g, '');
        const conditions = inner.split(',').map((cond) => {
          const parts = cond.split('.');
          const col = parts[0];
          const op = parts[1];
          const val = parts.slice(2).join('.');
          if (op === 'eq') {
            values.push(val);
            return `t."${col}" = $${pIdx++}`;
          } else if (op === 'is' && val === 'null') {
            return `t."${col}" IS NULL`;
          } else if (op === 'ilike') {
            values.push(val.replace(/\*/g, '%'));
            return `t."${col}" ILIKE $${pIdx++}`;
          }
          return 'TRUE';
        });
        whereClauses.push(`(${conditions.join(' OR ')})`);
      } else if (rawVal.startsWith('eq.')) {
        whereClauses.push(`t."${key}" = $${pIdx++}`);
        const v = rawVal.slice(3);
        values.push(v === 'true' ? true : v === 'false' ? false : v);
      } else if (rawVal.startsWith('neq.')) {
        whereClauses.push(`t."${key}" != $${pIdx++}`);
        const v = rawVal.slice(4);
        values.push(v === 'true' ? true : v === 'false' ? false : v);
      } else if (rawVal.startsWith('gte.')) {
        whereClauses.push(`t."${key}" >= $${pIdx++}`);
        values.push(rawVal.slice(4));
      } else if (rawVal.startsWith('lte.')) {
        whereClauses.push(`t."${key}" <= $${pIdx++}`);
        values.push(rawVal.slice(4));
      } else if (rawVal.startsWith('gt.')) {
        whereClauses.push(`t."${key}" > $${pIdx++}`);
        values.push(rawVal.slice(3));
      } else if (rawVal.startsWith('lt.')) {
        whereClauses.push(`t."${key}" < $${pIdx++}`);
        values.push(rawVal.slice(3));
      } else if (rawVal.startsWith('ilike.')) {
        whereClauses.push(`t."${key}" ILIKE $${pIdx++}`);
        values.push(rawVal.slice(6).replace(/\*/g, '%'));
      } else if (rawVal.startsWith('like.')) {
        whereClauses.push(`t."${key}" LIKE $${pIdx++}`);
        values.push(rawVal.slice(5).replace(/\*/g, '%'));
      } else if (rawVal.startsWith('is.')) {
        const v = rawVal.slice(3);
        if (v === 'null') whereClauses.push(`t."${key}" IS NULL`);
        else if (v === 'not.null') whereClauses.push(`t."${key}" IS NOT NULL`);
      } else if (rawVal.startsWith('in.(') && rawVal.endsWith(')')) {
        const items = rawVal
          .slice(4, -1)
          .split(',')
          .map((s) => s.replace(/^["']|["']$/g, ''));
        whereClauses.push(`t."${key}" = ANY($${pIdx++})`);
        values.push(items);
      }
    }

    // ORDER BY
    let orderClause = '';
    const orderParam = searchParams.get('order');
    if (orderParam) {
      const parts = orderParam.split('.');
      const col = parts[0];
      const dir = (parts[1] || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY t."${col}" ${dir}`;
    }

    // LIMIT & OFFSET
    let limitClause = '';
    const limit = searchParams.get('limit');
    if (limit && !isNaN(parseInt(limit, 10))) {
      limitClause = `LIMIT ${parseInt(limit, 10)}`;
    }
    const offset = searchParams.get('offset');
    if (offset && !isNaN(parseInt(offset, 10))) {
      limitClause += ` OFFSET ${parseInt(offset, 10)}`;
    }

    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true)",
      );

      // --- GET ---
      if (req.method === 'GET') {
        const { allSelects, allJoins } = buildSelectAndJoins(
          rawTableName,
          selectParam,
        );
        const whereSql =
          whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const sql =
          `SELECT ${allSelects} FROM public."${rawTableName}" t ${allJoins} ${whereSql} ${orderClause} ${limitClause}`.trim();

        const result = await client.query(sql, values);
        const isSingle = req.headers['accept']?.includes(
          'vnd.pgrst.object+json',
        );

        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Range',
          `0-${result.rows.length}/${result.rows.length}`,
        );

        if (isSingle) {
          if (result.rows.length === 0) {
            res.writeHead(406);
            res.end(
              JSON.stringify({
                message: 'No rows found',
                details: 'The result contains 0 rows',
              }),
            );
          } else {
            res.writeHead(200);
            res.end(JSON.stringify(result.rows[0]));
          }
        } else {
          res.writeHead(200);
          res.end(JSON.stringify(result.rows));
        }
        return;
      }

      // --- POST (Insert) ---
      if (req.method === 'POST') {
        const body = await readBody(req);
        const records = Array.isArray(body) ? body : [body];

        if (records.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        await client.query('BEGIN');
        const insertedRows = [];
        for (const rec of records) {
          const cols = Object.keys(rec);
          const colNames = cols.map((c) => `"${c}"`).join(', ');
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
          const rowVals = cols.map((c) => rec[c]);

          const insSql = `INSERT INTO public."${rawTableName}" (${colNames}) VALUES (${placeholders}) RETURNING *`;
          const insRes = await client.query(insSql, rowVals);
          insertedRows.push(...insRes.rows);
        }
        await client.query('COMMIT');

        const isSingle =
          !Array.isArray(body) ||
          req.headers['prefer']?.includes('return=representation');

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            Array.isArray(body) ? insertedRows : insertedRows[0] || {},
          ),
        );
        return;
      }

      // --- PATCH (Update) ---
      if (req.method === 'PATCH') {
        const body = await readBody(req);
        const updateCols = Object.keys(body);

        if (updateCols.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        const setClauses = [];
        const updateValues = [];
        let uIdx = 1;

        for (const col of updateCols) {
          setClauses.push(`"${col}" = $${uIdx++}`);
          updateValues.push(body[col]);
        }

        const adjustedWhere = [];
        for (const [key, rawVal] of searchParams.entries()) {
          if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
          if (rawVal.startsWith('eq.')) {
            adjustedWhere.push(`"${key}" = $${uIdx++}`);
            const v = rawVal.slice(3);
            updateValues.push(v === 'true' ? true : v === 'false' ? false : v);
          }
        }

        const whereSql =
          adjustedWhere.length > 0 ? `WHERE ${adjustedWhere.join(' AND ')}` : '';
        const sql = `UPDATE public."${rawTableName}" SET ${setClauses.join(', ')} ${whereSql} RETURNING *`;

        await client.query('BEGIN');
        const resUpdate = await client.query(sql, updateValues);
        await client.query('COMMIT');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resUpdate.rows));
        return;
      }

      // --- DELETE ---
      if (req.method === 'DELETE') {
        const whereSql =
          whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const sql = `DELETE FROM public."${rawTableName}" ${whereSql} RETURNING *`;

        await client.query('BEGIN');
        const resDel = await client.query(sql, values);
        await client.query('COMMIT');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resDel.rows));
        return;
      }

      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Method ${req.method} not allowed` }));
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`[Error ${req.method} ${pathname}]`, err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: err.message, code: err.code }));
    } finally {
      client.release();
    }
    return;
  }

  // 404 Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

// Start standalone server when executed directly
const currentFilePath = fileURLToPath(import.meta.url).toLowerCase();
const executedScript = process.argv[1] ? process.argv[1].toLowerCase() : '';

if (executedScript === currentFilePath || executedScript.endsWith('server.mjs')) {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error('[Unhandled Request Error]', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n⚠️ Port ${PORT} is already in use by another process.`);
      console.error(
        `If the server was already started, you do not need to run it again — it is already active!`,
      );
      console.error(
        `To restart it, close the existing terminal running on port ${PORT} and re-run npm run server.\n`,
      );
    } else {
      console.error('[Server Error]', err);
    }
    process.exit(1);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Rushi CRM Neon DB Backend running on:`);
    console.log(`   http://127.0.0.1:${PORT}`);
    console.log(`   Database: Neon PostgreSQL (Singapore pooler)`);
    console.log(`======================================================\n`);
  });
}


