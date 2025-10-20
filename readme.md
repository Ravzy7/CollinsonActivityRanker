# 🌦️ Activity Ranking API Test Automation
Test Task for Weather-Based Activity Recommendation

Welcome to the **Activity Ranking API Test Automation** repository.  
This repository contains an automated test suite that verifies weather-based activity recommendations across multiple cities using real forecast data from the **Open-Meteo API**.

---

## 🧪 What This Project Does

This project automatically:
- Fetches weather forecasts for multiple cities (Tokyo, London, Cape Town, etc.)
- Scores hourly conditions for activities like **Surfing**, **Skiing**, **Outdoor sightseeing**, and **Indoor sightseeing**
- Generates human-readable results (TXT + JSON)
- Runs full **BDD-style tests** with **Cucumber + TypeScript**
- Produces beautiful reports using **Allure**

---

## 🚀 Running the Automated Tests

You don’t need prior automation experience to run these tests — just follow these steps carefully:

---

### 1️⃣ Clone the Repository
Copy the project to your computer using the command line:

```bash
git clone https://github.com/yourusername/activity-ranking-api-tests.git
cd activity-ranking-api-tests
```

---

### 2️⃣ Install Node.js (If Not Installed)
If you don’t have Node.js yet, download it here:  
👉 [https://nodejs.org/](https://nodejs.org/)  
Then follow the installation instructions for your operating system.

Once installed, confirm it’s working by typing:
```bash
node -v
npm -v
```

---

### 3️⃣ Install Project Dependencies
Now install everything needed to run the project:

```bash
npm install
```

> 💡 If you see an error related to dependencies (like *peer dependency conflict*), try:
> ```bash
> npm install --legacy-peer-deps
> ```

---

### 4️⃣ Set Up Environment Variables
We’ll use a `.env` file to store base URLs for the weather APIs.

In the project root, create a new file named `.env` and paste the following:

```dotenv
GEOCODING_BASE=https://geocoding-api.open-meteo.com/v1
FORECAST_BASE=https://api.open-meteo.com/v1
RESULTS_DIR=./results
```

This tells the framework where to fetch city coordinates and forecast data.

---

### 5️⃣ Explore the Project Structure

```
activity-ranking-api-tests/
│
├── features/
│   └── activity.feature         # BDD scenarios (Happy Path, Edge Cases, API Errors)
│
├── tests/
│   ├── steps/
│   │   └── activity_steps.ts    # Step definitions (the logic behind the steps)
│   ├── utils/
│   │   └── activityScorer.ts    # Activity scoring logic
│   └── support/
│       └── hooks.ts             # Allure attachments and cleanup
│
├── src/
│   └── requests/
│       └── WeatherApiClient.ts  # API client for Open-Meteo
│
├── testdata/
│   ├── cities.json              # List of cities tested
│   └── fixtures/                # Mocked data for edge cases
│
├── results/                     # Where test outputs and reports are stored
├── cucumber.js                  # Cucumber configuration
├── package.json                 # Scripts and dependencies
└── .env                         # Your environment config
```

---

### 6️⃣ Run the Tests

You have two ways to run the automated tests:

#### Option 1: Standard Run (Text-Based)
```bash
npm test
```

This will execute all feature files in your terminal.

#### Option 2: Allure Report Run (For HTML Reports)
```bash
npm run test:allure
```

This will store results inside `allure-results/`.

---

### 7️⃣ Generate and View the Test Report

After the tests complete, generate a beautiful Allure report:

```bash
npm run allure:generate
npm run allure:open
```

This will open an interactive dashboard in your browser where you can:
- View passed and failed scenarios
- Inspect API responses
- See city-wise weather recommendations
- Download test artifacts

---

### 8️⃣ Example Test Output

When tests run successfully, you’ll see result files like this in the `/results` folder:

**Example: `Tokyo_result.txt`**

```
City Name: Tokyo
Recommended Activity: Outdoor sightseeing

Surfing:
1: 2025-10-24T10:00 (score: 6.5)
2: 2025-10-24T11:00 (score: 6.5)
3: 2025-10-24T12:00 (score: 6.5)
...

Skiing:
1: 2025-10-19T13:00 (score: 1.5)
...

Outdoor sightseeing:
1: 2025-10-19T02:00 (score: 10)
...

Indoor sightseeing:
1: 2025-10-22T02:00 (score: 6)
...
```

Each test also creates a matching JSON file with debug data and weather scores.

---

### 9️⃣ Manual Testing (Optional)

You can also manually validate scenarios listed in  
**`Manual-Test-Script.md`**, including:
- Invalid or blank city names  
- Missing forecast data  
- Simulated API failures  
- Elevation effects on Skiing scores  
- Timeout handling

---

### 🔧 Helpful Commands

| Command | Purpose |
|----------|----------|
| `npm test` | Run all BDD tests |
| `npm run test:allure` | Run tests with Allure reporting |
| `npm run allure:generate` | Generate Allure HTML report |
| `npm run allure:open` | Open the Allure report |
| `npm run clean` | Remove old `results` and `allure-results` folders |

---

### 🧠 How It Works (Behind the Scenes)

1. The **Geocoding API** gets latitude/longitude for each city  
2. The **Forecast API** fetches hourly weather data  
3. The **Scoring Engine** ranks conditions for:
   - Surfing 🌊
   - Skiing 🎿
   - Outdoor sightseeing 🌤️
   - Indoor sightseeing 🏛️
4. The **BDD Tests** validate:
   - Correct activity ranking  
   - Robustness against invalid or missing data  
   - Handling of API errors  
   - Proper output formatting
5. The **Allure Reporter** summarizes everything beautifully.

---

### 🧾 Author

**Raval Ramkhelawan**  
Test Automation Engineer  
📧 [raval.ramkhelawan@gmail.com]

---

