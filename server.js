const express = require("express");
const path = require("path");
const cors = require("cors"); // Import the cors package

const PAYPAL_CLIENT_ID = "AYHbbrbfRqY2Uo3kvU7lYBDI575Y_Nu3KLTFb04Ahr0S1sppPYcz9Zy0Ld03zmYAA9op4KYm92hAhSQx";
const PAYPAL_CLIENT_SECRET = "EKzqgZtoZgM9qAzzbplMH-qaWdsneznAkQoPQZweTlhmYTB1GrPQ6aoIvSxr8BjBCQlHA8OYG12bskXd";
const PORT = 8888;
const base = "https://api-m.sandbox.paypal.com";
const app = express();

// Use CORS middleware
app.use(cors());

app.use(express.static("client"));
app.use(express.json());

const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }

    const nodeFetch = await import('node-fetch');
    const fetch = nodeFetch.default;

    const auth = Buffer.from(
        PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

const createOrder = async (cart) => {
  console.log(
      "shopping cart information passed from the frontend createOrder() callback:",
      cart
  );

  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: "20",
        },
      },
    ],
  };

  const nodeFetch = await import('node-fetch');
  const fetch = nodeFetch.default;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

app.post("/api/orders", async (req, res) => {
  try {
    const { cart } = req.body;
    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

const captureOrder = async (orderID) => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

  const nodeFetch = await import('node-fetch');
  const fetch = nodeFetch.default;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return handleResponse(response);
};

app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.resolve("./client/checkout.html"));
});

app.listen(PORT, () => {
  console.log(`Node server listening at http://localhost:${PORT}/`);
});
