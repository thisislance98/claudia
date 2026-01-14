#!/bin/bash
# Claude Code PreToolUse Hook - notifies backend when Claude starts using a tool
# This indicates Claude is working/busy

# Read the JSON input from stdin
input=$(cat)

# Extract session_id using basic string parsing (no jq dependency)
session_id=$(echo "$input" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

# Extract tool_name if available
tool_name=$(echo "$input" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)

# Send notification to our backend via HTTP
curl -s -X POST "http://localhost:3001/api/claude-busy" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$session_id\", \"tool_name\": \"$tool_name\"}" \
  > /dev/null 2>&1

exit 0
