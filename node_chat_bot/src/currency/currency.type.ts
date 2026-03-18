export interface CurrencyApiResponse {
  data: Record<string, number>;
}

export interface FormattedCurrencyResponse {
  base: string;
  rates: Record<string, number>;
}
