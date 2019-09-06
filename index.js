const cc = require('console-control-strings');
const ora = require('ora'); // for spinners

const styled = (str = '', ...styles) => {
  if (!styles.length) return str;

  return `${styles.reduce(
    (codes, style) => `${codes}${cc.color(style)}`,
    ''
  )}${str}${cc.color('reset')}`;
};

const write = (...args) => process.stdout.write(styled(...args));
const writeLine = (...args) => console.log(styled(...args));

const getWindowWidth = () => process.stdout.getWindowSize(1)[0];

const progressBar = (
  actual,
  total,
  {
    start: { str: start = '', styles: startStyles = [] } = {},
    end: { str: end = '', styles: endStyles = [] } = {},
    done: { str: done = '-', styles: doneStyles = [] } = {},
    fill: { str: fill = ' ', styles: fillStyles = [] } = {},
  } = {}
) => {
  const progressTotal = getWindowWidth() - start.length - end.length;
  const progress = Math.ceil(actual / total * progressTotal);
  const remaining = progressTotal - progress;

  write(start, ...startStyles);
  write(done.repeat(progress / done.length), ...doneStyles);
  write(fill.repeat(remaining / fill.length), ...fillStyles);
  write(end, ...endStyles);
};

const banner = (str, ...styles) => {
  const len = str.length;
  const padding = Math.max(0, (getWindowWidth() - len) / 2);

  writeLine(
    `\n${' '.repeat(padding)}${str}${' '.repeat(padding)}`,
    ...(styles.length ? styles : ['bgBlue', 'bold'])
  );
};

const SHORT = 50; // ms
const MEDIUM = 150; // ms
const LONG = 500; // ms
const styledDuration = duration => {
  return styled(
    `${duration}ms`,
    duration < SHORT
      ? 'green'
      : duration < MEDIUM ? 'yellow' : duration < LONG ? 'red' : 'bgRed'
  );
};

const sum = (arr, getValue) =>
  arr.reduce((total, element) => total + getValue(element), 0);

const median = (sorted, getValue) => {
  const len = sorted.length;
  if (!len) return 0;

  const midpoint = Math.floor(len / 2);
  if (len % 2) {
    return getValue(sorted[midpoint]);
  }
  return (getValue(sorted[midpoint - 1]) + getValue(sorted[midpoint])) / 2;
};

const getDuration = ({ duration }) => duration;
const compareDurations = ({ duration: d1 }, { duration: d2 }) => d2 - d1;

class JestStats {
  onRunStart(_aggregatedResults, { estimatedTime }) {
    writeLine(`\nEstimated Time: ${estimatedTime} seconds`);
    this.suiteResults = [];
    this.suiteTotalTimesSum = 0;
    this.testResults = [];
    this.spinner = ora('Starting 0 test suites...');
    this.numStarted = 0;
  }

  onTestStart(test) {
    this.numStarted++;
    if (!this.started) {
      this.spinner = this.spinner.start();
      this.started = true;
    } else if (this.spinner.isSpinning) {
      this.spinner.text = `Starting ${this.numStarted} test suites...`;
    }
  }

  onTestResult({ path }, { testResults }, { numPassedTestSuites, numTotalTestSuites }) {
    this.spinner = this.spinner.stop();

    const suiteResult = {
      duration: sum(testResults, getDuration),
      path: path.split('magicwand/packages/')[1],
    };

    this.suiteResults.push(suiteResult);
    this.suiteTotalTimesSum += suiteResult.duration;
    this.testResults = this.testResults.concat(testResults);

    write(cc.gotoSOL());
    progressBar(numPassedTestSuites, numTotalTestSuites, {
      done: { str: ' ', styles: ['bgGreen'] },
      fill: { str: ' ', styles: ['bgRed'] },
      start: {
        str: `${numPassedTestSuites} / ${numTotalTestSuites} Test Suites Finished`,
        styles: ['bgGreen', 'bold'],
      },
    });
  }

  onRunComplete(_contexts, aggregatedResult) {
    writeLine('\n');
    const sortedSuiteResults = this.suiteResults.sort(compareDurations);
    const sortedTestResults = this.testResults.sort(compareDurations);

    banner('Test Suites (≥ 10ms)');
    sortedSuiteResults
      .filter(({ duration }) => duration >= 10)
      .forEach(({ duration, path }) => {
        writeLine(`${styledDuration(duration)}\t${path}`);
      });

    banner('Individual Tests (≥ 10ms)');
    sortedTestResults
      .filter(({ duration }) => duration >= 10)
      .forEach(({ duration, fullName }) =>
        writeLine(
          `${styledDuration(duration)}\t${fullName.replace(
            'should',
            styled('should', 'bold')
          )}`
        )
      );

    write('\nTotal:\t\t\t');
    writeLine(styled(`  ${this.suiteTotalTimesSum}ms  `, 'bgWhite', 'black'));
    write('Average (suites):\t');
    writeLine(
      styledDuration(this.suiteTotalTimesSum / sortedSuiteResults.length)
    );
    write('Average (tests):\t');
    writeLine(
      styledDuration(this.suiteTotalTimesSum / sortedTestResults.length)
    );
    write('Median (suites):\t');
    writeLine(styledDuration(median(sortedSuiteResults, getDuration)));
    write('Median (tests):\t\t');
    writeLine(styledDuration(median(sortedTestResults, getDuration)));

    const {
      numFailedTests,
      numPassedTests,
      numPendingTests,
      numRuntimeErrorTestSuites,
      numTotalTests,
    } = aggregatedResult;

    write(`\nTest results: ${numPassedTests} / ${numTotalTests} passed`);

    if (numPassedTests !== numTotalTests) {
      writeLine(
        `: ${numFailedTests} failed, ${numRuntimeErrorTestSuites} runtime errors, ${numPendingTests} pending`
      );
      write('  WARNING  ', 'bgRed', 'bold');
      writeLine(
        ` ${numTotalTests -
          numPassedTests} tests did not pass, above durations may be inaccurate. Run tests with default reporter for more detailed test output.`
      );
    } else {
      writeLine();
    }
    writeLine();
  }
}

module.exports = JestStats;
