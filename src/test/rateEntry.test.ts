import { describe, expect, it } from "vitest";
import {
  rateInsertErrorMessage,
  validateRateInput,
} from "../../scripts/set-cbn-nfem-rate.mjs";

describe("CBN NFEM rate entry validation", () => {
  const now = new Date("2026-11-02T05:00:00.000Z");

  it("accepts positive decimal rates with up to six decimal places", () => {
    expect(validateRateInput("1500", "2026-11-02", now)).toEqual({
      rate: "1500",
      effectiveDate: "2026-11-02",
    });
    expect(validateRateInput("1500.123456", "2026-11-02", now)).toEqual({
      rate: "1500.123456",
      effectiveDate: "2026-11-02",
    });
  });

  it.each(["0", "0.000000", "-1", "1.1234567", "1e3", ".5", "1."])(
    "rejects invalid rate %s",
    (rate) => {
      expect(validateRateInput(rate, "2026-11-02", now)).toHaveProperty("error");
    },
  );

  it.each(["2026-02-30", "2026-13-01", "not-a-date", "2026-11-03"])(
    "rejects invalid or future effective date %s",
    (effectiveDate) => {
      expect(validateRateInput("1500.25", effectiveDate, now)).toHaveProperty("error");
    },
  );

  it("gives a specific duplicate-date error without exposing service credentials", () => {
    const message = rateInsertErrorMessage({ code: "23505", message: "private details" });

    expect(message).toContain("already recorded for that effective date");
    expect(message).toContain("audited correction procedure");
    expect(message).not.toContain("private details");
    expect(message).not.toContain("service_role");
  });
});
