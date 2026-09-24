const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetZip = path.resolve(__dirname, 'navaldocspro-billing-review.zip');
const stageDir = path.resolve(__dirname, 'billing-review-package');

if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}

fs.mkdirSync(stageDir, { recursive: true });

const filesToCopy = [
  { src: 'supabase/migrations/20260924140000_admin_coupons_campaigns.sql', dest: 'migrations/20260924140000_admin_coupons_campaigns.sql' },
  { src: 'supabase/functions/stripe-checkout/index.ts', dest: 'functions/stripe-checkout/index.ts' },
  { src: 'supabase/functions/stripe-webhook/index.ts', dest: 'functions/stripe-webhook/index.ts' },
  { src: 'supabase/functions/stripe-portal/index.ts', dest: 'functions/stripe-portal/index.ts' },
  { src: 'supabase/functions/stripe-sync-plans/index.ts', dest: 'functions/stripe-sync-plans/index.ts' },
  { src: 'supabase/functions/_shared/stripe-client.ts', dest: 'functions/_shared/stripe-client.ts' },
  { src: 'supabase/functions/_shared/stripe-plans.ts', dest: 'functions/_shared/stripe-plans.ts' },
  { src: 'supabase/functions/_shared/auth.ts', dest: 'functions/_shared/auth.ts' },
  { src: 'src/services/billing/couponService.ts', dest: 'services/billing/couponService.ts' },
  { src: 'src/services/billing/domainUtils.ts', dest: 'services/billing/domainUtils.ts' },
  { src: 'src/__tests__/billing/postgres-coupons-rpc.test.ts', dest: 'tests/billing/postgres-coupons-rpc.test.ts' },
  { src: 'src/__tests__/billing/stripe-campaigns-and-trial.test.ts', dest: 'tests/billing/stripe-campaigns-and-trial.test.ts' },
];

for (const f of filesToCopy) {
  const fullSrc = path.resolve(__dirname, f.src);
  const fullDest = path.resolve(stageDir, f.dest);
  fs.mkdirSync(path.dirname(fullDest), { recursive: true });
  fs.copyFileSync(fullSrc, fullDest);
}

if (fs.existsSync(targetZip)) {
  fs.unlinkSync(targetZip);
}

// Compress using powershell Compress-Archive
execSync(`powershell -Command "Compress-Archive -Path '${stageDir}/*' -DestinationPath '${targetZip}' -Force"`);

fs.rmSync(stageDir, { recursive: true, force: true });

const stat = fs.statSync(targetZip);
console.log(`ZIP created successfully: ${targetZip} (${stat.size} bytes)`);
