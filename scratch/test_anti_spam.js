const http = require("http");

const BASE_URL = "http://localhost:3000";

async function makeRequest(path, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Helper to generate typical human typing intervals
function generateTypingIntervals(length, avg = 150) {
  const intervals = [];
  for (let i = 0; i < length; i++) {
    // Human typing is irregular
    intervals.push(avg + Math.floor((Math.random() - 0.5) * 50));
  }
  return intervals;
}

async function runTests() {
  console.log("=== STARTING ANTI-SPAM SYSTEM INTEGRATION TESTS ===\n");
  
  // Wait for 1 second just in case
  await new Promise(r => setTimeout(r, 1000));

  try {
    // ----------------------------------------------------
    // TEST 1: Valid human submission
    // ----------------------------------------------------
    console.log("TEST 1: Valid Human Submission...");
    const test1Payload = {
      name: "Alice Smith",
      email: "alice@gmail.com",
      subject: "Inquiry about partnership",
      message: "Hello, I am interested in collaborating on a web development project. Let me know your rates.",
      website: "",
      behavior: {
        openedAt: Date.now() - 5000, // 5 seconds elapsed
        firstKeystrokeAt: Date.now() - 4000,
        keystrokesCount: 80,
        mouseMovements: 45,
        focusBlurCount: 4,
        typingIntervals: generateTypingIntervals(20, 150) // irregular, natural typing
      }
    };

    const res1 = await makeRequest("/api/contact", "POST", {}, test1Payload);
    console.log(`Response Status: ${res1.status}`);
    console.log(`Response Body:`, res1.body);
    if (res1.status === 200 && res1.body.ok) {
      console.log("✅ TEST 1 PASSED");
    } else {
      console.log("❌ TEST 1 FAILED");
    }
    console.log("----------------------------------------------------\n");

    // ----------------------------------------------------
    // TEST 2: Honeypot Trigger (website field filled)
    // ----------------------------------------------------
    console.log("TEST 2: Honeypot Trigger...");
    const test2Payload = {
      name: "Bot Honeypot",
      email: "bot@spam.com",
      subject: "Buy SEO services",
      message: "Check out this website link for SEO services and free money rankings.",
      website: "http://attacker-site.com", // Filled!
      behavior: {
        openedAt: Date.now() - 5000,
        firstKeystrokeAt: Date.now() - 4000,
        keystrokesCount: 45,
        mouseMovements: 12,
        focusBlurCount: 2,
        typingIntervals: generateTypingIntervals(20, 100)
      }
    };

    const res2 = await makeRequest("/api/contact", "POST", {}, test2Payload);
    console.log(`Response Status: ${res2.status} (Expect 200 due to silent trap)`);
    console.log(`Response Body:`, res2.body);
    if (res2.status === 200 && res2.body.ok) {
      console.log("✅ TEST 2 PASSED (Silent trap succeeded)");
    } else {
      console.log("❌ TEST 2 FAILED");
    }
    console.log("----------------------------------------------------\n");

    // ----------------------------------------------------
    // TEST 3: Disposable Email Domain (Explicit rejection)
    // ----------------------------------------------------
    console.log("TEST 3: Disposable Email Provider Rejection...");
    const test3Payload = {
      name: "Temp User",
      email: "attacker@mail.tm", // Disposable domain!
      subject: "Testing disposable domain",
      message: "This is a legitimate message body that is long enough to pass message length validations.",
      website: "",
      behavior: {
        openedAt: Date.now() - 5000,
        firstKeystrokeAt: Date.now() - 4000,
        keystrokesCount: 50,
        mouseMovements: 30,
        focusBlurCount: 4,
        typingIntervals: generateTypingIntervals(25, 120)
      }
    };

    const res3 = await makeRequest("/api/contact", "POST", {}, test3Payload);
    console.log(`Response Status: ${res3.status} (Expect 400)`);
    console.log(`Response Body:`, res3.body);
    if (res3.status === 400 && res3.body.error === "This email provider is not supported.") {
      console.log("✅ TEST 3 PASSED");
    } else {
      console.log("❌ TEST 3 FAILED");
    }
    console.log("----------------------------------------------------\n");

    // ----------------------------------------------------
    // TEST 4: Bot typing simulation (zero standard deviation)
    // ----------------------------------------------------
    console.log("TEST 4: Bot Keystroke Simulation (Uniform intervals)...");
    const test4Payload = {
      name: "Uniform Bot",
      email: "uniform@spam.com",
      subject: "Automated typing simulation",
      message: "This message has uniform typing intervals representing automated software submission.",
      website: "",
      behavior: {
        openedAt: Date.now() - 5000,
        firstKeystrokeAt: Date.now() - 4000,
        keystrokesCount: 60,
        mouseMovements: 0,
        focusBlurCount: 0,
        typingIntervals: Array(10).fill(100) // Perfect 100ms intervals (stddev = 0)
      }
    };

    const res4 = await makeRequest("/api/contact", "POST", {}, test4Payload);
    console.log(`Response Status: ${res4.status} (Expect 200 due to silent trap)`);
    console.log(`Response Body:`, res4.body);
    if (res4.status === 200 && res4.body.ok) {
      console.log("✅ TEST 4 PASSED");
    } else {
      console.log("❌ TEST 4 FAILED");
    }
    console.log("----------------------------------------------------\n");

    // ----------------------------------------------------
    // TEST 5: Verify Admin Dashboard Access
    // ----------------------------------------------------
    console.log("TEST 5: Admin Dashboard Access...");
    const res5Fail = await makeRequest("/api/admin", "GET", { Authorization: "Bearer wrong_password" });
    console.log(`Unauthorized Fetch: ${res5Fail.status} (Expect 401)`);
    
    const res5Success = await makeRequest("/api/admin", "GET", { Authorization: "Bearer admin" });
    console.log(`Authorized Fetch: ${res5Success.status} (Expect 200)`);
    if (res5Fail.status === 401 && res5Success.status === 200 && Array.isArray(res5Success.body.submissions)) {
      console.log("✅ TEST 5 PASSED");
      
      const subs = res5Success.body.submissions;
      console.log(`Found ${subs.length} total submissions in database.`);
      subs.forEach(s => {
        console.log(` - ID: ${s.id} | Name: ${s.name} | Status: ${s.status} | Score: ${s.spam_score} | Reason: ${s.reason || "None"}`);
      });
    } else {
      console.log("❌ TEST 5 FAILED");
    }
    console.log("----------------------------------------------------\n");

  } catch (err) {
    console.error("Test execution error:", err);
  }
}

runTests();
