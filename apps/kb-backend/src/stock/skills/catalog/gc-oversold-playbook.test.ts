import { getGCStochPSARSignal } from "./gc-oversold-playbook.js";

// Simple test to verify the implementation
async function testGCStochPSARSignal() {
  try {
    console.log("Testing GC + Stochastic + PSAR signal implementation...");

    // Test with a sample stock (you can replace with any valid symbol)
    const result = await getGCStochPSARSignal("BBCA");

    console.log("✅ Implementation test successful!");
    console.log(`Symbol: ${result.symbol}`);
    console.log(`Phase: ${result.phase.current} (${result.phase.confidence})`);
    console.log(`Description: ${result.phase.description}`);
    console.log(`Actionable Insight: ${result.phase.actionableInsight}`);

    // Print key metrics
    console.log("\n📊 Key Metrics:");
    console.log(`SMA50: ${result.goldenCross.sma50}`);
    console.log(`SMA200: ${result.goldenCross.sma200}`);
    console.log(`Gap %: ${result.goldenCross.gapPct.toFixed(2)}%`);
    console.log(`Stochastic %K: ${result.stochastic.k.toFixed(2)}`);
    console.log(`Stochastic %D: ${result.stochastic.d.toFixed(2)}`);
    console.log(`PSAR: ${result.psar.value}`);
    console.log(`PSAR Trend: ${result.psar.trend}`);

    return true;
  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
}

// Run the test
testGCStochPSARSignal().then((success) => {
  if (success) {
    console.log("\n🎉 All tests passed! Implementation is working correctly.");
  } else {
    console.log("\n💥 Tests failed! Please check the implementation.");
  }
});
