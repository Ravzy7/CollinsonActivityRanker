// src/utils/activityScorer.ts
// Drop-in scorer that uses:
// temperature_2m, visibility, wind_speed_10m, cloud_cover, precipitation, snowfall, cloud_cover_low, wind_gusts_10m
//
// Exports:
// - scoreHourlyActivities(forecast, meta) -> ActivityScoreResult
// - scoreHourlyActivitiesDebug(forecast, meta) -> { result: ActivityScoreResult, debug: {...} }

export type HourScore = {
  time: string;
  scores: { [activity: string]: number };
};

export type ActivityScoreResult = {
  recommendedActivity: string;
  top10: Array<{ rank: number; time: string; score: number }>;
};

function safeGet<T>(arr: T[] | undefined, idx: number): T | null {
  return (arr && arr.length > idx) ? arr[idx] : null;
}

type ForecastHourly = {
  time: string[];
  temperature_2m?: number[];
  visibility?: number[];
  wind_speed_10m?: number[];
  cloud_cover?: number[];
  precipitation?: number[];
  snowfall?: number[]; // cm in your payload
  cloud_cover_low?: number[];
  wind_gusts_10m?: number[];
};

type ForecastResponseAny = {
  hourly: ForecastHourly;
};

/**
 * Internal scoring implementation (returns debug info)
 */
function computeScoresDebug(
  forecast: ForecastResponseAny,
  meta: { latitude: number; longitude: number; elevation: number }
) {
  const times = forecast.hourly.time || [];
  const temps = forecast.hourly.temperature_2m || [];
  const vis = forecast.hourly.visibility || [];
  const wind = forecast.hourly.wind_speed_10m || [];
  const cloud = forecast.hourly.cloud_cover || [];
  const precip = forecast.hourly.precipitation || [];
  const snowfall = forecast.hourly.snowfall || [];
  const cloudLow = forecast.hourly.cloud_cover_low || [];
  const gusts = forecast.hourly.wind_gusts_10m || [];
  const elevation = meta.elevation ?? 0;

  const hourlyScores: HourScore[] = [];

  for (let i = 0; i < times.length; i++) {
    const t = safeGet<string>(times, i) as string;
    const temp = safeGet<number>(temps, i) ?? NaN;
    const visibility = safeGet<number>(vis, i) ?? 0;
    const w = safeGet<number>(wind, i) ?? 0;
    const c = safeGet<number>(cloud, i) ?? 100;
    const p = safeGet<number>(precip, i) ?? 0;
    const snow = safeGet<number>(snowfall, i) ?? 0;
    const clow = safeGet<number>(cloudLow, i) ?? c;
    const gust = safeGet<number>(gusts, i) ?? 0;

    const scores: { [k: string]: number } = {
      Surfing: 0,
      Skiing: 0,
      'Outdoor sightseeing': 0,
      'Indoor sightseeing': 0
    };

    // --- Surfing / Water Sports rules (table)
    // Warm (>22°C), cloud < 60%, wind 10-25 km/h, precipitation < 1 mm, moderate gusts allowed
    if (!Number.isNaN(temp) && temp > 22) scores.Surfing += 3;
    if (c < 60) scores.Surfing += 1;
    if (w >= 10 && w <= 25) scores.Surfing += 2;
    if (p < 1) scores.Surfing += 2;
    // moderate gusts can help (but extreme gusts are bad)
    if (gust >= 20 && gust <= 45) scores.Surfing += 1;
    if (visibility >= 10000) scores.Surfing += 0.5;

    // --- Skiing / Snow Activities rules
    // Cold (<5°C), snowfall > 0 is strong proxy (snow), precipitation helps, elevation helps
    if (!Number.isNaN(temp) && temp < 5) scores.Skiing += 3;
    if (snow > 0) scores.Skiing += 4; // strong boost when snowfall is present
    if (p > 0) scores.Skiing += 1;
    if (elevation >= 500) scores.Skiing += 1;
    // clearer skies slightly help skiing visibility-wise
    if (visibility >= 10000) scores.Skiing += 0.5;

    // --- Outdoor sightseeing (10–25°C, cloud <50%, wind <20 km/h, precip 0)
    if (!Number.isNaN(temp) && temp >= 10 && temp <= 25) scores['Outdoor sightseeing'] += 4;
    if (c < 50) scores['Outdoor sightseeing'] += 2;
    if (w < 20) scores['Outdoor sightseeing'] += 1;
    if (p === 0) scores['Outdoor sightseeing'] += 2;
    if (visibility >= 15000) scores['Outdoor sightseeing'] += 1;

    // Penalize outdoor when low clouds are heavy
    if (clow >= 50) scores['Outdoor sightseeing'] -= 1;

    // --- Indoor sightseeing (cloud_cover > 80% OR precipitation > 1 mm)
    if (c > 80) scores['Indoor sightseeing'] += 3;
    if (p >= 1) scores['Indoor sightseeing'] += 3;
    if (gust >= 40) scores['Indoor sightseeing'] += 1;
    if (visibility <= 5000) scores['Indoor sightseeing'] += 1;
    if (!Number.isNaN(temp) && (temp <= 0 || temp >= 32)) scores['Indoor sightseeing'] += 1;

    // Ensure no negative scores (floor to 0)
    Object.keys(scores).forEach(k => {
      if (scores[k] < 0) scores[k] = 0;
    });

    hourlyScores.push({ time: t, scores });
  }

  // Build rankings per activity
  const activities = hourlyScores.length > 0 ? Object.keys(hourlyScores[0].scores) : [];
  const activityRankings: { [act: string]: Array<{ time: string; score: number }> } = {};

  activities.forEach(act => {
    activityRankings[act] = hourlyScores
      .map(h => ({ time: h.time, score: h.scores[act] }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.time.localeCompare(b.time);
      });
  });

  // Compute top-10 average metric for each activity
  const activityTopAvg: { [act: string]: number } = {};
  activities.forEach(act => {
    const top = activityRankings[act].slice(0, 10);
    const sum = top.reduce((s, t) => s + t.score, 0);
    activityTopAvg[act] = top.length > 0 ? sum / top.length : 0;
  });

  // --- Apply a global penalty of -2 to the *Outdoor sightseeing* metric (after calculation)
  const adjustedActivityTopAvg: { [act: string]: number } = { ...activityTopAvg };
  if (adjustedActivityTopAvg['Outdoor sightseeing'] !== undefined) {
    adjustedActivityTopAvg['Outdoor sightseeing'] = Math.max(0, adjustedActivityTopAvg['Outdoor sightseeing'] - 3);
  }

  return {
    hourlyScores,
    activityRankings,
    activityTopAvg, // original
    adjustedActivityTopAvg // after penalty
  };
}

/**
 * Public: debug version returns both the ActivityScoreResult and debug data
 */
export function scoreHourlyActivitiesDebug(
  forecast: ForecastResponseAny,
  meta: { latitude: number; longitude: number; elevation: number }
): { result: ActivityScoreResult; debug: any } {
  const { hourlyScores, activityRankings, activityTopAvg, adjustedActivityTopAvg } = computeScoresDebug(forecast, meta);

  const activities = Object.keys(activityRankings);
  // determine recommended activity by highest adjusted top-10 average
  const recommendedActivity = activities.reduce((best, curr) => {
    if (!best) return curr;
    return (adjustedActivityTopAvg[curr] > adjustedActivityTopAvg[best]) ? curr : best;
  }, activities[0] as string);

  const top10 = (activityRankings[recommendedActivity] || []).slice(0, 10).map((t, idx) => ({
    rank: idx + 1,
    time: t.time,
    score: t.score
  }));

  const result: ActivityScoreResult = { recommendedActivity, top10 };

  return {
    result,
    debug: {
      hourlyScores,
      activityRankings,
      activityTopAvg,
      adjustedActivityTopAvg
    }
  };
}

/**
 * Public: non-debug (same result but only returns ActivityScoreResult)
 */
export function scoreHourlyActivities(
  forecast: ForecastResponseAny,
  meta: { latitude: number; longitude: number; elevation: number }
): ActivityScoreResult {
  const { result } = scoreHourlyActivitiesDebug(forecast, meta);
  return result;
}
