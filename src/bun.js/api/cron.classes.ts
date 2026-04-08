// This branch does not ship the in-process callback-style `CronJob` class
// (PR #28701) — only the OS-level cron API from #26999 is present here.
// The codegen scans every `*.classes.ts`, so when this file exists in the
// working tree (e.g. in branches that merged #28701 first), it must not
// register a `CronJob` class or `generated_classes_list.zig` will reject
// the generated `Classes.CronJob` reference at build time.
export default [];
