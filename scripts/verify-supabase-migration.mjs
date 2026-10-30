#!/usr/bin/env node

/**
 * Compare exposed table row counts across two Supabase sources and a target.
 * Credentials are read from environment variables and are never printed.
 *
 * Required variables:
 *   SOURCE_A_URL, SOURCE_A_KEY
 *   SOURCE_B_URL, SOURCE_B_KEY
 *   TARGET_URL, TARGET_SERVICE_ROLE_KEY
 *
 * Optional:
 *   TABLES=table_a,table_b   # restrict the verification set
 */

const projects = {
  "Source A": {
    url: process.env.SOURCE_A_URL,
    key: process.env.SOURCE_A_KEY,
  },
  "Source B": {
    url: process.env.SOURCE_B_URL,
    key: process.env.SOURCE_B_KEY,
  },
  Target: {
    url: process.env.TARGET_URL,
    key: process.env.TARGET_SERVICE_ROLE_KEY,
  },
}

for (const [name, project] of Object.entries(projects)) {
  if (!project.url || !project.key) {
    throw new Error(`${name} is missing its URL or key environment variable.`)
  }
}

function apiUrl(project, path) {
  return `${project.url.replace(/\/$/, "")}${path}`
}

async function request(project, path, options = {}) {
  const response = await fetch(apiUrl(project, path), {
    ...options,
    headers: {
      apikey: project.key,
      Authorization: `Bearer ${project.key}`,
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 300)}`)
  }

  return response
}

async function discoverTables(project) {
  const response = await request(project, "/rest/v1/")
  const openApi = await response.json()
  const definitions = openApi.definitions ?? {}
  return Object.keys(definitions)
    .filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
    .sort()
}

async function countRows(project, table) {
  const response = await request(
    project,
    `/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`,
    { headers: { Prefer: "count=exact" } },
  )
  const contentRange = response.headers.get("content-range")
  const match = contentRange?.match(/\/(\d+|\*)$/)
  if (!match || match[1] === "*") {
    throw new Error(`Supabase did not return an exact count for ${table}.`)
  }
  return Number(match[1])
}

function statusFor(sourceA, sourceB, target) {
  const expected = sourceA + sourceB
  if (target === expected) return "OK"
  if (target < expected) return "MISSING"
  return "EXTRA"
}

function format(value, width) {
  return String(value).padEnd(width)
}

async function main() {
  const explicitTables = process.env.TABLES
    ?.split(",")
    .map((table) => table.trim())
    .filter(Boolean)

  const [sourceATables, sourceBTables, targetTables] = await Promise.all(
    Object.values(projects).map(discoverTables),
  )
  const available = new Set([...sourceATables, ...sourceBTables, ...targetTables])
  const tables = explicitTables ?? [...available].sort()

  if (tables.length === 0) {
    throw new Error("No exposed tables were discovered. Check Data API exposure and credentials.")
  }

  const rows = []
  for (const table of tables) {
    const counts = await Promise.all(
      Object.values(projects).map(async (project) => {
        try {
          return await countRows(project, table)
        } catch (error) {
          if (error.message.startsWith("404")) return null
          throw new Error(`${table}: ${error.message}`)
        }
      }),
    )
    const [sourceA, sourceB, target] = counts
    rows.push({ table, sourceA, sourceB, target, status: sourceA == null || sourceB == null || target == null ? "NOT EXPOSED" : statusFor(sourceA, sourceB, target) })
  }

  const widths = {
    table: Math.max(5, ...rows.map((row) => row.table.length)),
    sourceA: 9,
    sourceB: 9,
    target: 9,
    status: 11,
  }
  const header = [format("Table", widths.table), format("Source A", widths.sourceA), format("Source B", widths.sourceB), format("Target", widths.target), format("Status", widths.status)].join(" | ")
  console.log(header)
  console.log("-".repeat(header.length))
  for (const row of rows) {
    console.log([format(row.table, widths.table), format(row.sourceA ?? "—", widths.sourceA), format(row.sourceB ?? "—", widths.sourceB), format(row.target ?? "—", widths.target), format(row.status, widths.status)].join(" | "))
  }

  const discrepancies = rows.filter((row) => row.status !== "OK")
  console.log(`\nChecked ${rows.length} tables. ${rows.length - discrepancies.length} OK, ${discrepancies.length} requiring review.`)
  if (discrepancies.length > 0) process.exitCode = 2
}

main().catch((error) => {
  console.error(`Verification failed: ${error.message}`)
  process.exitCode = 1
})
