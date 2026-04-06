import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Regression test for https://github.com/oven-sh/bun/issues/28914
//
// The CSS bundler was stripping leading `@layer a, b, c;` statements from
// bundled output, breaking Tailwind CSS layer ordering. The statement should
// be preserved in the output because it carries cascade ordering information
// that is not re-emitted elsewhere.
describe("issue #28914 - bundler preserves top-level @layer statements", () => {
  test("Tailwind-style @layer statement with a @layer block", async () => {
    using dir = tempDir("css-layer-28914-tailwind", {
      "entry.css": /* css */ `
@layer theme, base, components, utilities;

@layer base {
  body {
    color: red;
  }
}
`,
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "build", "./entry.css", "--outdir=out"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);

    const out = await Bun.file(`${dir}/out/entry.css`).text();

    // The statement carrying layer ordering must survive the bundle.
    expect(out).toContain("@layer theme, base, components, utilities;");
    // The block content must also be present.
    expect(out).toContain("@layer base");
    expect(out).toContain("color: red");
  });

  test("bare @layer statement survives the bundle", async () => {
    using dir = tempDir("css-layer-28914-bare", {
      "entry.css": /* css */ `@layer theme, base, components, utilities;`,
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "build", "./entry.css", "--outdir=out"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);

    const out = await Bun.file(`${dir}/out/entry.css`).text();
    expect(out).toContain("@layer theme, base, components, utilities;");
  });

  test("@layer statement followed by an unlayered rule", async () => {
    using dir = tempDir("css-layer-28914-mixed", {
      "entry.css": /* css */ `
@layer reset, base, components, utilities;

.foo { color: blue; }
`,
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "build", "./entry.css", "--outdir=out"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);

    const out = await Bun.file(`${dir}/out/entry.css`).text();
    expect(out).toContain("@layer reset, base, components, utilities;");
    expect(out).toContain(".foo");
  });

  test("multiple individual @layer statements are all preserved", async () => {
    using dir = tempDir("css-layer-28914-multi", {
      "entry.css": /* css */ `
@layer theme;
@layer base;
@layer components;

.foo { color: red; }
`,
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "build", "./entry.css", "--outdir=out"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);

    const out = await Bun.file(`${dir}/out/entry.css`).text();
    expect(out).toContain("@layer theme;");
    expect(out).toContain("@layer base;");
    expect(out).toContain("@layer components;");
    expect(out).toContain(".foo");
  });
});
