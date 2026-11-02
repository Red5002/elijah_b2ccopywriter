export type ExchangeRateSnapshot = {
  rate: string;
  source: "CBN NFEM";
  effectiveDate: string;
};

export class ExchangeRateUnavailableError extends Error {
  constructor(message = "NGN checkout is unavailable until a current CBN NFEM rate is recorded.") {
    super(message);
    this.name = "ExchangeRateUnavailableError";
  }
}
