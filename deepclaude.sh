#!/usr/bin/env bash

# Route Claude Code to DeepSeek backend

export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN="sk-95bb8998f8cc4164a0de575a112eabbc"
export ANTHROPIC_MODEL=deepseek-v4-pro[1m]
export ANTHROPIC_DEFAULT_OPUS_MODEL=deepseek-v4-pro[1m]
export ANTHROPIC_DEFAULT_SONNET_MODEL=deepseek-v4-pro[1m]
export ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-v4-flash
export CLAUDE_CODE_SUBAGENT_MODEL=deepseek-v4-flash
export CLAUDE_CODE_EFFORT_LEVEL=max
export API_TIMEOUT_MS=3000000

export CLAUDE_CONFIG_DIR="${HOME}/.deepseek"
mkdir -p "${CLAUDE_CONFIG_DIR}"

claude "$@"