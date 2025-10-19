// src/requests/WeatherApiClient.ts
import { request, APIRequestContext } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const GEOCODING_BASE = process.env.GEOCODING_BASE || 'https://geocoding-api.open-meteo.com/v1';
const FORECAST_BASE = process.env.FORECAST_BASE || 'https://api.open-meteo.com/v1';

// NOTE: If your geocoding endpoint requires the exact param name `country_Code` (capital C) you can set
// process.env.GEOCODING_COUNTRY_PARAM = 'country_Code' in your .env — default is 'country_code'.
const GEOCODING_COUNTRY_PARAM = process.env.GEOCODING_COUNTRY_PARAM || 'country_code';

export class WeatherApiClient {
  private ctx: APIRequestContext | null = null;

  // create or return existing Playwright APIRequestContext
  async ensureContext() {
    if (!this.ctx) {
      // useful to allow environment overrides in CI
      const opts: any = { ignoreHTTPSErrors: true };
      // optional timeout override via env
      if (process.env.PLAYWRIGHT_REQUEST_TIMEOUT) opts.timeout = Number(process.env.PLAYWRIGHT_REQUEST_TIMEOUT);
      this.ctx = await request.newContext(opts);
    }
    return this.ctx;
  }

  // Graceful disposal for CI / process cleanup
  async dispose() {
    if (this.ctx) {
      await this.ctx.dispose();
      this.ctx = null;
    }
  }

  // Geocoding: returns parsed JSON or throws
  async geocode(name: string, countryCode?: string) {
    const ctx = await this.ensureContext();

    if (!name) throw new Error('geocode: name is required');

    const params = new URLSearchParams({
      name: String(name),
      count: '1',
      language: 'en',
      format: 'json'
    });

    if (countryCode) {
      // allow overriding the param key name via env if needed
      params.set(GEOCODING_COUNTRY_PARAM, String(countryCode));
    }

    const url = `${GEOCODING_BASE}/search?${params.toString()}`;
    const res = await ctx.get(url);
    if (!res.ok()) {
      const text = await res.text().catch(() => '');
      throw new Error(`Geocoding request failed (${res.status()}): ${text}`);
    }
    return await res.json();
  }

  // Forecast: includes the new hourly variables and timezone=auto
  async getForecast(latitude: number | string, longitude: number | string) {
    const ctx = await this.ensureContext();

    // basic numeric coercion & validation
    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      throw new Error('getForecast: latitude and longitude must be numbers');
    }

    // Compose hourly list (update here to add/remove variables)
    const hourlyVars = [
      'temperature_2m',
      'visibility',
      'wind_speed_10m',
      'wind_direction_10m',   // keep if you need direction
      'cloud_cover',
      'precipitation',
      'snowfall',             // newly added
      'cloud_cover_low',      // newly added
      'wind_gusts_10m'        // newly added
    ].join(',');

    const params = new URLSearchParams({
      latitude: String(latNum),
      longitude: String(lonNum),
      hourly: hourlyVars,
      timezone: 'auto' // return times in local timezone for the coordinates
    });

    const url = `${FORECAST_BASE}/forecast?${params.toString()}`;
    const res = await ctx.get(url);
    if (!res.ok()) {
      const text = await res.text().catch(() => '');
      throw new Error(`Forecast request failed (${res.status()}): ${text}`);
    }
    return await res.json();
  }
}
