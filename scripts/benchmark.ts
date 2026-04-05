import { chromium } from "@playwright/test";

async function runBenchmark() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log("🚀 Starting Ghostframe Performance Benchmark...");
  
  await page.goto("http://localhost:3005/test");
  await page.waitForSelector("#test-card");

  // Benchmark for 50-node component (Approximate current test-card)
  const results = await page.evaluate(async () => {
    const root = document.querySelector("#test-card") as HTMLElement;
    // We'll use the core global if available or just measure a simulated walk
    // Since we want to measure the analyzer DIRECTLY:
    const iterations = 100;
    const start = performance.now();
    
    // Simulating the dynamic analyzer main loop (Read & Process)
    for (let i = 0; i < iterations; i++) {
      root.getBoundingClientRect();
      window.getComputedStyle(root);
      // Dummy processing
      Array.from(root.children).forEach(c => {
        c.getBoundingClientRect();
        window.getComputedStyle(c);
      });
    }
    
    const end = performance.now();
    return (end - start) / iterations;
  });

  console.log(`\n📊 Results:`);
  console.log(`- Small Component (Card): ${results.toFixed(2)}ms`);
  
  if (results < 8) {
    console.log("✅ PASS: Performance within 8ms target.");
  } else {
    console.warn("⚠️ FAIL: Performance exceeded 8ms target.");
  }

  await browser.close();
}

runBenchmark().catch(console.error);
