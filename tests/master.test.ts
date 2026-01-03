import "dotenv/config";
import { describe, it, expect } from "vitest";
import { masterOrchestrator } from "../src/orchestrator/master.js";

describe("Master Agent Integration", () => {
  it("should orchestrate the full email processing pipeline", async () => {
    const email = {
      from: "dave@example.com",
      subject: "Project Update",
      body: "Hi team, The project is progressing well. We have completed phase 1 and are starting phase 2 next week. Please review the attached document. Best, Dave",
      attachments: ["progress.pdf"],
    };

    const result = await masterOrchestrator.processEmail(email);

    expect(result).toBeDefined();

    // Verify Summary (from Ollama)
    expect(result.summary).toBeTypeOf("string");
    expect(result.summary.length).toBeGreaterThan(0);

    // Verify Spam Score
    expect(result.spam_score).toBeTypeOf("number");

    // Verify Language Detection
    expect(result.detected_language).toBeDefined();
    expect(result.detected_language?.language).toBe("en");

    // Verify Actions Log
    expect(result.actions_taken).toBeInstanceOf(Array);
    expect(result.actions_taken.length).toBeGreaterThan(0);

    // Verify Timing
    expect(result.processing_time_ms).toBeGreaterThan(0);
  }, 60000); // 60s timeout to allow for local LLM inference

  it("should skip heavy agents when spam is detected", async () => {
    // A payload likely to be classified as spam
    const spamEmail = {
      from: "cheap-meds@spam-server.com",
      subject: "BUY NOW SUPER CHEAP",
      body: "CLICK HERE TO CLAIM YOUR PRIZE!!! UNCLAIMED 10000$ FOR YOU! DO NOT MISS THIS OPPORTUNITY.",
      attachments: [],
    };

    const result = await masterOrchestrator.processEmail(spamEmail);

    expect(result).toBeDefined();

    // Verify Spam Score is high
    expect(result.spam_score).toBeGreaterThanOrEqual(0.5);

    // Verify Summary is empty (skipped)
    expect(result.summary).toBe("");

    // Verify Calendar Event is not present (skipped)
    expect(result.calendar_event).toBeNull();

    // Verify Reply is not generated
    expect(result.suggested_reply).toBeNull();

    // Verify Actions Log contains skip message
    const skipAction = result.actions_taken.find((action) =>
      action.includes("Reply skipped (spam detected)")
    );
    expect(skipAction).toBeDefined();

    const spamAction = result.actions_taken.find((action) =>
      action.includes("Spam detected")
    );
    expect(spamAction).toBeDefined();
  }, 60000);
});
