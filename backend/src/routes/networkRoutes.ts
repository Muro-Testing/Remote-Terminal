import { Router } from "express";

export const networkRoutes = Router();

networkRoutes.get("/network/config", (_req, res) => {
  res.json({
    localLanIp: process.env.LOCAL_LAN_IP ?? ""
  });
});
