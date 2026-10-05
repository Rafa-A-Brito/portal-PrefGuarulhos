import { Router } from "express";

const router = Router();

router.get("/mapa", (req, res) => {
    return res.json({
        success: true,
        data: {
            googleMapsApiKey: process.env.GOOGLE_MAPS_KEY || null,
        },
    });
});

export default router;
