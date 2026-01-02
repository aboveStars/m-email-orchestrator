#!/usr/bin/env node

import 'dotenv/config';
import { readFileSync } from 'fs';
import { EmailSchema } from './types/email.js';
import { masterOrchestrator } from './orchestrator/master.js';

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
📧 Email Orchestrator CLI

Usage:
  npm run process-email -- --file <path-to-email.json>
  npm run process-email -- --stdin

Options:
  --file <path>   Path to JSON file containing email
  --stdin         Read email JSON from stdin
  --help          Show this help message

Example email JSON:
{
  "email": {
    "from": "john@acme.com",
    "subject": "Q4 Review Meeting - Tuesday 3pm",
    "body": "Hi team, let's meet Tuesday at 3pm in Room 204.",
    "attachments": ["q4-report.pdf"]
  }
}
  `);
}

async function main() {
  if (args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  let inputJson: string;

  if (args.includes('--file')) {
    const fileIndex = args.indexOf('--file') + 1;
    if (fileIndex >= args.length) {
      console.error('Error: --file requires a path argument');
      process.exit(1);
    }
    const filePath = args[fileIndex];
    try {
      inputJson = readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file: ${filePath}`);
      process.exit(1);
    }
  } else if (args.includes('--stdin')) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    inputJson = Buffer.concat(chunks).toString('utf-8');
  } else {
    console.error('Error: Please specify --file or --stdin');
    printUsage();
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(inputJson);
    const email = parsed.email || parsed;
    
    const validationResult = EmailSchema.safeParse(email);
    if (!validationResult.success) {
      console.error('Invalid email format:', validationResult.error.message);
      process.exit(1);
    }

    console.log('━'.repeat(60));
    const result = await masterOrchestrator.processEmail(validationResult.data);
    console.log('━'.repeat(60));
    
    console.log('\n📊 Orchestration Result:\n');
    console.log(JSON.stringify({ orchestration_result: result }, null, 2));
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
