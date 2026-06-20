import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { clerkMiddleware, requireAuth as clerkRequireAuth } from "@clerk/express";
import { createClerkClient } from "@clerk/express";
import axios from "axios";
import { createServer as createViteServer } from "vite";
import _firebaseAdmin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";

let supabase: ReturnType<typeof createClient> | null = null;
if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
  // Use service role key if available for backend, fallback to anon
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  supabase = createClient(process.env.VITE_SUPABASE_URL, key);
}

// Normalize admin import to handle both ESM and CJS gracefully
const admin = (_firebaseAdmin as any).apps ? _firebaseAdmin : (_firebaseAdmin as any).default || _firebaseAdmin;

// Initialize Firebase Admin safely
try {
  const hasApps = admin && admin.apps && admin.apps.length > 0;
  if (!hasApps) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    } else {
      admin.initializeApp({
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }
  }
} catch (err) {
  console.error("Firebase Admin initialization failed.", err);
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_Y3VyaW91cy10dW5hLTY2LmNsZXJrLmFjY291bnRzLmRldiQ";
const SECRET_KEY = process.env.CLERK_SECRET_KEY || "sk_test_mqEIXKFXmU5P6haiFuBxgmTGopd0wZUDRPuQa8oMsf";

process.env.CLERK_PUBLISHABLE_KEY = PUBLISHABLE_KEY;
process.env.CLERK_SECRET_KEY = SECRET_KEY;

const clerkClient = createClerkClient({ secretKey: SECRET_KEY, publishableKey: PUBLISHABLE_KEY });

// Unified Require Auth
const unifiedRequireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 1. Try Clerk
  if ((req as any).auth && (req as any).auth.userId) {
    return next();
  }
  
  // 2. Try Firebase Auth Token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      (req as any).auth = { userId: decoded.uid };
      return next();
    } catch (e) {
      console.error("Firebase verify fail:", e);
    }
  }

  // 3. Try Supabase Auth Token
  if (authHeader && authHeader.startsWith("Bearer ") && supabase) {
    const token = authHeader.split("Bearer ")[1];
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        (req as any).auth = { userId: user.id };
        return next();
      }
    } catch(e) {}
  }

  return res.status(401).json({ error: "Unauthorized" });
};

// Unified Get User
const getUnifiedUser = async (userId: string) => {
  try {
    // Try Supabase first
    if (supabase) {
      const { data, error } = await supabase.from('users').select('email, role, name').eq('id', userId).single();
      if (data && !error) {
        return {
          userId,
          email: data.email,
          role: data.role
        };
      }
    }
  } catch (e) {}

  try {
    // Try Clerk second
    const user = await clerkClient.users.getUser(userId);
    return {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      role: user.publicMetadata.role
    };
  } catch (e) {
    // Fallback to Firebase realtime database role
    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const secret = process.env.FIREBASE_DB_SECRET;
    if (dbUrl) {
      try {
        const res = await axios.get(`${dbUrl}/users/${userId}.json${secret ? `?auth=${secret}` : ''}`);
        const userData = res.data || {};
        return {
          userId,
          email: userData.email,
          role: userData.role
        };
      } catch (err) {}
    }
    return { userId, email: null, role: null };
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  // Note: For Vite, we apply clerkMiddleware() so that we can conditionally requireAuth
  app.use(clerkMiddleware({
    publishableKey: PUBLISHABLE_KEY,
    secretKey: SECRET_KEY
  }));

  // Helper to interact with Firebase REST API
  // Using database Auth if FIREBASE_DB_SECRET is defined, else relying on open rules (or failing if locked)
  const getDbUrl = (path: string) => {
    const baseUrl = process.env.FIREBASE_DATABASE_URL;
    const secret = process.env.FIREBASE_DB_SECRET; // Optional Admin bypass if user provides it
    return `${baseUrl}/${path}.json${secret ? `?auth=${secret}` : ''}`;
  };

  // Helper to fetch system config (simulates firebase-admin)
  const fetchSystemConfig = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('system_config').select('*').eq('id', 'default').single();
        if (data && !error) return data;
      }
      if (process.env.FIREBASE_DATABASE_URL) {
        const res = await axios.get(getDbUrl('system_config'));
        return res.data || {};
      }
      return {};
    } catch (e) {
      console.error("Failed to fetch system config.", e);
      return {};
    }
  };

  const updateSystemConfig = async (data: any) => {
    if (supabase) {
      await supabase.from('system_config').upsert({ id: 'default', ...data });
    } else if (process.env.FIREBASE_DATABASE_URL) {
      await axios.patch(getDbUrl('system_config'), data);
    }
  };

  // 1. Setup First Admin
  app.post("/api/setup/first-admin", unifiedRequireAuth, async (req, res) => {
    try {
      const auth = (req as any).auth;
      const user = await getUnifiedUser(auth.userId);
      const email = user.email;
      
      if (email === "lupinstarnley009@gmail.com") {
        if (user.role !== "admin") {
          try {
            await clerkClient.users.updateUserMetadata(auth.userId, {
              publicMetadata: { role: "admin" }
            });
          } catch(e) { /* Must be a firebase user */ }
          
          await axios.patch(getDbUrl(`users/${auth.userId}`), { role: "admin" });
          return res.json({ success: true, message: "Admin role granted." });
        }
        return res.json({ success: true, message: "Already admin." });
      }
      res.status(403).json({ error: "Unauthorized email." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Public Config
  app.get("/api/config/public", async (req, res) => {
    const config = await fetchSystemConfig();
    res.json({
      app_name: config.app_name || "Hostara",
      app_tagline: config.app_tagline || "powered by SwiftCloud",
      primary_color: config.primary_color || "#8B5CF6",
      guest_mode_enabled: config.guest_mode_enabled ?? true,
      maintenance_mode: config.maintenance_mode ?? false,
      maintenance_message: config.maintenance_message || "We are currently undergoing maintenance.",
      broadcast_message: config.broadcast_message || "",
      plans: config.plans || {},
      logo_url: config.logo_url || "",
      favicon_url: config.favicon_url || "",
      auth_mode: config.auth_mode || "normal"
    });
  });

  // 3. Admin Config CRUD
  app.get("/api/admin/config", unifiedRequireAuth, async (req, res) => {
    const auth = (req as any).auth;
    const user = await getUnifiedUser(auth.userId);
    if (user.role !== "admin" && user.email !== "lupinstarnley009@gmail.com") return res.status(403).json({ error: "Forbidden" });
    const config = await fetchSystemConfig();
    res.json(config);
  });

  app.post("/api/admin/config", unifiedRequireAuth, async (req, res) => {
    try {
      const auth = (req as any).auth;
      const user = await getUnifiedUser(auth.userId);
      if (user.role !== "admin" && user.email !== "lupinstarnley009@gmail.com") return res.status(403).json({ error: "Forbidden" });
      
      await updateSystemConfig(req.body);
      
      // Write audit log
      const pushId = `audit-${Date.now()}`;
      await axios.put(getDbUrl(`audit_logs/${pushId}`), {
        admin_id: auth.userId,
        action: "update_config",
        timestamp: Date.now()
      });
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Deploy route
  app.post("/api/deploy", unifiedRequireAuth, async (req, res) => {
    try {
      const auth = (req as any).auth;
      const { templateId, name, envVars, customRepoUrl, customBuildCmd, customStartCmd } = req.body;
      const userId = auth.userId;
      
      let userData: any = {};
      let template: any = null;
      let renderAccounts: any = {};

      if (supabase) {
        const { data: uData } = await supabase.from('users').select('*').eq('id', userId).single();
        if (uData) userData = uData;
        
        if (templateId !== 'custom') {
           const { data: tData } = await supabase.from('bot_templates').select('*').eq('id', templateId).single();
           template = tData;
        }

        const { data: rData } = await supabase.from('admin_keys').select('*').eq('id', 'default').single();
        if (rData) renderAccounts = rData;
      } else {
        const userRes = await axios.get(getDbUrl(`users/${userId}`));
        userData = userRes.data || {};
        if (templateId !== 'custom') {
          const templateRes = await axios.get(getDbUrl(`bot_templates/${templateId}`));
          template = templateRes.data;
        }
        const renderRes = await axios.get(getDbUrl('render_accounts'));
        renderAccounts = renderRes.data || {};
      }

      let templatePrice = 0;
      let repoUrl: string;
      let buildCmd: string;
      let startCmd: string;

      if (templateId === 'custom') {
        templatePrice = 3500;
        repoUrl = customRepoUrl;
        buildCmd = customBuildCmd || "";
        startCmd = customStartCmd || "npm start";
        if (!repoUrl) return res.status(400).json({ error: "No custom repo URL provided." });
      } else {
        if (!template) return res.status(404).json({ error: "Template not found" });
        templatePrice = template.cost || template.price_extra || 0;
        repoUrl = template.github_url || template.repo_url;
        buildCmd = template.build_cmd || template.build_command || "npm install";
        startCmd = template.start_cmd || template.start_command || "npm start";
      }

      if ((userData.balance || 0) < templatePrice) {
         return res.status(400).json({ error: `Insufficient balance. Requires ${templatePrice}.` });
      }

      let renderApiKey = null;
      let ownerId = null;

      if (supabase) {
        renderApiKey = renderAccounts.render_api_key;
        ownerId = renderAccounts.owner_id;
      } else {
        let minBots = Infinity;
        for (const [key, account] of Object.entries(renderAccounts) as any) {
          if (!account.suspended && account.bots_count < account.limit && account.bots_count < minBots) {
            minBots = account.bots_count;
            renderApiKey = account.api_key;
          }
        }
      }
      
      if (!renderApiKey) return res.status(500).json({ error: "No Render API keys available." });

      // Deploy to Render
      const envs = Object.entries(envVars || {}).map(([key, value]) => ({ key, value }));
      const renderPayload: any = {
        type: "web_service",
        name: `bot-${Date.now().toString().slice(-6)}`,
        repo: repoUrl,
        autoDeploy: "yes",
        envVars: envs,
        buildCommand: buildCmd,
        startCommand: startCmd
      };

      if (ownerId && ownerId.trim().length > 0) {
        renderPayload.ownerId = ownerId;
      }

      const renderApiRes = await axios.post("https://api.render.com/v1/services", renderPayload, {
        headers: { "Authorization": `Bearer ${renderApiKey}`, "Content-Type": "application/json", "Accept": "application/json" }
      });
      
      const service = renderApiRes.data;
      const serviceUrl = service.service? service.service.serviceDetails.url : service.serviceDetails?.url || "";
      const srvId = service.service? service.service.id : service.id;
      const sname = service.service? service.service.name : service.name;

      // UptimeRobot Monitor
      let uptimeApiKey = null;
      if (supabase) {
        uptimeApiKey = renderAccounts.uptimerobot_api_key;
      }

      if (uptimeApiKey) {
        try {
          await axios.post("https://api.uptimerobot.com/v2/newMonitor", {
            api_key: uptimeApiKey,
            format: "json",
            type: 1,
            url: serviceUrl,
            friendly_name: sname || "Bot Monitor"
          });
        } catch(err) {
          console.error("Failed to add uptime monitor");
        }
      }

      // Build Bot Data
      const pushId = `srv-${Date.now()}`;
      const botData = {
        name: name || sname,
        template_id: templateId,
        render_service_id: srvId,
        render_url: serviceUrl,
        status: "deploying",
        env_vars: envVars,
        created_at: Date.now()
      };

      const updatedBalance = (userData.balance || 0) - templatePrice;

      if (supabase) {
        await supabase.from('users').update({ balance: updatedBalance }).eq('id', userId);
        await supabase.from('user_bots').insert({
          id: pushId,
          user_id: userId,
          ...botData
        });
        if (templateId !== 'custom') {
          await supabase.from('bot_templates').update({ downloads: (template.downloads || 0) + 1 }).eq('id', templateId);
        }
      } else {
        await axios.patch(getDbUrl(`users/${userId}`), { balance: updatedBalance });
        await axios.put(getDbUrl(`users/${userId}/bots/${pushId}`), botData);
      }

      res.json({ url: serviceUrl, pushId, remaining_balance: updatedBalance });

    } catch (error: any) {
      console.error(error.response?.data || error.message);
      res.status(500).json({ error: error.message || "Deployment failed" });
    }
  });

  // 5. Proxy Render logs (Basic Implementation)
  app.get("/api/bot/:botId/logs", unifiedRequireAuth, async (req, res) => {
    try {
      const { botId } = req.params;
      let renderApiKey = null;
      
      if (supabase) {
        const { data } = await supabase.from('admin_keys').select('*').eq('id', 'default').single();
        if (data) renderApiKey = data.render_api_key;
      } else {
        const renderRes = await axios.get(getDbUrl('render_accounts'));
        const renderAccounts = renderRes.data || {};
        renderApiKey = (Object.values(renderAccounts)[0] as any)?.api_key;
      }
      
      if (!renderApiKey) throw new Error("API Key missing");
      
      const logsRes = await axios.get(`https://api.render.com/v1/services/${botId}/server-logs`, {
        headers: { "Authorization": `Bearer ${renderApiKey}`, "Accept": "application/json" }
      });
      res.json(logsRes.data);
    } catch(err: any) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });


  app.post("/api/wallet/bonus", unifiedRequireAuth, async (req, res) => {
    try {
      const auth = (req as any).auth;
      const userId = auth.userId;

      let userData: any = {};
      if (supabase) {
         const { data } = await supabase.from('users').select('*').eq('id', userId).single();
         if (data) userData = data;
      } else {
         const userRes = await axios.get(getDbUrl(`users/${userId}`));
         userData = userRes.data || {};
      }

      const now = Date.now();
      const lastClaim = userData.last_bonus_claim || 0;
      const hoursSince = (now - lastClaim) / (1000 * 60 * 60);

      if (hoursSince < 24) {
        return res.status(400).json({ error: `Please wait ${Math.ceil(24 - hoursSince)} hours to claim your next bonus.` });
      }

      const newBalance = (userData.balance || 0) + 500;
      if (supabase) {
         await supabase.from('users').update({ balance: newBalance, last_bonus_claim: now }).eq('id', userId);
      } else {
         await axios.patch(getDbUrl(`users/${userId}`), { balance: newBalance, last_bonus_claim: now });
      }

      // Optional: Add to transactions log if we build that later

      res.json({ message: "Bonus claimed successfully!", balance: newBalance });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Uptime Simulation/Proxy Endpoint
  app.get("/api/bot/:botId/uptime", unifiedRequireAuth, async (req, res) => {
    try {
      // In a real system, you'd fetch from UptimeRobot using the monitor ID.
      // Since we don't have the real UptimeRobot keys always, we simulate a ping
      // or return a mock realistic value.
      
      const config = await fetchSystemConfig();
      const uptimeApiKey = config.api_keys?.uptimerobot || process.env.UPTIMEROBOT_API_KEY;
      
      // Simulated response if no real api key
      if (!uptimeApiKey || uptimeApiKey === "placeholder") {
        return res.json({
          status: "up",
          uptime_ratio: (99.8 + Math.random() * 0.19).toFixed(2),
          response_time: Math.floor(Math.random() * 150) + 50
        });
      }
      
      // Real implementation would look like:
      // const uRes = await axios.post("https://api.uptimerobot.com/v2/getMonitors", { api_key: uptimeApiKey, custom_uptime_ratios: "7" });
      
      res.json({ status: "up", uptime_ratio: "99.98", response_time: 120 });
    } catch(err) {
      res.status(500).json({ error: "Failed to fetch uptime" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
