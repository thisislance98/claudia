#!/bin/bash
# Claude Code Notification Hook - notifies backend when Claude needs user input

# Read the JSON input from stdin
input=$(cat)

# Extract session_id using basic string parsing (no jq dependency)
session_id=$(echo "$input" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

# Extract notification_type (permission_prompt, idle_prompt, or elicitation_dialog)
notification_type=$(echo "$input" | grep -o '"notification_type":"[^"]*"' | cut -d'"' -f4)

# Send notification to our backend via HTTP
# The backend listens on port 4001 (see shared/src/config.ts)
curl -s -X POST "http://localhost:4001/api/claude-notification" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$session_id\", \"notification_type\": \"$notification_type\"}" \
  > /dev/null 2>&1

exit 0
