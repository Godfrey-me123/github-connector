# Point BIGsta only at amber-dog and remove the old database

## What I found
- No app code mentions the old database (yjnvjuouxzfrhlqzstlp). The only place it appears is the app's connection settings file, which Lovable fills in automatically from the connected Supabase project.
- This Lovable project is still connected to the old Supabase project. If only the settings file is edited, Lovable puts the old address back, and server features (admin, SMS payments, health check) keep using the old project's key.

## Step 1 — You do this (required first)
In Lovable: Project Settings -> Integrations -> Supabase -> disconnect, then connect the amber-dog project (fpkgkxyihbqlrsstvnnh). Lovable then stores the correct address and keys for the browser and the server.

## Step 2 — I do this after you reconnect
1. Confirm the settings file and `supabase/config.toml` show only fpkgkxyihbqlrsstvnnh. Refresh the server keys, and fail loudly if any value is missing. Never fall back to another database.
2. Search the whole project again (code, settings, tests) and remove any remaining old reference.
3. Keep the image-link fixer so old card background links load from amber-dog. If a background still fails to load, show a placeholder instead of freezing the editor.
4. Check amber-dog has the tables the app needs (templates, profiles, user_roles, token_packages, weekly_offers, nida_requests, system_settings). Check that the admin role for mbwilogodfrey123@gmail.com exists there. Add anything missing with a database change.
5. Tapping the "Special Creator Pass" offer opens checkout with the 10 tokens / 6,000 TZS package already selected.
6. Show payment steps for M-Pesa, Tigo Pesa and Airtel Money, using the Lipa Namba and USSD numbers saved in the admin payment methods. I need your real Lipa Namba numbers; I will not make any up.
7. Verify: 0 type errors, the health check reports amber-dog, sign-in works, and the admin dashboard loads users.

## Prompt to use after reconnecting
```text
The project is now connected to amber-dog (fpkgkxyihbqlrsstvnnh). Remove every trace of
yjnvjuouxzfrhlqzstlp, with no fallbacks anywhere. Refresh the Supabase server keys. Make sure
amber-dog has every table, policy, and the admin role for mbwilogodfrey123@gmail.com. Make
the weekly offer open checkout with its package pre-selected. Show M-Pesa/Tigo/Airtel
Lipa Namba + USSD steps from the payment methods settings. Verify sign-in, admin dashboard,
health check and 0 type errors.
```
