const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const VERSION = "4.2.0";

app.get("/", (req, res) => {
    res.json({
        application: "Retail Platform",
        version: VERSION,
        message: "Retail platform is running"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "UP",
        version: VERSION
    });
});

app.get("/products", (req, res) => {
    res.json([
        {
            id: 1,
            name: "Laptop",
            price: 60000
        },
        {
            id: 2,
            name: "Mobile",
            price: 30000
        }
    ]);
});

app.get("/search", (req, res) => {
    res.json({
        feature: "Product Search",
        status: "Available"
    });
});

app.get("/cart", (req, res) => {
    res.json({
        feature: "Shopping Cart",
        status: "Available"
    });
});

// Payment endpoint - version 4.2.0 contains the payment defect
app.post("/payment", (req, res) => {
    const { amount } = req.body;

    res.json({
        status: "SUCCESS",
        message: "Payment processed",
        amount: amount
    });
});

app.listen(PORT, () => {
    console.log(`Retail Platform ${VERSION} running on port ${PORT}`);
});