# EVCare Validation Test Report

**Tester:** Cyrus (25005799)  
**Feature:** Server-Side Validation and Automated Unit Testing

## Automated Test Command

```bash
npm test
```

## Automated Test Summary

- **Total tests:** 28
- **Passed:** 28
- **Failed:** 0
- **Pass rate:** 100%

## Main Test Cases

| No. | Test Case | Input | Expected Result | Status |
|---:|---|---|---|:---:|
| 1 | Accept valid battery health | `80` | Accepted | Pass |
| 2 | Reject battery health above 100 | `101` | Rejected | Pass |
| 3 | Reject negative battery health | `-1` | Rejected | Pass |
| 4 | Reject decimal battery health | `97.6` | Rejected | Pass |
| 5 | Reject empty battery health | `""` | Rejected | Pass |
| 6 | Accept minimum battery boundary | `0` | Accepted | Pass |
| 7 | Accept maximum battery boundary | `100` | Accepted | Pass |
| 8 | Accept battery health as a form string | `"80"` | Accepted | Pass |
| 9 | Reject battery health containing only spaces | `"   "` | Rejected | Pass |
| 10 | Reject non-numeric battery health | `"abc"` | Rejected | Pass |
| 11 | Reject null battery health | `null` | Rejected | Pass |
| 12 | Reject undefined battery health | `undefined` | Rejected | Pass |
| 13 | Accept valid mileage | `50000` | Accepted | Pass |
| 14 | Accept zero mileage | `0` | Accepted | Pass |
| 15 | Reject negative mileage | `-1` | Rejected | Pass |
| 16 | Reject decimal mileage | `100.5` | Rejected | Pass |
| 17 | Reject empty mileage | `""` | Rejected | Pass |
| 18 | Accept mileage as a form string | `"50000"` | Accepted | Pass |
| 19 | Reject mileage containing only spaces | `"   "` | Rejected | Pass |
| 20 | Reject non-numeric mileage | `"ten thousand"` | Rejected | Pass |
| 21 | Reject null mileage | `null` | Rejected | Pass |
| 22 | Reject undefined mileage | `undefined` | Rejected | Pass |
| 23 | Accept a future charging date | Future date and time | Accepted | Pass |
| 24 | Reject a past charging date | Past date and time | Rejected | Pass |
| 25 | Reject an invalid charging date | `"invalid-date"` | Rejected | Pass |
| 26 | Reject an empty charging date | `""` | Rejected | Pass |
| 27 | Reject a null charging date | `null` | Rejected | Pass |
| 28 | Reject an undefined charging date | `undefined` | Rejected | Pass |
