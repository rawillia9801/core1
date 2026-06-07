# Runtime Action Crash Fix Note

The production crash is caused by server actions that throw during production runtime. The fix is to remove production-only throws and redirect with safe error query parameters instead.
