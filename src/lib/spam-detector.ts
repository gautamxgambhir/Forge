import { isDisposableEmail } from "./disposable-emails";
import { getRecentSubmissions } from "./db";

export interface BehavioralTelemetry {
  openedAt?: number;
  firstKeystrokeAt?: number | null;
  keystrokesCount?: number;
  mouseMovements?: number;
  focusBlurCount?: number;
  typingIntervals?: number[];
  pausesCount?: number;
}

export interface SpamDetectionResult {
  score: number;
  reasons: string[];
  isSpam: boolean;
  status: "approved" | "pending" | "spam";
  reasonDetails: string;
}

const SPAM_KEYWORDS = [
  "seo", "marketing", "casino", "gambling", "crypto", "bitcoin", "ethereum", 
  "solana", "leads", "backlink", "backlinks", "forex", "make money", "free money", 
  "earn money", "passive income", "dollars", "invest", "google ranking", "viagra", 
  "cialis", "get rich", "wealth", "hacked", "click here", "opt-in", "subscribers"
];

const SUSPICIOUS_TLDS = [
  ".zip", ".mov", ".xyz", ".fit", ".top", ".click", ".ru", ".cn", ".gq", ".cf", ".tk", ".ml", ".ga"
];

const CRYPTO_GAMBLING_ADULT_KEYWORDS = [
  "bitcoin", "crypto", "casino", "poker", "porn", "xxx", "sex", "viagra", "betting", "lottery"
];

// Helper to calculate Jaccard similarity of words
function getWordJaccardSimilarity(s1: string, s2: string): number {
  const clean = (text: string) => text.toLowerCase().match(/\b\w+\b/g) || [];
  const words1 = clean(s1);
  const words2 = clean(s2);
  
  if (words1.length === 0 && words2.length === 0) return 1;
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

export async function detectSpam(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string; // Honeypot
  behavior?: BehavioralTelemetry;
  ip: string;
}): Promise<SpamDetectionResult> {
  let score = 0;
  const reasons: string[] = [];

  const name = data.name.trim();
  const email = data.email.trim();
  const subject = data.subject.trim();
  const message = data.message.trim();
  const website = data.website.trim();

  // 1. Honeypot Check
  if (website.length > 0) {
    score += 100;
    reasons.push("Honeypot field filled");
  }

  // 2. Disposable Email Check
  if (isDisposableEmail(email)) {
    score += 60;
    reasons.push("Disposable email address");
  }

  // 3. Time Analysis
  if (data.behavior?.openedAt) {
    const timeTaken = (Date.now() - data.behavior.openedAt) / 1000;
    if (timeTaken < 3) {
      score += 25;
      reasons.push(`Submitted extremely fast (${timeTaken.toFixed(2)}s)`);
    }
  } else {
    // If no behavior data is provided, bots might be submitting directly to the API
    score += 50;
    reasons.push("No client behavior telemetry");
  }

  // 4. Human Typing & Interaction Detection
  if (data.behavior) {
    const mouseMovements = data.behavior.mouseMovements ?? 0;
    const keystrokesCount = data.behavior.keystrokesCount ?? 0;
    const focusBlurCount = data.behavior.focusBlurCount ?? 0;
    const typingIntervals = data.behavior.typingIntervals ?? [];

    if (mouseMovements === 0) {
      score += 15;
      reasons.push("No mouse movements detected");
    }
    if (keystrokesCount === 0) {
      score += 20;
      reasons.push("No keystrokes recorded");
    } else if (typingIntervals.length > 0) {
      // Calculate average interval
      const totalInterval = typingIntervals.reduce((a, b) => a + b, 0);
      const avgInterval = totalInterval / typingIntervals.length;
      
      // Extremely fast typing
      if (avgInterval < 15) {
        score += 25;
        reasons.push(`Unrealistically fast typing speed (avg ${avgInterval.toFixed(1)}ms)`);
      }

      // Check standard deviation of intervals. Bots simulating keystrokes might use exactly uniform intervals.
      if (typingIntervals.length > 3) {
        const variance = typingIntervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / typingIntervals.length;
        const stddev = Math.sqrt(variance);
        if (stddev === 0) {
          score += 25;
          reasons.push("Perfectly uniform typing intervals (bot signature)");
        }
      }
    }
  }

  // 5. Content Checks
  
  // Message too short
  if (message.length < 30) {
    score += 20;
    reasons.push("Message body is under 30 characters");
  }

  // Repeated characters (e.g., "aaaaa" or "!!!!!")
  const repeatCharRegex = /(.)\1{4,}/;
  if (repeatCharRegex.test(message) || repeatCharRegex.test(subject)) {
    score += 30;
    reasons.push("Repeated character patterns detected");
  }

  // Repeated words (e.g., "hello hello hello hello hello")
  const repeatWordRegex = /\b(\w+)\b(\s+\1\b){4,}/i;
  if (repeatWordRegex.test(message)) {
    score += 20;
    reasons.push("Excessive repeated words");
  }

  // Emojis count
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = message.match(emojiRegex) || [];
  if (emojis.length > 5) {
    score += 10;
    reasons.push(`Excessive emojis (${emojis.length})`);
  }

  // URL checks
  const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
  const urls = message.match(urlRegex) || [];
  if (urls.length > 5) {
    score += 40;
    reasons.push(`Contains too many URLs (${urls.length})`);
  } else if (urls.length > 2) {
    score += 20;
    reasons.push(`Contains multiple URLs (${urls.length})`);
  }

  // Markdown links check
  const markdownLinkRegex = /\[[^\]]+\]\([^)]+\)/;
  if (markdownLinkRegex.test(message)) {
    score += 20;
    reasons.push("Contains markdown link spam");
  }

  // Spam keywords
  const messageLower = message.toLowerCase();
  const subjectLower = subject.toLowerCase();
  
  const foundKeywords = SPAM_KEYWORDS.filter(keyword => 
    messageLower.includes(keyword) || subjectLower.includes(keyword)
  );
  if (foundKeywords.length > 0) {
    score += 20;
    reasons.push(`Contains spam keywords: ${foundKeywords.slice(0, 3).join(", ")}`);
  }

  // Links category check (Crypto/Gambling/Adult) or suspicious TLDs
  let hasCriticalBlacklistedContent = false;
  
  for (const url of urls) {
    const urlLower = url.toLowerCase();
    
    // Check suspicious TLDs
    const matchedTld = SUSPICIOUS_TLDS.find(tld => urlLower.includes(tld + "/") || urlLower.endsWith(tld));
    if (matchedTld) {
      hasCriticalBlacklistedContent = true;
      reasons.push(`Suspicious TLD (${matchedTld}) in link`);
    }

    // Check critical keywords in links
    const matchedCrit = CRYPTO_GAMBLING_ADULT_KEYWORDS.find(keyword => urlLower.includes(keyword));
    if (matchedCrit) {
      hasCriticalBlacklistedContent = true;
      reasons.push(`Blacklisted link category (${matchedCrit})`);
    }
  }

  if (hasCriticalBlacklistedContent) {
    score += 100; // Immediate reject score
  }

  // Keyboard Smashing / Gibberish detection
  // Check words > 5 letters for vowel-to-consonant ratios and missing vowels
  const words = message.match(/\b[a-zA-Z]{6,}\b/g) || [];
  let gibberishDetected = false;
  for (const word of words) {
    const wordLower = word.toLowerCase();
    const vowelCount = (wordLower.match(/[aeiouy]/g) || []).length;
    const consonantCount = (wordLower.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
    
    if (vowelCount === 0 || consonantCount / wordLower.length > 0.85) {
      const safeExceptions = ["rhythm", "rhythms", "html5", "github", "docker", "script", "sqlite"];
      if (!safeExceptions.includes(wordLower)) {
        gibberishDetected = true;
        break;
      }
    }
  }

  if (gibberishDetected) {
    score += 20;
    reasons.push("Gibberish / keyboard smashing pattern");
  }

  // 6. Duplicate Detection (Checked against database)
  try {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentSubmissions = await getRecentSubmissions(oneDayAgo); // Await the async Supabase lookup
    
    let isExactDuplicate = false;
    let isSimilarDuplicate = false;
    let subjectCount = 0;
    let similarIpCount = 0;

    for (const sub of recentSubmissions) {
      if (sub.message.trim() === message) {
        isExactDuplicate = true;
      }
      
      if (sub.subject.trim() === subject) {
        subjectCount += 1;
      }

      if (sub.ip === data.ip) {
        const sim = getWordJaccardSimilarity(sub.message, message);
        if (sim > 0.6) {
          similarIpCount += 1;
        }
      }

      const sim = getWordJaccardSimilarity(sub.message, message);
      if (sim > 0.8) {
        isSimilarDuplicate = true;
      }
    }

    if (isExactDuplicate) {
      score = 100;
      reasons.push("Duplicate content (identical message)");
    } else if (isSimilarDuplicate) {
      score = 100;
      reasons.push("Duplicate content (highly similar message)");
    } else if (subjectCount >= 3) {
      score = 100;
      reasons.push("Subject repeated multiple times today");
    } else if (similarIpCount >= 2) {
      score = 100;
      reasons.push("Same IP sending multiple similar messages");
    }
  } catch (err) {
    console.error("Failed to run duplicate detection", err);
  }

  let status: "approved" | "pending" | "spam" = "approved";
  if (score >= 70) {
    status = "spam";
  } else if (score >= 40) {
    status = "pending";
  }

  return {
    score,
    reasons,
    isSpam: score >= 40,
    status,
    reasonDetails: reasons.join("; ")
  };
}
