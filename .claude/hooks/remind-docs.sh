#!/bin/bash
# PostToolUse hook: reminds Claude to document any new commands in docs/commands/

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only remind for non-trivial, non-git commands (git commands have their own doc file)
if [ -n "$COMMAND" ]; then
  echo "{\"hookSpecificOutput\": {\"hookEventName\": \"PostToolUse\", \"additionalContext\": \"REMINDER (CLAUDE.md rule): If the Bash command you just ran is new and not already documented, add it now — git commands go in docs/commands/git.mdDo this before continuing.\"}}"
fi
