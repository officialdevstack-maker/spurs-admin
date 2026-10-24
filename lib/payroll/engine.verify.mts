/**
 * Regression check for the payroll engine. Run it after ANY change to the tax
 * bands or contribution rates:
 *
 *   npx tsx lib/payroll/engine.verify.mts
 *
 * It asserts the band walk, the tax-free threshold, that pension is charged on
 * basic+housing+transport rather than gross, the rent-relief cap, exemptions,
 * the net-can-never-go-negative clamp, and that every figure stays integer kobo.
 */
import { computePay, annualTax, naira, DEFAULT_CONFIG } from "./engine";

const N = (amount: number) => amount * 100; // ₦ → kobo

console.log("=== Band walk: is the tax split correctly across bands? ===");
// ₦5,000,000 taxable: 800k@0 + 2.2m@15% + 2m@18%
const t = annualTax(N(5_000_000));
for (const b of t.bands) {
  console.log(`  ${(b.rate * 100).toString().padStart(2)}% → ${naira(b.taxMinor)}`);
}
const expected = 0 + 2_200_000 * 0.15 + 2_000_000 * 0.18;
console.log("  total:", naira(t.taxMinor), "| expected:", naira(N(expected)),
  t.taxMinor === N(expected) ? "✓" : "✗ MISMATCH");

console.log("\n=== Low earner below the threshold pays no tax ===");
const junior = computePay({ monthlyGrossMinor: N(60_000) });
console.log("  gross/mo:", naira(junior.grossMinor));
console.log("  annual taxable:", naira(junior.breakdown.taxableIncomeMinor));
console.log("  PAYE/mo:", naira(junior.payeMinor), junior.payeMinor === 0 ? "✓ exempt" : "✗ should be 0");
console.log("  pension (8%):", naira(junior.pensionEmployeeMinor));
console.log("  net:", naira(junior.netMinor));

console.log("\n=== Mid earner, ₦400,000/mo + allowances ===");
const mid = computePay({
  monthlyGrossMinor: N(400_000),
  allowances: { transport: N(30_000), data: N(15_000) },
});
console.log("  basic/housing/transport:", naira(mid.basicMinor), naira(mid.housingMinor), naira(mid.transportMinor));
console.log("  gross incl. allowances:", naira(mid.grossMinor));
console.log("  pension employee (8%):", naira(mid.pensionEmployeeMinor));
console.log("  pension employer (10%):", naira(mid.pensionEmployerMinor), "← company cost, not deducted");
console.log("  PAYE/mo:", naira(mid.payeMinor));
console.log("  net:", naira(mid.netMinor));
console.log("  employer total cost:", naira(mid.employerCostMinor));

console.log("\n  identity check: gross - deductions == net");
const lhs = mid.grossMinor - mid.totalDeductionsMinor;
console.log("   ", naira(lhs), "==", naira(mid.netMinor), lhs === mid.netMinor ? "✓" : "✗");

console.log("\n=== Pension is charged on basic+housing+transport, not gross ===");
console.log("  pensionable:", naira(mid.pensionableMinor),
  "= 80% of base gross:", naira(N(400_000) * 0.8),
  mid.pensionableMinor === Math.round(N(400_000) * 0.8) ? "✓" : "✗");

console.log("\n=== Rent relief caps at ₦500,000 ===");
const noRent = computePay({ monthlyGrossMinor: N(1_000_000) });
const bigRent = computePay({ monthlyGrossMinor: N(1_000_000), annualRentMinor: N(10_000_000) });
console.log("  relief with ₦10m rent:", naira(bigRent.breakdown.rentReliefMinor),
  bigRent.breakdown.rentReliefMinor === DEFAULT_CONFIG.rentReliefCapMinor ? "✓ capped" : "✗");
console.log("  PAYE without rent:", naira(noRent.payeMinor), "| with rent:", naira(bigRent.payeMinor),
  bigRent.payeMinor < noRent.payeMinor ? "✓ lower" : "✗");

console.log("\n=== Exemptions honoured ===");
const exempt = computePay({ monthlyGrossMinor: N(400_000), pensionExempt: true, nhfExempt: true });
console.log("  pension:", naira(exempt.pensionEmployeeMinor), exempt.pensionEmployeeMinor === 0 ? "✓" : "✗");
console.log("  NHF:", naira(exempt.nhfMinor), exempt.nhfMinor === 0 ? "✓" : "✗");

console.log("\n=== NHF is 2.5% of basic when opted in ===");
const nhf = computePay({ monthlyGrossMinor: N(400_000), nhfExempt: false });
console.log("  NHF:", naira(nhf.nhfMinor), "= 2.5% of", naira(nhf.basicMinor),
  nhf.nhfMinor === Math.round(nhf.basicMinor * 0.025) ? "✓" : "✗");

console.log("\n=== An advance repayment can't push net below zero ===");
const clamped = computePay({
  monthlyGrossMinor: N(100_000),
  otherDeductions: { advance: N(500_000) },
});
console.log("  net:", naira(clamped.netMinor), clamped.netMinor === 0 ? "✓ clamped at zero" : "✗ NEGATIVE");

console.log("\n=== Everything stays integer kobo ===");
const all = [junior, mid, bigRent, nhf].flatMap((p) => [
  p.grossMinor, p.payeMinor, p.pensionEmployeeMinor, p.nhfMinor, p.netMinor,
]);
console.log("  non-integer values:", all.filter((v) => !Number.isInteger(v)).length === 0 ? "none ✓" : "FOUND ✗");
