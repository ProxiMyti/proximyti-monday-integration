# Claude Instructions — proximyti-monday-integration

## Git

Work on a feature branch, never commit to `main`, and finish with a PR.

### Getting a PR reviewed: draft → ready → re-request

Bill reviews every PR, and he hears about one only when his review is **requested**: GitHub
sends him a Slack ping. A push on its own notifies nobody, so a fix pushed without a re-request
looks exactly like work in progress and sits unreviewed. Follow these steps without being asked:

1. **Open every PR as a draft:** `gh pr create --draft`. Push as often as you like while working;
   a draft pings no one.
2. **When the work is done** (self-review and, where this repo has one, the security pass are
   clean), mark it ready **and** request Bill's review:
   `gh pr ready <n> && gh pr edit <n> --add-reviewer billcalfee`
3. **After addressing review feedback,** push, then re-request his review the same way
   (`gh pr edit <n> --add-reviewer billcalfee` re-requests it even if he has already reviewed),
   and leave a comment saying what changed and the new head SHA.
4. **Merging needs an Approve,** not just a review comment. Approvals survive later pushes, so if
   you push anything after Bill approves, re-request his review before merging. Otherwise the new
   commit merges unreviewed.

If the person you're working with says "open a PR", open it as a draft. If they say it's done or
ready, run step 2. If they've just fixed review feedback, run step 3.
