export type ForecastResponse = {
    latitude: number;
    longitude: number;
    generationtime_ms?: number;
    utc_offset_seconds?: number;
    timezone?: string;
    timezone_abbreviation?: string;
    elevation?: number;
    hourly: {
      time: string[];
      temperature_2m: number[];
      visibility: number[];
      wind_speed_10m: number[];
      wind_direction_10m: number[];
      cloud_cover: number[];
      precipitation: number[];
    };
  };
  