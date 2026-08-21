# @ethio/teamtracker

Ethio Home plugin for [ha-teamtracker](https://github.com/vasqued2/ha-teamtracker) sensors.

Scoreboard UX inspired by [ha-teamtracker-card](https://github.com/vasqued2/ha-teamtracker-card) — rebuilt as a React widget for the Ethio plugin platform (not a fork of the Lit card).

## Live mode

Install the ha-teamtracker integration in Home Assistant, create a team sensor, then add **Team Card** from the widget picker and bind that sensor. During live games the card follows sensor updates (score, clock, `last_play`) and scrolls the last play as a marquee.

Celebration settings on Team Card:

- **score_celebration** — full-screen wash / confetti when *your* team scores (`"{Team} Goal"`)
- **opponent_celebration** — same animation when the opponent scores (no cheer)
- **celebration_sound** — stadium cheer when *your* team scores (Mixkit “Huge crowd cheering victory”, Mixkit License)

## Demo mode

Ethio ships `sensor.demo_arsenal` with simulated IN-game attributes so you can try the card without the integration. In demo mode the clock and last play tick about every 5s, and the score updates about every 20s (mostly Arsenal goals) so `score_celebration` can be exercised live.
