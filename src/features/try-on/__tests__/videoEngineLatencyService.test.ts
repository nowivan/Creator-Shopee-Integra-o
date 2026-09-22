import { describe, it } from 'node:test';
import assert from 'node:assert';
import { videoEngineLatencyService } from '../../../services/videoEngineLatencyService';

describe('Video Engine Latency Service & Real-Time Monitoring', () => {
  it('1. initializes all 8 core video generation engines with baseline latency', () => {
    const engines = videoEngineLatencyService.getEngines();
    assert.strictEqual(engines.length, 8);

    const ids = engines.map(e => e.id);
    assert.ok(ids.includes('google_veo'));
    assert.ok(ids.includes('runway_gen3'));
    assert.ok(ids.includes('kling_ai'));
    assert.ok(ids.includes('luma_dream'));
    assert.ok(ids.includes('hailuo_minimax'));
    assert.ok(ids.includes('openai_sora'));
    assert.ok(ids.includes('wan_video'));
    assert.ok(ids.includes('gemini_video_gateway'));

    engines.forEach(engine => {
      assert.ok(engine.currentLatencyMs > 0);
      assert.ok(engine.avgLatencyMs > 0);
      assert.ok(engine.successRate >= 90);
      assert.ok(Array.isArray(engine.latencyHistory));
      assert.ok(engine.latencyHistory.length > 0);
    });
  });

  it('2. calculates accurate global health statistics', () => {
    const stats = videoEngineLatencyService.getGlobalStats();
    assert.ok(stats.overallAvgLatencyMs > 0);
    assert.ok(stats.p95LatencyMs >= stats.overallAvgLatencyMs);
    assert.ok(stats.globalSuccessRate >= 95);
    assert.strictEqual(stats.totalEnginesCount, 8);
    assert.ok(stats.totalEnginesOnline >= 7);
    assert.ok(stats.fastestEngine.latencyMs <= stats.slowestEngine.latencyMs);
  });

  it('3. records live API call measurements and updates statistics', () => {
    const beforeStats = videoEngineLatencyService.getEngine('google_veo');
    assert.ok(beforeStats);
    const beforeCalls = beforeStats.totalCalls;

    videoEngineLatencyService.recordEngineCall('google_veo', 105, true, 200, 'Test Probe');

    const afterStats = videoEngineLatencyService.getEngine('google_veo');
    assert.ok(afterStats);
    assert.strictEqual(afterStats.totalCalls, beforeCalls + 1);
    assert.strictEqual(afterStats.currentLatencyMs, 105);
    assert.strictEqual(afterStats.latencyHistory[afterStats.latencyHistory.length - 1], 105);

    const traces = videoEngineLatencyService.getTraces();
    assert.ok(traces.length > 0);
    assert.strictEqual(traces[0].engineId, 'google_veo');
    assert.strictEqual(traces[0].latencyMs, 105);
  });

  it('4. performs active ping probe to video engine', async () => {
    const latency = await videoEngineLatencyService.pingEngine('luma_dream');
    assert.ok(latency > 0);
    const engine = videoEngineLatencyService.getEngine('luma_dream');
    assert.ok(engine);
    assert.ok(engine.lastChecked > 0);
  });

  it('5. supports event subscription listeners', () => {
    let notified = false;
    const unsubscribe = videoEngineLatencyService.subscribe((engines, stats) => {
      if (engines.length === 8 && stats.totalEnginesCount === 8) {
        notified = true;
      }
    });

    assert.strictEqual(notified, true);
    unsubscribe();
  });
});
