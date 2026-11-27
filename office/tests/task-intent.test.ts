import { DAILY_ACTIVITY_REQUIRED_ROLES, isDailyWebsiteActivityTask } from "../supabase/functions/_shared/task-intent.ts";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message + ": expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
  }
}

Deno.test("daily Hinglish property and booking report routes to daily activity", () => {
  assertEqual(
    isDailyWebsiteActivityTask("Today's Website Activity Report – 26 November 2026", "Aaj website me new property add hui, update/remove hui ya booking hui?"),
    true,
    "daily activity intent"
  );
});

Deno.test("plain Hinglish what-happened-today request is daily activity", () => {
  assertEqual(isDailyWebsiteActivityTask("Aaj website me kya hua?", ""), true, "plain daily activity intent");
});

Deno.test("plain city-wise property count remains a count task", () => {
  assertEqual(
    isDailyWebsiteActivityTask("Sikar property count", "How many hostels are in Sikar?"),
    false,
    "city count must not be mistaken for daily activity"
  );
});

Deno.test("date-based new-property count is not a daily activity report", () => {
  assertEqual(
    isDailyWebsiteActivityTask("Daily property count", "Count all hostels created today"),
    false,
    "created-today count must stay with the analyst count workflow"
  );
});

Deno.test("daily report uses DLM, DAR and independent QC", () => {
  assertEqual(
    [...DAILY_ACTIVITY_REQUIRED_ROLES],
    ["data_listing_manager", "data_analyst_reporting_manager", "quality_control_manager"],
    "daily activity role set"
  );
});
