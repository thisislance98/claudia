#!/bin/bash
# Claude Code Stop Hook - notifies backend when Claude finishes

# Read the JSON input from stdin
input=$(cat)

# Extract session_id using basic string parsing (no jq dependency)
session_id=$(echo "$input" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

# Send notification to our backend via HTTP
# The backend listens on port 3001 by default
curl -s -X POST "http://localhost:3001/api/claude-stopped" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$session_id\"}" \
  > /dev/null 2>&1

exit 0
