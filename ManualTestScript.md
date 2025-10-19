# Manual Test Script — Activity Recommendation Feature

**Purpose:**
Step-by-step manual test script to validate the activity recommendation feature which scores hourly weather and recommends activities (Surfing, Skiing, Outdoor sightseeing, Indoor sightseeing).

---

## Preconditions

1. Project checked out locally and dependencies installed:

   * `npm install` completed successfully.
2. Environment variables configured (create `.env` in project root):

   * `RESULTS_DIR` (optional) — where JSON/TXT output files are written; default is `./results`.
   * If you modified API base URLs, confirm `GEOCODING_BASE` and `FORECAST_BASE` in environment or code.
3. Cucumber/TypeScript setup works (previously used `cucumber-js` + `ts-node/register`).
4. `testdata/cities.json` exists and contains the city array used by tests.
5. Network access to Open-Meteo geocoding and forecast endpoints (or you have a local mock server configured).
6. Clean results directory before running tests: `rm -rf results && mkdir results` (or manual delete on Windows).

---

## Test data examples

Place the following JSON in `testdata/cities.json` for broader coverage (example):

```json
[
  { "name": "Honolulu", "country_code": "US" },
  { "name": "Gold Coast", "country_code": "AU" },
  { "name": "Zermatt", "country_code": "CH" },
  { "name": "Banff", "country_code": "CA" },
  { "name": "Barcelona", "country_code": "ES" },
  { "name": "Cape Town", "country_code": "ZA" },
  { "name": "London", "country_code": "GB" },
  { "name": "Seattle", "country_code": "US" },
  { "name": "Tokyo", "country_code": "JP" }
]
```

---

## How to run (happy-path)

1. Ensure `.env` exists and `RESULTS_DIR` is set (or accept default `./results`).
2. Run the scenario(s):

   * `npx cucumber-js`  **or**  `npm test` (if `npm test` calls `cucumber-js` as in `package.json`).
3. Observe console logs as cities are processed.
4. Inspect the `results` folder. For each city you should see two files:

   * `<CityName>_result.json` — full JSON with `recommended`, `ranked`, and `debug` info
   * `<CityName>_result.txt` — human-readable compact output

---

## Test steps (detailed)

### A. Happy path: valid cities

1. Precondition: `testdata/cities.json` contains valid cities.
2. Run `npx cucumber-js`.
3. Expected: For each city, two result files are written to `results`.
4. Open the `.txt` file for a city and verify the structure:

   * `City Name: <Name>`
   * `Recommended Activity: <Activity>`
   * Each activity (Surfing, Skiing, Outdoor sightseeing, Indoor sightseeing) has up to 10 numbered entries, one per line, with ISO datetime and score.
5. Open the `.json` file and verify:

   * `city` object matches requested city.
   * `recommended` matches one of the four activities.
   * `ranked` contains `top10` entries (time + score) matching the recommended activity.
   * `debug.hourlyScores` is present and contains per-hour scoring.

**Acceptance criteria**: All files exist, formatting matches README, and recommended activity is a string from allowed list.

---

### B. Edge case: invalid/blank city (no geocode results)

1. Modify `testdata` or run the scenario with an invalid name (e.g. `@@@@@@` or blank string). Use the provided step `Given a test city with an empty or invalid name` if executing steps directly.
2. Run the scenario.
3. Expected:

   * A `*_no_geocode.json` file is produced with the raw geocode response (which may be `{ "generationtime_ms": ... }` or empty results array).
   * The `.txt`/.json result files for that city are **not** created (or a `_no_geocode.json` is also present alongside a no-result indicator).
4. Verify logs indicate "No geocoding results for <city>".

**Acceptance criteria**: System handled invalid input gracefully and produced a `*_no_geocode.json` file and console warning; no crash.

---

### C. Edge case: forecast returned but no hourly data

1. Mock or simulate a forecast response that contains no `hourly` field or empty `hourly.time` array.
2. Run the scenario.
3. Expected: A `*_no_forecast.json` file is written containing the original API response; no _result.json with scores is produced.

**Acceptance criteria**: System detects missing hourly forecast and logs the condition.

---

### D. Error handling: API failure (non-200, network error, timeout)

1. Simulate geocoding or forecast API failure (e.g., temporarily block network, use a mock server that returns 500, or monkey-patch client to throw).
2. Run the scenario.
3. Expected:

   * A `<city>_geocode_error.json` or `<city>_forecast_error.json` file is written containing the error message.
   * Console warning printed that includes the error.
   * The test run continues for remaining cities (no global crash).

**Acceptance criteria**: Failure is recorded, the runner does not crash, and other cities are processed.

---

### E. Validate scoring logic and recommended activity (functional correctness)

1. Pick one city and instrument test to save `debug.hourlyScores` (already in JSON output).
2. Manually pick an hourly row and calculate expected scores for each activity using the scoring rules (temperature, wind, cloud, precipitation, snowfall, gusts, visibility).
3. Compare computed score in `debug.hourlyScores` to expected calculations. Verify top 10 for recommended activity matches `activityRankings` in debug.

**Acceptance criteria**: Scores in debug match manual calculation for sample rows.

---

## Expected results (summary)

* For valid city: `CityName_result.json` and `CityName_result.txt` created.
* `result.json` contains `recommended`, `ranked`, and `debug`.
* `result.txt` contains a compact, human-readable list by activity with up to 10 entries each.
* For invalid city: `*_no_geocode.json` created and no scored result.
* For forecast missing hourly: `*_no_forecast.json` created.
* For API errors: `*_geocode_error.json` or `*_forecast_error.json` created and the run continues.

---

## Edge cases & tips

* **Slow API response / intermittent network**: run with retries/timeout set on the request context or use a local mocked server for determinism. If a request times out, ensure the code writes an error file and moves to the next city.
* **Ties in scores**: the scorer breaks ties by time (earlier times first) — validate tie-breaker behavior by crafting identical-score rows.
* **Timezone / locale**: outputs use ISO timestamps returned by the forecast API (UTC or timezone as returned). Confirm interpretation if local time display is required.
* **Floating scores**: some scores include halves (e.g. `11.5`). Validate formatting in `.txt` shows one decimal when needed.

---

## Manual verification checklist (quick)

* [ ] `results` directory cleared prior to test
* [ ] `npx cucumber-js` ran without exceptions
* [ ] JSON + TXT files present for each valid city
* [ ] `recommended` activity is one of the allowed values
* [ ] Top-10 lists populated and consistent between `.json` and `.txt`
* [ ] Error files present for invalid cities or API failures
* [ ] Debug/hourlyScores used to validate scoring math for at least 3 hours

