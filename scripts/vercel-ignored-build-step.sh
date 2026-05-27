#!/bin/bash
# Exit 0 = skip build. Exit 1 = proceed with build.
# Skip preview deployments triggered by dependabot — they lack the required
# env vars and shouldn't run migrations against the database.
if [ "$VERCEL_GIT_COMMIT_AUTHOR_LOGIN" = "dependabot[bot]" ]; then
  echo "Skipping Vercel build for dependabot PR"
  exit 0
fi
exit 1
