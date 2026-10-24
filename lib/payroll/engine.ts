/**
 * Nigerian payroll — our own engine, not a third-party service.
 *
 * ── Read this before trusting a number ──────────────────────────────────────
 * Tax law moves, and it moved recently: the Nigeria Tax Act 2025 replaced the
 * old Consolidated Relief Allowance regime from January 2026. Every rate and
 * band below is therefore **data with a default**, editable in admin without a
 * deploy — the same rule the platform applies to gift card rates.
 *
 * The arithmetic here is deterministic and tested. The *statutory figures* are
 * my best understanding and must be confirmed with your accountant before a
 * real payroll run. If a band is wrong, correct it in Settings; nothing here
 * hardcodes it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Money is integer kobo throughout. Never floats: a rounding drift of one kobo
 * per person per month becomes a reconciliation problem nobody can find.
 *
 * Pure functions, no imports — so this is unit-testable and safe on the client
 * for previewing a package before anyone is hired.
 */

/** A slice of income taxed at one rate. `upToMinor: null` means "everything above". */
export interface TaxBand {
  upToMinor: number | null;
  rate: number;
}

export interface PayrollConfig {
  /** Annual PAYE bands, applied in order to taxable income. */
  bands: TaxBand[];
  /** Employee pension contribution, as a percentage of pensionable pay. */
  pensionEmployeePct: number;
  /** Employer's share — a company cost, never deducted from the employee. */
  pensionEmployerPct: number;
  /** National Housing Fund, as a percentage of basic salary. */
  nhfPct: number;
  /**
   * Rent relief: a percentage of annual rent, capped. Replaced the old CRA.
   * Only applies when the employee has declared rent.
   */
  rentReliefPct: number;
  rentReliefCapMinor: number;
  /** Income below this pays no tax at all. */
  taxFreeThresholdMinor: number;
  /**
   * Share of gross treated as basic salary. Pension and NHF are computed on
   * basic + housing + transport; where a package isn't itemised, this is the
   * split we assume.
   */
  basicPctOfGross: number;
  housingPctOfGross: number;
  transportPctOfGross: number;
}

/**
 * Defaults reflecting the Nigeria Tax Act 2025 regime (effective January 2026)
 * plus the Pension Reform Act 2014 contribution rates.
 *
 * CONFIRM THESE WITH AN ACCOUNTANT before running real payroll.
 */
export const DEFAULT_CONFIG: PayrollConfig = {
  // Annual bands, in kobo. First ₦800,000 is exempt.
  bands: [
    { upToMinor: 80_000_000, rate: 0 },        // first ₦800,000
    { upToMinor: 300_000_000, rate: 0.15 },    // next ₦2,200,000
    { upToMinor: 1_200_000_000, rate: 0.18 },  // next ₦9,000,000
    { upToMinor: 2_500_000_000, rate: 0.21 },  // next ₦13,000,000
    { upToMinor: 5_000_000_000, rate: 0.23 },  // next ₦25,000,000
    { upToMinor: null, rate: 0.25 },           // above ₦50,000,000
  ],
  pensionEmployeePct: 8,
  pensionEmployerPct: 10,
  nhfPct: 2.5,
  rentReliefPct: 20,
  rentReliefCapMinor: 50_000_000,              // ₦500,000
  taxFreeThresholdMinor: 80_000_000,           // ₦800,000/yr
  basicPctOfGross: 40,
  housingPctOfGross: 20,
  transportPctOfGross: 20,
};

export interface PayInput {
  /** Monthly gross in kobo, before allowances. */
  monthlyGrossMinor: number;
  /** Recurring monthly allowances in kobo, e.g. { transport, data }. */
  allowances?: Record<string, number>;
  pensionExempt?: boolean;
  nhfExempt?: boolean;
  /** Annual rent in kobo, if declared — unlocks rent relief. */
  annualRentMinor?: number;
  /** Anything else withheld this month: advance repayments, loans, fines. */
  otherDeductions?: Record<string, number>;
}

export interface Payslip {
  basicMinor: number;
  housingMinor: number;
  transportMinor: number;
  allowances: Record<string, number>;
  allowancesTotalMinor: number;
  grossMinor: number;

  pensionableMinor: number;
  pensionEmployeeMinor: number;
  pensionEmployerMinor: number;
  nhfMinor: number;
  payeMinor: number;
  otherDeductions: Record<string, number>;
  otherDeductionsTotalMinor: number;

  totalDeductionsMinor: number;
  netMinor: number;
  /** What this person costs the company: gross plus the employer's pension. */
  employerCostMinor: number;

  /** How the tax was reached, so a payslip can be explained line by line. */
  breakdown: {
    annualGrossMinor: number;
    taxExemptDeductionsMinor: number;
    rentReliefMinor: number;
    taxableIncomeMinor: number;
    annualTaxMinor: number;
    bands: { fromMinor: number; toMinor: number | null; rate: number; taxMinor: number }[];
  };
}

/** Round half-up to the nearest kobo. Everything internal stays integer. */
const round = (n: number) => Math.round(n);

const sum = (record: Record<string, number> = {}) =>
  Object.values(record).reduce((total, value) => total + (Number(value) || 0), 0);

/**
 * Annual PAYE on a taxable income, walked band by band.
 * Returns the tax plus the per-band detail, because a payslip nobody can
 * explain is a payslip nobody trusts.
 */
export function annualTax(taxableMinor: number, config: PayrollConfig = DEFAULT_CONFIG) {
  const bands: Payslip["breakdown"]["bands"] = [];
  let remaining = Math.max(0, taxableMinor);
  let previousCeiling = 0;
  let tax = 0;

  for (const band of config.bands) {
    if (remaining <= 0) break;

    const width = band.upToMinor === null ? remaining : band.upToMinor - previousCeiling;
    const slice = Math.min(remaining, Math.max(0, width));
    const bandTax = round(slice * band.rate);

    if (slice > 0) {
      bands.push({ fromMinor: previousCeiling, toMinor: band.upToMinor, rate: band.rate, taxMinor: bandTax });
      tax += bandTax;
      remaining -= slice;
    }
    if (band.upToMinor !== null) previousCeiling = band.upToMinor;
  }

  return { taxMinor: tax, bands };
}

/**
 * Work out one person's pay for one month.
 *
 * Order matters and follows the statute: pension and NHF come off first (they
 * are tax-exempt), rent relief is applied, and PAYE is charged on what remains.
 * Computing tax on the full gross would overtax everyone.
 */
export function computePay(input: PayInput, config: PayrollConfig = DEFAULT_CONFIG): Payslip {
  const gross = Math.max(0, round(input.monthlyGrossMinor));
  const allowances = input.allowances ?? {};
  const allowancesTotal = round(sum(allowances));
  const totalGross = gross + allowancesTotal;

  // The statutory split. Pension is charged on basic + housing + transport.
  const basic = round((gross * config.basicPctOfGross) / 100);
  const housing = round((gross * config.housingPctOfGross) / 100);
  const transport = round((gross * config.transportPctOfGross) / 100);
  const pensionable = basic + housing + transport;

  const pensionEmployee = input.pensionExempt
    ? 0
    : round((pensionable * config.pensionEmployeePct) / 100);
  const pensionEmployer = input.pensionExempt
    ? 0
    : round((pensionable * config.pensionEmployerPct) / 100);

  const nhf = input.nhfExempt ? 0 : round((basic * config.nhfPct) / 100);

  // PAYE is assessed annually, then spread across twelve months.
  const annualGross = totalGross * 12;
  const taxExempt = (pensionEmployee + nhf) * 12;

  const rentRelief = input.annualRentMinor
    ? Math.min(round((input.annualRentMinor * config.rentReliefPct) / 100), config.rentReliefCapMinor)
    : 0;

  const taxable = Math.max(0, annualGross - taxExempt - rentRelief);

  // Below the threshold, no tax at all — not a token amount.
  const { taxMinor: annualPaye, bands } =
    taxable <= config.taxFreeThresholdMinor
      ? { taxMinor: 0, bands: [] as Payslip["breakdown"]["bands"] }
      : annualTax(taxable, config);

  const paye = round(annualPaye / 12);

  const otherDeductions = input.otherDeductions ?? {};
  const otherTotal = round(sum(otherDeductions));

  const totalDeductions = pensionEmployee + nhf + paye + otherTotal;
  // Never hand back a negative payslip: an advance repayment bigger than the
  // month's pay is a scheduling mistake, and taking more than someone earns
  // would be worse than carrying it.
  const net = Math.max(0, totalGross - totalDeductions);

  return {
    basicMinor: basic,
    housingMinor: housing,
    transportMinor: transport,
    allowances,
    allowancesTotalMinor: allowancesTotal,
    grossMinor: totalGross,

    pensionableMinor: pensionable,
    pensionEmployeeMinor: pensionEmployee,
    pensionEmployerMinor: pensionEmployer,
    nhfMinor: nhf,
    payeMinor: paye,
    otherDeductions,
    otherDeductionsTotalMinor: otherTotal,

    totalDeductionsMinor: totalDeductions,
    netMinor: net,
    employerCostMinor: totalGross + pensionEmployer,

    breakdown: {
      annualGrossMinor: annualGross,
      taxExemptDeductionsMinor: taxExempt,
      rentReliefMinor: rentRelief,
      taxableIncomeMinor: taxable,
      annualTaxMinor: annualPaye,
      bands,
    },
  };
}

/** Hourly staff: pay is hours worked, then the same deductions apply. */
export function computeHourlyPay(
  hourlyRateMinor: number,
  minutesWorked: number,
  input: Omit<PayInput, "monthlyGrossMinor"> = {},
  config: PayrollConfig = DEFAULT_CONFIG,
): Payslip {
  const monthlyGross = round((hourlyRateMinor * minutesWorked) / 60);
  return computePay({ ...input, monthlyGrossMinor: monthlyGross }, config);
}

export const naira = (minor: number) => {
  const negative = minor < 0;
  const digits = Math.abs(round(minor)).toString().padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}₦${whole}.${digits.slice(-2)}`;
};
