# GrowthSignal.ai source handoff

This archive contains the current static marketing website, including all assets.

## Mac setup
Download growthsignal-source.zip into Downloads. In Terminal run:

mkdir -p "$HOME/Projects"
unzip -n "$HOME/Downloads/growthsignal-source.zip" -d "$HOME/Projects"
open "$HOME/Projects/growthsignal"

The project folder is ~/Projects/growthsignal. Open this folder in Claude Code.
If Safari automatically extracted the download, move the downloaded growthsignal folder into ~/Projects instead.

## Preview
From the project folder run: python3 -m http.server 8080 --directory dist
Then visit http://localhost:8080.

## Contents
- dist/index.html: page structure and copy
- dist/style.css: styling
- dist/app.js: interactive sample reports, pricing and FAQ assistant
- dist/assets/: logos and images
- .openai/hosting.json: existing Sites hosting identity; do not reuse it for a different site

The actual audit backend, accounts and billing are not implemented. See CLAUDE.md for context and paste the full strategy/build prompt from our conversation into Claude Code.
No Git history, credentials or API keys are included.
