import { describe, it, expect, beforeEach } from "vitest";
import { ActionRegistry } from "../actions/action-registry";
import { ActionEngine, registerStubs, BaseStubAction } from "../actions/action-engine";
import { ActionStatus, ConfirmationPolicy } from "../actions/action-types";

describe("Action Engine Core (Sprint 4.1)", () => {
  beforeEach(() => {
    ActionRegistry.clear();
  });

  it("should register and find an action", () => {
    const action = new BaseStubAction("test-action", "Test", "Desc");
    ActionRegistry.register(action);
    expect(ActionRegistry.exists("test-action")).toBe(true);
    expect(ActionRegistry.get("test-action")).toBe(action);
  });

  it("should return undefined for non-existent action", () => {
    expect(ActionRegistry.get("missing")).toBeUndefined();
    expect(ActionRegistry.exists("missing")).toBe(false);
  });

  it("should list registered actions", () => {
    ActionRegistry.register(new BaseStubAction("a1", "A1", "D1"));
    ActionRegistry.register(new BaseStubAction("a2", "A2", "D2"));
    expect(ActionRegistry.list().length).toBe(2);
  });

  it("should register stubs correctly", () => {
    registerStubs();
    expect(ActionRegistry.exists("request-signature")).toBe(true);
    expect(ActionRegistry.exists("generate-pdf")).toBe(true);
    expect(ActionRegistry.exists("request-signature")).toBe(true);
    expect(ActionRegistry.exists("complete-checklist")).toBe(true);
  });

  it("should return NOT_IMPLEMENTED for stub execution", async () => {
    const engine = new ActionEngine();
    registerStubs();
    const result = await engine.execute("request-signature", {});
    expect(result.success).toBe(false);
    expect(result.status).toBe(ActionStatus.NOT_IMPLEMENTED);
    expect(result.executionId).toBeDefined();
  });


  it("should return failure for unknown action execution", async () => {
    const engine = new ActionEngine();
    const result = await engine.execute("unknown", {});
    expect(result.success).toBe(false);
    expect(result.status).toBe(ActionStatus.FAILED);
    expect(result.message).toContain("not found");
  });

  it("should have correct enums", () => {
    expect(ConfirmationPolicy.CRITICAL).toBe("CRITICAL");
    expect(ActionStatus.SUCCESS).toBe("SUCCESS");
  });

  it("should create action result with metadata", async () => {
    const engine = new ActionEngine();
    registerStubs();
    // Use an existing implemented action instead of assuming generate-pdf is a stub
    const result = await engine.execute("complete-checklist", {
      processId: "proc-1",
      checklistItemId: "item-1",
      companyId: "comp-1"
    });
    expect(result.executionId).toBeDefined();

    expect(typeof result.duration).toBe("number");
  });
});
