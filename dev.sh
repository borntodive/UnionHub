#!/usr/bin/env bash
# Opens 4 iTerm2 tabs for full-stack dev:
#   1. AI Agent  — uv run uvicorn (port 8002)
#   2. ngrok     — tunnels port 3000 + updates .env.development
#   3. Backend   — NestJS (port 3000)
#   4. Frontend  — Expo iOS

osascript <<'EOF'
tell application "iTerm"
    activate

    set w to (create window with default profile)

    -- Tab 1: AI Agent
    tell current session of current tab of w
        set name to "AI Agent"
        write text "cd '/Users/andreacovelli/apps/CISL/AI Agents/Hybrid' && uv run uvicorn src.main:app --port 8002 --reload"
    end tell

    -- Tab 2: ngrok
    tell w
        create tab with default profile
        tell current session of current tab
            set name to "ngrok"
            write text "bash '/Users/andreacovelli/apps/CISL/UnionHub/scripts/ngrok-start.sh'"
        end tell
    end tell

    -- Tab 3: Backend API
    tell w
        create tab with default profile
        tell current session of current tab
            set name to "Backend"
            write text "cd '/Users/andreacovelli/apps/CISL/UnionHub/api' && npm run start:dev"
        end tell
    end tell

    -- Tab 4: Frontend iOS (waits for ngrok sentinel before starting)
    tell w
        create tab with default profile
        tell current session of current tab
            set name to "Frontend iOS"
            write text "echo 'Waiting for ngrok .env update...' && until [ -f '/Users/andreacovelli/apps/CISL/UnionHub/.ngrok-ready' ]; do sleep 1; done && rm '/Users/andreacovelli/apps/CISL/UnionHub/.ngrok-ready' && echo '.env ready — starting Expo...' && cd '/Users/andreacovelli/apps/CISL/UnionHub/apps/mobile' && npx expo run:ios"
        end tell
    end tell
end tell
EOF

echo "Done — 4 iTerm2 tabs opened."
