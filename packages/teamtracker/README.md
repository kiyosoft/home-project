# @ethio/teamtracker

Ethio Home plugin for SofaScore team sensors. The integration publishes one sensor per club as `sensor.{team}` (for example `sensor.arsenal`).

## Live mode

Add the SofaScore integration in Home Assistant, then add **Team Card** from the widget picker and bind that sensor. During live games the card follows sensor updates (score, clock, `last_play`) and scrolls the last play as a marquee.

Pre-match attributes the card reads: `season`, `event_name`, `kickoff_in`, `venue`, `location`, `team_homeaway` / `opponent_homeaway`, and `team_record` / `opponent_record`.

Celebration settings on Team Card:

- **score_celebration** — full-screen wash / confetti when *your* team scores (`"{Team} Goal"`)
- **opponent_celebration** — same animation when the opponent scores (no cheer)
- **celebration_sound** — stadium cheer when *your* team scores (Mixkit “Huge crowd cheering victory”, Mixkit License)

## Demo mode

Ethio ships `sensor.demo_arsenal` (not a live `sensor.arsenal`) with SofaScore-shaped attributes so you can try the card without the integration. In demo mode the clock and last play tick about every 5s, and the score updates about every 20s (mostly Arsenal goals) so `score_celebration` can be exercised live.
