Feature: Activity recommendation based on weather forecast

  # -------------------------
  # 1️⃣ Happy Path
  # -------------------------
  Scenario: Determine best activity and rank top 10 hourly slots for cities from testdata
    Given the test data file "testdata/cities.json"
    When I run activity recommendation for each city in the testdata
    Then I should get a recommendation and a ranked top-10 list for each city

  # -------------------------
  # 2️⃣ Edge Case — invalid/blank city
  # -------------------------
  Scenario: Handle invalid or blank city name gracefully
    Given a test city with an empty or invalid name
    When I attempt to fetch geocoding data
    Then the system should detect that no results were returned
    And it should log or save a "no_geocode" result file

  # -------------------------
  # 3️⃣ Error Handling — API failure
  # -------------------------
  Scenario: Handle API failure or unreachable endpoint
    Given a valid city name "London" and country code "GB"
    When the geocoding API returns an error or non-200 status
    Then the system should handle it without crashing
    And it should log an error message or mark the result as failed
