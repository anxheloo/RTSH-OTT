import { STORE_UPDATE_MODE } from '../appUpdate';

// `main` is what store builds are made from. A non-'off' value here would ship
// the store-update notice inside the newest build, to users who are already on
// it. The switch is turned on only in an OTA published from an older release's
// tag — see CLAUDE.md → Releasing.
it("keeps the store-update switch 'off' on main", () => {
  expect(STORE_UPDATE_MODE).toBe('off');
});
