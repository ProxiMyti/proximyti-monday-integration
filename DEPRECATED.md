# ⚠️ DEPRECATED - DO NOT USE

**Date Deprecated**: October 4, 2025
**Reason**: Duplicate of monorepo service - use `proximyti-platform/services/monday-sync` instead

## Status: OUT OF USE

This standalone repository is **no longer actively maintained or deployed**.

## ✅ Active Repository

**Use this instead**: [`proximyti-platform/services/monday-sync`](https://github.com/ProxiMyti/proximyti-platform/tree/main/services/monday-sync)

The active monday-sync service is part of the ProxiMyti platform monorepo and includes:
- Complete vendor authentication system
- Email invitation system
- Vendor-auth API (production)
- Enhanced security features
- Full integration with Supabase

## Why This Repository Exists

This was created on September 29, 2025 as a standalone test/experimental version of the Monday.com sync service. Development continued in the monorepo (`proximyti-platform`) on October 2-3, 2025, making this repository obsolete.

## Railway Deployment

Railway is configured to deploy from:
- **Repository**: `ProxiMyti/proximyti-platform`
- **Root Directory**: `/services/monday-sync`
- **Service Name**: `proximyti-monday-integration`

Despite the service name matching this repo, Railway actually deploys the monorepo version.

## What Happened

1. **Sept 29**: Created this standalone repo as initial version
2. **Sept 30**: Railway deployment succeeded (basic version)
3. **Oct 2-3**: Major development work in **monorepo** (`proximyti-platform/services/monday-sync`)
4. **Oct 3**: Railway deployments started failing (missing env vars from new monorepo features)
5. **Oct 4**: Deprecated this standalone repo - all work should be in monorepo

## Migration Notes

All work from this repository has been superseded by the monorepo version, which includes:
- More dependencies (`@supabase/supabase-js`, `dotenv`, `compression`, `cors`, `helmet`)
- Vendor authentication API
- Email service integration
- Invitation system
- Production-ready security features

## Action Items

- ✅ Document as deprecated (this file)
- ⏳ Add missing Railway environment variables to monorepo service
- 📝 Consider archiving this repository on GitHub

---

**For all Monday.com sync work, use**: `proximyti-platform/services/monday-sync`
