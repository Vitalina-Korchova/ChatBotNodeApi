export interface WeatherNlpResult {
  intent: 'weather';
  city: string | null;
}

export interface CurrencyNlpResult {
  intent: 'currency';
  from: string | null;
  to: string | null;
}

export interface UnknownNlpResult {
  intent: 'unknown';
}

export type NlpResult = WeatherNlpResult | CurrencyNlpResult | UnknownNlpResult;
