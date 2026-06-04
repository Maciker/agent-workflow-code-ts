import { describe, expect, it } from "vitest";
import { greet } from "../src/index.js";

describe("greet", () => {
  it("returns a greeting for the provided name", () => {
    expect(greet("Ada")).toBe("Hello, Ada");
  });
});
