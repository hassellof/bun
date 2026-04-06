// https://github.com/oven-sh/bun/issues/28914
import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

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

    const [, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    const out = await Bun.file(`${dir}/out/entry.css`).text();

    // The statement carrying layer ordering must survive the bundle.
    expect(out).toContain("@layer theme, base, components, utilities;");
    // The block content must also be present.
    expect(out).toContain("@layer base");
    expect(out).toContain("color: red");
    expect(exitCode).toBe(0);
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

    const [, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    const out = await Bun.file(`${dir}/out/entry.css`).text();
    expect(out).toContain("@layer theme, base, components, utilities;");
    expect(exitCode).toBe(0);
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

    const [, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    const out = await Bun.file(`${dir}/out/entry.css`).text();
    expect(out).toContain("@layer reset, base, components, utilities;");
    expect(out).toContain(".foo");
    expect(exitCode).toBe(0);
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

    const [, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    const out = await Bun.file(`${dir}/out/entry.css`).text();
    expect(out).toContain("@layer theme;");
    expect(out).toContain("@layer base;");
    expect(out).toContain("@layer components;");
    expect(out).toContain(".foo");
    expect(exitCode).toBe(0);
  });
});
