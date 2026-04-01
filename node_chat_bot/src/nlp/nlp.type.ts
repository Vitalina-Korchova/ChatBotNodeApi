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

export interface ReminderNlpResult {
  intent: 'reminder';
  reminder: {
    datetime: string;
    text: 'string';
  };
}

export interface TranslateNlpResult {
  intent: 'translate';
  translation: {
    target_language: string;
    language_code: string;
    text: string;
  };
}

export type NlpResult =
  | WeatherNlpResult
  | CurrencyNlpResult
  | UnknownNlpResult
  | ReminderNlpResult
  | TranslateNlpResult;
