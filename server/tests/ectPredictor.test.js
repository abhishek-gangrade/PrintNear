import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateBaselineECT, predictOrderECT } from '../utils/ectPredictor.js';

describe('ECT Prediction Engine (Baseline & Machine Learning)', () => {
  it('calculates analytical baseline completion time within realistic bounds', () => {
    const result = calculateBaselineECT({
      pages: 30,
      copies: 1,
      colorType: 'B&W',
      printSides: 'Single',
      binding: 'None',
      queuePagesAhead: 0,
      activeJobsAhead: 0,
      availablePrinters: 1,
      avgPrinterPpm: 30
    });

    assert.strictEqual(typeof result.estimatedMinutes, 'number');
    assert.ok(result.estimatedMinutes >= 2);
    assert.strictEqual(result.predictorVersion, 'analytical_baseline_v1');
    assert.ok(result.confidenceInterval.minMinutes <= result.estimatedMinutes);
    assert.ok(result.confidenceInterval.maxMinutes >= result.estimatedMinutes);
  });

  it('adjusts baseline completion time when queue is backed up', () => {
    const emptyQueue = calculateBaselineECT({ pages: 20, copies: 1, queuePagesAhead: 0 });
    const backedUpQueue = calculateBaselineECT({ pages: 20, copies: 1, queuePagesAhead: 150, activeJobsAhead: 5 });

    assert.ok(backedUpQueue.estimatedMinutes > emptyQueue.estimatedMinutes);
  });

  it('predicts with trained ML regression model and provides confidence intervals', () => {
    const mlResult = predictOrderECT({
      pages: 40,
      copies: 2,
      colorType: 'Color',
      printSides: 'Double',
      binding: 'Staple',
      queuePagesAhead: 60,
      activeJobsAhead: 2,
      availablePrinters: 2,
      avgPrinterPpm: 25
    });

    assert.strictEqual(typeof mlResult.estimatedMinutes, 'number');
    assert.ok(mlResult.estimatedMinutes >= 3);
    assert.strictEqual(mlResult.predictorVersion, 'ml_regression_v1');
    assert.strictEqual(typeof mlResult.confidenceInterval.minMinutes, 'number');
  });
});

