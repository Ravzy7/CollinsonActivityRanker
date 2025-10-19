module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['features/steps/**/*.ts'],
    format: [
      'progress',                         // keep console output
      'allure-cucumberjs/reporter'        // add allure reporter
    ],
    formatOptions: {
      resultsDir: 'allure-results'        // Allure results output folder
    }
  }
};
