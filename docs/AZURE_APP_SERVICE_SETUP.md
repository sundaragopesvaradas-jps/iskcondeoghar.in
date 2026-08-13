# Azure App Service — Phase 3 (Central India / Pune)

Target: **Jharkhand users**, **App Service Linux Always On**, region **Central India**.

## Live resources (created 2026-08-13)

| Resource | Value |
|---|---|
| Resource group | `iskcon-deoghar-rg` |
| App Service plan | `iskcon-deoghar-plan` (B1 Linux, Central India) |
| Web App | `iskcondeoghar-in` |
| URL | https://iskcondeoghar-in.azurewebsites.net |
| Runtime | Node **22 LTS** (20 not offered in this region) |
| Always On | On |
| Startup | `node server.js` |
| HTTPS only | On |

GitHub (`sundaragopesvaradas-jps/iskcondeoghar.in`):
- Secret `AZURE_WEBAPP_PUBLISH_PROFILE`
- Variable `AZURE_WEBAPP_NAME` = `iskcondeoghar-in`

Push to `main` deploys via `.github/workflows/azure-appservice-deploy.yml`.

## 1. Create resources (Azure Portal) — already done via CLI

If recreating manually:
1. Portal → **Create a resource** → **Web App**
2. Basics:
   - **Resource group**: `iskcon-deoghar-rg`
   - **Name**: `iskcondeoghar-in` → `https://iskcondeoghar-in.azurewebsites.net`
   - **Publish**: **Code**
   - **Runtime stack**: **Node 22 LTS**
   - **Operating System**: **Linux**
   - **Region**: **Central India**
3. **Pricing**: **Basic B1** (Always On needs Basic or higher)
4. Review + create

## 2. App settings

Web App → **Configuration** → **Application settings**:

| Name | Value |
|---|---|
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |
| `PM2_HOME` | (leave unset) |

**General settings**:
- **Always On**: **On**
- **Startup Command**: `node server.js`

Save.

## 3. Publish profile → GitHub secret

1. Web App → **Download publish profile** (overview toolbar)
2. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
3. New secret:
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: full XML contents of the downloaded file
4. Optional variable (or edit workflow):
   - `AZURE_WEBAPP_NAME` = exact App Service name (e.g. `iskcondeoghar`)

The workflow in `.github/workflows/azure-appservice-deploy.yml` expects:
- `secrets.AZURE_WEBAPP_PUBLISH_PROFILE`
- `vars.AZURE_WEBAPP_NAME` (fallback name in the YAML if unset)

## 4. Deploy

Push to `main` (or run the workflow manually). It will:

1. `npm ci` + `next build` (standalone)
2. Pack `deploy/` (standalone + `.next/static` + `public`)
3. Zip-deploy to App Service

Smoke-test: `https://<app-name>.azurewebsites.net/home`

## 5. Custom domain (iskcondeoghar.in)

1. App Service → **Custom domains** → **Add custom domain**
2. At your DNS host, create what Azure shows (usually):
   - `A` / `TXT` for apex, or `CNAME` for `www`
3. After validation → **Add TLS/SSL binding** → App Service Managed Certificate (free)
4. **Remove / change** DNS that still points at **Azure Static Web Apps**
5. Wait for DNS TTL, then confirm https://iskcondeoghar.in/home

## 6. Retire Static Web App

After 24–48h stable on App Service:

1. Delete or stop the Static Web App resource
2. Remove old SWA secrets from GitHub if any remain

## Local package test

```bash
chmod +x scripts/prepare-appservice.sh
./scripts/prepare-appservice.sh
cd deploy && PORT=8080 node server.js
# open http://localhost:8080/home
```

## Docker (optional)

`Dockerfile` is ready if you later switch the Web App to **Container**. Default path above is **Code + zip deploy** (no ACR required).
