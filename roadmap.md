# Roadmap

- [x] Import BIGsta app code from GitHub repo "New-age" into this project
- [x] Restore database access for all tables (grants were missing)
- [x] Save Zambia NRC submissions to the database
- [ ] Check RLS on all tables — blocked: app signs in with passkeys, not real accounts; locking tables needs a decision from the user
- [ ] Auto-push to GitHub — blocked: user must connect via Plus menu > GitHub (Lovable sync)
- [x] Stage 1 offline/connectivity: real server+database probe, offline banner, NIDA & driving licence forms use it, service worker v2 caches template backgrounds, CI build fixed
- [ ] Stage 2 user-to-admin request & reply system — needs decision on accounts (passkey users have no real login, so per-user privacy can't be enforced yet)
- [ ] Stage 3 template background audit — needs database access to list each template's front/back records
- [ ] Stage 4 payments review — needs admin confirmation of current provider flow
- [x] Silent offline template prefetch (only for users with tokens)
- [x] Recent requests not showing — audit all user & admin request sections so every user request appears
