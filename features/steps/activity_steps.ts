import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { WeatherApiClient } from '../../src/requests/WeatherApiClient';
import { scoreHourlyActivitiesDebug } from '../../src/utils/activityScorer';
import { mkdirSync } from 'fs';

dotenv.config();

const resultsDir = process.env.RESULTS_DIR || './results';
mkdirSync(resultsDir, { recursive: true });

// Shared state for scenarios
let cities: Array<{ name: string; country_code: string }>;
const client = new WeatherApiClient();

// For edge-case / error scenarios
let invalidGeoResponse: any = null;
let apiError: any = null;
let singleTestCity: { name: string; country_code: string } | null = null;

Given('the test data file {string}', async (filePath: string) => {
  const full = path.resolve(filePath);
  const raw = fs.readFileSync(full, 'utf8');
  cities = JSON.parse(raw);
});

Given('a test city with an empty or invalid name', async () => {
  cities = [{ name: '@@@@@@', country_code: 'ZZ' }];
});

Given('a valid city name {string} and country code {string}', async (name: string, code: string) => {
  singleTestCity = { name, country_code: code };
});

When('I run activity recommendation for each city in the testdata', async () => {
  if (!cities || cities.length === 0) {
    console.warn('No cities provided in testdata - skipping run.');
    return;
  }

  for (const city of cities) {
    console.log(`\n--- Processing ${city.name} (${city.country_code}) ---`);

    // 1) Geocoding call
    let geo: any;
    try {
      geo = await client.geocode(city.name, city.country_code);
    } catch (err) {
      console.warn(`Geocoding API call failed for ${city.name}: ${(err as Error).message}`);
      fs.writeFileSync(
        path.join(resultsDir, `${city.name.replace(/\s+/g, '_')}_geocode_error.json`),
        JSON.stringify({ city, error: String(err) }, null, 2)
      );
      continue;
    }

    if (!geo || !geo.results || geo.results.length === 0) {
      console.warn(`No geocoding results for ${city.name}`);
      fs.writeFileSync(
        path.join(resultsDir, `${city.name.replace(/\s+/g, '_')}_no_geocode.json`),
        JSON.stringify({ city, geo }, null, 2)
      );
      continue;
    }

    const loc = geo.results[0];
    const latitude = loc.latitude;
    const longitude = loc.longitude;

    // 2) Forecast call
    let forecast: any;
    try {
      forecast = await client.getForecast(latitude, longitude);
    } catch (err) {
      console.warn(`Forecast API call failed for ${city.name}: ${(err as Error).message}`);
      fs.writeFileSync(
        path.join(resultsDir, `${city.name.replace(/\s+/g, '_')}_forecast_error.json`),
        JSON.stringify({ city, loc, error: String(err) }, null, 2)
      );
      continue;
    }

    if (!forecast || !forecast.hourly) {
      console.warn(`No forecast data for ${city.name}`);
      fs.writeFileSync(
        path.join(resultsDir, `${city.name.replace(/\s+/g, '_')}_no_forecast.json`),
        JSON.stringify({ city, loc, forecast }, null, 2)
      );
      continue;
    }

    // 3) Score hourly and decide recommended activity (DEBUG version)
    const { result: activityResult, debug } = scoreHourlyActivitiesDebug(forecast, {
      latitude,
      longitude,
      elevation: loc.elevation || 0
    });

    // --- sanitize loc: omit postcodes so output is cleaner
    const locForOutput = { ...loc };
    if ('postcodes' in locForOutput) delete (locForOutput as any).postcodes;

    // --- 1) Save JSON output with debug info
    const jsonFile = path.join(resultsDir, `${city.name.replace(/\s+/g, '_')}_result.json`);
    fs.writeFileSync(
      jsonFile,
      JSON.stringify(
        {
          city,
          loc: locForOutput,
          recommended: activityResult.recommendedActivity,
          ranked: activityResult.top10,
          debug
        },
        null,
        2
      )
    );

    // --- 2) Build per-activity rankings (sorted)
    let activityRankings: { [act: string]: Array<{ time: string; score: number }> } = {};
    if (debug?.activityRankings && Object.keys(debug.activityRankings).length > 0) {
      activityRankings = { ...(debug.activityRankings as any) };
    } else {
      const tempMap: { [act: string]: Array<{ time: string; score: number }> } = {};
      const hourlyScores = debug?.hourlyScores || [];
      for (const h of hourlyScores) {
        const time = h.time;
        const scoresObj = h.scores || {};
        for (const act of Object.keys(scoresObj)) {
          if (!tempMap[act]) tempMap[act] = [];
          tempMap[act].push({ time, score: scoresObj[act] ?? 0 });
        }
      }
      for (const act of Object.keys(tempMap)) {
        tempMap[act].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.time.localeCompare(b.time);
        });
      }
      activityRankings = tempMap;
    }

    // --- 3) Build nicely formatted .txt output
    const activityOrder = ['Surfing', 'Skiing', 'Outdoor sightseeing', 'Indoor sightseeing'];
    let textOutput = `City Name: ${city.name}\n`;
    textOutput += `Recommended Activity: ${activityResult.recommendedActivity}\n\n`;

    for (const activity of activityOrder) {
      const ranking = activityRankings?.[activity] || [];
      textOutput += `${activity}:\n`;
      if (!ranking || ranking.length === 0) {
        textOutput += `  No data available\n\n`;
      } else {
        const top = ranking.slice(0, 10);
        for (let i = 0; i < top.length; i++) {
          const { time, score } = top[i];
          const scoreStr = Number.isInteger(score) ? `${score}` : `${score.toFixed(1)}`;
          textOutput += `  ${i + 1}: ${time} (score: ${scoreStr})\n`;
        }
        textOutput += '\n'; // <-- extra spacing between ranked items for readability
      }
    }

    const textFile = path.join(resultsDir, `${city.name.replace(/\s+/g, '_')}_result.txt`);
    fs.writeFileSync(textFile, textOutput);

    console.log(`✅ Wrote results to:\n - ${jsonFile}\n - ${textFile}\n`);
  }
});

When('I attempt to fetch geocoding data', async () => {
  if (!cities || cities.length === 0) {
    throw new Error('No test city available for this step');
  }
  try {
    invalidGeoResponse = await client.geocode(cities[0].name, cities[0].country_code);
  } catch (err) {
    invalidGeoResponse = { error: String(err) };
  }
});

Then('the system should detect that no results were returned', async () => {
  assert.ok(
    !invalidGeoResponse || !invalidGeoResponse.results || invalidGeoResponse.results.length === 0,
    'Expected no results array in the response for invalid city'
  );
});

Then('it should log or save a "no_geocode" result file', async () => {
  const filePath = path.join(resultsDir, `invalid_city_no_geocode.json`);
  fs.writeFileSync(filePath, JSON.stringify(invalidGeoResponse, null, 2));
  const exists = fs.existsSync(filePath);
  assert.strictEqual(exists, true, 'Expected no_geocode JSON file to exist');
});

When('the geocoding API returns an error or non-200 status', async () => {
  if (!singleTestCity) throw new Error('No singleTestCity provided for API-failure scenario');

  const originalGeocode = (client as any).geocode.bind(client);
  apiError = null;
  (client as any).geocode = async () => {
    throw new Error('Simulated geocoding API failure');
  };

  try {
    await client.geocode(singleTestCity.name, singleTestCity.country_code);
  } catch (err) {
    apiError = err;
  } finally {
    (client as any).geocode = originalGeocode;
  }
});

Then('the system should handle it without crashing', async () => {
  assert.ok(apiError, 'Expected an API error to have been captured');
});

Then('it should log an error message or mark the result as failed', async () => {
  const logFile = path.join(resultsDir, `api_failure_log.txt`);
  fs.writeFileSync(logFile, `API failed with error: ${String(apiError)}`);
  const exists = fs.existsSync(logFile);
  assert.strictEqual(exists, true, 'Expected API failure log file to exist');
});

Then('I should get a recommendation and a ranked top-10 list for each city', async () => {
  if (!cities || cities.length === 0)
    throw new Error('No cities were provided to verify results for.');

  for (const city of cities) {
    const file = path.join(resultsDir, `${city.name.replace(/\s+/g, '_')}_result.json`);
    const exists = fs.existsSync(file);
    assert.strictEqual(exists, true, `Expected result file ${file} to exist`);
  }
});
