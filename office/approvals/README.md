# Owner Approval Center — Phase 9

## Approval rules
- Only an active Owner account with an AAL2 session can review an approval.
- Decisions are `approved` or `rejected`; a rejection requires a review note.
- Expired requests are marked `expired` and cannot be approved.
- All decisions are written to `office.office_task_logs`; integration proposal decisions also update `office.office_integration_events`.
- The approval center only records the decision. It never executes the underlying integration action.
- An approved proposal remains pending execution until Phase 10 provides a separate executor that rechecks approval, connection status, action allowlist and idempotency.
- AI employees and the General Manager cannot approve requests.
