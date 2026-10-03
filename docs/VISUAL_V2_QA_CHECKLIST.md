# ChameleonDetailing — QA Acceptance Checklist for staging/visual-v2

## Release gate
Status must remain **NOT APPROVED** until QA explicitly accepts the staging build.

## Smoke
- [ ] Mini App starts in Telegram
- [ ] Splash completes
- [ ] No white screen / fatal console error
- [ ] Home opens
- [ ] Garage opens
- [ ] Services opens
- [ ] Calculator opens
- [ ] VIP opens
- [ ] Profile opens
- [ ] Bottom navigation works in both directions

## iPhone 13 visual regression
- [ ] No horizontal scrolling
- [ ] Header does not collide with Telegram chrome
- [ ] Hero text is not clipped
- [ ] Car imagery stays inside intended composition
- [ ] Cards do not overlap
- [ ] CTA remains reachable
- [ ] Bottom nav does not cover content
- [ ] Safe-area padding is correct
- [ ] Long UA/PL/EN labels remain readable

## Calculator critical path
- [ ] Saved car can be selected
- [ ] Other car can be selected
- [ ] Vehicle type selection works
- [ ] Full detailing conflicts still work
- [ ] Multiple valid add-ons can be selected
- [ ] Continue button enable/disable logic is correct
- [ ] Price result is returned
- [ ] Result modal scrolls
- [ ] Confirmation works
- [ ] Schedule/off-hours state is respected
- [ ] Per-car defaults are not lost

## Garage
- [ ] Multiple cars can be switched
- [ ] Add car works
- [ ] Edit car works
- [ ] Plate / phone / ceramic / body type fields survive save
- [ ] History opens
- [ ] Schedule action opens correct flow

## State handling
- [ ] blocked user -> service unavailable screen
- [ ] maintenance -> maintenance screen
- [ ] direct web disabled -> Telegram gate
- [ ] API error -> friendly error state
- [ ] reload/reopen does not corrupt selected locale/currency

## Localization
- [ ] Ukrainian
- [ ] Polish
- [ ] English
- [ ] No raw translation keys
- [ ] No overflow introduced by longer translations

## Approval note
QA tester records:
- Build/commit:
- Device:
- Telegram version:
- Passed:
- Failed:
- Blocking defects:
- Decision: APPROVED / NOT APPROVED
