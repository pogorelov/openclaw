#!/bin/sh
set -e

STATE_DIR="${OPENCLAW_STATE_DIR:-/data/.openclaw}"
mkdir -p "$STATE_DIR"

CONFIG_FILE="$STATE_DIR/openclaw.json"

# Merge Railway-required settings into config without overwriting existing values
node -e "
const fs = require('fs');
const path = '$CONFIG_FILE';
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path, 'utf8')); } catch(e) {}
cfg.gateway = cfg.gateway || {};
cfg.gateway.controlUi = cfg.gateway.controlUi || {};
cfg.gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback = true;
cfg.gateway.controlUi.dangerouslyDisableDeviceAuth = true;
cfg.channels = cfg.channels || {};
cfg.channels.telegram = cfg.channels.telegram || {};
if (!cfg.channels.telegram.dmPolicy) cfg.channels.telegram.dmPolicy = 'open';
fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
"

exec "$@"
