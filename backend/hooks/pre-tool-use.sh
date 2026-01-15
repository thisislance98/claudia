#!/bin/bash
# Claude Code PreToolUse Hook - notifies backend when Claude starts using a tool
# This indicates Claude is working/busy

# Read the JSON input from stdin
input=$(cat)

# Extract session_id using basic string parsing (no jq dependency)
session_id=$(echo "$input" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

# Extract tool_name if available
tool_name=$(echo "$input" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)

# Log for debugging
echo "[PreToolUse] Session: $session_id, Tool: $tool_name" >> /tmp/codeui-hooks.log 2>&1

# Send notification to our backend via HTTP (port 4001, see shared/src/config.ts)
response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:4001/api/claude-busy" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$session_id\", \"tool_name\": \"$tool_name\"}" 2>&1)

# Log response
echo "[PreToolUse] Response: $response" >> /tmp/codeui-hooks.log 2>&1

exit 0
