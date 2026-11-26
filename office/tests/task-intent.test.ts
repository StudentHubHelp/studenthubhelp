import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DAILY_ACTIVITY_REQUIRED_ROLES, isDailyWebsiteActivityTask } from "../supabase/functions/_shared/task-intent.ts";
Deno.test("daily Hinglish property and booking report routes to daily activity",()=>assertEquals(isDailyWebsiteActivityTask("Today's Website Activity Report – 26 November 2026","Aaj website me new property add hui, update/remove hui ya booking hui?"),true));
Deno.test("plain city-wise property count remains a count task",()=>assertEquals(isDailyWebsiteActivityTask("Sikar property count","How many hostels are in Sikar?"),false));
Deno.test("daily report uses DLM, DAR and independent QC",()=>assertEquals([...DAILY_ACTIVITY_REQUIRED_ROLES],["data_listing_manager","data_analyst_reporting_manager","quality_control_manager"]));
