export interface TranslateRequest {
  q: string;
  target: string;
}

export interface TranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage: string;
    }>;
  };
}
