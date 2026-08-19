import { readFile } from 'fs/promises';
import path from 'path';

const outputDir = path.join(process.cwd(), 'proposal_output');
const migrationsDir = path.join(process.cwd(), 'Migrations');

// Every tenant (ProposalMonitor's own default "" prefix, "pathways_" for
// Pathways Technologies) reads and writes the same filenames, just prefixed,
// so the file-handling logic below only needs to be written once.
export function tenantPaths(prefix = '') {
  return {
    results: path.join(outputDir, `${prefix}proposals.json`),
    workbook: path.join(outputDir, `${prefix}proposals.xlsx`),
    history: path.join(outputDir, `${prefix}previous_opportunities.json`),
    config: path.join(outputDir, `${prefix}proposal_source.json`),
    configTemplate: path.join(migrationsDir, `${prefix}proposal_source.json`),
    intake: path.join(outputDir, `${prefix}pending_source_intake.json`),
    intakeTemplate: path.join(migrationsDir, `${prefix}pending_source_intake.json`),
    analysis: path.join(outputDir, `${prefix}one_off_analysis_links.json`),
  };
}

function nairobiDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function isActiveProposal(proposal, today) {
  const dueDate = proposal?.due_date;
  return !/^\d{4}-\d{2}-\d{2}$/.test(dueDate || '') || dueDate >= today;
}

export async function readConfig(prefix = '') {
  const { config, configTemplate } = tenantPaths(prefix);
  return readFile(config, 'utf8').then(JSON.parse)
    .catch(() => readFile(configTemplate, 'utf8').then(JSON.parse).catch(() => ({})));
}

export async function readResults(prefix = '') {
  const { results } = tenantPaths(prefix);
  try {
    const [data, config] = await Promise.all([
      readFile(results, 'utf8').then(JSON.parse),
      readConfig(prefix),
    ]);
    const proposals = (data.proposals || []).filter((proposal) => isActiveProposal(proposal, nairobiDate()));
    return { ...data, count: proposals.length, proposals, keywords: config.keywords || [] };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const config = await readConfig(prefix);
    return { generated_at: null, count: 0, proposals: [], keywords: config.keywords || [] };
  }
}

export async function readHistory(prefix = '') {
  const { history } = tenantPaths(prefix);
  try {
    return JSON.parse(await readFile(history, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { generated_at: null, count: 0, proposals: [] };
  }
}

export async function readWorkbook(prefix = '') {
  const { workbook } = tenantPaths(prefix);
  return readFile(workbook);
}
