const express = require("express");
const cors = require("cors");

const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const path = require("path");

// config
const app = express();
const port = 4000;
const allowedOrigins = [
  "http://localhost:3000",
  "https://staging.tiktaac.com",
  "https://tiktaac.com",
];
// log styles 
const bold = '\x1b[1m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
// CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error("Not allowed by CORS")); // Block the request
    }
  },
  methods: ["GET", "POST"], // Specify allowed methods
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));
app.use(express.json()); // Middleware to parse JSON requests

// Basic route for the home page
app.get("/", (req, res) => {
  res.send("The print server is running!");
});

// Create a printer instance
let printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: "tcp://192.168.1.153", // printer local IP
  options: {
    // Additional options
    timeout: 5000, // Connection timeout (ms) [applicable only for network printers] - default: 3000
  },
});

// Check if the printer is connected
const checkPrinterConnection = async () => {
  try {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error(
        `${red}Could not connect to printer, please make sure the printer is turned on and its IP is 192.168.1.153.`
      );
    }
    console.log(`${green}🎉🎉 Printer connected successfully. 🎉🎉`);
    console.info(`keep this window open and start printing tickets 🚀 `);
  } catch (error) {
    console.error(`${red}Error connecting to printer:`, error.message);
    process.exit(1); // Exit the process if printer connection fails
  }
};

checkPrinterConnection(); // Call the function to check printer connection
const resetPrinter = () => {
  printer.clear();
  printer.setTypeFontB();
  printer.alignCenter();
  printer.setTextSize(1, 1);
};
// Print endpoint
app.post("/print", async (req, res) => {
  const tickets = req.body;
  try {
    for (const ticket of tickets) {
      resetPrinter(); // Clear any previous print data
      await printer.printImage(path.join(__dirname, "img", "logo.png"));
      printer.newLine();
      printer.println(ticket.eventId.name);
      printer.setTextDoubleHeight();
      printer.drawLine();
      printer.leftRight(
        ticket.price + " " + ticket.currency,
        new Date(ticket.createdAt).toLocaleString()
      );
      printer.drawLine();
      printer.printQR(ticket._id, {
        cellSize: 8, // 1 - 8
        correction: "H", // L(7%), M(15%), Q(25%), H(30%)
        model: 2,
      });
      // printer.drawLine()
      printer.newLine();
      printer.setTextNormal();
      printer.println("tiktaac.com");
      printer.cut();

      await printer.execute(); // Await the execution
      console.log(`${green}Print done `);
    }

    res.status(200).send(`Print successful for all tickets!`);
  } catch (error) {
    console.error("Print failed:", error);
    res.status(500).send(`${green}Error while printing`);
    process.exit(1);
  }
});
// log some info
console.log("\nTiktaac Print Service\n");
console.log("Welcome to the Tiktaac Print Service!");
console.log("Note: This service is compatible only with Epson TM printers.");
console.log(
  "Nate: Printer local IP must be 192.168.1.153 and your machine must be on the same network (wifi).\n"
);

// Start the server
app.listen(port, () => {
  console.log(`${green}Server started on http://localhost:${port}`);
  console.log(`${yellow }🔍 Checking printer connection ... \n`);
});
